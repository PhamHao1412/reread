import React from 'react';
import { BookOpen, Bookmark as BookmarkIcon, Settings, Compass, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type TabType = 'library' | 'reading' | 'bookmarks' | 'settings';

interface MobileAppShellProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  children: React.ReactNode;
  showHeader?: boolean;
  showNav?: boolean;
}

export const MobileAppShell: React.FC<MobileAppShellProps> = ({
  currentTab,
  onTabChange,
  children,
  showHeader = true,
  showNav = true,
}) => {
  const { user, logout } = useAuth();

  const navItems: { id: TabType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'library', label: 'Tủ sách', icon: BookOpen },
    { id: 'reading', label: 'Đang đọc', icon: Compass },
    { id: 'bookmarks', label: 'Đánh dấu', icon: BookmarkIcon },
    { id: 'settings', label: 'Cài đặt', icon: Settings },
  ];

  return (
    <div className="h-[100dvh] w-full max-w-[420px] bg-[var(--app-bg)] text-[var(--app-text)] flex flex-col relative overflow-hidden shadow-2xl border-x border-[var(--app-border)] select-none">
      {/* Top Header Bar */}
      {showHeader && (
        <header className="flex items-center justify-between px-5 py-3.5 bg-[var(--app-surface)]/90 backdrop-blur-md border-b border-[var(--app-border)] z-20 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-black tracking-tight text-[var(--app-accent)]">
              ReRead
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--app-accent)]/15 border border-[var(--app-accent)]/30 text-[var(--app-accent)] font-black uppercase tracking-wider">
              Mobile
            </span>
          </div>

          {user && (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-[var(--app-text)] truncate max-w-[120px]">
                {user.username}
              </span>
              <button
                onClick={logout}
                title="Đăng xuất"
                className="p-1.5 rounded-xl bg-[var(--app-card)] text-[var(--app-muted)] hover:text-[var(--app-text)] transition-all border border-[var(--app-border)]"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </header>
      )}

      {/* Main Viewport Content */}
      <main className={`flex-1 overflow-y-auto no-scrollbar relative ${showNav ? 'pb-20' : ''}`}>
        {children}
      </main>

      {/* Fixed Bottom Navigation Bar */}
      {showNav && (
        <nav className="absolute bottom-0 left-0 right-0 z-30 bg-[var(--app-surface)]/95 backdrop-blur-xl border-t border-[var(--app-border)] px-4 py-2 shadow-lg">
          <div className="flex justify-between items-center max-w-md mx-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className="flex flex-col items-center justify-center flex-1 py-1 text-center transition-all duration-150 relative active:scale-95"
                >
                  <div
                    className={`p-1 rounded-xl transition-all ${
                      isActive
                        ? 'text-[var(--app-accent)] scale-110'
                        : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
                    }`}
                  >
                    <Icon className="h-5.5 w-5.5" />
                  </div>
                  <span
                    className={`text-[11px] font-bold transition-all mt-0.5 ${
                      isActive ? 'text-[var(--app-accent)]' : 'text-[var(--app-muted)]'
                    }`}
                  >
                    {item.label}
                  </span>
                  {isActive && (
                    <div className="absolute bottom-0 h-1 w-1 rounded-full bg-orange-warm" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
};
