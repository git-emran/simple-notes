import { atomWithStorage } from 'jotai/utils'

export type ThemeMode = 'system' | 'light' | 'dark'

export const themeModeAtom = atomWithStorage<ThemeMode>('writr-theme-mode', 'system')

export const showToolbarAtom = atomWithStorage<boolean>('writr-show-toolbar', true)
export const showFolderIconsAtom = atomWithStorage<boolean>('writr-show-folder-icons', true)
export const relativeLineNumbersEnabledAtom = atomWithStorage<boolean>(
  'writr-relative-line-numbers',
  true
)
export const lineWrappingEnabledAtom = atomWithStorage<boolean>('writr-line-wrapping', true)

export const tabIndentUnitAtom = atomWithStorage<number>('writr-tab-indent-unit', 2)
export const editorFontSizeAtom = atomWithStorage<number>('writr-editor-font-size', 13)

export type EditorFontOption =
  | 'SF Pro'
  | 'SFMono-Regular'
  | 'Menlo'
  | 'Courier'
  | 'JetBrains Mono'
  | 'Martian Mono'

export const editorFontAtom = atomWithStorage<EditorFontOption>(
  'writr-editor-font',
  'SFMono-Regular'
)

export const vimModeEnabledAtom = atomWithStorage<boolean>('writr-vim-mode-enabled', true)

export const rememberLastStateAtom = atomWithStorage<boolean>('writr-remember-last-state', true)

export const aiApiKeyAtom = atomWithStorage<string>('writr-openrouter-api-key', '')

/** User-chosen primary accent color (hex). Applied to --obsidian-accent via App.tsx. */
export const accentColorAtom = atomWithStorage<string>('writr-accent-color', '#3b82f6')
