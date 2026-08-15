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
      <div className="h-[100dvh] w-full max-w-[420px] md:border-x md:border-purple-primary/20 md:shadow-2xl bg-plum-deep text-white flex flex-col items-center justify-center p-6 space-y-4">
        <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-purple-primary/30 to-orange-warm/20 border border-purple-primary/20 flex items-center justify-center animate-pulse shadow-2xl">
          <BookOpen className="h-8 w-8 text-purple-light" />
        </div>
        <p className="text-sm font-bold bg-gradient-to-r from-purple-light to-orange-warm bg-clip-text text-transparent">
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
