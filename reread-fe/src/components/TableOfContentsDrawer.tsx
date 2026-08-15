import React from 'react';
import { TocItem } from '../lib/pdfToc';
import { X, List, ChevronRight, BookOpen } from 'lucide-react';

interface TableOfContentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: TocItem[];
  currentPage: number;
  totalPages: number;
  onSelectPage: (page: number) => void;
}

export const TableOfContentsDrawer: React.FC<TableOfContentsDrawerProps> = ({
  isOpen,
  onClose,
  items,
  currentPage,
  totalPages,
  onSelectPage,
}) => {
  if (!isOpen) return null;

  // If no PDF outline exists, generate fallback sections
  const displayItems: TocItem[] = items.length > 0 ? items : Array.from({ length: Math.ceil(totalPages / 20) }, (_, i) => ({
    id: `chunk-${i}`,
    title: `Phần ${i + 1}: Trang ${i * 20 + 1} - ${Math.min((i + 1) * 20, totalPages)}`,
    pageNumber: i * 20 + 1,
    level: 0,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-[420px] bg-[var(--app-surface)] text-[var(--app-text)] rounded-t-[28px] border-t border-[var(--app-border)] p-6 z-10 max-h-[80vh] flex flex-col shadow-2xl animate-slide-up select-none">
        {/* Drag handle */}
        <div className="mx-auto w-12 h-1 bg-[var(--app-muted)]/30 rounded-full mb-4 shrink-0" />

        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-[var(--app-border)] shrink-0">
          <h3 className="text-base font-black text-[var(--app-text)] flex items-center">
            <List className="h-4.5 w-4.5 mr-2 text-[var(--app-accent)]" />
            Mục lục sách ({displayItems.length} mục)
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[var(--app-muted)] hover:text-[var(--app-text)] transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Chapters list */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-3 space-y-1.5">
          {displayItems.map((item) => {
            const isCurrent = currentPage >= item.pageNumber && (
              // If next item exists, check if current page is before next item
              displayItems.find((next, idx) => idx > displayItems.indexOf(item) && next.pageNumber > item.pageNumber)
                ? currentPage < (displayItems.find((next, idx) => idx > displayItems.indexOf(item) && next.pageNumber > item.pageNumber)?.pageNumber || Infinity)
                : true
            );

            return (
              <div
                key={item.id}
                onClick={() => {
                  onSelectPage(item.pageNumber);
                  onClose();
                }}
                style={{ paddingLeft: `${Math.min(item.level * 16 + 12, 48)}px` }}
                className={`flex items-center justify-between py-3 pr-3 rounded-2xl cursor-pointer active:scale-98 transition-all border ${
                  isCurrent
                    ? 'bg-[var(--app-accent)]/15 border-[var(--app-accent)]/30 text-[var(--app-accent)] font-bold'
                    : 'bg-[var(--app-card)] border-transparent hover:border-[var(--app-border)] text-[var(--app-text)]'
                }`}
              >
                <div className="flex items-center space-x-2.5 overflow-hidden pr-2">
                  <BookOpen className={`h-4 w-4 shrink-0 ${isCurrent ? 'text-[var(--app-accent)]' : 'text-[var(--app-muted)]'}`} />
                  <span className="text-xs font-semibold truncate leading-tight">
                    {item.title}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                    isCurrent ? 'bg-[var(--app-accent)] text-white' : 'bg-[var(--app-surface)] text-[var(--app-muted)]'
                  }`}>
                    Tr. {item.pageNumber}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-[var(--app-muted)] opacity-60" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
