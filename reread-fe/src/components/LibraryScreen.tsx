import React, { useState, useEffect } from 'react';
import { Search, BookOpen, Sparkles, RefreshCw, FileText } from 'lucide-react';
import { Book, BookFormat } from '../types';
import { api } from '../lib/api';

interface LibraryScreenProps {
  onSelectBook: (book: Book) => void;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({ onSelectBook }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');

  const fetchBooks = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getBooks();
      setBooks(data || []);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách sách.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const formats: { id: string; label: string }[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'pdf', label: 'PDF' },
    { id: 'epub', label: 'EPUB' },
    { id: 'txt', label: 'TXT' },
    { id: 'md', label: 'Markdown' },
  ];

  const filteredBooks = books.filter((book) => {
    const matchesSearch =
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (book.author && book.author.toLowerCase().includes(searchQuery.toLowerCase()));

    const bookType = (book.file_type || book.format || 'pdf').toLowerCase();
    const matchesFormat =
      selectedFormat === 'all' || bookType === selectedFormat.toLowerCase();

    return matchesSearch && matchesFormat;
  });

  const recentBook = books
    .filter((b) => (b.current_page || 0) > 0)
    .sort((a, b) => new Date(b.last_read_at || 0).getTime() - new Date(a.last_read_at || 0).getTime())[0];

  const getFormatBadgeColor = (format: BookFormat) => {
    switch (format?.toLowerCase()) {
      case 'pdf':
        return 'bg-red-500/15 border-red-500/30 text-red-500';
      case 'epub':
        return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400';
      case 'md':
        return 'bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400';
      default:
        return 'bg-[var(--app-accent)]/15 border-[var(--app-accent)]/30 text-[var(--app-accent)]';
    }
  };

