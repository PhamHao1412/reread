import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useReader } from '../context/ReaderContext';
import { ReaderTheme } from '../types';
import { BookOpen, Zap, ShieldCheck } from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const { user } = useAuth();
  const { settings, setTheme, setReadingMode } = useReader();

  const themes: { id: ReaderTheme; label: string; bg: string; text: string }[] = [
    { id: 'sepia', label: 'Sepia (Trang sách)', bg: '#F7EFE1', text: '#2D2013' },
    { id: 'light', label: 'Sáng', bg: '#F8FAFC', text: '#0F172A' },
    { id: 'plum', label: 'Plum Dark', bg: '#1A0D1C', text: '#FFFFFF' },
    { id: 'amoled', label: 'AMOLED Đen', bg: '#000000', text: '#FFFFFF' },
  ];

  return (
    <div className="px-5 py-5 select-none space-y-6">
      <div>
        <h2 className="text-xl font-black tracking-tight text-[var(--app-text)]">
          Cài đặt
        </h2>
        <p className="text-xs text-[var(--app-muted)] mt-0.5">
          Tùy chỉnh tài khoản và cấu hình đọc sách di động
        </p>
      </div>

      {/* Account Info Card */}
      {user && (
        <div className="p-4 rounded-3xl bg-[var(--app-card)] border border-[var(--app-border)] shadow-sm">
          <div className="flex items-center space-x-3.5">
            <div className="h-12 w-12 rounded-2xl bg-[var(--app-accent)] flex items-center justify-center text-white font-black text-lg shadow-sm">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center space-x-1.5">
                <h3 className="text-sm font-extrabold text-[var(--app-text)] truncate">
                  {user.username}
                </h3>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 font-bold">
                  Đã đồng bộ
                </span>
              </div>
              <p className="text-xs text-[var(--app-muted)] mt-0.5 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Theme Selection */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-[var(--app-muted)] uppercase tracking-wider">
          Giao diện màu chủ đạo
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          {themes.map((t) => {
            const isSelected = settings.theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                style={{ backgroundColor: t.bg, color: t.text }}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all active:scale-95 shadow-sm ${
                  isSelected ? 'border-[var(--app-accent)] ring-2 ring-[var(--app-accent)]/50' : 'border-[var(--app-border)]'
                }`}
              >
                <span className="text-xs font-bold">{t.label}</span>
                {isSelected && <div className="h-2 w-2 rounded-full bg-[var(--app-accent)]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Default Reading Mode */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-[var(--app-muted)] uppercase tracking-wider">
          Chế độ đọc mặc định
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => setReadingMode('standard')}
            className={`flex items-center justify-center space-x-2 py-3 rounded-2xl font-bold text-xs border transition-all ${
              settings.readingMode === 'standard'
                ? 'bg-[var(--app-accent)] border-[var(--app-accent)] text-white shadow-md'
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
                ? 'bg-[var(--app-accent)] border-[var(--app-accent)] text-white shadow-md'
                : 'bg-[var(--app-card)] border-[var(--app-border)] text-[var(--app-text)]'
            }`}
          >
            <Zap className="h-4 w-4 fill-current" />
            <span>Readthrough</span>
          </button>
        </div>
      </div>

      {/* System & Database Connection */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-[var(--app-muted)] uppercase tracking-wider">
          Hệ thống & Cơ sở dữ liệu
        </label>
        <div className="p-4 rounded-2xl bg-[var(--app-card)] border border-[var(--app-border)] space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-[var(--app-muted)]">Phiên bản</span>
            <span className="font-bold text-[var(--app-text)]">ReRead v1.0.0 (Mobile)</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[var(--app-muted)]">Kết nối</span>
            <span className="font-bold text-emerald-600 flex items-center space-x-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Đồng bộ Render Backend</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
