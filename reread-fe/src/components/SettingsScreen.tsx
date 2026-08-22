import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useReader } from '../context/ReaderContext';
import { BookOpen, Zap, LogOut } from 'lucide-react';
import { ReaderTheme } from '../types';

export const SettingsScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { settings, setTheme, setReadingMode } = useReader();

  const themes: { id: ReaderTheme; label: string; bg: string; text: string }[] = [
    { id: 'plum', label: 'Plum Dark', bg: '#1A0D1C', text: '#FFFFFF' },
    { id: 'sepia', label: 'Sepia', bg: '#F7EFE1', text: '#2D2013' },
    { id: 'amoled', label: 'AMOLED', bg: '#000000', text: '#FFFFFF' },
    { id: 'light', label: 'Light', bg: '#F8FAFC', text: '#0F172A' },
  ];

  return (
    <div className="px-5 py-5 select-none space-y-6">
      <div>
        <h2 className="text-xl font-black tracking-tight text-[var(--app-text)]">
          Settings
        </h2>
        <p className="text-xs text-[var(--app-muted)] mt-0.5">
          Account preferences and mobile reading setup
        </p>
      </div>

      {/* Account Info Card */}
      {user && (
        <div className="p-4 rounded-3xl bg-[var(--app-card)] border border-[var(--app-border)] shadow-sm">
          <div className="flex items-center space-x-3.5">
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-inner" style={{ background: 'linear-gradient(135deg, var(--app-accent), color-mix(in srgb, var(--app-accent) 60%, var(--app-bg)))' }}>
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center space-x-1.5">
                <h3 className="text-sm font-extrabold text-[var(--app-text)] truncate">
                  {user.username}
                </h3>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold">
                  Synced
                </span>
              </div>
              <p className="text-xs text-[var(--app-muted)] mt-0.5 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Theme Settings */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-[var(--app-muted)] uppercase tracking-wider">
          App Theme
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
                {isSelected && <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--app-accent)' }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Default Reading Mode */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-[var(--app-muted)] uppercase tracking-wider">
          Default Reading Mode
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => setReadingMode('standard')}
            className={`flex items-center justify-center space-x-2 py-3 rounded-2xl font-bold text-xs border transition-all ${
              settings.readingMode === 'standard'
                ? 'btn-accent shadow-md'
                : 'bg-[var(--app-card)] border-[var(--app-border)] text-[var(--app-text)]'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Original PDF</span>
          </button>
          <button
            onClick={() => setReadingMode('readthrough')}
            className={`flex items-center justify-center space-x-2 py-3 rounded-2xl font-bold text-xs border transition-all ${
              settings.readingMode === 'readthrough'
                ? 'btn-accent shadow-md'
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
          System & Storage
        </label>
        <div className="p-3.5 rounded-2xl bg-[var(--app-card)] border border-[var(--app-border)] space-y-2 text-xs">
          <div className="flex justify-between items-center text-[var(--app-muted)]">
            <span>Database</span>
            <span className="text-[var(--app-text)] font-mono font-bold">readful (PostgreSQL)</span>
          </div>
          <div className="flex justify-between items-center text-[var(--app-muted)]">
            <span>Platform</span>
            <span className="text-[var(--app-accent)] font-bold">Reread Mobile Companion</span>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <div className="pt-2 pb-8">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center space-x-2 py-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 font-bold text-sm hover:bg-red-500/20 transition-all active:scale-98"
        >
          <LogOut className="h-4.5 w-4.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
