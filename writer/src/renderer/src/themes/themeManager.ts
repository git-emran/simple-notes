import type { ThemeMode } from '@renderer/store/settingsStore'
import type { NativeThemeSource } from '@shared/types'

export type ResolvedTheme =
  | 'light'
  | 'dark'
  | 'gruvbox-dark'
  | 'gruvbox-light'
  | 'catppuccin-dark'
  | 'catppuccin-light'

export interface ThemeOption {
  value: ThemeMode
  label: string
  group: 'Base' | 'Color Schemes'
  isDarkVariant: boolean
  className?: string
}

export const THEME_OPTIONS: ThemeOption[] = [
  { value: 'system', label: 'System (Auto)', group: 'Base', isDarkVariant: false },
  { value: 'light', label: 'Light', group: 'Base', isDarkVariant: false },
  { value: 'dark', label: 'Dark', group: 'Base', isDarkVariant: true },
  {
    value: 'gruvbox-dark',
    label: 'Gruvbox Dark',
    group: 'Color Schemes',
    isDarkVariant: true,
    className: 'theme-gruvbox-dark'
  },
  {
    value: 'gruvbox-light',
    label: 'Gruvbox Light',
    group: 'Color Schemes',
    isDarkVariant: false,
    className: 'theme-gruvbox-light'
  },
  {
    value: 'catppuccin-dark',
    label: 'Catppuccin Dark (Mocha)',
    group: 'Color Schemes',
    isDarkVariant: true,
    className: 'theme-catppuccin-dark'
  },
  {
    value: 'catppuccin-light',
    label: 'Catppuccin Light (Latte)',
    group: 'Color Schemes',
    isDarkVariant: false,
    className: 'theme-catppuccin-light'
  }
]

export const DARK_THEME_IDS = new Set<string>(['dark', 'gruvbox-dark', 'catppuccin-dark'])

export const ALL_THEME_CLASSES = [
  'theme-gruvbox-dark',
  'theme-gruvbox-light',
  'theme-catppuccin-dark',
  'theme-catppuccin-light'
]

export const THEME_CLASS_MAP: Partial<Record<ThemeMode, string>> = {
  'gruvbox-dark': 'theme-gruvbox-dark',
  'gruvbox-light': 'theme-gruvbox-light',
  'catppuccin-dark': 'theme-catppuccin-dark',
  'catppuccin-light': 'theme-catppuccin-light'
}

/**
 * Resolves whether the current theme configuration results in a dark background.
 */
export const resolveIsDark = (themeMode: ThemeMode, systemIsDark: boolean): boolean => {
  if (themeMode === 'system') {
    return systemIsDark
  }
  return DARK_THEME_IDS.has(themeMode)
}

/**
 * Resolves the concrete theme mode (handling 'system' resolution).
 */
export const resolveThemeMode = (themeMode: ThemeMode, systemIsDark: boolean): ResolvedTheme => {
  if (themeMode === 'system') {
    return systemIsDark ? 'dark' : 'light'
  }
  return themeMode as ResolvedTheme
}

/**
 * Determines the Electron nativeTheme.themeSource value to pass to the main process.
 */
export const resolveNativeThemeSource = (
  themeMode: ThemeMode,
  isDark: boolean
): NativeThemeSource => {
  if (themeMode === 'system') {
    return 'system'
  }
  return isDark ? 'dark' : 'light'
}

/**
 * Applies the selected theme to the root HTML document element.
 * Ensures consistent CSS class lists, data attributes, and colorScheme styling.
 */
export const applyThemeToDocument = (
  themeMode: ThemeMode,
  systemIsDark: boolean
): { isDark: boolean; resolvedTheme: ResolvedTheme } => {
  const isDark = resolveIsDark(themeMode, systemIsDark)
  const resolvedTheme = resolveThemeMode(themeMode, systemIsDark)
  const root = document.documentElement

  // 1. Base dark/light classes for Tailwind darkMode: 'class' and CSS selectors
  root.classList.toggle('dark', isDark)
  root.classList.toggle('light', !isDark)

  // 2. Custom color scheme classes
  ALL_THEME_CLASSES.forEach((cls) => root.classList.remove(cls))
  const customClass = THEME_CLASS_MAP[resolvedTheme]
  if (customClass) {
    root.classList.add(customClass)
  }

  // 3. Data attributes for declarative CSS and testing
  root.dataset.theme = resolvedTheme
  root.dataset.themeMode = themeMode
  root.dataset.baseTheme = isDark ? 'dark' : 'light'

  // 4. Browser color scheme for native inputs, scrollbars, etc.
  root.style.colorScheme = isDark ? 'dark' : 'light'

  // 5. Notify Electron native process
  const nativeSource = resolveNativeThemeSource(themeMode, isDark)
  if (window.context?.setThemeSource) {
    window.context.setThemeSource(nativeSource).catch(() => {})
  }

  return { isDark, resolvedTheme }
}
