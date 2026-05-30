import { useSyncExternalStore } from 'react';
import { activeTheme, onThemeChange, type ThemePalette } from './theme.js';

/**
 * React hook exposing the live theme palette. Any component that calls this
 * re-renders automatically when the user switches themes via `/theme`.
 */
export function useTheme(): ThemePalette {
  return useSyncExternalStore(
    (cb) => onThemeChange(cb),
    () => activeTheme,
    () => activeTheme,
  );
}
