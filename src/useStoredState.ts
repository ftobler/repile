import { useEffect, useState } from 'react';

/** useState that is remembered in localStorage; `parse` returns undefined for invalid values. */
export function useStoredState<T extends string | number>(key: string, fallback: T, parse: (raw: string) => T | undefined) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return (raw === null ? undefined : parse(raw)) ?? fallback;
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, String(value));
    } catch {
      // storage unavailable (private mode etc.) - the value still works for this session
    }
  }, [key, value]);

  return [value, setValue] as const;
}
