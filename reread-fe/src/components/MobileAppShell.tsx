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

  // Nav height = 64px content + safe area padding
  // Main content gets padding-bottom to not hide behind nav
  const NAV_CONTENT_H = 64; // px

  return (
    <>
      {/*
        SAFE AREA BACKGROUND FILLER
        position: fixed — không bị clip bởi overflow: hidden của bất kỳ ancestor nào.
        Đảm bảo vùng home indicator của iPhone luôn có màu nền đúng,
        ngay cả khi padding-bottom trên nav bị clip.
      */}
      {showNav && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 'env(safe-area-inset-bottom, 0px)',
            backgroundColor: 'var(--app-surface)',
            zIndex: 29,
          }}
        />
      )}

      {/* APP CONTAINER */}
      <div
        className="h-[100dvh] w-full max-w-[420px] bg-[var(--app-bg)] text-[var(--app-text)] flex flex-col select-none md:border-x md:border-[var(--app-border)] md:shadow-2xl"
        style={{ position: 'relative' }}
      >
        {/* Top Header Bar with Safe Area Top */}
        {showHeader && (
          <header className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3.5 bg-[var(--app-surface)]/90 backdrop-blur-md border-b border-[var(--app-border)] z-20 shrink-0 select-none">
            <div
              onClick={() => window.location.reload()}
              title="Nhấn để tải lại giao diện mới nhất"
              className="flex items-center space-x-2 cursor-pointer active:opacity-70 transition-opacity"
            >
              <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-purple-light to-orange-warm bg-clip-text text-transparent">
                Reread
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--app-accent)]/15 border border-[var(--app-accent)]/30 text-[var(--app-accent)] font-black uppercase tracking-wider">
                Reader
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
        <main
          className="flex-1 overflow-y-auto no-scrollbar relative"
          style={{
            // Đủ khoảng cách để nội dung không bị che bởi nav + safe area
            paddingBottom: showNav
              ? `calc(${NAV_CONTENT_H}px + env(safe-area-inset-bottom, 0px))`
              : '1rem',
          }}
        >
          {children}
        </main>

        {/*
          BOTTOM NAV BAR
          Dùng position: fixed thay vì absolute.
          - `fixed` luôn tham chiếu viewport, KHÔNG bị clip bởi overflow: hidden của parent.
          - padding-bottom: env(safe-area-inset-bottom) kéo background xuống che home indicator.
          - Content (h-16 = 64px) nằm ở trên, padding-bottom là vùng trống fill màu.
        */}
        {showNav && (
          <nav
            className="border-t border-[var(--app-border)] select-none flex flex-col"
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 30,
              backgroundColor: 'var(--app-surface)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
            }}
          >
            <div className="flex justify-between items-center w-full px-4" style={{ height: `${NAV_CONTENT_H}px` }}>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className="flex flex-col items-center justify-center flex-1 h-full text-center transition-all duration-150 relative active:scale-95"
                  >
                    <div
                      className={`p-1 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'text-[var(--app-accent)] scale-110'
                          : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <span
                      className={`text-[11px] font-semibold transition-all mt-0.5 ${
                        isActive ? 'text-[var(--app-accent)]' : 'text-[var(--app-muted)]'
                      }`}
                    >
                      {item.label}
                    </span>
                    {isActive && (
                      <div className="absolute top-1 h-0.5 w-5 rounded-full bg-[var(--app-accent)]" />
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </>
  );
};
