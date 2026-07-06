import {
  ensureSyntaxTree,
  foldGutter,
  foldKeymap,
  LanguageDescription,
  LanguageSupport,
  syntaxHighlighting,
  syntaxTree
} from '@codemirror/language'
import { lintGutter } from '@codemirror/lint'
import { Compartment, EditorState, Prec } from '@codemirror/state'
import { drawSelection, EditorView, keymap } from '@codemirror/view'
import { autocompletion, closeBrackets } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { autoCloseTags } from '@codemirror/lang-html'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { vim } from '@replit/codemirror-vim'
import { indentationMarkers } from '@replit/codemirror-indentation-markers'
import { autoSavingTime } from '@shared/constants'
import { debounce, throttle } from 'lodash'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { relativeLineNumbers } from '../../code-mirror-ui/relativeLineNumbers'
import { checkboxExtension } from '../checkboxExtension'
import { createClipboardExperience } from '../clipboardExperience'
import { codeBlockBackground } from '../codeBlockBackground'
import { codeBlockCopy } from '../codeBlockCopy'
import * as commands from '../editorCommands'
import {
  getEditorTheme,
  gutterTheme,
  markdownHighlightStyle,
  markdownHighlightStyleDark
} from '../editorTheme'
import { markdownTableEnhancement } from '../extendTableEditing'
import { headingFoldExtension } from '../headingFold'
import { codeLanguages } from '../languageConfig'
import { createLivePreviewImages } from '../livePreviewImages'
import { markdownLivePreview } from '../markdownLivePreview'
import { markdownMarkupColors } from '../markdownMarkupColors'
import { quoteLineStyling } from '../quoteLineStyling'
import { tabAsSpaces } from '../tabAsSpaces'
import { tripleBacktickExtension } from '../tripleBacktick'
import { statusBarExtension } from '../statusbar'
import { editorSaveStateByPathAtom, saveNoteAtom } from '@renderer/store'
import { useSetAtom } from 'jotai'
import type { SelectedNote, ViewRef, DivRef } from './types'

interface Compartments {
  vim: Compartment
  theme: Compartment
  highlight: Compartment
  relativeLineNumbers: Compartment
  lineWrapping: Compartment
  tabIndent: Compartment
  livePreviewImages: Compartment
  languageSupport: Compartment
}

interface UseEditorLifecycleParams {
  selectedNote: SelectedNote | null
  editorRef: DivRef
  viewRef: ViewRef
  compartments: Compartments
  isDarkMode: boolean
  vimModeEnabled: boolean
  relativeLineNumbersEnabled: boolean
  lineWrappingEnabled: boolean
  tabIndentUnit: number
  rootDir: string
  reconfigureLanguage: (view: EditorView, support: LanguageSupport | []) => void
}

