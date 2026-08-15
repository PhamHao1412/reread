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

// ── NAV BAR HEIGHT CONSTANTS ────────────────────────────────────────────────
// Nav icon+label area = 48px, top padding = 6px → visible nav = 54px.
// paddingBottom = env(safe-area-inset-bottom) covers home indicator (~34px).
// Main content bottom padding must clear the full nav bar height.
const NAV_VISIBLE_HEIGHT = 54; // px  (6px top pad + 48px items)

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
    <>
      {/* ── FULL-SCREEN BACKGROUND ──────────────────────────────────────────
          A simple fixed inset-0 div whose only job is to paint the background
          colour on every physical pixel, including the home-indicator zone.
          This eliminates the visible gap when 100dvh ≠ physical screen height. */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'var(--app-surface)', // matches nav bar — gap is invisible
          zIndex: 0,
        }}
      />

      {/* ── MAIN SHELL ─────────────────────────────────────────────────────
          Centred column that holds header + scrollable content.
          Uses 100dvh as height; any shortfall is covered by the bg div above. */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          justifyContent: 'center',
          zIndex: 1,
        }}
      >
        <div
          className="w-full max-w-[420px] select-none md:border-x md:border-[var(--app-border)] md:shadow-2xl"
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: 'var(--app-bg)',
            color: 'var(--app-text)',
            overflow: 'hidden',
          }}
        >
          {/* ── HEADER ── */}
          {showHeader && (
            <header
              className="flex items-center justify-between px-5 pb-3.5 bg-[var(--app-surface)]/90 backdrop-blur-md border-b border-[var(--app-border)] z-20 select-none"
              style={{
                flexShrink: 0,
                paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)',
              }}
            >
              <div
                onClick={() => window.location.reload()}
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
                    className="p-1.5 rounded-xl bg-[var(--app-card)] text-[var(--app-muted)] hover:text-[var(--app-text)] transition-all border border-[var(--app-border)]"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              )}
            </header>
          )}

          {/* ── SCROLLABLE CONTENT ──
              Bottom padding = nav visible height + home indicator safe area,
              so the last content item is never hidden behind the nav bar. */}
          <main
            className="no-scrollbar flex-1"
            style={{
              overflowY: 'auto',
              overflowX: 'hidden',
              // Ensure content clears the fixed nav bar at the bottom
              paddingBottom: showNav
                ? `calc(${NAV_VISIBLE_HEIGHT}px + env(safe-area-inset-bottom, 0px))`
                : 0,
            }}
          >
            {children}
          </main>
        </div>
      </div>

      {/* ── BOTTOM NAVIGATION BAR ──────────────────────────────────────────
          position:fixed bottom:0 is the ONLY reliable way to stick something
          to the physical screen bottom on iOS PWA, regardless of 100dvh bugs.

          The nav is rendered OUTSIDE the scroll container so it's always
          visible and always at the real bottom of the screen.

          max-width + left/right auto centres it on wider screens (tablet/desktop). */}
      {showNav && (
        <nav
          style={{
            position: 'fixed',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: '420px',
            zIndex: 50,
            backgroundColor: 'var(--app-surface)',
            borderTop: '1px solid var(--app-border)',
            boxShadow: '0 -2px 16px rgba(0,0,0,0.12)',
            // Push content above home indicator (face-id phones: ~34px)
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            paddingTop: '6px',
          }}
          className="select-none"
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              height: '48px',
              paddingLeft: '8px',
              paddingRight: '8px',
            }}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className="active:scale-95 transition-transform"
                  style={{
                    flex: 1,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '3px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  {isActive && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '2px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '16px',
                        height: '2.5px',
                        borderRadius: '99px',
                        backgroundColor: 'var(--app-accent)',
                      }}
                    />
                  )}
                  <div
                    style={{
                      color: isActive ? 'var(--app-accent)' : 'var(--app-muted)',
                      transform: isActive ? 'scale(1.08)' : 'scale(1)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Icon className="h-[21px] w-[21px]" />
                  </div>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: isActive ? '700' : '500',
                      color: isActive ? 'var(--app-accent)' : 'var(--app-muted)',
                      lineHeight: 1,
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
};
