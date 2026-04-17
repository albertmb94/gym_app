import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ThemeName } from '../types';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
});

const STORAGE_KEY = 'gymtracker_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeName | null;
    return saved || 'dark';
  });

  const setTheme = (t: ThemeName) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
  };

  useEffect(() => {
    const root = document.documentElement;
    // Remove all theme-* classes first
    root.classList.remove('theme-dark', 'theme-black', 'theme-light', 'theme-contrast');
    root.classList.add(`theme-${theme}`);
    // Also set data attribute for any future CSS targeting
    root.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export const THEMES: { id: ThemeName; name: string; emoji: string; description: string }[] = [
  { id: 'light', name: 'Claro', emoji: '☀️', description: 'Fondo blanco, ideal para luz diurna' },
  { id: 'contrast', name: 'Contraste', emoji: '🌈', description: 'Mayor contraste entre colores' },
  { id: 'dark', name: 'Oscuro', emoji: '🌙', description: 'Tema oscuro estándar' },
  { id: 'black', name: 'Negro', emoji: '⚫', description: 'OLED total, máximo ahorro de batería' },
];
