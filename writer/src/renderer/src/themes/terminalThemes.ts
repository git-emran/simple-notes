import type { ITheme } from '@xterm/xterm'
import type { ThemeMode } from '@renderer/store/settingsStore'

export const darkTerminalTheme: ITheme = {
  background: '#14171d',
  foreground: '#e5e7eb',
  cursor: '#7c9efb',
  cursorAccent: '#14171d',
  black: '#1c1f26',
  red: '#ff7b72',
  green: '#7ee787',
  yellow: '#f2cc60',
  blue: '#79c0ff',
  magenta: '#d2a8ff',
  cyan: '#76e3ea',
  white: '#c9d1d9',
  brightBlack: '#6e7681',
  brightRed: '#ffa198',
  brightGreen: '#56d364',
  brightYellow: '#e3b341',
  brightBlue: '#58a6ff',
  brightMagenta: '#bc8cff',
  brightCyan: '#39c5cf',
  brightWhite: '#f0f6fc',
  selectionBackground: 'rgba(124, 158, 251, 0.28)',
  selectionInactiveBackground: 'rgba(124, 158, 251, 0.16)'
}

export const lightTerminalTheme: ITheme = {
  background: '#ffffff',
  foreground: '#111827',
  cursor: '#3b82f6',
  cursorAccent: '#ffffff',
  black: '#1f2937',
  red: '#dc2626',
  green: '#15803d',
  yellow: '#b45309',
  blue: '#2563eb',
  magenta: '#9333ea',
  cyan: '#0f766e',
  white: '#6b7280',
  brightBlack: '#4b5563',
  brightRed: '#ef4444',
  brightGreen: '#16a34a',
  brightYellow: '#d97706',
  brightBlue: '#3b82f6',
  brightMagenta: '#a855f7',
  brightCyan: '#14b8a6',
  brightWhite: '#111827',
  selectionBackground: 'rgba(59, 130, 246, 0.2)',
  selectionInactiveBackground: 'rgba(59, 130, 246, 0.12)'
}

export const gruvboxDarkTerminalTheme: ITheme = {
  background: '#1d2021',
  foreground: '#ebdbb2',
  cursor: '#fabd2f',
  cursorAccent: '#1d2021',
  black: '#282828',
  red: '#cc241d',
  green: '#98971a',
  yellow: '#d79921',
  blue: '#458588',
  magenta: '#b16286',
  cyan: '#689d6a',
  white: '#a89984',
  brightBlack: '#928374',
  brightRed: '#fb4934',
  brightGreen: '#b8bb26',
  brightYellow: '#fabd2f',
  brightBlue: '#83a598',
  brightMagenta: '#d3869b',
  brightCyan: '#8ec07c',
  brightWhite: '#ebdbb2',
  selectionBackground: 'rgba(250, 189, 47, 0.3)',
  selectionInactiveBackground: 'rgba(250, 189, 47, 0.18)'
}

export const gruvboxLightTerminalTheme: ITheme = {
  background: '#f9f5d7',
  foreground: '#3c3836',
  cursor: '#b57614',
  cursorAccent: '#f9f5d7',
  black: '#fbf1c7',
  red: '#9d0006',
  green: '#79740e',
  yellow: '#b57614',
  blue: '#076678',
  magenta: '#8f3f71',
  cyan: '#427b58',
  white: '#7c6f64',
  brightBlack: '#928374',
  brightRed: '#cc241d',
  brightGreen: '#98971a',
  brightYellow: '#d79921',
  brightBlue: '#458588',
  brightMagenta: '#b16286',
  brightCyan: '#689d6a',
  brightWhite: '#3c3836',
  selectionBackground: 'rgba(181, 118, 20, 0.25)',
  selectionInactiveBackground: 'rgba(181, 118, 20, 0.14)'
}

export const catppuccinDarkTerminalTheme: ITheme = {
  background: '#1e1e2e',
  foreground: '#cdd6f4',
  cursor: '#cba6f7',
  cursorAccent: '#1e1e2e',
  black: '#45475a',
  red: '#f38ba8',
  green: '#a6e3a1',
  yellow: '#f9e2af',
  blue: '#89b4fa',
  magenta: '#f5c2e7',
  cyan: '#94e2d5',
  white: '#bac2de',
  brightBlack: '#585b70',
  brightRed: '#f38ba8',
  brightGreen: '#a6e3a1',
  brightYellow: '#f9e2af',
  brightBlue: '#89b4fa',
  brightMagenta: '#f5c2e7',
  brightCyan: '#94e2d5',
  brightWhite: '#a6adc8',
  selectionBackground: 'rgba(203, 166, 247, 0.28)',
  selectionInactiveBackground: 'rgba(203, 166, 247, 0.16)'
}

export const catppuccinLightTerminalTheme: ITheme = {
  background: '#eff1f5',
  foreground: '#4c4f69',
  cursor: '#8839ef',
  cursorAccent: '#eff1f5',
  black: '#5c5f77',
  red: '#d20f39',
  green: '#40a02b',
  yellow: '#df8e1d',
  blue: '#1e66f5',
  magenta: '#ea76cb',
  cyan: '#179299',
  white: '#acb0be',
  brightBlack: '#6c6f85',
  brightRed: '#d20f39',
  brightGreen: '#40a02b',
  brightYellow: '#df8e1d',
  brightBlue: '#1e66f5',
  brightMagenta: '#ea76cb',
  brightCyan: '#179299',
  brightWhite: '#bcc0cc',
  selectionBackground: 'rgba(136, 57, 239, 0.22)',
  selectionInactiveBackground: 'rgba(136, 57, 239, 0.12)'
}

export const getTerminalTheme = (themeMode: ThemeMode, isDarkMode: boolean): ITheme => {
  switch (themeMode) {
    case 'gruvbox-dark':
      return gruvboxDarkTerminalTheme
    case 'gruvbox-light':
      return gruvboxLightTerminalTheme
    case 'catppuccin-dark':
      return catppuccinDarkTerminalTheme
    case 'catppuccin-light':
      return catppuccinLightTerminalTheme
    case 'dark':
      return darkTerminalTheme
    case 'light':
      return lightTerminalTheme
    case 'system':
    default:
      return isDarkMode ? darkTerminalTheme : lightTerminalTheme
  }
}
