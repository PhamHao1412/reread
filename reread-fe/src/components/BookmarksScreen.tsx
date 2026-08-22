import React, { useState, useEffect } from 'react';
import { Bookmark as BookmarkIcon, Trash2 } from 'lucide-react';
import { Bookmark, Book } from '../types';
import { api } from '../lib/api';

interface BookmarksScreenProps {
  onOpenBookAtPage: (book: Book, page: number) => void;
}

export const BookmarksScreen: React.FC<BookmarksScreenProps> = ({ onOpenBookAtPage }) => {
  const [bookmarks, setBookmarks] = useState<(Bookmark & { book?: Book })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllBookmarks = async () => {
    setLoading(true);
    try {
      const books = await api.getBooks();
      const bookMap = new Map<string, Book>();
      books.forEach((b) => bookMap.set(b.id, b));

      const allBms = await api.getAllBookmarks().catch(() => []);
      if (allBms && allBms.length > 0) {
        const enriched = allBms.map((bm) => ({
          ...bm,
          book: bookMap.get(bm.book_id),
        }));
        setBookmarks(enriched);
      } else {
        // Fallback per-book fetch
        const allBookmarksList: (Bookmark & { book?: Book })[] = [];
        for (const book of books) {
          try {
            const bms = await api.getBookmarks(book.id);
            bms.forEach((bm) => {
              allBookmarksList.push({ ...bm, book });
            });
          } catch {
            // ignore individual book failures
          }
        }
        setBookmarks(allBookmarksList);
      }
    } catch {
      setBookmarks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllBookmarks();
  }, []);

  const handleDelete = async (bookId: string, bookmarkId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.removeBookmark(bookId, bookmarkId);
      setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
    } catch {
      // ignore
    }
  };

  return (
    <div className="px-5 py-6 select-none space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-[var(--app-text)]">
          Bookmarks ({bookmarks.length})
        </h2>
        <p className="text-sm text-[var(--app-muted)] mt-1">
          Pages you saved for quick reference
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--app-muted)] space-y-3">
          <div className="h-9 w-9 rounded-full border-2 border-[var(--app-accent)] border-t-transparent animate-spin" />
          <p className="text-sm">Loading your bookmarks...</p>
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="p-8 rounded-3xl bg-[var(--app-card)] border border-[var(--app-border)] text-center text-[var(--app-muted)] flex flex-col items-center">
          <BookmarkIcon className="h-14 w-14 text-[var(--app-muted)]/40 mb-3" />
          <p className="text-base font-bold text-[var(--app-text)]">No bookmarks yet</p>
          <p className="text-sm text-[var(--app-muted)] mt-1.5 max-w-[280px]">
            While reading, tap the Bookmark icon in the top toolbar to save important pages.
          </p>
        </div>
      ) : (
        <div className="space-y-3 pb-8">
          {bookmarks.map((bm) => (
            <div
              key={bm.id}
              onClick={() => bm.book && onOpenBookAtPage(bm.book, Number(bm.page_number))}
              className="flex items-center justify-between p-4 rounded-2xl bg-[var(--app-card)] border border-[var(--app-border)] hover:border-[var(--app-accent)]/50 transition-all cursor-pointer active:scale-98 shadow-sm"
            >
              <div className="flex items-center space-x-3.5 overflow-hidden">
                <div className="p-3 rounded-xl bg-[var(--app-accent)]/15 border border-[var(--app-accent)]/30 text-[var(--app-accent)] shrink-0">
                  <BookmarkIcon className="h-5 w-5 fill-current" />
                </div>
                <div className="overflow-hidden">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-[13px] font-black px-2.5 py-0.5 rounded-lg bg-[var(--app-accent)]/15 border border-[var(--app-accent)]/30 text-[var(--app-accent)] shrink-0">
                      Page {bm.page_number}
                    </span>
                    <span className="text-[15px] font-black text-[var(--app-text)] truncate">
                      {bm.book?.title || 'Book'}
                    </span>
                  </div>
                  <p className="text-[13px] text-[var(--app-muted)] font-medium mt-1 truncate">
                    {bm.title || `Page ${bm.page_number}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1 shrink-0 ml-3">
                <button
                  onClick={(e) => bm.book && handleDelete(bm.book.id, bm.id, e)}
                  title="Delete bookmark"
                  className="p-2.5 rounded-xl text-[var(--app-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-95"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
