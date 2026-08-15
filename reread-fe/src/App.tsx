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
      <div className="h-full w-full max-w-[440px] mx-auto bg-[var(--app-bg)] text-[var(--app-text)] flex flex-col items-center justify-center p-6 space-y-4 select-none">
        <div className="h-16 w-16 rounded-3xl bg-[var(--app-surface)] border border-[var(--app-border)] flex items-center justify-center animate-pulse shadow-xl text-[var(--app-accent)]">
          <BookOpen className="h-8 w-8" />
        </div>
        <p className="text-sm font-extrabold text-[var(--app-text)]">
          ReRead
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
      <div className="h-full w-full max-w-[440px] mx-auto bg-[var(--app-bg)] text-[var(--app-text)] flex flex-col relative overflow-hidden select-none">
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
    <MobileAppShell currentTab={currentTab} onTabChange={setCurrentTab}>
      {currentTab === 'library' && (
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
