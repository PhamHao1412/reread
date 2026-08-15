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
  theme: 'sepia',
  fontSize: 16,
  lineHeight: 1.6,
  fontFamily: 'serif',
  readingMode: 'standard',
  bionicIntensity: 2,
  continuousScroll: false,
};

// Theme color map — single source of truth
const THEMES: Record<ReaderTheme, Record<string, string>> = {
  sepia: {
    '--app-bg':             '#F7EFE1',
    '--app-surface':        '#EDE2CE',
    '--app-card':           '#E1D3BA',
    '--app-text':           '#2D2013',
    '--app-text-secondary': '#523F2C',
    '--app-muted':          '#7E6851',
    '--app-border':         'rgba(126, 104, 81, 0.25)',
    '--app-accent':         '#C27803',
  },
  light: {
    '--app-bg':             '#F8FAFC',
    '--app-surface':        '#FFFFFF',
    '--app-card':           '#F1F5F9',
    '--app-text':           '#0F172A',
    '--app-text-secondary': '#334155',
    '--app-muted':          '#64748B',
    '--app-border':         'rgba(0, 0, 0, 0.12)',
    '--app-accent':         '#6366F1',
  },
  amoled: {
    '--app-bg':             '#000000',
    '--app-surface':        '#121212',
    '--app-card':           '#1E1E1E',
    '--app-text':           '#FFFFFF',
    '--app-text-secondary': '#CCCCCC',
    '--app-muted':          '#777777',
    '--app-border':         'rgba(255, 255, 255, 0.15)',
    '--app-accent':         '#3B82F6',
  },
  plum: {
    '--app-bg':             '#1A0D1C',
    '--app-surface':        '#261329',
    '--app-card':           '#351B3A',
    '--app-text':           '#FFFFFF',
    '--app-text-secondary': '#D6C5DB',
    '--app-muted':          '#9A84A1',
    '--app-border':         'rgba(168, 47, 208, 0.2)',
    '--app-accent':         '#A82FD0',
  },
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

    const themeRoot = document.documentElement;
    const colors = THEMES[settings.theme] ?? THEMES.sepia;

    // Apply all CSS variables
    Object.entries(colors).forEach(([prop, value]) => {
      themeRoot.style.setProperty(prop, value);
    });

    // Sync body/html background to nav-surface color for iOS PWA gap fix
    // (the home-indicator zone below 100dvh is painted by iOS using body background)
    document.body.style.backgroundColor = colors['--app-surface'];
    document.documentElement.style.backgroundColor = colors['--app-surface'];
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
