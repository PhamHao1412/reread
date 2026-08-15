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
    <div className="px-5 py-5 select-none space-y-5">
      <div>
        <h2 className="text-xl font-black tracking-tight text-[var(--app-text)]">
          Đánh dấu trang ({bookmarks.length})
        </h2>
        <p className="text-xs text-[var(--app-muted)] mt-0.5">
          Các trang sách bạn đã lưu để xem lại nhanh
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--app-muted)] space-y-3">
          <div className="h-8 w-8 rounded-full border-2 border-[var(--app-accent)] border-t-transparent animate-spin" />
          <p className="text-xs">Đang tải danh sách trang đã lưu...</p>
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="p-8 rounded-3xl bg-[var(--app-card)] border border-[var(--app-border)] text-center text-[var(--app-muted)] flex flex-col items-center">
          <BookmarkIcon className="h-12 w-12 text-[var(--app-muted)]/40 mb-3" />
          <p className="text-sm font-bold text-[var(--app-text)]">Chưa có trang nào được đánh dấu</p>
          <p className="text-xs text-[var(--app-muted)] mt-1 max-w-[240px]">
            Khi đang đọc sách, chạm vào biểu tượng Bookmark ở góc trên để lưu lại trang quan trọng.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 pb-8">
          {bookmarks.map((bm) => (
            <div
              key={bm.id}
              onClick={() => bm.book && onOpenBookAtPage(bm.book, bm.page_number)}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--app-card)] border border-[var(--app-border)] hover:border-[var(--app-accent)]/40 transition-all cursor-pointer active:scale-98 shadow-sm"
            >
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="p-2.5 rounded-xl bg-[var(--app-accent)]/15 border border-[var(--app-accent)]/25 text-[var(--app-accent)] shrink-0">
                  <BookmarkIcon className="h-5 w-5 fill-current" />
                </div>
                <div className="overflow-hidden">
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-black px-1.5 py-0.5 rounded bg-orange-warm/15 border border-orange-warm/30 text-orange-warm">
                      Trang {bm.page_number}
                    </span>
                    <span className="text-xs font-black text-[var(--app-text)] truncate">
                      {bm.book?.title || 'Sách'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--app-muted)] font-medium mt-0.5 truncate">
                    {bm.title || `Trang ${bm.page_number}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1 shrink-0 ml-2">
                <button
                  onClick={(e) => bm.book && handleDelete(bm.book.id, bm.id, e)}
                  title="Xóa đánh dấu"
                  className="p-2 rounded-xl text-[var(--app-muted)] hover:text-red-500 transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
