import React from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Compass, Bookmark, Settings, LogOut } from 'lucide-react';

export type TabType = 'library' | 'reading' | 'bookmarks' | 'settings';

interface MobileAppShellProps {
  children: React.ReactNode;
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  showHeader?: boolean;
  showNav?: boolean;
}

export const MobileAppShell: React.FC<MobileAppShellProps> = ({
  children,
  currentTab,
  onTabChange,
  showHeader = true,
  showNav = true,
}) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'library' as TabType, label: 'Tủ sách', icon: BookOpen },
    { id: 'reading' as TabType, label: 'Đang đọc', icon: Compass },
    { id: 'bookmarks' as TabType, label: 'Đánh dấu', icon: Bookmark },
    { id: 'settings' as TabType, label: 'Cài đặt', icon: Settings },
  ];

  return (
    <div className="h-full w-full max-w-[440px] mx-auto bg-[var(--app-bg)] text-[var(--app-text)] flex flex-col relative overflow-hidden select-none">
      {/* Top Header Bar (Safe Area Aware) */}
      {showHeader && (
        <header
          className="flex items-center justify-between px-5 pb-2.5 bg-[var(--app-surface)]/95 backdrop-blur-md border-b border-[var(--app-border)] z-20 shrink-0"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}
        >
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
      <main className="flex-1 overflow-y-auto no-scrollbar relative">
        {children}
      </main>

      {/* Fixed Compact Bottom Navigation Bar (Sits right at bottom edge) */}
      {showNav && (
        <nav
          className="shrink-0 bg-[var(--app-surface)]/95 backdrop-blur-xl border-t border-[var(--app-border)] px-3 pt-1.5 z-20 shadow-lg"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
        >
          <div className="flex justify-around items-center max-w-md mx-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className="flex flex-col items-center justify-center flex-1 py-0.5 text-center transition-all duration-150 relative active:scale-95"
                >
                  <div
                    className={`p-1 rounded-xl transition-all ${
                      isActive
                        ? 'text-[var(--app-accent)] scale-105'
                        : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span
                    className={`text-[10px] font-bold transition-all ${
                      isActive ? 'text-[var(--app-accent)]' : 'text-[var(--app-muted)]'
                    }`}
                  >
                    {item.label}
                  </span>
                  {isActive && (
                    <div className="h-1 w-1 rounded-full bg-orange-warm mt-0.5" />
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
