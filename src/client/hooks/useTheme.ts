import { useState, useEffect, useCallback } from 'react';
import type { ThemeId } from '@shared/types.js';

const STORAGE_KEY = 'dual-adventure-theme';

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(STORAGE_KEY) as ThemeId) || 'forest';
    }
    return 'forest';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((t: ThemeId) => {
    document.body.classList.add('theme-transitioning');
    setThemeState(t);
    setTimeout(() => document.body.classList.remove('theme-transitioning'), 450);
  }, []);

  return { theme, setTheme };
}
