import React, { useState, useRef, useEffect, useMemo } from 'react';
import { TocItem } from '../lib/pdfToc';
import { isChapterOrMajorContainer } from '../lib/sectionExtractor';
import { X, List, ChevronRight, BookOpen, Sparkles, ArrowLeft, Search, Compass } from 'lucide-react';

interface TableOfContentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: TocItem[];
  currentPage: number;
  totalPages: number;
  onSelectPage: (page: number) => void;
  onSummarizeItem?: (item: TocItem) => void;
}

export const TableOfContentsDrawer: React.FC<TableOfContentsDrawerProps> = ({
  isOpen,
  onClose,
  items,
  currentPage,
  totalPages,
  onSelectPage,
  onSummarizeItem,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const activeItemRef = useRef<HTMLDivElement | null>(null);

  // If no PDF outline exists, generate fallback sections
  const displayItems: TocItem[] = useMemo(() => {
    return items.length > 0 ? items : Array.from({ length: Math.ceil(totalPages / 20) }, (_, i) => ({
      id: `chunk-${i}`,
      title: `Section ${i + 1}: Page ${i * 20 + 1} - ${Math.min((i + 1) * 20, totalPages)}`,
      pageNumber: i * 20 + 1,
      level: 0,
    }));
  }, [items, totalPages]);

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return displayItems;
    const q = searchQuery.toLowerCase().trim();
    return displayItems.filter(item => item.title.toLowerCase().includes(q));
  }, [displayItems, searchQuery]);

  // Auto-scroll to active item when opened
  useEffect(() => {
    if (isOpen && activeItemRef.current) {
      const timer = setTimeout(() => {
        activeItemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 w-full h-full bg-[var(--app-bg)] text-[var(--app-text)] flex flex-col select-none overflow-hidden animate-fadeIn">
      {/* 1. Full-Screen Top Header with Safe Area Top offset */}
      <div className="w-full bg-[var(--app-surface)]/95 backdrop-blur-xl border-b border-[var(--app-border)] px-4 pt-[calc(env(safe-area-inset-top,0px)+0.625rem)] pb-2.5 flex items-center justify-between shrink-0 shadow-sm z-20">
        <div className="flex items-center space-x-3 overflow-hidden flex-1 min-w-0 pr-2">
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[var(--app-card)] text-[var(--app-text)] hover:opacity-80 active:scale-95 transition-all shrink-0 border border-[var(--app-border)]"
            title="Back to reading"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="overflow-hidden flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[var(--app-accent)]/20 text-[var(--app-accent)] border border-[var(--app-accent)]/30">
                <List className="w-2.5 h-2.5" />
                <span>{displayItems.length} items</span>
              </span>

              {currentPage > 0 && (
                <span className="text-[10px] font-mono font-bold text-[var(--app-muted)] bg-[var(--app-card)] px-1.5 py-0.2 rounded-md border border-[var(--app-border)]">
                  Current: p. {currentPage}
                </span>
              )}
            </div>

            <h2 className="text-sm font-extrabold text-[var(--app-text)] truncate leading-snug">
              Table of Contents
            </h2>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-[var(--app-card)] border border-[var(--app-border)] text-[var(--app-muted)] hover:text-[var(--app-text)] active:scale-95 transition-all shrink-0"
          title="Close Table of Contents"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 2. Quick Search Filter Bar */}
      <div className="px-4 py-2 bg-[var(--app-surface)]/80 border-b border-[var(--app-border)] shrink-0 flex items-center gap-2 z-10">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--app-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chapters or sections..."
            className="w-full bg-[var(--app-card)] border border-[var(--app-border)] rounded-xl pl-9 pr-8 py-2 text-xs text-[var(--app-text)] placeholder-[var(--app-muted)] focus:outline-none focus:border-[var(--app-accent)] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--app-muted)] hover:text-[var(--app-text)] p-0.5 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {searchQuery && (
          <span className="text-[11px] font-bold text-[var(--app-muted)] shrink-0">
            {filteredItems.length} found
          </span>
        )}
      </div>

      {/* 3. Full-Height Scrollable Chapters List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 pb-[max(env(safe-area-inset-bottom,0px),1.5rem)]">
        {filteredItems.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-6 space-y-2">
            <Compass className="w-8 h-8 text-[var(--app-muted)]" />
            <p className="text-xs font-bold text-[var(--app-muted)]">No sections match "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-[var(--app-accent)] font-bold underline"
            >
              Clear search
            </button>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isCurrent = currentPage >= item.pageNumber && (
              displayItems.find((next, idx) => idx > displayItems.indexOf(item) && next.pageNumber > item.pageNumber)
                ? currentPage < (displayItems.find((next, idx) => idx > displayItems.indexOf(item) && next.pageNumber > item.pageNumber)?.pageNumber || Infinity)
                : true
            );

            const isChapter = isChapterOrMajorContainer(item, displayItems);

            return (
              <div
                key={item.id}
                ref={isCurrent ? activeItemRef : undefined}
                onClick={() => {
                  onSelectPage(item.pageNumber);
                  onClose();
                }}
                style={{ paddingLeft: `${Math.min(item.level * 16 + 14, 60)}px` }}
                className={`flex items-center justify-between py-3 pr-3 rounded-2xl cursor-pointer active:scale-98 transition-all border ${
                  isCurrent
                    ? 'bg-[var(--app-accent)]/15 border-[var(--app-accent)]/40 text-[var(--app-accent)] font-bold shadow-xs'
                    : isChapter
                    ? 'bg-[var(--app-card)] border-[var(--app-border)] text-[var(--app-text)] font-bold hover:border-[var(--app-accent)]/30'
                    : 'bg-[var(--app-card)]/70 border-transparent hover:border-[var(--app-border)] text-[var(--app-text)]'
                }`}
              >
                <div className="flex items-center space-x-2.5 overflow-hidden pr-2 flex-1 min-w-0">
                  <BookOpen className={`h-4 w-4 shrink-0 ${
                    isCurrent 
                      ? 'text-[var(--app-accent)]' 
                      : isChapter 
                      ? 'text-purple-400' 
                      : 'text-[var(--app-muted)]'
                  }`} />
                  <span className={`text-xs truncate leading-tight ${isChapter ? 'font-bold' : 'font-medium'}`}>
                    {item.title}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  {onSummarizeItem && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSummarizeItem(item);
                        onClose();
                      }}
                      className={`p-1.5 rounded-lg active:scale-90 transition-all ${
                        isChapter
                          ? 'text-purple-400 bg-purple-500/15 border border-purple-500/30 hover:bg-purple-500/25 shadow-xs'
                          : 'text-[var(--app-accent)] bg-[var(--app-accent)]/15 border border-[var(--app-accent)]/30 hover:bg-[var(--app-accent)]/25 shadow-xs'
                      }`}
                      title={isChapter ? 'Analyze Chapter Roadmap & Overview' : 'Deep Dive this section'}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                    isCurrent 
                      ? 'bg-[var(--app-accent)] text-white' 
                      : 'bg-[var(--app-surface)] text-[var(--app-muted)] border border-[var(--app-border)]'
                  }`}>
                    p. {item.pageNumber}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-[var(--app-muted)] opacity-60" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

