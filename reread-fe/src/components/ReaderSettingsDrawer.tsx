import React, { useRef, useEffect } from 'react';
import { useReader } from '../context/ReaderContext';
import { ReaderTheme, FontFamily } from '../types';
import { X, Sun, Moon, Sparkles, BookOpen, Zap, Type } from 'lucide-react';

interface ReaderSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: number;
  totalPages: number;
  onPageScrub: (page: number) => void;
}

export const ReaderSettingsDrawer: React.FC<ReaderSettingsDrawerProps> = ({
  isOpen,
  onClose,
  currentPage,
  totalPages,
  onPageScrub,
}) => {
  const {
    settings,
    setTheme,
    setReadingMode,
    setFontFamily,
    increaseFontSize,
    decreaseFontSize,
  } = useReader();

  const mountTimeRef = useRef<number>(Date.now());
  const backdropPointerDownRef = useRef<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      mountTimeRef.current = Date.now();
      backdropPointerDownRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropPointerDown = (e: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      backdropPointerDownRef.current = true;
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (Date.now() - mountTimeRef.current < 400) {
      return;
    }
    if (!backdropPointerDownRef.current) {
      return;
    }
    onClose();
  };

  const themes: { id: ReaderTheme; label: string; bg: string; text: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'plum', label: 'Plum Dark', bg: '#1A0D1C', text: '#FFFFFF', icon: Sparkles },
    { id: 'sepia', label: 'Sepia', bg: '#F7EFE1', text: '#2D2013', icon: Sun },
    { id: 'amoled', label: 'AMOLED', bg: '#000000', text: '#FFFFFF', icon: Moon },
    { id: 'light', label: 'Sáng', bg: '#F8FAFC', text: '#0F172A', icon: Sun },
  ];

  const fontFamilies: { id: FontFamily; label: string }[] = [
    { id: 'serif', label: 'Serif (Sách)' },
    { id: 'sans', label: 'Sans (Hiện đại)' },
    { id: 'mono', label: 'Monospace' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
      {/* Overlay dismissal with synthetic touch release protection */}
      <div
        className="absolute inset-0"
        onPointerDown={handleBackdropPointerDown}
        onMouseDown={handleBackdropPointerDown}
        onTouchStart={handleBackdropPointerDown}
        onClick={handleBackdropClick}
      />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-[var(--app-surface)] text-[var(--app-text)] rounded-t-[28px] border-t border-[var(--app-border)] p-6 pb-[max(env(safe-area-inset-bottom,0px),1.5rem)] z-10 max-h-[80vh] overflow-y-auto no-scrollbar shadow-2xl animate-slide-up select-none"
      >
        {/* Drag handle */}
        <div className="mx-auto w-12 h-1 bg-[var(--app-muted)]/30 rounded-full mb-5" />

        <div className="flex justify-between items-center mb-6">
          <h3 className="text-base font-extrabold text-[var(--app-text)] flex items-center">
            <Type className="h-4.5 w-4.5 mr-2 text-[var(--app-accent)]" />
            Tùy chỉnh đọc sách
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[var(--app-muted)] hover:text-[var(--app-text)] transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 1. Page Scrubber Slider */}
        <div className="mb-6 p-4 rounded-2xl bg-[var(--app-card)] border border-[var(--app-border)]">
          <div className="flex justify-between text-xs font-bold text-[var(--app-text)] mb-2">
            <span>Tua trang nhanh</span>
            <span className="text-[var(--app-accent)] font-extrabold">
              Trang {currentPage} / {totalPages}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={Math.max(totalPages, 1)}
            value={currentPage}
            onChange={(e) => onPageScrub(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-[var(--app-surface)] rounded-lg appearance-none cursor-pointer accent-purple-primary"
          />
        </div>

        {/* 2. Reading Mode Switcher */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-[var(--app-muted)] mb-2 uppercase tracking-wider">
            Chế độ đọc
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setReadingMode('standard')}
              className={`flex items-center justify-center space-x-2 py-3 rounded-2xl font-bold text-xs border transition-all ${
                settings.readingMode === 'standard'
                  ? 'bg-purple-primary border-purple-primary text-white shadow-lg'
                  : 'bg-[var(--app-card)] border-[var(--app-border)] text-[var(--app-text)]'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Xem PDF gốc</span>
            </button>
            <button
              onClick={() => setReadingMode('readthrough')}
              className={`flex items-center justify-center space-x-2 py-3 rounded-2xl font-bold text-xs border transition-all ${
                settings.readingMode === 'readthrough'
                  ? 'bg-purple-primary border-purple-primary text-white shadow-lg'
                  : 'bg-[var(--app-card)] border-[var(--app-border)] text-[var(--app-text)]'
              }`}
            >
              <Zap className="h-4 w-4 fill-current" />
              <span>Readthrough</span>
            </button>
          </div>
        </div>

        {/* 3. Theme Selector */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-[var(--app-muted)] mb-2 uppercase tracking-wider">
            Giao diện màu sắc
          </label>
          <div className="grid grid-cols-4 gap-2">
            {themes.map((t) => {
              const isSelected = settings.theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  style={{ backgroundColor: t.bg, color: t.text }}
                  className={`flex flex-col items-center justify-center py-3 rounded-2xl border transition-all active:scale-95 shadow-sm ${
                    isSelected ? 'border-[var(--app-accent)] ring-2 ring-[var(--app-accent)]/50' : 'border-black/10 dark:border-white/10'
                  }`}
                >
                  <span className="text-[11px] font-bold">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Font Size Controls */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-[var(--app-muted)] mb-2 uppercase tracking-wider">
            Cỡ chữ văn bản
          </label>
          <div className="flex items-center justify-between p-2 rounded-2xl bg-[var(--app-card)] border border-[var(--app-border)]">
            <button
              onClick={decreaseFontSize}
              className="px-4 py-2 rounded-xl bg-[var(--app-surface)] text-[var(--app-text)] text-sm font-bold active:scale-95 transition-all shadow-xs"
            >
              A-
            </button>
            <span className="text-sm font-black text-[var(--app-text)]">
              {settings.fontSize}px
            </span>
            <button
              onClick={increaseFontSize}
              className="px-4 py-2 rounded-xl bg-[var(--app-surface)] text-[var(--app-text)] text-sm font-bold active:scale-95 transition-all shadow-xs"
            >
              A+
            </button>
          </div>
        </div>

        {/* 5. Font Family */}
        <div>
          <label className="block text-xs font-bold text-[var(--app-muted)] mb-2 uppercase tracking-wider">
            Kiểu phông chữ
          </label>
          <div className="grid grid-cols-3 gap-2">
            {fontFamilies.map((f) => (
              <button
                key={f.id}
                onClick={() => setFontFamily(f.id)}
                className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  settings.fontFamily === f.id
                    ? 'bg-purple-primary border-purple-primary text-white shadow-md'
                    : 'bg-[var(--app-card)] border-[var(--app-border)] text-[var(--app-text)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
