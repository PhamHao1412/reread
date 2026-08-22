import { Book, User, Bookmark, TranslationData } from '../types';
import { getCachedBlob, setCachedBlob, bookEtag } from './bookCache';

class ApiClient {
  private accessKey = 'readthrough_access_token';
  private refreshKey = 'readthrough_refresh_token';
  private baseUrl = (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    ''
  ).replace(/\/$/, '');


  private formatUrl(endpoint: string): string {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}${cleanEndpoint}`;
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.accessKey) || localStorage.getItem('reread_token') || localStorage.getItem('token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshKey);
  }

  setTokens(access: string, refresh?: string) {
    localStorage.setItem(this.accessKey, access);
    localStorage.setItem('reread_token', access);
    if (refresh) {
      localStorage.setItem(this.refreshKey, refresh);
    }
  }

  clearTokens() {
    localStorage.removeItem(this.accessKey);
    localStorage.removeItem(this.refreshKey);
    localStorage.removeItem('reread_token');
    localStorage.removeItem('token');
  }

  async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const fullUrl = this.formatUrl(url);
    const token = this.getAccessToken();
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    let res = await fetch(fullUrl, { ...options, headers });

    if (res.status === 401) {
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        try {
          const refreshRes = await fetch(this.formatUrl('/api/v1/auth/refresh'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
          const refreshJson = await refreshRes.json();
          if (refreshRes.ok && refreshJson.succeeded && refreshJson.data?.access_token) {
            this.setTokens(refreshJson.data.access_token, refreshJson.data.refresh_token);
            headers.set('Authorization', `Bearer ${refreshJson.data.access_token}`);
            res = await fetch(fullUrl, { ...options, headers });
          }
        } catch {
          // ignore
        }
      }
    }

    return res;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const res = await this.fetchWithAuth(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      },
    });

    if (res.status === 401) {
      this.clearTokens();
      window.dispatchEvent(new Event('auth:unauthorized'));
      throw new Error('Session expired');
    }

    const data = await res.json();
    if (!res.ok || (data.succeeded !== undefined && !data.succeeded)) {
      throw new Error(data.message || data.error || `Request failed (${res.status})`);
    }

    return data.data !== undefined ? data.data : data;
  }

  // Authentication
  async login(credentials: { username: string; password: string }): Promise<{ access_token: string; refresh_token: string }> {
    const res = await fetch(this.formatUrl('/api/v1/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: credentials.username,
        password: credentials.password,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.succeeded || !json.data?.access_token) {
      throw new Error(json.message || 'Login failed. Please check your credentials.');
    }

    this.setTokens(json.data.access_token, json.data.refresh_token);
    return json.data;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/api/v1/auth/me');
  }

  // Books
  async getBooks(): Promise<Book[]> {
    return this.request<Book[]>('/api/v1/books');
  }

  async getBook(id: string): Promise<Book> {
    return this.request<Book>(`/api/v1/books/${id}`);
  }

  private pendingDownloads = new Map<string, Promise<string>>();

  /**
   * Fast Source Resolver for PDF.js:
   * - If already cached in IndexedDB: returns local blob URL immediately (0ms).
   * - If not cached: returns streaming URL with Range header support so PDF.js
   *   can fetch only ~150KB and render the current page in < 0.5s, while simultaneously
   *   triggering background full-file caching to IndexedDB.
   */
  async getPdfDocumentSource(book: Book): Promise<{ url: string; headers?: Record<string, string>; isBlob: boolean }> {
    const etag = bookEtag(book);
    const cached = await getCachedBlob(book.id, etag);
    if (cached) {
      return {
        url: URL.createObjectURL(cached),
        isBlob: true,
      };
    }

    // Trigger non-blocking background download to populate IndexedDB
    this.prefetchBookBlob(book);

    // 1. Try direct Cloudflare R2 presigned URL (fast Cloudflare CDN edge network)
    try {
      const urlRes = await this.request<{ url: string; is_presigned: boolean }>(
        `/api/v1/books/${book.id}/download-url`,
      );
      if (urlRes?.url && urlRes.is_presigned) {
        return {
          url: urlRes.url,
          isBlob: false,
        };
      }
    } catch {
      // ignore — fall through to backend proxy
    }

    // 2. Fallback to backend /content endpoint with Authorization header
    const token = this.getAccessToken();
    return {
      url: this.formatUrl(`/api/v1/books/${book.id}/content`),
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      isBlob: false,
    };
  }

  async getBookFileBlobUrl(book: Book, onProgress?: (pct: number) => void): Promise<string> {
    const existing = this.pendingDownloads.get(book.id);
    if (existing) {
      return existing;
    }

    const downloadPromise = this.doGetBookFileBlobUrl(book, onProgress).finally(() => {
      this.pendingDownloads.delete(book.id);
    });

    this.pendingDownloads.set(book.id, downloadPromise);
    return downloadPromise;
  }

  private async doGetBookFileBlobUrl(book: Book, onProgress?: (pct: number) => void): Promise<string> {
    const etag = bookEtag(book);
    const mimeType = book.file_type === 'pdf' ? 'application/pdf' : 'application/octet-stream';

    // ── 1. Cache HIT — serve instantly from IndexedDB (0ms) ──
    const cached = await getCachedBlob(book.id, etag);
    if (cached) {
      return URL.createObjectURL(cached);
    }

    // ── 2. Cache MISS — single high-speed HTTP/2 stream direct from Cloudflare R2 ──
    let fileRes: Response | null = null;

    try {
      const urlRes = await this.request<{ url: string; is_presigned: boolean }>(
        `/api/v1/books/${book.id}/download-url`,
      );
      if (urlRes?.url && urlRes.is_presigned) {
        // Direct high-speed download from Cloudflare CDN Edge
        const directRes = await fetch(urlRes.url);
        if (directRes.ok) {
          fileRes = directRes;
        }
      }
    } catch {
      // ignore — will fall through to BE proxy
    }

    // Fallback: proxy through BE (local dev or non-presigned storage)
    if (!fileRes || !fileRes.ok) {
      const proxyRes = await this.fetchWithAuth(`/api/v1/books/${book.id}/content`);
      if (proxyRes.ok) {
        fileRes = proxyRes;
      }
    }

    if (!fileRes || !fileRes.ok || !fileRes.body) {
      throw new Error('Unable to download book file.');
    }

    // Stream download with progress tracking (1 single fast connection, 1-2s for 30MB)
    const contentLength = Number(fileRes.headers.get('Content-Length')) || book.file_size || 0;
    const reader = fileRes.body.getReader();
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        receivedBytes += value.length;
        if (contentLength > 0 && onProgress) {
          const pct = Math.min(Math.round((receivedBytes / contentLength) * 100), 100);
          onProgress(pct);
        }
      }
    }

    const typedBlob = new Blob(chunks as BlobPart[], { type: mimeType });

    // ── 3. Persist to IndexedDB for all future instant loads ──
    setCachedBlob(book.id, typedBlob, etag).catch(() => {});

    return URL.createObjectURL(typedBlob);
  }

  /**
   * Warms the cache for a book in the background (fire-and-forget).
   * Uses in-flight deduplication so it never triggers duplicate network downloads.
   */
  prefetchBookBlob(book: Book): void {
    const etag = bookEtag(book);
    getCachedBlob(book.id, etag).then((cached) => {
      if (!cached) {
        // Not cached yet — fetch silently in background
        this.getBookFileBlobUrl(book).catch(() => {});
      }
    }).catch(() => {});
  }

  async updateProgress(bookId: string, page: number, totalPages: number): Promise<void> {
    return this.request<void>(`/api/v1/books/${bookId}/progress`, {
      method: 'PUT',
      body: JSON.stringify({
        current_page: page,
        total_pages: totalPages,
      }),
    });
  }

  // Translation & Dictionary API
  async translate(text: string): Promise<TranslationData> {
    return this.request<TranslationData>('/api/v1/translate', {
      method: 'POST',
      body: JSON.stringify({ text: text.trim() }),
    });
  }

  // AI Contextual Explanation (SSE Streaming)
  async explainStream(
    params: {
      text: string;
      context_sentence?: string;
      book_title?: string;
      book_author?: string;
      page_number?: number;
    },
    onChunk: (chunk: string) => void,
    onDone: () => void,
    onError: (err: Error) => void,
  ): Promise<() => void> {
    const controller = new AbortController();
    const token = this.getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    fetch(this.formatUrl('/api/v1/explain'), {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Unable to connect to AI Explain service.');
        }
        if (!res.body) {
          throw new Error('No data stream received from AI.');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data:')) {
              try {
                const parsed = JSON.parse(trimmed.slice(5).trim());
                if (parsed.content) {
                  onChunk(parsed.content);
                }
              } catch {
                // ignore parse error on incomplete chunks
              }
            }
          }
        }
        onDone();
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          onError(err);
        }
      });

    return () => controller.abort();
  }

  // Vocabulary Notebook
  async saveVocabulary(data: {
    book_id: string;
    original_text: string;
    translated_text: string;
    ipa?: string;
    part_of_speech?: string;
    context_sentence?: string;
    audio_url?: string;
  }): Promise<any> {
    return this.request<any>('/api/v1/vocabularies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getVocabularies(bookId?: string): Promise<any[]> {
    const endpoint = bookId ? `/api/v1/vocabularies?book_id=${bookId}` : '/api/v1/vocabularies';
    return this.request<any[]>(endpoint).catch(() => []);
  }

  async deleteVocabulary(id: string): Promise<void> {
    return this.request<void>(`/api/v1/vocabularies/${id}`, {
      method: 'DELETE',
    });
  }

  // Bookmarks
  async getAllBookmarks(): Promise<Bookmark[]> {
    return this.request<Bookmark[]>(`/api/v1/bookmarks`).catch(() => []);
  }

  async getBookmarks(bookId: string): Promise<Bookmark[]> {
    return this.request<Bookmark[]>(`/api/v1/books/${bookId}/bookmarks`).catch(() => []);
  }

  async addBookmark(bookId: string, page: number, title?: string): Promise<Bookmark> {
    return this.request<Bookmark>(`/api/v1/books/${bookId}/bookmarks`, {
      method: 'POST',
      body: JSON.stringify({
        page_number: page,
        title: title || `Trang ${page}`,
      }),
    });
  }

  async removeBookmark(bookId: string, bookmarkId: string): Promise<void> {
    return this.request<void>(`/api/v1/books/${bookId}/bookmarks/${bookmarkId}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();
