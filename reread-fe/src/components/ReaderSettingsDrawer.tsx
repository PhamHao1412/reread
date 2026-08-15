import React from 'react';
import { useReader } from '../context/ReaderContext';
import { ReaderTheme, FontFamily } from '../types';
import { 
  X, Sun, Moon, Sparkles, Type, Minus, Plus, 
  BookOpen, Zap, AlignJustify 
} from 'lucide-react';

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

  if (!isOpen) return null;

  const themes: { id: ReaderTheme; label: string; bg: string; text: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'sepia', label: 'Sepia', bg: '#F7EFE1', text: '#2D2013', icon: Sun },
    { id: 'light', label: 'Sáng', bg: '#F8FAFC', text: '#0F172A', icon: Sun },
    { id: 'plum', label: 'Plum Dark', bg: '#1A0D1C', text: '#FFFFFF', icon: Sparkles },
    { id: 'amoled', label: 'AMOLED', bg: '#000000', text: '#FFFFFF', icon: Moon },
  ];

  const fontFamilies: { id: FontFamily; label: string }[] = [
    { id: 'serif', label: 'Serif (Sách)' },
    { id: 'sans', label: 'Sans (Hiện đại)' },
    { id: 'mono', label: 'Monospace' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
      {/* Overlay dismissal */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-[420px] bg-[var(--app-surface)] text-[var(--app-text)] rounded-t-[28px] border-t border-[var(--app-border)] p-6 z-10 max-h-[80vh] overflow-y-auto no-scrollbar shadow-2xl animate-slide-up select-none">
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
            className="w-full h-2 bg-[var(--app-surface)] rounded-lg appearance-none cursor-pointer accent-[var(--app-accent)]"
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
                  ? 'bg-[var(--app-accent)] border-[var(--app-accent)] text-white shadow-lg'
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
                  ? 'bg-[var(--app-accent)] border-[var(--app-accent)] text-white shadow-lg'
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
            Chủ đề màu nền
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {themes.map((t) => {
              const isSelected = settings.theme === t.id;
              const IconComp = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  style={{ backgroundColor: t.bg, color: t.text }}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all active:scale-95 shadow-sm ${
                    isSelected ? 'border-[var(--app-accent)] ring-2 ring-[var(--app-accent)]/50' : 'border-[var(--app-border)]'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <IconComp className="h-4 w-4" />
                    <span className="text-xs font-bold">{t.label}</span>
                  </div>
                  {isSelected && <div className="h-2 w-2 rounded-full bg-[var(--app-accent)]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Font Size Controls */}
        <div className="mb-6 p-4 rounded-2xl bg-[var(--app-card)] border border-[var(--app-border)] flex items-center justify-between">
          <div>
            <span className="block text-xs font-bold text-[var(--app-text)]">Cỡ chữ</span>
            <span className="text-[11px] text-[var(--app-muted)]">{settings.fontSize}px</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={decreaseFontSize}
              disabled={settings.fontSize <= 12}
              className="p-2 rounded-xl bg-[var(--app-surface)] text-[var(--app-text)] disabled:opacity-30 active:scale-90 transition-all border border-[var(--app-border)]"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center text-sm font-black text-[var(--app-text)]">
              {settings.fontSize}
            </span>
            <button
              onClick={increaseFontSize}
              disabled={settings.fontSize >= 28}
              className="p-2 rounded-xl bg-[var(--app-surface)] text-[var(--app-text)] disabled:opacity-30 active:scale-90 transition-all border border-[var(--app-border)]"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 5. Font Family Selection */}
        <div className="mb-2">
          <label className="block text-xs font-bold text-[var(--app-muted)] mb-2 uppercase tracking-wider flex items-center">
            <AlignJustify className="h-3.5 w-3.5 mr-1.5" />
            Kiểu phông chữ
          </label>
          <div className="grid grid-cols-3 gap-2">
            {fontFamilies.map((f) => {
              const isSelected = settings.fontFamily === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFontFamily(f.id)}
                  className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition-all ${
                    isSelected
                      ? 'bg-[var(--app-accent)] border-[var(--app-accent)] text-white shadow-md'
                      : 'bg-[var(--app-card)] border-[var(--app-border)] text-[var(--app-text)] hover:opacity-80'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
