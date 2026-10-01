import { useCallback, useEffect } from 'react';
import { useStoredState } from './useStoredState';

export type Theme = 'dark' | 'light';

/** Dark by default; the choice is applied to <html data-theme> and remembered. */
export function useTheme() {
  const [theme, setTheme] = useStoredState<Theme>('repile-theme', 'dark', (raw) =>
    raw === 'light' || raw === 'dark' ? raw : undefined,
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [setTheme]);
  return { theme, toggle };
}
