import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { MobileAppShell, TabType } from './components/MobileAppShell';
import { LoginScreen } from './components/LoginScreen';
import { LibraryScreen } from './components/LibraryScreen';
import { ReaderScreen } from './components/ReaderScreen';
import { BookmarksScreen } from './components/BookmarksScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { Book } from './types';
import { BookOpen } from 'lucide-react';

export function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<TabType>('library');
  const [activeBook, setActiveBook] = useState<Book | null>(null);

  if (isLoading) {
    return (
      <div
        className="h-[100dvh] w-full max-w-[420px] md:border-x md:shadow-2xl flex flex-col items-center justify-center p-6 space-y-4"
        style={{ backgroundColor: 'var(--app-bg)', color: 'var(--app-text)', borderColor: 'var(--app-border)' }}
      >
        <div
          className="h-16 w-16 rounded-3xl flex items-center justify-center animate-pulse shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--app-accent) 25%, transparent), color-mix(in srgb, var(--app-accent) 10%, transparent))',
            border: '1px solid color-mix(in srgb, var(--app-accent) 30%, transparent)',
          }}
        >
          <BookOpen className="h-8 w-8" style={{ color: 'var(--app-accent)' }} />
        </div>
        <p className="text-sm font-bold" style={{ color: 'var(--app-accent)' }}>
          Reread Mobile
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Active Reading Workspace
  if (activeBook) {
    return (
      <div className="h-[100dvh] w-full max-w-[420px] md:border-x md:border-[var(--app-border)] md:shadow-2xl bg-[var(--app-bg)] text-[var(--app-text)] flex flex-col relative overflow-hidden select-none">
        <ReaderScreen
          book={activeBook}
          onBack={() => setActiveBook(null)}
        />
      </div>
    );
  }

  const handleOpenBookAtPage = (book: Book, page: number) => {
    setActiveBook({ ...book, current_page: page });
  };

  return (
    <MobileAppShell
      currentTab={currentTab}
      onTabChange={setCurrentTab}
      showHeader={true}
      showNav={true}
    >
      {currentTab === 'library' && (
        <LibraryScreen onSelectBook={(book) => setActiveBook(book)} />
      )}

      {currentTab === 'reading' && (
        <LibraryScreen onSelectBook={(book) => setActiveBook(book)} />
      )}

      {currentTab === 'bookmarks' && (
        <BookmarksScreen onOpenBookAtPage={handleOpenBookAtPage} />
      )}

      {currentTab === 'settings' && <SettingsScreen />}
    </MobileAppShell>
  );
}

export default App;