export function useEditorLifecycle({
  selectedNote,
  editorRef,
  viewRef,
  compartments,
  isDarkMode,
  vimModeEnabled,
  relativeLineNumbersEnabled,
  lineWrappingEnabled,
  tabIndentUnit,
  rootDir,
  reconfigureLanguage
}: UseEditorLifecycleParams) {
  const saveNote = useSetAtom(saveNoteAtom)
  const setEditorSaveStateByPath = useSetAtom(editorSaveStateByPathAtom)

  const [debouncedContent, setDebouncedContent] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const currentNotePathRef = useRef<string>('')
  const currentNoteTitleRef = useRef<string>('')
  const isSwitchingRef = useRef(false)
  const lastLanguageRef = useRef<string | null>(null)
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const suppressNativeFormatUntilRef = useRef({ bold: 0, italic: 0 })
  const lastPersistedContentRef = useRef('')
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryAttemptRef = useRef(0)

  const debouncedSetContent = useMemo(
    () => debounce((content: string) => setDebouncedContent(content), 300),
    []
  )

  const updateTrackedSaveState = useCallback(
    (path: string, state: { hasUnsavedChanges: boolean; hasSaveError: boolean }) => {
      if (!path) return
      setEditorSaveStateByPath((current) => ({
        ...current,
        [path]: state
      }))
    },
    [setEditorSaveStateByPath]
  )

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
  }, [])

  // ── Preview markdown transform ────────────────────────────────────────────
  const previewMarkdown = useMemo(() => {
    const lines = debouncedContent.split('\n')
    let inFence = false
    const replaced = lines
      .map((line) => {
        if (/^\s*```/.test(line)) {
          inFence = !inFence
          return line
        }
        if (inFence) return line
        return line.replace(/<kbd>(.*?)<\/kbd>/gi, (_, inner: string) => `\`kbd:${inner}\``)
      })
      .join('\n')

    return replaced.replace(/!\[\[(.*?)\]\]/g, '![$1]($1)')
  }, [debouncedContent])

  // ── Image helpers ─────────────────────────────────────────────────────────
  const extensionFromMimeType = useCallback((mimeType: string) => {
    switch (mimeType.toLowerCase()) {
      case 'image/png':
        return '.png'
      case 'image/jpeg':
        return '.jpg'
      case 'image/gif':
        return '.gif'
      case 'image/webp':
        return '.webp'
      case 'image/svg+xml':
        return '.svg'
      case 'image/bmp':
        return '.bmp'
      default:
        return ''
    }
  }, [])

  const importImageFilesAsMarkdownLinks = useCallback(
    async (files: File[]) => {
      if (!selectedNote?.path || files.length === 0) return []

      const insertedLinks: string[] = []

      for (const file of files) {
        const sourcePath = (file as File & { path?: string }).path
        const result = sourcePath
          ? await window.context.importImageToRootImageFolder({ sourcePath })
          : await (async () => {
              const buffer = new Uint8Array(await file.arrayBuffer())
              const originalName = file.name?.trim() || 'image'
              const hasExtension = /\.[a-z0-9]+$/i.test(originalName)
              const effectiveName = hasExtension
                ? originalName
                : `${originalName}${extensionFromMimeType(file.type)}`
              return window.context.importImageToRootImageFolder({
                fileName: effectiveName,
                data: buffer
              })
            })()

        if (result?.markdownPath) insertedLinks.push(`![[${result.markdownPath}]]`)
      }

      return insertedLinks
    },
    [extensionFromMimeType, selectedNote?.path]
  )

  const insertTextAtCursor = useCallback((view: EditorView, text: string) => {
    const selection = view.state.selection.main
    view.dispatch({
      changes: { from: selection.from, to: selection.to, insert: text },
      selection: { anchor: selection.from + text.length }
    })
    view.focus()
  }, [])

  const handleClipboardImagePaste = useCallback(
    async (clipboardData: DataTransfer) => {
      const itemFiles = Array.from(clipboardData.items ?? [])
        .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null)
      const imageFiles = itemFiles.length
        ? itemFiles
        : Array.from(clipboardData.files ?? []).filter((file) => file.type.startsWith('image/'))

      return importImageFilesAsMarkdownLinks(imageFiles)
    },
    [importImageFilesAsMarkdownLinks]
  )

  const handleEditorImageDrop = useCallback(
    async (event: DragEvent, view: EditorView) => {
      if (!selectedNote?.path) return false
      if (!event.dataTransfer?.files?.length) return false

      const imageFiles = Array.from(event.dataTransfer.files).filter((file) => {
        const lowerName = file.name.toLowerCase()
        return /^image\//.test(file.type) || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(lowerName)
      })

      if (imageFiles.length === 0) return false

      event.preventDefault()
      const insertedLinks = await importImageFilesAsMarkdownLinks(imageFiles)

      if (insertedLinks.length > 0) {
        insertTextAtCursor(view, `${insertedLinks.join('\n')}\n`)
      }

      return insertedLinks.length > 0
    },
    [importImageFilesAsMarkdownLinks, insertTextAtCursor, selectedNote?.path]
  )

  // ── Save logic ────────────────────────────────────────────────────────────
  const executeSave = useCallback(
    async (content: string, notePath: string) => {
      if (!notePath || selectedNote?.readError) return

      const isCurrentNote = currentNotePathRef.current === notePath

      if (isCurrentNote) {
        setSaveStatus('saving')
        setSaveError(null)
      }
      updateTrackedSaveState(notePath, { hasUnsavedChanges: true, hasSaveError: false })

      try {
        await saveNote({ newContent: content, path: notePath })
        if (currentNotePathRef.current === notePath) {
          lastPersistedContentRef.current = content
          retryAttemptRef.current = 0
          clearRetryTimer()
          setHasUnsavedChanges(false)
          setSaveStatus('saved')
          setSaveError(null)
        }
        updateTrackedSaveState(notePath, { hasUnsavedChanges: false, hasSaveError: false })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to save this note.'
        if (currentNotePathRef.current === notePath) {
          setHasUnsavedChanges(true)
          setSaveStatus('error')
          setSaveError(message)
        }
        updateTrackedSaveState(notePath, { hasUnsavedChanges: true, hasSaveError: true })
        throw error
      }
    },
    [clearRetryTimer, saveNote, selectedNote?.readError, updateTrackedSaveState]
  )

  const scheduleRetrySave = useCallback(
    (content: string, notePath: string) => {
      if (!notePath) return

      clearRetryTimer()
      const attempt = Math.min(retryAttemptRef.current + 1, 5)
      retryAttemptRef.current = attempt
      const delay = Math.min(30000, 1000 * 2 ** (attempt - 1))

      retryTimerRef.current = setTimeout(() => {
        saveQueueRef.current = saveQueueRef.current
          .then(() => executeSave(content, notePath))
          .catch(() => {
            if (currentNotePathRef.current === notePath) {
              scheduleRetrySave(content, notePath)
            }
          })
      }, delay)
    },
    [clearRetryTimer, executeSave]
  )

  const queueSave = useCallback(
    (content: string, notePath: string) => {
      saveQueueRef.current = saveQueueRef.current
        .then(() => executeSave(content, notePath))
        .catch(() => scheduleRetrySave(content, notePath))
      return saveQueueRef.current
    },
    [executeSave, scheduleRetrySave]
  )

  const debouncedSave = useMemo(
    () =>
      throttle(
        (content: string, notePath: string) => queueSave(content, notePath),
        autoSavingTime,
        { leading: false, trailing: true }
      ),
    [queueSave]
  )

  const handleBlurSave = useCallback(async () => {
    if (!currentNotePathRef.current || !viewRef.current || isSwitchingRef.current) return
    debouncedSave.flush()
  }, [debouncedSave, viewRef])

  const retrySaveNow = useCallback(() => {
    const view = viewRef.current
    const notePath = currentNotePathRef.current
    if (!view || !notePath) return

    const content = view.state.doc.toString()
    clearRetryTimer()
    retryAttemptRef.current = 0
    saveQueueRef.current = saveQueueRef.current
      .then(() => executeSave(content, notePath))
      .catch(() => scheduleRetrySave(content, notePath))
  }, [clearRetryTimer, executeSave, scheduleRetrySave, viewRef])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges && saveStatus !== 'error') return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges, saveStatus])

  useEffect(() => {
    return () => clearRetryTimer()
  }, [clearRetryTimer])

  // ── Base CodeMirror extensions ────────────────────────────────────────────
  const baseExtensions = useMemo(
    () => [
      history(),
      Prec.highest(
        keymap.of([
          {
            key: 'Mod-b',
            preventDefault: true,
            stopPropagation: true,
            run: (view) => {
              suppressNativeFormatUntilRef.current.bold = Date.now() + 150
              commands.applyFormat(view, '**', '**')
              return true
            }
          },
          {
            key: 'Mod-i',
            preventDefault: true,
            stopPropagation: true,
            run: (view) => {
              suppressNativeFormatUntilRef.current.italic = Date.now() + 150
              commands.applyFormat(view, '*', '*')
              return true
            }
          }
        ])
      ),
      keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap]),
      drawSelection(),
      closeBrackets(),
      autoCloseTags,
      gutterTheme,
      foldGutter(),
      markdown({ base: markdownLanguage, codeLanguages, addKeymap: true, completeHTMLTags: false }),
      lintGutter(),
      indentationMarkers({
        highlightActiveBlock: false,
        hideFirstIndent: true,
        markerType: 'codeOnly',
        thickness: 1,
        colors: {
          light: 'rgba(0, 0, 0, 0.05)',
          dark: 'rgba(255, 255, 255, 0.05)',
          activeLight: 'rgba(0, 0, 0, 0.1)',
          activeDark: 'rgba(255, 255, 255, 0.1)'
        }
      }),
      autocompletion({ activateOnTyping: true, icons: true }),
      markdownTableEnhancement,
      checkboxExtension,
      createClipboardExperience({ importImages: handleClipboardImagePaste }),
      statusBarExtension,
      codeBlockCopy,
      codeBlockBackground,
      quoteLineStyling,
      tripleBacktickExtension,
      markdownMarkupColors,
      markdownLivePreview,
      ...headingFoldExtension,
      EditorView.contentAttributes.of({ spellcheck: 'true' })
    ],
    [handleClipboardImagePaste]
  )

  // ── Main editor lifecycle (create / switch notes) ─────────────────────────
  useEffect(() => {
    if (!selectedNote?.path || selectedNote.readError || !editorRef.current) {
      debouncedSetContent.cancel()
      setDebouncedContent('')
      if (viewRef.current) {
        viewRef.current.destroy()
        viewRef.current = null
      }
      return
    }

    const buildState = (doc: string) =>
      EditorState.create({
        doc,
        selection: { anchor: 0 },
        extensions: [
          ...baseExtensions,
          compartments.vim.of(vimModeEnabled ? vim() : []),
          compartments.theme.of(getEditorTheme(isDarkMode)),
          compartments.highlight.of(
            syntaxHighlighting(isDarkMode ? markdownHighlightStyleDark : markdownHighlightStyle)
          ),
          compartments.relativeLineNumbers.of(
            relativeLineNumbersEnabled ? relativeLineNumbers() : []
          ),
          compartments.lineWrapping.of(lineWrappingEnabled ? EditorView.lineWrapping : []),
          compartments.tabIndent.of(tabAsSpaces(tabIndentUnit)),
          compartments.livePreviewImages.of(
            createLivePreviewImages(selectedNote?.path, rootDir || undefined)
          ),
          compartments.languageSupport.of([]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged || update.selectionSet) {
              const pos = update.state.selection.main.head

              const tree = ensureSyntaxTree(update.state, pos, 50) || syntaxTree(update.state)
              const node = tree.resolveInner(pos, -1)
              let fence = node
              while (fence && fence.name !== 'FencedCode') {
                fence = fence.parent!
                if (!fence) break
              }

              let langName: string | null = null
              if (fence) {
                const info = fence.getChild('CodeInfo')
                if (info) {
                  langName = update.state
                    .sliceDoc(info.from, info.to)
                    .trim()
                    .split(/\s+/)[0]
                    .toLowerCase()
                }
              }

              if (langName !== lastLanguageRef.current) {
                lastLanguageRef.current = langName

                if (langName) {
                  const desc =
                    LanguageDescription.matchLanguageName(codeLanguages, langName) ||
                    LanguageDescription.matchFilename(codeLanguages, `f.${langName}`)

                  if (desc) {
                    const requestedPath = currentNotePathRef.current
                    const requestedView = update.view
                    desc
                      .load()
                      .then((support) => {
                        if (
                          lastLanguageRef.current === langName &&
                          currentNotePathRef.current === requestedPath &&
                          viewRef.current === requestedView
                        ) {
                          reconfigureLanguage(requestedView, support)
                        }
                      })
                      .catch(() => {
                        if (
                          lastLanguageRef.current === langName &&
                          currentNotePathRef.current === requestedPath &&
                          viewRef.current === requestedView
                        ) {
                          reconfigureLanguage(requestedView, [])
                        }
                      })
                  } else {
                    reconfigureLanguage(update.view, [])
                  }
                } else {
                  reconfigureLanguage(update.view, [])
                }
              }
            }
            if (update.docChanged && !isSwitchingRef.current) {
              const content = update.state.doc.toString()
              const notePath = currentNotePathRef.current
              const dirty = content !== lastPersistedContentRef.current
              setHasUnsavedChanges(dirty)
              if (dirty) {
                setSaveStatus('saving')
                updateTrackedSaveState(notePath, { hasUnsavedChanges: true, hasSaveError: false })
              }
              debouncedSetContent(content)
              debouncedSave(content, notePath)
            }
          }),
          EditorView.domEventHandlers({
            beforeinput: (event, view) => {
              const inputType = (event as InputEvent).inputType
              if (inputType !== 'formatBold' && inputType !== 'formatItalic') return false

              const now = Date.now()
              if (inputType === 'formatBold' && now < suppressNativeFormatUntilRef.current.bold) {
                event.preventDefault()
                return true
              }
              if (
                inputType === 'formatItalic' &&
                now < suppressNativeFormatUntilRef.current.italic
              ) {
                event.preventDefault()
                return true
              }

              event.preventDefault()
              if (inputType === 'formatBold') commands.applyFormat(view, '**', '**')
              else commands.applyFormat(view, '*', '*')
              return true
            },
            blur: () => {
              handleBlurSave()
              return false
            },
            dragover: (event) => {
              if (!event.dataTransfer?.files?.length) return false
              event.preventDefault()
              return true
            },
            drop: (event, view) => {
              if (!event.dataTransfer?.files?.length) return false
              void handleEditorImageDrop(event, view)
              return true
            }
          })
        ]
      })

    const ensureView = () => {
      if (viewRef.current) return
      viewRef.current = new EditorView({ state: buildState(''), parent: editorRef.current! })
    }

    const switchNote = () => {
      isSwitchingRef.current = true
      ensureView()

      const newTitle = selectedNote.title
      const newContent = selectedNote.content

      debouncedSave.flush()

      currentNoteTitleRef.current = newTitle
      currentNotePathRef.current = selectedNote.path
      lastPersistedContentRef.current = newContent
      lastLanguageRef.current = null
      clearRetryTimer()
      retryAttemptRef.current = 0
      setHasUnsavedChanges(false)
      setSaveStatus('saved')
      setSaveError(null)
      updateTrackedSaveState(selectedNote.path, { hasUnsavedChanges: false, hasSaveError: false })

      debouncedSetContent.cancel()
      setDebouncedContent(newContent)

      const view = viewRef.current
      if (view) {
        view.setState(buildState(newContent))
      }
      isSwitchingRef.current = false
    }

    switchNote()
    return () => {
      debouncedSave.cancel()
    }
    // Intentionally only re-runs on note path change; compartments/settings
    // are reconfigured separately by applyEditorSettings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedNote?.path,
    selectedNote?.readError,
    baseExtensions,
    debouncedSave,
    handleBlurSave,
    handleEditorImageDrop,
    clearRetryTimer,
    updateTrackedSaveState
  ])

  // Sync editor when selectedNote content resolves asynchronously
  useEffect(() => {
    if (!selectedNote?.path || selectedNote.readError) return
    if (selectedNote.path !== currentNotePathRef.current) return
    if (isSwitchingRef.current) return

    const view = viewRef.current
    if (!view) return

    const editorContent = view.state.doc.toString()
    const incomingContent = selectedNote.content

    if (editorContent === '' && incomingContent !== '') {
      debouncedSetContent.cancel()
      setDebouncedContent(incomingContent)
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: incomingContent },
        selection: { anchor: 0 }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNote?.content, selectedNote?.path, selectedNote?.readError])

  // Destroy editor if no note selected
  useEffect(() => {
    if ((!selectedNote?.path || selectedNote.readError) && viewRef.current) {
      viewRef.current.destroy()
      viewRef.current = null
    }
  }, [selectedNote?.path, selectedNote?.readError, viewRef])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (viewRef.current) {
        viewRef.current.destroy()
        viewRef.current = null
      }
      debouncedSave.cancel()
      clearRetryTimer()
    }
  }, [clearRetryTimer, debouncedSave, viewRef])

  return {
    debouncedContent,
    setDebouncedContent,
    previewMarkdown,
    insertTextAtCursor,
    handleEditorImageDrop,
    handleClipboardImagePaste,
    handleBlurSave,
    saveStatus,
    saveError,
    hasUnsavedChanges,
    retrySaveNow
  }
}
