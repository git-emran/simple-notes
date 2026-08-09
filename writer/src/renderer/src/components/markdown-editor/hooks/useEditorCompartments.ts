import {
  isDarkModeAtom,
  lineWrappingEnabledAtom,
  relativeLineNumbersEnabledAtom,
  tabIndentUnitAtom,
  vimModeEnabledAtom,
  themeModeAtom,
} from '@renderer/store'
import { syntaxHighlighting } from '@codemirror/language'
import { Compartment } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { vim } from '@replit/codemirror-vim'
import { useAtomValue } from 'jotai'
import { debounce } from 'lodash'
import { useCallback, useEffect, useMemo } from 'react'
import { relativeLineNumbers } from '../../code-mirror-ui/relativeLineNumbers'
import { createLivePreviewImages } from '../livePreviewImages'
import { tabAsSpaces } from '../tabAsSpaces'
import {
  getEditorTheme,
  markdownHighlightStyle,
  markdownHighlightStyleDark,
} from '../editorTheme'
import { gruvboxDark, gruvboxLight } from '../../../themes/gruvbox'
import { catppuccinDark, catppuccinLight } from '../../../themes/catppuccin'
import type { LanguageSupport } from '@codemirror/language'

import type { ViewRef } from './types'

interface UseEditorCompartmentsParams {
  viewRef: ViewRef
  selectedNotePath: string | undefined
  rootDir: string
}

export function useEditorCompartments({
  viewRef,
  selectedNotePath,
  rootDir
}: UseEditorCompartmentsParams) {
  const isDarkMode = useAtomValue(isDarkModeAtom)
  const themeMode = useAtomValue(themeModeAtom)
  const relativeLineNumbersEnabled = useAtomValue(relativeLineNumbersEnabledAtom)
  const lineWrappingEnabled = useAtomValue(lineWrappingEnabledAtom)
  const tabIndentUnit = useAtomValue(tabIndentUnitAtom)
  const vimModeEnabled = useAtomValue(vimModeEnabledAtom)

  const vimCompartment = useMemo(() => new Compartment(), [])
  const themeCompartment = useMemo(() => new Compartment(), [])
  const highlightCompartment = useMemo(() => new Compartment(), [])
  const relativeLineNumbersCompartment = useMemo(() => new Compartment(), [])
  const lineWrappingCompartment = useMemo(() => new Compartment(), [])
  const tabIndentCompartment = useMemo(() => new Compartment(), [])
  const livePreviewImagesCompartment = useMemo(() => new Compartment(), [])
  const languageSupportCompartment = useMemo(() => new Compartment(), [])

  const reconfigureLanguage = useMemo(
    () =>
      debounce((view: EditorView, support: LanguageSupport | []) => {
        if (!view.state) return
        view.dispatch({
          effects: languageSupportCompartment.reconfigure(support)
        })
      }, 100),
    [languageSupportCompartment]
  )

  const applyEditorSettings = useCallback(() => {
    const view = viewRef.current
    if (!view) return

    const resolvedThemeExtension = (() => {
      const baseTheme = getEditorTheme(isDarkMode)
      switch (themeMode) {
        case 'gruvbox-dark':    return [baseTheme, gruvboxDark]
        case 'gruvbox-light':   return [baseTheme, gruvboxLight]
        case 'catppuccin-dark': return [baseTheme, catppuccinDark]
        case 'catppuccin-light':return [baseTheme, catppuccinLight]
        default: return baseTheme
      }
    })()

    const resolvedHighlightExtension = (() => {
      switch (themeMode) {
        case 'gruvbox-dark':
        case 'gruvbox-light':
        case 'catppuccin-dark':
        case 'catppuccin-light':
          return [] as const
        default:
          return syntaxHighlighting(isDarkMode ? markdownHighlightStyleDark : markdownHighlightStyle)
      }
    })()

    view.dispatch({
      effects: [
        vimCompartment.reconfigure(vimModeEnabled ? vim() : []),
        themeCompartment.reconfigure(resolvedThemeExtension),
        highlightCompartment.reconfigure(resolvedHighlightExtension),
        relativeLineNumbersCompartment.reconfigure(
          relativeLineNumbersEnabled ? relativeLineNumbers() : []
        ),
        lineWrappingCompartment.reconfigure(lineWrappingEnabled ? EditorView.lineWrapping : []),
        tabIndentCompartment.reconfigure(tabAsSpaces(tabIndentUnit)),
        livePreviewImagesCompartment.reconfigure(
          createLivePreviewImages(selectedNotePath, rootDir || undefined)
        ),
        languageSupportCompartment.reconfigure([])
      ]
    })
  }, [
    viewRef,
    highlightCompartment,
    isDarkMode,
    themeMode,
    lineWrappingCompartment,
    lineWrappingEnabled,
    livePreviewImagesCompartment,
    relativeLineNumbersCompartment,
    relativeLineNumbersEnabled,
    selectedNotePath,
    tabIndentCompartment,
    tabIndentUnit,
    themeCompartment,
    vimCompartment,
    vimModeEnabled,
    rootDir,
    languageSupportCompartment
  ])

  // Re-apply settings whenever any setting changes
  useEffect(() => {
    applyEditorSettings()
  }, [applyEditorSettings])

  const compartments = {
    vim: vimCompartment,
    theme: themeCompartment,
    highlight: highlightCompartment,
    relativeLineNumbers: relativeLineNumbersCompartment,
    lineWrapping: lineWrappingCompartment,
    tabIndent: tabIndentCompartment,
    livePreviewImages: livePreviewImagesCompartment,
    languageSupport: languageSupportCompartment,
  }

  return {
    compartments,
    applyEditorSettings,
    reconfigureLanguage,
    // expose individual setting values so useEditorLifecycle can read them
    isDarkMode,
    vimModeEnabled,
    relativeLineNumbersEnabled,
    lineWrappingEnabled,
    tabIndentUnit,
  }
}