  return (
    <div className="px-5 py-5 select-none space-y-6">
      {/* Top Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--app-muted)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm sách theo tên hoặc tác giả..."
          className="w-full pl-12 pr-4 py-3 rounded-2xl bg-[var(--app-card)] border border-[var(--app-border)] text-[15px] font-medium text-[var(--app-text)] placeholder-[var(--app-muted)] focus:outline-none focus:border-[var(--app-accent)] focus:ring-1 focus:ring-[var(--app-accent)] transition-all shadow-inner"
        />
      </div>

      {/* Format Filter Chips */}
      <div className="flex space-x-2 overflow-x-auto no-scrollbar py-1 -mx-5 px-5">
        {formats.map((fmt) => (
          <button
            key={fmt.id}
            onClick={() => setSelectedFormat(fmt.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
              selectedFormat === fmt.id
                ? 'bg-purple-primary border-purple-primary text-white shadow-md'
                : 'bg-[var(--app-card)] border-[var(--app-border)] text-[var(--app-text)] hover:opacity-80'
            }`}
          >
            {fmt.label}
          </button>
        ))}
      </div>

      {/* Continue Reading Hero (If any book was previously opened) */}
      {recentBook && !searchQuery && selectedFormat === 'all' && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-black text-[var(--app-text)] flex items-center">
              <Sparkles className="h-4 w-4 mr-1.5 text-orange-warm fill-orange-warm" />
              Đang đọc gần đây
            </h3>
          </div>
          <div
            onClick={() => onSelectBook(recentBook)}
            className="p-4 rounded-3xl bg-[var(--app-card)] border border-[var(--app-border)] shadow-md cursor-pointer active:scale-98 transition-all relative overflow-hidden"
          >
            <div className="flex space-x-3.5">
              <div className="w-16 h-22 rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)] flex flex-col items-center justify-center shrink-0 p-1 shadow-xs">
                <BookOpen className="h-7 w-7 text-[var(--app-accent)] mb-1" />
                <span className="text-[9px] font-extrabold uppercase text-[var(--app-accent)]">
                  {recentBook.file_type || recentBook.format || 'Book'}
                </span>
              </div>
              <div className="flex-1 flex flex-col justify-between overflow-hidden">
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border uppercase ${getFormatBadgeColor(recentBook.file_type || recentBook.format || 'pdf')}`}>
                      {recentBook.file_type || recentBook.format || 'pdf'}
                    </span>
                    <span className="text-[10px] text-[var(--app-muted)] font-medium truncate">
                      {recentBook.author || 'Tác giả chưa rõ'}
                    </span>
                  </div>
                  <h4 className="text-[15px] font-black text-[var(--app-text)] mt-1 truncate">
                    {recentBook.title}
                  </h4>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-bold text-[var(--app-text-secondary)] mb-1">
                    <span>Trang {recentBook.current_page || 1} / {recentBook.total_pages || 1}</span>
                    <span className="text-[var(--app-accent)] font-extrabold">
                      {Math.round(((recentBook.current_page || 1) / (recentBook.total_pages || 1)) * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--app-surface)] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-primary to-orange-warm rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          Math.round(((recentBook.current_page || 1) / (recentBook.total_pages || 1)) * 100),
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Book Catalog Grid */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[15px] font-black text-[var(--app-text)]">
            Tất cả sách ({filteredBooks.length})
          </h3>
          <button
            onClick={fetchBooks}
            title="Làm mới"
            className="p-1 rounded-lg text-[var(--app-muted)] hover:text-[var(--app-text)] transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-[var(--app-muted)] space-y-3">
            <div className="h-8 w-8 rounded-full border-2 border-[var(--app-accent)] border-t-transparent animate-spin" />
            <p className="text-xs font-medium">Đang tải tủ sách của bạn...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-center text-red-500 text-xs">
            <p className="font-semibold">{error}</p>
            <button
              onClick={fetchBooks}
              className="mt-3 px-4 py-1.5 rounded-xl bg-red-500/20 text-red-600 dark:text-red-400 font-bold"
            >
              Thử lại
            </button>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="p-8 rounded-3xl bg-[var(--app-card)] border border-[var(--app-border)] text-center text-[var(--app-muted)] flex flex-col items-center">
            <FileText className="h-12 w-12 text-[var(--app-muted)]/40 mb-3" />
            <p className="text-sm font-black text-[var(--app-text)]">Chưa có cuốn sách nào</p>
            <p className="text-xs text-[var(--app-muted)] mt-1 max-w-[240px]">
              Hãy tải thêm sách vào tài khoản của bạn tại ứng dụng Readthrough trên máy tính.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-8">
            {filteredBooks.map((book) => {
              const progress = Math.round(
                ((book.current_page || 0) / (book.total_pages || 1)) * 100
              );

              return (
                <div
                  key={book.id}
                  onClick={() => onSelectBook(book)}
                  className="flex flex-col justify-between p-3 rounded-2xl bg-[var(--app-card)] border border-[var(--app-border)] hover:border-[var(--app-accent)]/40 transition-all cursor-pointer active:scale-95 shadow-sm"
                >
                  <div>
                    {/* Book Cover / Thumbnail */}
                    <div className="h-28 w-full rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)] flex flex-col items-center justify-center p-2 mb-2.5 relative overflow-hidden">
                      <BookOpen className="h-8 w-8 text-[var(--app-accent)] mb-1" />
                      <span className={`absolute top-2 right-2 text-[8px] font-black px-1.5 py-0.5 rounded-md border uppercase ${getFormatBadgeColor(book.file_type || book.format || 'pdf')}`}>
                        {book.file_type || book.format || 'pdf'}
                      </span>
                    </div>

                    <h4 className="text-[13px] font-extrabold text-[var(--app-text)] line-clamp-2 leading-snug">
                      {book.title}
                    </h4>
                    <p className="text-[11px] text-[var(--app-muted)] font-medium mt-0.5 truncate">
                      {book.author || 'Tác giả chưa rõ'}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-[var(--app-border)]">
                    <div className="flex justify-between text-[10px] text-[var(--app-text-secondary)] font-bold mb-1">
                      <span>{book.total_pages ? `${book.total_pages} trang` : 'Đang cập nhật'}</span>
                      {progress > 0 && <span className="text-[var(--app-accent)]">{progress}%</span>}
                    </div>
                    {progress > 0 && (
                      <div className="h-1 w-full rounded-full bg-[var(--app-surface)] overflow-hidden">
                        <div
                          className="h-full bg-purple-primary rounded-full"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
