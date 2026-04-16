import { useState, useEffect } from 'react';

/**
 * useDarkMode
 * ────────────────────────────────────────────────────────────────────────────
 * Manages dark mode state:
 *  1. Reads persisted preference from localStorage
 *  2. Falls back to system preference (prefers-color-scheme: dark)
 *  3. Toggles by adding/removing class 'dark' on <html>
 *  4. Persists choice to localStorage
 *
 * Returns: [isDark: boolean, toggle: () => void]
 */
export function useDarkMode() {
  const getInitial = () => {
    try {
      const stored = localStorage.getItem('cv-theme');
      if (stored === 'dark') return true;
      if (stored === 'light') return false;
    } catch { /* ignore */ }
    // Respect system preference
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  };

  const [isDark, setIsDark] = useState(getInitial);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('cv-theme', isDark ? 'dark' : 'light');
    } catch { /* ignore */ }
  }, [isDark]);

  // Listen for system preference changes (when no stored preference)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const handler = (e) => {
      const stored = localStorage.getItem('cv-theme');
      if (!stored) setIsDark(e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggle = () => setIsDark(d => !d);

  return [isDark, toggle];
}

export default useDarkMode;
