import { Book, User, Bookmark, TranslationData } from '../types';

class ApiClient {
  private accessKey = 'readthrough_access_token';
  private refreshKey = 'readthrough_refresh_token';
  private baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

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
      throw new Error('Phiên đăng nhập đã hết hạn');
    }

    const data = await res.json();
    if (!res.ok || (data.succeeded !== undefined && !data.succeeded)) {
      throw new Error(data.message || data.error || `Yêu cầu thất bại (${res.status})`);
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
      throw new Error(json.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
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

  async getBookFileBlobUrl(book: Book): Promise<string> {
    let fileRes = await this.fetchWithAuth(`/api/v1/books/${book.id}/content`);
    
    if (!fileRes.ok) {
      try {
        const urlRes = await this.request<{ url: string; is_presigned: boolean }>(`/api/v1/books/${book.id}/download-url`);
        if (urlRes?.url) {
          const directRes = await fetch(urlRes.url);
          if (directRes.ok) {
            fileRes = directRes;
          }
        }
      } catch {
        // ignore
      }
    }

    if (!fileRes || !fileRes.ok) {
      throw new Error('Không thể tải tệp tin nội dung sách.');
    }

    const mimeType = book.file_type === 'pdf' ? 'application/pdf' : 'application/octet-stream';
    const blob = await fileRes.blob();
    return URL.createObjectURL(new Blob([blob], { type: mimeType }));
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

  // Bookmarks
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
