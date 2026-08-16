/**
 * bookCache.ts — IndexedDB-based PDF blob cache for instant book loading.
 *
 * Strategy:
 *  - Store full PDF blob in IndexedDB keyed by bookId
 *  - Include an `etag` (book's updated_at or Content-Length+Last-Modified)
 *    so stale entries are auto-invalidated when the book changes on the server
 *  - Auto-evict oldest entries when total size exceeds MAX_CACHE_BYTES
 *  - TTL: 7 days — entries older than that are considered stale
 */

const DB_NAME = 'reread_book_cache';
const DB_VERSION = 1;
const STORE_NAME = 'blobs';
const MAX_CACHE_BYTES = 200 * 1024 * 1024; // 200 MB
const TTL_MS = 7 * 24 * 60 * 60 * 1000;   // 7 days

interface CacheEntry {
  bookId: string;
  blob: Blob;
  etag: string;       // book's updated_at or derived header hash
  savedAt: number;    // Date.now()
  sizeBytes: number;
}

// ── IndexedDB helpers ─────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'bookId' });
        store.createIndex('savedAt', 'savedAt');
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function tx(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest | void,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE_NAME, mode);
    const store = t.objectStore(STORE_NAME);
    const req = fn(store);
    if (req) {
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    } else {
      t.oncomplete = () => resolve(undefined);
      t.onerror    = () => reject(t.error);
    }
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the cached Blob for a book if it exists, is fresh, and etag matches.
 * Returns null on any cache miss.
 */
export async function getCachedBlob(
  bookId: string,
  etag: string,
): Promise<Blob | null> {
  try {
    const db = await openDB();
    const entry: CacheEntry | undefined = await tx(db, 'readonly', (s) =>
      s.get(bookId),
    );
    db.close();

    if (!entry) return null;

    const expired = Date.now() - entry.savedAt > TTL_MS;
    const stale   = entry.etag !== etag;
    if (expired || stale) return null;

    return entry.blob;
  } catch {
    return null;
  }
}

/**
 * Stores a Blob in IndexedDB under bookId.
 * Runs eviction in the background so it never blocks the caller.
 */
export async function setCachedBlob(
  bookId: string,
  blob: Blob,
  etag: string,
): Promise<void> {
  try {
    const db = await openDB();
    const entry: CacheEntry = {
      bookId,
      blob,
      etag,
      savedAt: Date.now(),
      sizeBytes: blob.size,
    };
    await tx(db, 'readwrite', (s) => s.put(entry));
    db.close();

    // Run eviction async — don't block the caller
    evictOldEntries().catch(() => {});
  } catch {
    // Cache write failure is non-fatal
  }
}

/**
 * Checks if a fresh, matching entry exists without retrieving the blob.
 */
export async function hasCachedBlob(
  bookId: string,
  etag: string,
): Promise<boolean> {
  try {
    const db = await openDB();
    const entry: CacheEntry | undefined = await tx(db, 'readonly', (s) =>
      s.get(bookId),
    );
    db.close();

    if (!entry) return false;
    const expired = Date.now() - entry.savedAt > TTL_MS;
    return !expired && entry.etag === etag;
  } catch {
    return false;
  }
}

/**
 * Removes a single entry (e.g. when the user explicitly clears a book).
 */
export async function evictBook(bookId: string): Promise<void> {
  try {
    const db = await openDB();
    await tx(db, 'readwrite', (s) => s.delete(bookId));
    db.close();
  } catch {
    // ignore
  }
}

/**
 * Evicts oldest entries when total cached size exceeds MAX_CACHE_BYTES,
 * and removes any entry older than TTL.
 * Called automatically after every setCachedBlob.
 */
async function evictOldEntries(): Promise<void> {
  try {
    const db = await openDB();

    // Collect all entries sorted by savedAt ascending (oldest first)
    const entries: CacheEntry[] = await new Promise((resolve, reject) => {
      const t = db.transaction(STORE_NAME, 'readonly');
      const store = t.objectStore(STORE_NAME);
      const index = store.index('savedAt');
      const req = index.getAll();
      req.onsuccess = () => resolve(req.result as CacheEntry[]);
      req.onerror   = () => reject(req.error);
    });

    const now = Date.now();
    let totalBytes = entries.reduce((s, e) => s + e.sizeBytes, 0);

    const toDelete: string[] = [];

    for (const entry of entries) {
      const expired = now - entry.savedAt > TTL_MS;
      const overLimit = totalBytes > MAX_CACHE_BYTES;

      if (expired || overLimit) {
        toDelete.push(entry.bookId);
        totalBytes -= entry.sizeBytes;
      }
    }

    if (toDelete.length > 0) {
      const t = db.transaction(STORE_NAME, 'readwrite');
      const store = t.objectStore(STORE_NAME);
      toDelete.forEach((id) => store.delete(id));
      await new Promise<void>((res, rej) => {
        t.oncomplete = () => res();
        t.onerror    = () => rej(t.error);
      });
    }

    db.close();
  } catch {
    // ignore
  }
}

/**
 * Derives a stable etag string from a Book object.
 * Uses updated_at if available, falls back to book id (always re-validates).
 */
export function bookEtag(book: { id: string; updated_at?: string }): string {
  return book.updated_at ? `${book.id}:${book.updated_at}` : book.id;
}
