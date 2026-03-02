import { atomWithStorage } from 'jotai/utils'

export type ThemeMode = 'system' | 'light' | 'dark'

export const themeModeAtom = atomWithStorage<ThemeMode>('writr-theme-mode', 'system')

export const showToolbarAtom = atomWithStorage<boolean>('writr-show-toolbar', true)
export const relativeLineNumbersEnabledAtom = atomWithStorage<boolean>(
  'writr-relative-line-numbers',
  true
)
export const lineWrappingEnabledAtom = atomWithStorage<boolean>('writr-line-wrapping', true)

export const tabIndentUnitAtom = atomWithStorage<number>('writr-tab-indent-unit', 2)
export const editorFontSizeAtom = atomWithStorage<number>('writr-editor-font-size', 13)

export type EditorFontOption =
  | 'SFMono-Regular'
  | 'Menlo'
  | 'Courier'
  | 'JetBrains Mono'

export const editorFontAtom = atomWithStorage<EditorFontOption>(
  'writr-editor-font',
  'SFMono-Regular'
)

export const vimModeEnabledAtom = atomWithStorage<boolean>('writr-vim-mode-enabled', true)
