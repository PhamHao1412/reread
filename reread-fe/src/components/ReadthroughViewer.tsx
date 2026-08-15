import React, { useMemo, useRef, useEffect, useState } from 'react';
import { ReaderSettings } from '../types';
import { convertToReadableText } from '../lib/bionic';
import { getWordAtPoint, sanitizeSingleWord } from '../lib/wordFinder';
import { ImageViewerModal } from './ImageViewerModal';
import { Zap, Sparkles, ChevronRight, Image as ImageIcon, Maximize2 } from 'lucide-react';

interface ReadthroughViewerProps {
  text: string;
  pageImageUrl?: string;
  settings: ReaderSettings;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number, totalPages: number) => void;
  onTranslateWord: (word: string) => void;
  onTap: () => void;
}

export const ReadthroughViewer: React.FC<ReadthroughViewerProps> = ({
  text,
  pageImageUrl,
  settings,
  currentPage,
  totalPages,
  onPageChange,
  onTranslateWord,
  onTap,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showInlineImage, setShowInlineImage] = useState<boolean>(false);
  const [showFullImageModal, setShowFullImageModal] = useState<boolean>(false);

  // Touch tracking for mobile gesture vs tap separation
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchStartTime = useRef<number>(0);
  const isScrollingRef = useRef<boolean>(false);

  // Reset scroll and inline image when page changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    setShowInlineImage(false);
  }, [currentPage]);

  // Detect if current page contains figures or architecture diagrams
  const hasFigureReference = useMemo(() => {
    if (!text) return false;
    return /Figure \d+|Example \d+|Architecture|Diagram|Sơ đồ|Bảng/i.test(text);
  }, [text]);

  const formattedHtml = useMemo(() => {
    if (!text || text.trim() === '') return '';
    return convertToReadableText(text);
  }, [text]);

  const getFontFamilyClass = () => {
    switch (settings.fontFamily) {
      case 'sans':
        return 'font-sans-book';
      case 'mono':
        return 'font-mono-book';
      default:
        return 'font-serif-book';
    }
  };

  // Helper to extract clean single word from element or coordinate
  const extractWord = (target: HTMLElement | null, clientX: number, clientY: number): string | null => {
    const wordEl = target?.closest('.read-word, .bionic-word') as HTMLElement | null;
    if (wordEl) {
      const dataWord = wordEl.getAttribute('data-word');
      if (dataWord) {
        const clean = sanitizeSingleWord(dataWord);
        if (clean) return clean;
      }
      const textVal = wordEl.innerText || wordEl.textContent || '';
      const clean = sanitizeSingleWord(textVal);
      if (clean) return clean;
    }
    return getWordAtPoint(clientX, clientY);
  };

  // 1. Mouse Click Handler (for Desktop / PC / Mac)
  const handleClick = (e: React.MouseEvent) => {
    // Avoid interfering with buttons or modals
    const targetElement = e.target as HTMLElement | null;
    if (targetElement?.closest('button, .cursor-pointer')) return;

    const word = extractWord(targetElement, e.clientX, e.clientY);
    if (word) {
      e.preventDefault();
      e.stopPropagation();
      window.getSelection()?.removeAllRanges();
      onTranslateWord(word);
    }
  };

  // 2. Mobile Touch Event Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchStartTime.current = Date.now();
    isScrollingRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const diffX = Math.abs(touch.clientX - touchStartX.current);
    const diffY = Math.abs(touch.clientY - touchStartY.current);

    // If finger moves more than 8px, it is scrolling/swiping
    if (diffX > 8 || diffY > 8) {
      isScrollingRef.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartX.current;
    const diffY = touch.clientY - touchStartY.current;
    const duration = Date.now() - touchStartTime.current;

    // Case A: User was scrolling / swiping
    if (isScrollingRef.current) {
      // Horizontal swipe to flip pages
      if (Math.abs(diffX) > 48 && Math.abs(diffY) < 70) {
        if (diffX < 0 && currentPage < totalPages) {
          onPageChange(currentPage + 1, totalPages);
        } else if (diffX > 0 && currentPage > 1) {
          onPageChange(currentPage - 1, totalPages);
        }
      }
      // Vertical scroll: do nothing, let native scrolling finish
      return;
    }

    // Case B: Clean stationary Tap (finger did not scroll, duration < 400ms)
    if (duration < 400 && Math.abs(diffX) <= 8 && Math.abs(diffY) <= 8) {
      const targetElement = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;

      // Ignore taps on interactive buttons/icons
      if (targetElement?.closest('button, .cursor-pointer')) return;

      // Check if tap landed on a word
      const word = extractWord(targetElement, touch.clientX, touch.clientY);
      if (word) {
        e.preventDefault();
        e.stopPropagation();
        window.getSelection()?.removeAllRanges();

        // Optional light haptic feedback
        try {
          if ('vibrate' in navigator) navigator.vibrate(30);
        } catch {
          // ignore
        }

        onTranslateWord(word);
        return;
      }

      // Tap landed on empty margins/whitespace
      const screenWidth = window.innerWidth || 360;
      const xRatio = touch.clientX / screenWidth;

      if (xRatio < 0.15 && currentPage > 1) {
        // Left margin tap -> Prev Page
        onPageChange(currentPage - 1, totalPages);
        return;
      }

      if (xRatio > 0.85 && currentPage < totalPages) {
        // Right margin tap -> Next Page
        onPageChange(currentPage + 1, totalPages);
        return;
      }

      // Center whitespace tap -> Toggle menu bars
      onTap();
    }
  };

  // If page contains NO text (e.g. blank verso chapter divider)
  if (!text || text.trim() === '') {
    return (
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full h-full overflow-y-auto no-scrollbar px-6 py-6 select-none flex flex-col items-center justify-center"
      >
        <div className="p-6 rounded-3xl bg-[var(--app-card)] border border-[var(--app-border)] max-w-[320px] text-center space-y-3.5 shadow-md">
          <div className="w-12 h-12 rounded-2xl bg-[var(--app-accent)]/15 border border-[var(--app-accent)]/30 flex items-center justify-center mx-auto text-[var(--app-accent)]">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-sm font-black text-[var(--app-text)]">
              Trang phân cách chương
            </h4>
            <p className="text-xs text-[var(--app-muted)] mt-1 leading-relaxed">
              Trang {currentPage} là trang trắng ngắt chương trong bản in gốc của sách.
            </p>
          </div>
          {currentPage < totalPages && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPageChange(currentPage + 1, totalPages);
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-[var(--app-accent)] text-white text-xs font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center space-x-1.5"
            >
              <span>Đọc chương tiếp (Trang {currentPage + 1})</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="w-full h-full overflow-y-auto no-scrollbar px-6 py-6 select-none cursor-pointer"
      style={{
        fontSize: `${settings.fontSize}px`,
        lineHeight: settings.lineHeight,
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
    >
      {/* Top Header Pill & Visual Diagram Toggle Button */}
      <div className="flex items-center justify-center space-x-2 mb-6">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[var(--app-accent)]/15 border border-[var(--app-accent)]/30 text-[var(--app-accent)] text-[11px] font-extrabold shadow-xs">
          <Zap className="h-3.5 w-3.5 fill-current" />
          <span>Chế độ Readthrough</span>
        </div>

        {/* Smart Figure Detection Quick Button */}
        {pageImageUrl && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowInlineImage(!showInlineImage);
            }}
            className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full border text-[11px] font-extrabold shadow-xs transition-all active:scale-95 ${
              showInlineImage || hasFigureReference
                ? 'bg-orange-warm/20 border-orange-warm/40 text-orange-warm'
                : 'bg-[var(--app-card)] border-[var(--app-border)] text-[var(--app-muted)] hover:text-[var(--app-text)]'
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>{showInlineImage ? 'Ẩn sơ đồ' : hasFigureReference ? '🖼️ Xem sơ đồ Figure' : 'Xem sơ đồ'}</span>
          </button>
        )}
      </div>

      {/* Embedded Diagram Card (If toggled or figure present) */}
      {showInlineImage && pageImageUrl && (
        <div className="my-5 p-3.5 rounded-3xl bg-[var(--app-card)] border border-[var(--app-border)] shadow-xl animate-scale-in">
          <div className="flex justify-between items-center mb-2 px-1">
            <span className="text-xs font-black text-[var(--app-text)] flex items-center">
              <ImageIcon className="h-4 w-4 mr-1.5 text-orange-warm" />
              Sơ đồ & Hình ảnh nguyên bản (Trang {currentPage})
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowFullImageModal(true);
              }}
              className="p-1.5 rounded-xl bg-[var(--app-surface)] text-[var(--app-accent)] hover:opacity-80 transition-all flex items-center space-x-1 text-[10px] font-bold"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>Phóng to</span>
            </button>
          </div>

          <div
            onClick={(e) => {
              e.stopPropagation();
              setShowFullImageModal(true);
            }}
            className="cursor-pointer overflow-hidden rounded-2xl bg-white border border-[var(--app-border)] shadow-inner"
          >
            <img
              src={pageImageUrl}
              alt={`Sơ đồ trang ${currentPage}`}
              className="w-full object-contain max-h-[380px] select-none"
            />
          </div>
        </div>
      )}

      {/* Main Content (Uniform normal font weight, natural left alignment) */}
      <div
        className={`readable-content text-[var(--app-text)] ${getFontFamilyClass()} tracking-normal text-left max-w-full font-normal pb-14 select-none`}
        dangerouslySetInnerHTML={{ __html: formattedHtml }}
      />

      {/* Fullscreen Zoomable Image Modal */}
      {pageImageUrl && (
        <ImageViewerModal
          isOpen={showFullImageModal}
          onClose={() => setShowFullImageModal(false)}
          imageUrl={pageImageUrl}
          pageNumber={currentPage}
        />
      )}
    </div>
  );
};
