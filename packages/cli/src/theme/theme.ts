/**
 * Real theme system for the CyberCoder CLI.
 *
 * Unlike a cosmetic picker, this module is the single source of truth for
 * every color the UI renders. Components call `useTheme()` (or read the
 * module-level `activeTheme`) instead of hard-coding hex/ANSI values, so a
 * `/theme` change instantly re-paints the whole interface — exactly like
 * Claude Code.
 */

export type ThemeMode =
  | 'auto'
  | 'dark'
  | 'light'
  | 'dark-colorblind'
  | 'light-colorblind'
  | 'dark-ansi'
  | 'light-ansi';

/** Semantic color roles used throughout the UI. */
export interface ThemePalette {
  /** Primary brand accent (CyberCoder terracotta). */
  accent: string;
  /** Secondary accent for highlights / selection. */
  accentAlt: string;
  /** Default body text. */
  text: string;
  /** Muted / secondary text. */
  muted: string;
  /** Dim text (hints, separators). */
  dim: string;
  /** Success / additions. */
  success: string;
  /** Warning / thinking. */
  warning: string;
  /** Error / deletions. */
  error: string;
  /** Informational / system. */
  info: string;
  /** User message label color. */
  user: string;
  /** Assistant message text color. */
  assistant: string;
  /** Border color for boxes/panels. */
  border: string;
  /** Whether this palette targets a light terminal background. */
  isLight: boolean;
  /** Whether to restrict to the 16 standard ANSI color names. */
  ansiOnly: boolean;
}

const ACCENT = '#D97757'; // CyberCoder terracotta (matches the website)
const ACCENT_LIGHT = '#C2410C';

/** Full 24-bit dark palette (default). */
const DARK: ThemePalette = {
  accent: ACCENT,
  accentAlt: '#E0915F',
  text: '#ECECEC',
  muted: '#9CA3AF',
  dim: '#6B7280',
  success: '#4ADE80',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',
  user: '#7DD3FC',
  assistant: '#ECECEC',
  border: ACCENT,
  isLight: false,
  ansiOnly: false,
};

/** Full 24-bit light palette. */
const LIGHT: ThemePalette = {
  accent: ACCENT_LIGHT,
  accentAlt: '#9A3412',
  text: '#1F2937',
  muted: '#4B5563',
  dim: '#9CA3AF',
  success: '#15803D',
  warning: '#B45309',
  error: '#B91C1C',
  info: '#1D4ED8',
  user: '#0369A1',
  assistant: '#1F2937',
  border: ACCENT_LIGHT,
  isLight: true,
  ansiOnly: false,
};

/** Colorblind-friendly dark (blue/orange instead of green/red). */
const DARK_CB: ThemePalette = {
  ...DARK,
  success: '#38BDF8', // blue stands in for "good"
  error: '#FB923C', // orange stands in for "bad"
  warning: '#FACC15',
  user: '#38BDF8',
};

/** Colorblind-friendly light. */
const LIGHT_CB: ThemePalette = {
  ...LIGHT,
  success: '#0284C7',
  error: '#C2410C',
  warning: '#A16207',
  user: '#0284C7',
};

/** Dark using only the 16 ANSI color names (for limited terminals). */
const DARK_ANSI: ThemePalette = {
  accent: 'red',
  accentAlt: 'redBright',
  text: 'white',
  muted: 'gray',
  dim: 'gray',
  success: 'green',
  warning: 'yellow',
  error: 'red',
  info: 'blue',
  user: 'cyan',
  assistant: 'white',
  border: 'red',
  isLight: false,
  ansiOnly: true,
};

/** Light using only the 16 ANSI color names. */
const LIGHT_ANSI: ThemePalette = {
  accent: 'red',
  accentAlt: 'magenta',
  text: 'black',
  muted: 'gray',
  dim: 'gray',
  success: 'green',
  warning: 'yellow',
  error: 'red',
  info: 'blue',
  user: 'blue',
  assistant: 'black',
  border: 'red',
  isLight: true,
  ansiOnly: true,
};

const PALETTES: Record<Exclude<ThemeMode, 'auto'>, ThemePalette> = {
  dark: DARK,
  light: LIGHT,
  'dark-colorblind': DARK_CB,
  'light-colorblind': LIGHT_CB,
  'dark-ansi': DARK_ANSI,
  'light-ansi': LIGHT_ANSI,
};

/**
 * Detect whether the terminal background is light. Honors COLORFGBG (set by
 * many terminals) and falls back to dark, which is the safe default.
 */
function detectTerminalIsLight(): boolean {
  const fgbg = process.env.COLORFGBG;
  if (fgbg) {
    // Format is usually "foreground;background"; background >= 7 ≈ light.
    const parts = fgbg.split(';');
    const bg = Number(parts[parts.length - 1]);
    if (!Number.isNaN(bg)) return bg >= 7 || bg === 15;
  }
  return false;
}

/** Resolve a (possibly `auto`) mode into a concrete palette. */
export function resolvePalette(mode: ThemeMode): ThemePalette {
  if (mode === 'auto') {
    return detectTerminalIsLight() ? LIGHT : DARK;
  }
  return PALETTES[mode] ?? DARK;
}

/**
 * Module-level active palette. Components import this for color values; it is
 * reassigned by `setActiveTheme` whenever the user changes themes so the next
 * render uses the new colors.
 */
export let activeTheme: ThemePalette = DARK;
export let activeMode: ThemeMode = 'dark';

const listeners = new Set<() => void>();

export function setActiveTheme(mode: ThemeMode): ThemePalette {
  activeMode = mode;
  activeTheme = resolvePalette(mode);
  for (const fn of listeners) fn();
  return activeTheme;
}

/** Subscribe to theme changes (used by the React hook to force re-render). */
export function onThemeChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const THEME_OPTIONS: { id: ThemeMode; label: string }[] = [
  { id: 'auto', label: 'Auto (match terminal)' },
  { id: 'dark', label: 'Dark mode' },
  { id: 'light', label: 'Light mode' },
  { id: 'dark-colorblind', label: 'Dark mode (colorblind-friendly)' },
  { id: 'light-colorblind', label: 'Light mode (colorblind-friendly)' },
  { id: 'dark-ansi', label: 'Dark mode (ANSI colors only)' },
  { id: 'light-ansi', label: 'Light mode (ANSI colors only)' },
];
