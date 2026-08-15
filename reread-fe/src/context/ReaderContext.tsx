import React, { createContext, useContext, useState, useEffect } from 'react';
import { ReaderSettings, ReaderTheme, ReadingMode, FontFamily } from '../types';

interface ReaderContextType {
  settings: ReaderSettings;
  updateSettings: (newSettings: Partial<ReaderSettings>) => void;
  setTheme: (theme: ReaderTheme) => void;
  setReadingMode: (mode: ReadingMode) => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  setFontFamily: (font: FontFamily) => void;
}

const defaultSettings: ReaderSettings = {
  theme: 'plum',
  fontSize: 16,
  lineHeight: 1.6,
  fontFamily: 'serif',
  readingMode: 'standard',
  bionicIntensity: 2,
  continuousScroll: false,
};

const ReaderContext = createContext<ReaderContextType | undefined>(undefined);

export const ReaderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ReaderSettings>(() => {
    const saved = localStorage.getItem('reread_settings');
    if (saved) {
      try {
        return { ...defaultSettings, ...JSON.parse(saved) };
      } catch {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('reread_settings', JSON.stringify(settings));

    // Update document colors according to active theme
    const themeRoot = document.documentElement;
    if (settings.theme === 'sepia') {
      themeRoot.style.setProperty('--app-bg', '#F7EFE1');
      themeRoot.style.setProperty('--app-surface', '#EDE2CE');
      themeRoot.style.setProperty('--app-card', '#E1D3BA');
      themeRoot.style.setProperty('--app-text', '#2D2013');
      themeRoot.style.setProperty('--app-text-secondary', '#523F2C');
      themeRoot.style.setProperty('--app-muted', '#7E6851');
      themeRoot.style.setProperty('--app-border', 'rgba(126, 104, 81, 0.25)');
      themeRoot.style.setProperty('--app-accent', '#C27803');
    } else if (settings.theme === 'light') {
      themeRoot.style.setProperty('--app-bg', '#F8FAFC');
      themeRoot.style.setProperty('--app-surface', '#FFFFFF');
      themeRoot.style.setProperty('--app-card', '#F1F5F9');
      themeRoot.style.setProperty('--app-text', '#0F172A');
      themeRoot.style.setProperty('--app-text-secondary', '#334155');
      themeRoot.style.setProperty('--app-muted', '#64748B');
      themeRoot.style.setProperty('--app-border', 'rgba(0, 0, 0, 0.12)');
      themeRoot.style.setProperty('--app-accent', '#6366F1');
    } else if (settings.theme === 'amoled') {
      themeRoot.style.setProperty('--app-bg', '#000000');
      themeRoot.style.setProperty('--app-surface', '#121212');
      themeRoot.style.setProperty('--app-card', '#1E1E1E');
      themeRoot.style.setProperty('--app-text', '#FFFFFF');
      themeRoot.style.setProperty('--app-text-secondary', '#CCCCCC');
      themeRoot.style.setProperty('--app-muted', '#777777');
      themeRoot.style.setProperty('--app-border', 'rgba(255, 255, 255, 0.15)');
      themeRoot.style.setProperty('--app-accent', '#3B82F6');
    } else {
      // Default Plum Dark theme
      themeRoot.style.setProperty('--app-bg', '#1A0D1C');
      themeRoot.style.setProperty('--app-surface', '#261329');
      themeRoot.style.setProperty('--app-card', '#351B3A');
      themeRoot.style.setProperty('--app-text', '#FFFFFF');
      themeRoot.style.setProperty('--app-text-secondary', '#D6C5DB');
      themeRoot.style.setProperty('--app-muted', '#9A84A1');
      themeRoot.style.setProperty('--app-border', 'rgba(168, 47, 208, 0.2)');
      themeRoot.style.setProperty('--app-accent', '#A82FD0');
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<ReaderSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const setTheme = (theme: ReaderTheme) => {
    updateSettings({ theme });
  };

  const setReadingMode = (readingMode: ReadingMode) => {
    updateSettings({ readingMode });
  };

  const setFontFamily = (fontFamily: FontFamily) => {
    updateSettings({ fontFamily });
  };

  const increaseFontSize = () => {
    setSettings((prev) => ({
      ...prev,
      fontSize: Math.min(prev.fontSize + 1, 28),
    }));
  };

  const decreaseFontSize = () => {
    setSettings((prev) => ({
      ...prev,
      fontSize: Math.max(prev.fontSize - 1, 12),
    }));
  };

  return (
    <ReaderContext.Provider
      value={{
        settings,
        updateSettings,
        setTheme,
        setReadingMode,
        setFontFamily,
        increaseFontSize,
        decreaseFontSize,
      }}
    >
      {children}
    </ReaderContext.Provider>
  );
};

export const useReader = () => {
  const context = useContext(ReaderContext);
  if (!context) {
    throw new Error('useReader must be used within a ReaderProvider');
  }
  return context;
};
