import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [mode,  setModeState]  = useState(() => localStorage.getItem('lc-mode')  || 'social');
  const [theme, setThemeState] = useState(() => localStorage.getItem('lc-theme') || 'light');

  // Apply tokens to <html> element so CSS vars work everywhere
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('data-mode',  mode);
    html.setAttribute('data-theme', theme);
    localStorage.setItem('lc-mode',  mode);
    localStorage.setItem('lc-theme', theme);
  }, [mode, theme]);

  const setMode = (m) => setModeState(m);

  const toggleTheme = () => setThemeState(t => t === 'light' ? 'dark' : 'light');

  const setTheme = (t) => setThemeState(t);

  const isAcademic = mode === 'academic';
  const isDark     = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ mode, theme, setMode, setTheme, toggleTheme, isAcademic, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

export default ThemeContext;
