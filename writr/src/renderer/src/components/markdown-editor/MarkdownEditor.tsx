'use client'
import { Children, isValidElement, useEffect, useRef, useCallback, useMemo, useState, memo, startTransition, type ReactNode } from 'react'
import { Compartment, EditorState, Prec } from '@codemirror/state'
import { EditorView, keymap, drawSelection } from '@codemirror/view'
import { defaultKeymap, historyKeymap, history } from '@codemirror/commands'
import { vim } from '@replit/codemirror-vim'
import { throttle, debounce } from 'lodash'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import {
  createNoteAtom,
  lineWrappingEnabledAtom,
  noteStatusByPathAtom,
  noteTagByPathAtom,
  relativeLineNumbersEnabledAtom,
  saveNoteAtom,
  selectedNoteAtom,
  showToolbarAtom,
  tabIndentUnitAtom,
  vimModeEnabledAtom,
} from '@renderer/store'
import { autoSavingTime } from '@shared/constants'
import ReactMarkdown from 'react-markdown'
import { relativeLineNumbers } from '../code-mirror-ui/relativeLineNumbers'
import { HiOutlineEye } from "react-icons/hi2";
import { markdown } from '@codemirror/lang-markdown'
import { syntaxHighlighting } from '@codemirror/language'
import { markdownLanguage } from "@codemirror/lang-markdown"
import SyntaxHighlighter from 'react-syntax-highlighter'
import { vs, vs2015 } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import { gutterTheme, getEditorTheme, markdownHighlightStyle, markdownHighlightStyleDark } from './editorTheme'
import { codeLanguages } from './languageConfig'
import { autocompletion, closeBrackets } from '@codemirror/autocomplete'
import { autoCloseTags } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { rust } from '@codemirror/lang-rust'
import { php } from '@codemirror/lang-php'
import { typescriptLanguage } from '@codemirror/lang-javascript'
import { go } from '@codemirror/lang-go'
import { cpp } from '@codemirror/lang-cpp'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { java } from '@codemirror/lang-java'
import { sql } from '@codemirror/lang-sql'
import { indentationMarkers } from '@replit/codemirror-indentation-markers'
import { checkboxExtension } from './checkboxExtension'
import { statusBarExtension } from './statusbar'
import remarkGfm from 'remark-gfm'
import { MermaidDiagram } from './MermaidDiagram'
import { MarkdownToolbar } from './MarkdownToolbar'
const MarkdownToolbarMemo = memo(MarkdownToolbar)
import { tabAsSpaces } from './tabAsSpaces'
import { twMerge } from 'tailwind-merge'
import { markdownTableEnhancement } from './extendTableEditing'
import { codeBlockCopy } from './codeBlockCopy'
import { codeBlockBackground } from './codeBlockBackground'
import { createLivePreviewImages } from './livePreviewImages'
import { toLocalFileUrl } from './localFileUrl'
import { tripleBacktickExtension } from './tripleBacktick'
import { quoteLineStyling } from './quoteLineStyling'
import { MdDragIndicator } from "react-icons/md";
import { ContextMenu, ContextMenuItem } from '../ContextMenu'
import * as commands from './editorCommands'
import { CommandPaletteModal, type CommandPaletteItem } from './CommandPaletteModal'
import { markdownMarkupColors } from './markdownMarkupColors'
import { 
  FaBold, FaItalic, FaStrikethrough, FaQuoteRight, 
  FaListUl, FaCheckSquare, FaCode, 
  FaLink, FaImage, FaTable, FaHeading, FaKeyboard
} from 'react-icons/fa'
import { MdHorizontalRule } from 'react-icons/md'
import { VscSparkle } from 'react-icons/vsc'
import { VscChevronDown, VscChromeClose, VscError, VscInfo, VscLightbulb, VscSplitHorizontal, VscWarning } from 'react-icons/vsc'
import { AiModelInfo } from '@shared/types'
import { NOTE_STATUS_META, NOTE_STATUS_VALUES } from '@renderer/constants/noteStatus'
import { CUSTOM_TAG_STYLE } from '@renderer/constants/noteTag'
import { MoreActionsMenu } from './MoreActionsMenu'

export const MarkdownEditor = () => {
  const selectedNote = useAtomValue(selectedNoteAtom)
  const [noteStatuses, setNoteStatuses] = useAtom(noteStatusByPathAtom)
  const [noteTags, setNoteTags] = useAtom(noteTagByPathAtom)
  const saveNote = useSetAtom(saveNoteAtom)
  const createNote = useSetAtom(createNoteAtom)
  const showToolbar = useAtomValue(showToolbarAtom)
  const relativeLineNumbersEnabled = useAtomValue(relativeLineNumbersEnabledAtom)
  const lineWrappingEnabled = useAtomValue(lineWrappingEnabledAtom)
  const tabIndentUnit = useAtomValue(tabIndentUnitAtom)
  const vimModeEnabled = useAtomValue(vimModeEnabledAtom)
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const currentNotePathRef = useRef<string>('')

  const containerRef = useRef<HTMLDivElement>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const dragBarRef = useRef<HTMLDivElement>(null)

  const currentNoteTitleRef = useRef<string>('')
  const isSwitchingRef = useRef(false)
  const lastScrollPercentageRef = useRef<number>(0)
  const [isPreview, setIsPreview] = useState(false)
  const [isFullPreview, setIsFullPreview] = useState(false) // New state for full preview
  const [currentContent, setCurrentContent] = useState('')
  const [debouncedContent, setDebouncedContent] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [rootDir, setRootDir] = useState<string>('')
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [exportNotice, setExportNotice] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiModels, setAiModels] = useState<AiModelInfo[]>([])
  const [selectedAiModel, setSelectedAiModel] = useState('')
  const [aiApiKey, setAiApiKey] = useState('')
  const [isLoadingAiModels, setIsLoadingAiModels] = useState(false)
  const [isGeneratingWithAi, setIsGeneratingWithAi] = useState(false)
  const [aiProgress, setAiProgress] = useState(0)
  const [aiError, setAiError] = useState<string | null>(null)
  const [showFAB, setShowFAB] = useState(false)

  const previewReadableWidthClass = 'w-full min-w-0 max-w-[860px]'

  const suppressNativeFormatUntilRef = useRef({ bold: 0, italic: 0 })

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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      const isModP = key === 'p' && (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey
      if (!isModP) return

      if (isFullPreview) return
      if (isAiModalOpen) return
      if (!selectedNote?.path) return

      e.preventDefault()
      e.stopPropagation()
      setContextMenu(null)
      setIsCommandPaletteOpen(true)
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [isAiModalOpen, isFullPreview, selectedNote?.path])

  useEffect(() => {
    if (!selectedNote?.path) setIsCommandPaletteOpen(false)
  }, [selectedNote?.path])

  const getReactNodeText = useCallback((node: unknown): string => {
    if (node == null) return ''
    if (typeof node === 'string' || typeof node === 'number') return String(node)
    if (Array.isArray(node)) return node.map(getReactNodeText).join('')
    if (isValidElement(node)) return getReactNodeText((node.props as any)?.children)
    return ''
  }, [])

  const getCalloutMeta = useCallback((type: string) => {
    const upper = type.toUpperCase()
    const isDark = isDarkMode

    const make = (
      label: string,
      Icon: any,
      colors: { light: { border: string; fg: string }; dark: { border: string; fg: string } }
    ) => {
      const c = isDark ? colors.dark : colors.light
      return { label, Icon, ...c }
    }

    switch (upper) {
      case 'NOTE':
        return make('Note', VscInfo, {
          light: { border: '#3b82f6', fg: '#2563eb' },
          dark: { border: '#60a5fa', fg: '#93c5fd' },
        })
      case 'TIP':
        return make('Tip', VscLightbulb, {
          light: { border: '#22c55e', fg: '#16a34a' },
          dark: { border: '#34d399', fg: '#6ee7b7' },
        })
      case 'IMPORTANT':
        return make('Important', VscWarning, {
          light: { border: '#a855f7', fg: '#a855f7' },
          dark: { border: '#c084fc', fg: '#d8b4fe' },
        })
      case 'WARNING':
        return make('Warning', VscWarning, {
          light: { border: '#f97316', fg: '#f97316' },
          dark: { border: '#fb923c', fg: '#fdba74' },
        })
      case 'CAUTION':
        return make('Caution', VscError, {
          light: { border: '#ef4444', fg: '#ef4444' },
          dark: { border: '#f87171', fg: '#fecaca' },
        })
      default:
        return null
    }
  }, [isDarkMode])

  const vimCompartment = useMemo(() => new Compartment(), [])
  const themeCompartment = useMemo(() => new Compartment(), [])
  const highlightCompartment = useMemo(() => new Compartment(), [])
  const relativeLineNumbersCompartment = useMemo(() => new Compartment(), [])
  const lineWrappingCompartment = useMemo(() => new Compartment(), [])
  const tabIndentCompartment = useMemo(() => new Compartment(), [])
  const livePreviewImagesCompartment = useMemo(() => new Compartment(), [])

  const applyEditorSettings = useCallback(() => {
    const view = viewRef.current
    if (!view) return

    view.dispatch({
      effects: [
        vimCompartment.reconfigure(vimModeEnabled ? vim() : []),
        themeCompartment.reconfigure(getEditorTheme(isDarkMode)),
        highlightCompartment.reconfigure(
          syntaxHighlighting(isDarkMode ? markdownHighlightStyleDark : markdownHighlightStyle)
        ),
        relativeLineNumbersCompartment.reconfigure(
          relativeLineNumbersEnabled ? relativeLineNumbers() : []
        ),
        lineWrappingCompartment.reconfigure(lineWrappingEnabled ? EditorView.lineWrapping : []),
        tabIndentCompartment.reconfigure(tabAsSpaces(tabIndentUnit)),
        livePreviewImagesCompartment.reconfigure(createLivePreviewImages(selectedNote?.path, rootDir || undefined)),
      ],
    })
  }, [
    highlightCompartment,
    isDarkMode,
    lineWrappingCompartment,
    lineWrappingEnabled,
    livePreviewImagesCompartment,
    relativeLineNumbersCompartment,
    relativeLineNumbersEnabled,
    selectedNote?.path,
    tabIndentCompartment,
    tabIndentUnit,
    themeCompartment,
    vimCompartment,
    vimModeEnabled,
    rootDir,
  ])

  useEffect(() => {
    let cancelled = false
    void window.context
      .getRootDir()
      .then((dir) => {
        if (!cancelled) setRootDir(dir)
      })
      .catch((error) => console.error('Failed to get root dir:', error))

    return () => {
      cancelled = true
    }
  }, [])

  // Save queue management
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const isSavingRef = useRef(false)

  const currentNoteStatus = selectedNote?.path ? noteStatuses[selectedNote.path] : undefined
  const currentNoteTag = selectedNote?.path ? noteTags[selectedNote.path] : undefined
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    setTagInput('')
  }, [selectedNote?.path])

  useEffect(() => {
    const getIsDarkMode = () => {
      if (document.documentElement.classList.contains('dark')) return true
      if (document.documentElement.classList.contains('light')) return false
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    const checkDarkMode = () => {
      setIsDarkMode(getIsDarkMode())
    }

    checkDarkMode()
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', checkDarkMode)

    return () => {
      observer.disconnect()
      mediaQuery.removeEventListener('change', checkDarkMode)
    }
  }, [])

  const debouncedSetContent = useMemo(
    () => debounce((content: string) => setDebouncedContent(content), 300),
    []
  )

  useEffect(() => {
    startTransition(() => {
      debouncedSetContent(currentContent)
    })
    return debouncedSetContent.cancel
  }, [currentContent, debouncedSetContent])

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
            },
          },
          {
            key: 'Mod-i',
            preventDefault: true,
            stopPropagation: true,
            run: (view) => {
              suppressNativeFormatUntilRef.current.italic = Date.now() + 150
              commands.applyFormat(view, '*', '*')
              return true
            },
          },
        ])
      ),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      drawSelection(),
      closeBrackets(),
      autoCloseTags,
      gutterTheme,
      markdown({ base: markdownLanguage, codeLanguages, addKeymap: true, completeHTMLTags: false }),
      javascript(),
      python(),
      rust(),
      html(),
      php(),
      go(),
      java(),
      cpp(),
      css(),
      sql(),
      typescriptLanguage,
      indentationMarkers({
        highlightActiveBlock: false,
        hideFirstIndent: true,
        markerType: 'codeOnly',
        thickness: 1,
        colors: {
          light: 'rgba(0, 0, 0, 0.05)',
          dark: 'rgba(255, 255, 255, 0.05)',
          activeLight: 'rgba(0, 0, 0, 0.1)',
          activeDark: 'rgba(255, 255, 255, 0.1)',
        },
      }),
      autocompletion({ activateOnTyping: true, icons: true }),
      markdownTableEnhancement,
      checkboxExtension,
      statusBarExtension,
      codeBlockCopy,
      codeBlockBackground,
      quoteLineStyling,
      tripleBacktickExtension,
      markdownMarkupColors,
    ],
    [
      highlightCompartment,
      isDarkMode,
      lineWrappingCompartment,
      livePreviewImagesCompartment,
      relativeLineNumbersCompartment,
      tabIndentCompartment,
      themeCompartment,
      vimCompartment,
    ]
  )

  // Optimized save function with queue
  const executeSave = useCallback(
    async (content: string, notePath: string) => {
      // Don't bail out if currentNoteTitleRef doesn't match; we might be flushing a save for a previous note!
      isSavingRef.current = true
      try {
        await saveNote({ newContent: content, path: notePath })
      } catch (error) {
        console.error('Save failed:', error)
      } finally {
        isSavingRef.current = false
      }
    },
    [saveNote]
  )

  const queueSave = useCallback(
    (content: string, notePath: string) => {
      saveQueueRef.current = saveQueueRef.current.then(() =>
        executeSave(content, notePath)
      )
      return saveQueueRef.current
    },
    [executeSave]
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
    // When focus is lost, we save the content of whatever is currently loaded in the CodeMirror view.
    if (!currentNotePathRef.current || !viewRef.current || isSwitchingRef.current) return
    const content = viewRef.current.state.doc.toString()
    const notePath = currentNotePathRef.current
    debouncedSave.flush()
    await queueSave(content, notePath)
  }, [queueSave, debouncedSave])

  const insertTextAtCursor = useCallback((view: EditorView, text: string) => {
    const selection = view.state.selection.main
    view.dispatch({
      changes: { from: selection.from, to: selection.to, insert: text },
      selection: { anchor: selection.from + text.length }
    })
    view.focus()
  }, [])

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

      const insertedLinks: string[] = []
      const extensionFromMimeType = (mimeType: string) => {
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
      }

      for (const file of imageFiles) {
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
                data: buffer,
              })
            })()

        if (result?.markdownPath) insertedLinks.push(`![[${result.markdownPath}]]`)
      }

      if (insertedLinks.length > 0) {
        insertTextAtCursor(view, `${insertedLinks.join('\n')}\n`)
      }

      return insertedLinks.length > 0
    },
    [insertTextAtCursor, selectedNote?.path]
  )

  const handleExportPdf = useCallback(async () => {
    if (!selectedNote?.path) return
    setIsExportingPdf(true)
    try {
      const latestContent = viewRef.current?.state.doc.toString() ?? currentContent
      const success = await window.context.exportNoteToPdf(
        selectedNote.path,
        selectedNote.title,
        latestContent
      )
      if (success) {
        setExportNotice('PDF exported successfully')
      }
    } finally {
      setIsExportingPdf(false)
    }
  }, [currentContent, selectedNote?.path, selectedNote?.title])

  useEffect(() => {
    if (!exportNotice) return
    const timer = window.setTimeout(() => setExportNotice(null), 2200)
    return () => window.clearTimeout(timer)
  }, [exportNotice])

  const openAiModal = useCallback(async () => {
    setContextMenu(null)
    setIsAiModalOpen(true)
    setAiError(null)
    setIsLoadingAiModels(true)

    const storedKey = localStorage.getItem('writr-openrouter-api-key') || ''
    setAiApiKey(storedKey)

    try {
      const models = await window.context.listFreeAiModels(storedKey || undefined)
      setAiModels(models)
      setSelectedAiModel((prev) => prev || models[0]?.id || '')
    } catch (error) {
      console.error('Failed to load AI models:', error)
      setAiError('Failed to load models.')
    } finally {
      setIsLoadingAiModels(false)
    }
  }, [])

  type EditorMenuEntry =
    | { type: 'separator'; id: string }
    | {
        type: 'item'
        id: string
        label: string
        icon?: ReactNode
        shortcut?: string
        keywords?: string[]
        run: () => void
      }

  const editorMenuEntries: EditorMenuEntry[] = useMemo(
    () => [
      {
        type: 'item',
        id: 'bold',
        label: 'Bold',
        icon: <FaBold className="h-3 w-3 opacity-60" />,
        shortcut: 'Ctrl+B',
        keywords: ['strong'],
        run: () => commands.applyFormat(viewRef.current, '**', '**'),
      },
      {
        type: 'item',
        id: 'italic',
        label: 'Italic',
        icon: <FaItalic className="h-3 w-3 opacity-60" />,
        shortcut: 'Ctrl+I',
        keywords: ['emphasis'],
        run: () => commands.applyFormat(viewRef.current, '*', '*'),
      },
      {
        type: 'item',
        id: 'strikethrough',
        label: 'Strikethrough',
        icon: <FaStrikethrough className="h-3 w-3 opacity-60" />,
        shortcut: 'Ctrl+D',
        keywords: ['strike'],
        run: () => commands.applyFormat(viewRef.current, '~~', '~~'),
      },
      {
        type: 'item',
        id: 'kbd',
        label: 'Keyboard Key',
        icon: <FaKeyboard className="h-3 w-3 opacity-60" />,
        keywords: ['kbd', 'keyboard', 'key', 'shortcut'],
        run: () => commands.insertKbd(viewRef.current),
      },
      {
        type: 'item',
        id: 'write-with-ai',
        label: 'Write with AI',
        icon: <VscSparkle className="h-3 w-3 opacity-60" />,
        keywords: ['ai', 'generate', 'rewrite'],
        run: () => void openAiModal(),
      },
      { type: 'separator', id: 'sep-1' },
      {
        type: 'item',
        id: 'header-1',
        label: 'Header 1',
        icon: <FaHeading className="h-3 w-3 opacity-60" />,
        keywords: ['heading', 'h1', 'title'],
        run: () => commands.applyHeaderFormat(viewRef.current, 1),
      },
      {
        type: 'item',
        id: 'header-2',
        label: 'Header 2',
        icon: <FaHeading className="h-3 w-3 opacity-60" />,
        keywords: ['heading', 'h2'],
        run: () => commands.applyHeaderFormat(viewRef.current, 2),
      },
      {
        type: 'item',
        id: 'header-3',
        label: 'Header 3',
        icon: <FaHeading className="h-3 w-3 opacity-60" />,
        keywords: ['heading', 'h3'],
        run: () => commands.applyHeaderFormat(viewRef.current, 3),
      },
      { type: 'separator', id: 'sep-2' },
      {
        type: 'item',
        id: 'quote',
        label: 'Quote',
        icon: <FaQuoteRight className="h-3 w-3 opacity-60" />,
        shortcut: 'Ctrl+Q',
        keywords: ['blockquote'],
        run: () => commands.applyLineFormat(viewRef.current, '> '),
      },
      {
        type: 'item',
        id: 'bullet-list',
        label: 'Bullet List',
        icon: <FaListUl className="h-3 w-3 opacity-60" />,
        shortcut: 'Ctrl+L',
        keywords: ['list', 'unordered'],
        run: () => commands.applyLineFormat(viewRef.current, '- '),
      },
      {
        type: 'item',
        id: 'task-list',
        label: 'Task List',
        icon: <FaCheckSquare className="h-3 w-3 opacity-60" />,
        shortcut: 'Ctrl+T',
        keywords: ['checkbox', 'todo'],
        run: () => commands.insertCheckbox(viewRef.current),
      },
      { type: 'separator', id: 'sep-3' },
      {
        type: 'item',
        id: 'link',
        label: 'Link',
        icon: <FaLink className="h-3 w-3 opacity-60" />,
        shortcut: 'Ctrl+K',
        keywords: ['url', 'hyperlink'],
        run: () => commands.applyLinkFormat(viewRef.current),
      },
      {
        type: 'item',
        id: 'image',
        label: 'Image',
        icon: <FaImage className="h-3 w-3 opacity-60" />,
        keywords: ['img', 'picture'],
        run: () => commands.applyImageFormat(viewRef.current),
      },
      {
        type: 'item',
        id: 'table',
        label: 'Table',
        icon: <FaTable className="h-3 w-3 opacity-60" />,
        shortcut: 'Ctrl+Shift+T',
        keywords: ['grid'],
        run: () => commands.insertTable(viewRef.current),
      },
      {
        type: 'item',
        id: 'horizontal-rule',
        label: 'Horizontal Rule',
        icon: <MdHorizontalRule className="h-3 w-3 opacity-60" />,
        shortcut: 'Ctrl+H',
        keywords: ['divider', 'hr'],
        run: () => commands.insertHorizontalRule(viewRef.current),
      },
      { type: 'separator', id: 'sep-4' },
      {
        type: 'item',
        id: 'code-block',
        label: 'Code Block',
        icon: <FaCode className="h-3 w-3 opacity-60" />,
        shortcut: 'Ctrl+Shift+`',
        keywords: ['code', 'fence', 'triple backtick'],
        run: () => commands.insertCodeBlock(viewRef.current),
      },
    ],
    [openAiModal]
  )

  const commandPaletteItems: CommandPaletteItem[] = useMemo(
    () =>
      editorMenuEntries
        .filter((e): e is Extract<EditorMenuEntry, { type: 'item' }> => e.type === 'item')
        .map(({ id, label, icon, shortcut, keywords, run }) => ({
          id,
          label,
          icon,
          shortcut,
          keywords,
          run,
        })),
    [editorMenuEntries]
  )

  const insertAiText = useCallback((text: string) => {
    const view = viewRef.current
    if (!view) return

    const selection = view.state.selection.main
    view.dispatch({
      changes: { from: selection.from, to: selection.to, insert: text },
      selection: { anchor: selection.from + text.length }
    })
    view.focus()
  }, [])

  const handleGenerateWithAi = useCallback(async () => {
    if (!viewRef.current) return

    const prompt = aiPrompt.trim()
    if (!prompt) {
      setAiError('Prompt is required.')
      return
    }
    if (!selectedAiModel) {
      setAiError('Please select a model.')
      return
    }

    setIsGeneratingWithAi(true)
    setAiError(null)
    localStorage.setItem('writr-openrouter-api-key', aiApiKey.trim())

    try {
      const currentContent = viewRef.current.state.doc.toString()
      const result = await window.context.generateWithAi({
        model: selectedAiModel,
        prompt,
        content: currentContent,
        apiKey: aiApiKey.trim() || undefined
      })

      if ('error' in result) {
        setAiError(result.error)
        return
      }

      insertAiText(result.text)
      setIsAiModalOpen(false)
      setAiPrompt('')
    } catch (error) {
      console.error('AI generation failed:', error)
      setAiError('Failed to generate text.')
    } finally {
      setIsGeneratingWithAi(false)
    }
  }, [aiApiKey, aiPrompt, insertAiText, selectedAiModel])

  useEffect(() => {
    if (!isGeneratingWithAi) {
      setAiProgress(0)
      return
    }

    setAiProgress(8)
    const timer = window.setInterval(() => {
      setAiProgress((prev) => {
        if (prev >= 92) return prev
        return prev + Math.max(1, Math.round((100 - prev) / 12))
      })
    }, 280)

    return () => window.clearInterval(timer)
  }, [isGeneratingWithAi])

  // Initialize editor (once per mount) + switch documents without recreating the view
  useEffect(() => {
    if (!selectedNote?.path || !editorRef.current) {
      setCurrentContent('')
      return
    }

    const buildState = (doc: string) =>
      EditorState.create({
        doc,
        selection: { anchor: 0 },
        extensions: [
          ...baseExtensions,
          vimCompartment.of(vimModeEnabled ? vim() : []),
          themeCompartment.of(getEditorTheme(isDarkMode)),
          highlightCompartment.of(
            syntaxHighlighting(isDarkMode ? markdownHighlightStyleDark : markdownHighlightStyle)
          ),
          relativeLineNumbersCompartment.of(
            relativeLineNumbersEnabled ? relativeLineNumbers() : []
          ),
          lineWrappingCompartment.of(lineWrappingEnabled ? EditorView.lineWrapping : []),
          tabIndentCompartment.of(tabAsSpaces(tabIndentUnit)),
          livePreviewImagesCompartment.of(createLivePreviewImages(selectedNote?.path, rootDir || undefined)),
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !isSwitchingRef.current) {
              const content = update.state.doc.toString()
              setCurrentContent(content)
              debouncedSave(content, currentNotePathRef.current)
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
              if (inputType === 'formatItalic' && now < suppressNativeFormatUntilRef.current.italic) {
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
            },
          }),
        ],
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
  
        // FLUSH pending debounced saves for the OLD note before replacing refs
        // This prevents data loss when rapidly switching tabs while typing
        debouncedSave.flush()
  
        currentNoteTitleRef.current = newTitle
        currentNotePathRef.current = selectedNote.path
        
        // Update state immediately for visual snappiness
        setCurrentContent(newContent)
        startTransition(() => {
          setDebouncedContent(newContent)
        })
  
        const view = viewRef.current
        if (view) {
          // Replace state entirely to reset undo history and prevent Ctrl+Z cross-contamination
          view.setState(buildState(newContent))
        }
        applyEditorSettings()
        isSwitchingRef.current = false
      }
  
      switchNote()
    return () => {
      debouncedSave.cancel()
    }
  }, [
    selectedNote?.path,
    baseExtensions,
    debouncedSave,
    handleBlurSave,
    handleEditorImageDrop,
    applyEditorSettings,
  ])

  useEffect(() => {
    applyEditorSettings()
  }, [applyEditorSettings])

  // Destroy editor if no note is selected
  useEffect(() => {
    if (!selectedNote?.path && viewRef.current) {
        viewRef.current.destroy()
        viewRef.current = null
    }
  }, [selectedNote?.path])

  // Clean up editor
  useEffect(() => {
    return () => {
      if (viewRef.current) {
        viewRef.current.destroy()
        viewRef.current = null
      }
      debouncedSave.cancel()
    }
  }, [debouncedSave])

  // Draggable resize
  useEffect(() => {
    if (!isPreview || isFullPreview) return // Disabled for full preview mode
    const dragBar = dragBarRef.current
    const editor = editorContainerRef.current
    const preview = previewContainerRef.current
    if (!dragBar || !editor || !preview) return

    let startX = 0
    let startWidth = 0

    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX
      const newWidth = startWidth + delta
      const containerWidth = containerRef.current?.offsetWidth || 1
      const minWidth = containerWidth * 0.2
      const maxWidth = containerWidth * 0.8
      const clampedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth)
      editor.style.width = `${clampedWidth}px`
      preview.style.width = `${containerWidth - clampedWidth}px`
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    const onMouseDown = (e: MouseEvent) => {
      startX = e.clientX
      startWidth = editor.offsetWidth
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    }

    dragBar.addEventListener('mousedown', onMouseDown)
    return () => {
      dragBar.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [isPreview, isFullPreview])

  // FAB Visibility & Inactivity Timer
  const fabTimerRef = useRef<any>(null)

  useEffect(() => {
    const fabThreshold = 5
    const inactivityTimeout = 10000 // 10 seconds
    
    const showAndResetTimer = () => {
        setShowFAB(true)
        if (fabTimerRef.current) clearTimeout(fabTimerRef.current)
        fabTimerRef.current = setTimeout(() => {
            setShowFAB(false)
        }, inactivityTimeout)
    }

    const handleScroll = (e: Event) => {
        const target = e.target as HTMLElement
        if (target.scrollTop !== undefined && target.scrollTop > fabThreshold) {
            showAndResetTimer()
        }
    }

    const handleMouseMove = () => {
        showAndResetTimer()
    }

    const container = containerRef.current
    if (container) {
        container.addEventListener('scroll', handleScroll, true)
        container.addEventListener('mousemove', handleMouseMove)
    }

    return () => {
        container?.removeEventListener('scroll', handleScroll, true)
        container?.removeEventListener('mousemove', handleMouseMove)
        if (fabTimerRef.current) clearTimeout(fabTimerRef.current)
    }
  }, [selectedNote?.path, isPreview, isFullPreview])

  useEffect(() => {
      // Reset FAB when switching notes
      setShowFAB(false)
  }, [selectedNote?.path])

  const captureScrollPercentage = useCallback(() => {
    if (isFullPreview) {
      if (previewContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = previewContainerRef.current
        if (scrollHeight > clientHeight) {
          lastScrollPercentageRef.current = scrollTop / (scrollHeight - clientHeight)
        }
      }
    } else {
      if (viewRef.current) {
        const { scrollDOM } = viewRef.current
        const { scrollTop, scrollHeight, clientHeight } = scrollDOM
        if (scrollHeight > clientHeight) {
          lastScrollPercentageRef.current = scrollTop / (scrollHeight - clientHeight)
        }
      }
    }
  }, [isFullPreview])

  const restoreScrollPosition = useCallback(() => {
    const percentage = lastScrollPercentageRef.current
    if (percentage <= 0) return

    // Restore Editor Scroll
    if (viewRef.current) {
      const { scrollDOM } = viewRef.current
      const { scrollHeight, clientHeight } = scrollDOM
      if (scrollHeight > clientHeight) {
        scrollDOM.scrollTop = percentage * (scrollHeight - clientHeight)
      }
    }

    // Restore Preview Scroll
    if (previewContainerRef.current) {
      const { scrollHeight, clientHeight } = previewContainerRef.current
      if (scrollHeight > clientHeight) {
        previewContainerRef.current.scrollTop = percentage * (scrollHeight - clientHeight)
      }
    }
  }, [])

  // Restore scroll when mode changes
  useEffect(() => {
    // 50ms is a good compromise for layout stabilization
    const timer = setTimeout(restoreScrollPosition, 50)
    return () => clearTimeout(timer)
  }, [isPreview, isFullPreview, restoreScrollPosition])

  const scrollSyncLockRef = useRef<null | 'editor' | 'preview'>(null)
  const scrollSyncRafRef = useRef<number | null>(null)
  const lastProgrammaticScrollRef = useRef<{ editor: number; preview: number }>({ editor: 0, preview: 0 })

  // Sync scroll between editor + preview in split view
  useEffect(() => {
    if (!isPreview || isFullPreview) return

    const editorContainer = editorContainerRef.current
    const previewContainer = previewContainerRef.current
    if (!editorContainer || !previewContainer) return

    const clearRaf = () => {
      if (scrollSyncRafRef.current != null) {
        window.cancelAnimationFrame(scrollSyncRafRef.current)
        scrollSyncRafRef.current = null
      }
    }

    const getScrollPercentage = (el: HTMLElement) => {
      const max = el.scrollHeight - el.clientHeight
      if (max <= 0) return 0
      return el.scrollTop / max
    }

    const setScrollPercentage = (el: HTMLElement, percentage: number) => {
      const max = el.scrollHeight - el.clientHeight
      if (max <= 0) {
        el.scrollTop = 0
        return
      }
      const nextTop = percentage * max
      if (Math.abs(el.scrollTop - nextTop) < 0.5) return
      el.scrollTop = nextTop
    }

    const getEditorScroller = (eventTarget: EventTarget | null): HTMLElement | null => {
      const viewScroller = viewRef.current?.scrollDOM as HTMLElement | undefined
      if (viewScroller) return viewScroller

      if (!(eventTarget instanceof HTMLElement)) return null
      if (eventTarget.classList.contains('cm-scroller')) return eventTarget
      return eventTarget.closest?.('.cm-scroller') ?? null
    }

    const syncFromEditor = (source: HTMLElement) => {
      if (scrollSyncLockRef.current === 'preview') return
      scrollSyncLockRef.current = 'editor'

      const percentage = getScrollPercentage(source)
      lastScrollPercentageRef.current = percentage

      clearRaf()
      scrollSyncRafRef.current = window.requestAnimationFrame(() => {
        lastProgrammaticScrollRef.current.preview = performance.now()
        setScrollPercentage(previewContainer, percentage)
        window.requestAnimationFrame(() => {
          scrollSyncLockRef.current = null
        })
      })
    }

    const syncFromPreview = () => {
      if (scrollSyncLockRef.current === 'editor') return
      const editorScroller = viewRef.current?.scrollDOM as HTMLElement | undefined
      if (!editorScroller) return

      scrollSyncLockRef.current = 'preview'

      const percentage = getScrollPercentage(previewContainer)
      lastScrollPercentageRef.current = percentage

      clearRaf()
      scrollSyncRafRef.current = window.requestAnimationFrame(() => {
        lastProgrammaticScrollRef.current.editor = performance.now()
        setScrollPercentage(editorScroller, percentage)
        window.requestAnimationFrame(() => {
          scrollSyncLockRef.current = null
        })
      })
    }

    const onEditorScroll = (e: Event) => {
      if (performance.now() - lastProgrammaticScrollRef.current.editor < 120) return
      const scroller = getEditorScroller(e.target)
      if (!scroller) return
      syncFromEditor(scroller)
    }

    const onPreviewScroll = () => {
      if (performance.now() - lastProgrammaticScrollRef.current.preview < 120) return
      syncFromPreview()
    }

    editorContainer.addEventListener('scroll', onEditorScroll, true)
    previewContainer.addEventListener('scroll', onPreviewScroll)

    return () => {
      editorContainer.removeEventListener('scroll', onEditorScroll, true)
      previewContainer.removeEventListener('scroll', onPreviewScroll)
      clearRaf()
      scrollSyncLockRef.current = null
    }
  }, [isPreview, isFullPreview, selectedNote?.path])

  const handleFullPreviewToggle = () => {
    captureScrollPercentage()
    // Synchronize preview content immediately for a safe and efficient transition
    setDebouncedContent(currentContent)

    if (isFullPreview) {
      setIsFullPreview(false);
      setIsPreview(false);
    } else {
      setIsFullPreview(true);
      setIsPreview(true);
    }
  }

  const handleSplitViewToggle = () => {
    captureScrollPercentage()
    // Synchronize preview content immediately for a safe and efficient transition
    setDebouncedContent(currentContent)
    if (isFullPreview) {
      setIsFullPreview(false)
      setIsPreview(true)
    } else {
      setIsPreview(!isPreview)
    }
  }

  const handleStatusChange = (status: string) => {
    const notePath = selectedNote?.path
    if (!notePath) return

    setNoteStatuses((prev) => {
      const next = { ...prev }
      if (!status) {
        delete next[notePath]
        return next
      }
      next[notePath] = status as (typeof NOTE_STATUS_VALUES)[number]
      return next
    })
  }
  
  const handleTagChange = (tag: string) => {
    const notePath = selectedNote?.path
    if (!notePath) return

    setNoteTags((prev) => {
      const next = { ...prev }
      if (!tag) {
        delete next[notePath]
        return next
      }
      next[notePath] = tag as any
      return next
    })
  }

  if (!selectedNote?.path) {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--obsidian-workspace)]">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-[var(--obsidian-text)]">No note selected</h2>
          <p className="mt-2 text-sm text-[var(--obsidian-text-muted)]">Create a note to start writing.</p>
          <button
            type="button"
            onClick={() => {
              void createNote('')
            }}
            className="mt-5 text-sm font-medium text-[var(--obsidian-accent)] hover:opacity-80 transition-opacity"
          >
            Create New Note
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full bg-[var(--obsidian-workspace)]">
      {exportNotice && (
        <div className="absolute top-14 right-5 z-50 rounded-md border border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] px-3 py-2 text-xs text-[var(--obsidian-text)] shadow-lg">
          {exportNotice}
        </div>
      )}
      <div className="flex flex-col px-6 py-4 bg-[var(--obsidian-workspace)] shrink-0 border-b border-[var(--obsidian-border-soft)]">
        <div className="flex items-start justify-between mb-2">
          <h1 className="text-2xl font-semibold text-[var(--obsidian-text)] truncate flex-1">
            {selectedNote.title}
          </h1>
          <div className="flex items-center gap-1">
            <MoreActionsMenu 
              notePath={selectedNote.path} 
              onExportPdf={() => void handleExportPdf()} 
              isExportingPdf={isExportingPdf}
            />
          </div>
        </div>

        <div className='flex items-center flex-wrap gap-3 text-[12px]'>
          <div className="flex items-center gap-1 text-[var(--obsidian-text-muted)] opacity-80">
            <span className="truncate max-w-[200px]">{selectedNote.path}</span>
          </div>

          <div className="w-px h-3 bg-[var(--obsidian-border)]" />

          <div className="relative group">
            <div className="flex items-center gap-1 cursor-pointer text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)]">
               {currentNoteStatus ? (
                 <span className={twMerge(
                   "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                   NOTE_STATUS_META[currentNoteStatus].className
                 )}>
                   {NOTE_STATUS_META[currentNoteStatus].label}
                 </span>
               ) : (
                 <span>Status</span>
               )}
               <VscChevronDown className="w-3 h-3" />
            </div>
            <select
              value={currentNoteStatus ?? ''}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
              title="Set note status"
            >
              <option value="">No Status</option>
              {NOTE_STATUS_VALUES.map((statusValue) => (
                <option key={statusValue} value={statusValue}>
                  {NOTE_STATUS_META[statusValue].label}
                </option>
              ))}
            </select>
          </div>

          <div className="w-px h-3 bg-[var(--obsidian-border)]" />

          <div className="flex items-center gap-2">
            {currentNoteTag ? (
              <div 
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium transition-colors ${CUSTOM_TAG_STYLE}`}
              >
                <span>{currentNoteTag}</span>
                <button
                  onClick={() => handleTagChange('')}
                  className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <VscChromeClose className="w-2.5 h-2.5" />
                </button>
              </div>
            ) : (
              <div className="relative group">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tagInput.trim()) {
                      handleTagChange(tagInput.trim())
                      setTagInput('')
                    }
                  }}
                  placeholder="Add Tag"
                  className="bg-transparent border-none outline-none text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] focus:text-[var(--obsidian-text)] placeholder:text-[var(--obsidian-text-muted)] w-16 focus:w-32 transition-all"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {!isFullPreview && showToolbar && (
        <MarkdownToolbarMemo view={viewRef.current} onWriteWithAi={() => void openAiModal()} />
      )}

      <div
        ref={containerRef}
        className="flex-1 flex h-full overflow-hidden relative"
        onContextMenu={(e) => {
          if (isFullPreview) return
          e.preventDefault()
          setContextMenu({ x: e.clientX, y: e.clientY })
        }}
      >
        {/* Floating Action Button (FAB) */}
        <div className={twMerge(
          "absolute bottom-10 right-4 flex flex-col items-center gap-0.5 bg-[var(--obsidian-workspace)] border border-[var(--obsidian-border)] rounded-xl shadow-xl z-[100] p-1 transition-all duration-300 transform",
          showFAB ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}>
          <button
            onClick={handleFullPreviewToggle}
            className={twMerge(
              "p-1.5 rounded-lg transition-all",
              isFullPreview 
                ? "bg-[var(--obsidian-accent-dim)] text-[var(--obsidian-accent)]" 
                : "text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)]"
            )}
            title="Toggle Preview Mode"
          >
            <HiOutlineEye className="w-4 h-4" />
          </button>
          <div className="w-5 h-px bg-[var(--obsidian-border-soft)]" />
          <button
            onClick={handleSplitViewToggle}
            className={twMerge(
              "p-1.5 rounded-lg transition-all",
              isPreview && !isFullPreview
                ? "bg-[var(--obsidian-accent-dim)] text-[var(--obsidian-accent)]"
                : "text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)]"
            )}
            title="Toggle Split View"
          >
             <VscSplitHorizontal className="w-4 h-4" />
          </button>
        </div>
        <div
          ref={editorContainerRef}
          className="h-full"
          style={{
            width: isFullPreview ? '0' : (isPreview ? '50%' : '100%'),
            display: isFullPreview ? 'none' : 'block'
          }}
        >
          <div
            ref={editorRef}
            className="absolute inset-0 w-full h-full visible"
          />
        </div>

        {isPreview && !isFullPreview && (
          <div
            ref={dragBarRef}
            className="w-1.5 cursor-col-resize bg-[var(--obsidian-border)] hover:bg-[var(--obsidian-accent)] z-10 flex items-center justify-center transition-colors"
          >
            <MdDragIndicator className="w-3 h-3 text-[var(--obsidian-text-muted)]" />
          </div>
        )}

        {/* Toggleable Preview Container */}
        <div
          ref={previewContainerRef}
          className="h-full preview-scrollbar overflow-auto p-8 bg-[var(--obsidian-workspace)]"
          style={{ 
            width: isFullPreview ? '100%' : '50%',
            display: isPreview ? 'block' : 'none'
          }}
        >
          <div className="w-full min-w-0">
            <div className="prose prose-sm max-w-none w-full break-words text-[var(--obsidian-text)]">
            <MarkdownPreview 
                  previewMarkdown={previewMarkdown}
                  selectedNotePath={selectedNote.path}
                  rootDir={rootDir || undefined}
                  isDarkMode={isDarkMode}
                  previewReadableWidthClass={previewReadableWidthClass}
                  getReactNodeText={getReactNodeText}
                  getCalloutMeta={getCalloutMeta}
                />
            </div>
          </div>
        </div>
      </div>
      {isAiModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-2xl rounded-lg border border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--obsidian-border-soft)] px-4 py-3">
              <h3 className="text-sm font-semibold text-[var(--obsidian-text)]">Write with AI</h3>
              <button
                type="button"
                className="rounded px-2 py-1 text-xs text-[var(--obsidian-text-muted)] hover:bg-[var(--obsidian-hover)]"
                onClick={() => setIsAiModalOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="space-y-3 px-4 py-4">
              <div>
                <label className="mb-1 block text-xs text-[var(--obsidian-text-muted)]">OpenRouter API Key</label>
                <input
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="w-full rounded border border-[var(--obsidian-border)] bg-[var(--obsidian-workspace)] px-3 py-2 text-sm text-[var(--obsidian-text)] outline-none focus:border-[var(--obsidian-accent)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-[var(--obsidian-text-muted)]">Free Model</label>
                <select
                  value={selectedAiModel}
                  onChange={(e) => setSelectedAiModel(e.target.value)}
                  disabled={isLoadingAiModels}
                  className="w-full rounded border border-[var(--obsidian-border)] bg-[var(--obsidian-workspace)] px-3 py-2 text-sm text-[var(--obsidian-text)] outline-none focus:border-[var(--obsidian-accent)] disabled:opacity-60"
                >
                  {aiModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-[var(--obsidian-text-muted)]">Prompt</label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Example: Rewrite my note in a clearer and concise way."
                  rows={6}
                  className="w-full resize-y rounded border border-[var(--obsidian-border)] bg-[var(--obsidian-workspace)] px-3 py-2 text-sm text-[var(--obsidian-text)] outline-none focus:border-[var(--obsidian-accent)]"
                />
              </div>

              {isGeneratingWithAi && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-[var(--obsidian-text-muted)]">
                    <span>Generating with AI...</span>
                    <span>{Math.min(aiProgress, 99)}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded bg-[var(--obsidian-border-soft)]">
                    <div
                      className="h-full rounded bg-[var(--obsidian-accent)] transition-all duration-300 ease-out"
                      style={{ width: `${Math.min(aiProgress, 99)}%` }}
                    />
                  </div>
                </div>
              )}

              {aiError && (
                <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {aiError}
                </div>
              )}
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-[var(--obsidian-border-soft)] px-4 py-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => setIsAiModalOpen(false)}
                className="w-full rounded border border-[var(--obsidian-border)] px-3 py-1.5 text-xs text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)] sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleGenerateWithAi()}
                disabled={isGeneratingWithAi || isLoadingAiModels}
                className="w-full rounded bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-black/85 disabled:opacity-60 sm:w-auto"
              >
                {isGeneratingWithAi ? 'Generating...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          className="fixed z-50 bg-[var(--obsidian-pane)] border border-[var(--obsidian-border)] shadow-xl rounded-md py-1 min-w-[180px] max-h-[350px] overflow-y-auto preview-scrollbar"
        >
          {editorMenuEntries.map((entry) => {
            if (entry.type === 'separator') {
              return (
                <div
                  key={entry.id}
                  className="my-1 h-px bg-[var(--obsidian-border-soft)]"
                />
              )
            }

            return (
              <ContextMenuItem
                key={entry.id}
                onClick={() => {
                  setContextMenu(null)
                  entry.run()
                }}
              >
                {entry.icon}
                <span>{entry.label}</span>
                {entry.shortcut ? (
                  <span className="ml-auto text-[10px] opacity-40">{entry.shortcut}</span>
                ) : null}
              </ContextMenuItem>
            )
          })}
        </ContextMenu>
      )}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        items={commandPaletteItems}
        onClose={() => {
          setIsCommandPaletteOpen(false)
          viewRef.current?.focus()
        }}
      />
    </div>
  )
}

interface MarkdownPreviewProps {
  previewMarkdown: string;
  selectedNotePath: string;
  rootDir?: string;
  isDarkMode: boolean;
  previewReadableWidthClass: string;
  getReactNodeText: (node: any) => string;
  getCalloutMeta: (type: string) => any;
}

const MarkdownPreview = memo(({ 
  previewMarkdown, 
  selectedNotePath, 
  rootDir, 
  isDarkMode, 
  previewReadableWidthClass,
  getReactNodeText,
  getCalloutMeta
}: MarkdownPreviewProps) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1
            className={twMerge(
              previewReadableWidthClass,
              'font-sans text-2xl font-semibold mt-8 mb-4 pb-2 border-b border-[var(--obsidian-border)] text-[var(--obsidian-text)]'
            )}
          >
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2
            className={twMerge(
              previewReadableWidthClass,
              'text-xl font-sans text-[var(--obsidian-text)] font-semibold mt-6 mb-3'
            )}
          >
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3
            className={twMerge(
              previewReadableWidthClass,
              'text-lg font-sans font-medium mt-5 mb-2 text-[var(--obsidian-text)]'
            )}
          >
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4
            className={twMerge(
              previewReadableWidthClass,
              'text-md font-sans font-medium mt-5 mb-2 text-[var(--obsidian-text)]'
            )}
          >
            {children}
          </h4>
        ),
        h5: ({ children }) => (
          <h5
            className={twMerge(
              previewReadableWidthClass,
              'text-md font-sans font-medium mt-5 mb-2 text-[var(--obsidian-text)]'
            )}
          >
            {children}
          </h5>
        ),
        p: ({ children }) => (
          <p
            className={twMerge(
              previewReadableWidthClass,
              'mb-4 text-[14px] leading-7 font-sans text-[var(--obsidian-text)]'
            )}
          >
            {children}
          </p>
        ),
        ul: ({ children }) => (
          <ul
            className={twMerge(
              previewReadableWidthClass,
              'font-sans mb-4 pl-6 space-y-1 text-[var(--obsidian-text)]'
            )}
          >
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol
            className={twMerge(
              previewReadableWidthClass,
              'text-[var(--obsidian-text)] text-sm font-sans mb-4 pl-6 space-y-1'
            )}
          >
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="font-sans text-sm text-[var(--obsidian-text)]">
            {children}
          </li>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-[var(--obsidian-text)]">
            {children}
          </strong>
        ),
        em: ({ children }) => <em className="italic font-medium text-[var(--obsidian-text)]">{children}</em>,
        blockquote: ({ children }) => (
          (() => {
            const parts = Children.toArray(children).filter((child) => {
              if (typeof child === 'string') return child.trim().length > 0
              return child != null
            })
            const first = parts[0]

            const firstText = getReactNodeText(first).trim()
            const match = /^\[!([A-Za-z]+)\]\s*(.*)$/.exec(firstText)
            if (match) {
              const meta = getCalloutMeta(match[1])
              if (meta) {
                const remainder = (match[2] || '').trim()
                const rest = parts.slice(1)
                const Icon = meta.Icon
                return (
                  <div
                    className={twMerge(previewReadableWidthClass, 'my-4 pl-4')}
                    style={{
                      borderLeft: `4px solid ${meta.border}`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3" style={{ color: meta.fg }}>
                      <Icon className="w-5 h-5" />
                      <div className="text-lg font-semibold">{meta.label}</div>
                    </div>
                    <div className="text-[var(--obsidian-text)] [&_p]:mb-0">
                      {remainder ? <p>{remainder}</p> : null}
                      {rest}
                    </div>
                  </div>
                )
              }
            }

            return (
              <blockquote
                className={twMerge(
                  previewReadableWidthClass,
                  'pl-2 my-4 italic text-[var(--obsidian-quote-text)] [&_p]:!text-[var(--obsidian-quote-text)] [&_p]:italic [&_li]:!text-[var(--obsidian-quote-text)] [&_li]:italic'
                )}
              >
                {children}
              </blockquote>
            )
          })()
        ),
        a: ({ href, children }) => {
          const isImage = href && (
            href.toLowerCase().endsWith('.png') || 
            href.toLowerCase().endsWith('.jpg') || 
            href.toLowerCase().endsWith('.jpeg') || 
            href.toLowerCase().endsWith('.gif') || 
            href.toLowerCase().endsWith('.svg') || 
            href.toLowerCase().endsWith('.webp')
          )

          if (isImage) {
            const finalSrc = href ? toLocalFileUrl(href, selectedNotePath, rootDir) : href
            return (
              <div className={previewReadableWidthClass}>
                <img 
                  src={finalSrc} 
                  alt={String(children)} 
                  className="max-w-full w-auto h-auto rounded-lg shadow-[0_10px_28px_rgba(0,0,0,0.18)] my-4 border border-[var(--obsidian-border)]" 
                  style={{ maxWidth: 'min(100%, 720px)' }}
                />
              </div>
            )
          }

          return (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[var(--obsidian-accent)] hover:opacity-80 underline underline-offset-4"
            >
              {children}
            </a>
          )
        },
        hr: () => (
          <hr className={twMerge(previewReadableWidthClass, 'my-8 border-t border-[var(--obsidian-border)]')} />
        ),
        table: ({ children }) => (
          <div className="w-full overflow-x-auto my-6 border border-[var(--obsidian-border)] rounded-lg">
            <table className="w-full table-auto border-collapse">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-[var(--obsidian-table-head)] border-b border-[var(--obsidian-border)]">
            {children}
          </thead>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-[var(--obsidian-border-soft)]">
            {children}
          </tbody>
        ),
        tr: ({ children }) => (
          <tr className="even:bg-[var(--obsidian-table-row)] transition-colors">
            {children}
          </tr>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-left text-[11px] font-bold text-[var(--obsidian-text-muted)] uppercase tracking-tight border-r border-[var(--obsidian-border)] last:border-r-0 align-top">
            <div className="min-w-[140px] whitespace-normal break-words">{children}</div>
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-1.5 text-xs text-[var(--obsidian-text)] border-r border-[var(--obsidian-border-soft)] last:border-r-0 align-top">
            <div className="min-w-[140px] whitespace-normal break-words">{children}</div>
          </td>
        ),
        code: ({ children, className, ...rest }) => {
          const match = /language-(\w+)/.exec(className || '')
          const language = match ? match[1] : ''
          const isInline = !match
          const codeContent = String(children).replace(/\n$/, '')

          if (language === 'mermaid') {
            return <MermaidDiagram chart={codeContent} />
          }

          if (isInline && codeContent.toLowerCase().startsWith('kbd:')) {
            const keyText = codeContent.slice(4)
            return (
              <kbd className="inline-flex items-center rounded-md border border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] px-1.5 py-0.5 text-[11px] font-mono font-medium text-[var(--obsidian-text)] shadow-[inset_0_-1px_0_rgba(0,0,0,0.22),0_10px_28px_rgba(0,0,0,0.06)]">
                {keyText}
              </kbd>
            )
          }

          return isInline ? (
            <code
              className="px-1.5 py-0.5 bg-[var(--obsidian-inline-code-bg)] text-[var(--obsidian-inline-code-text)] rounded text-sm font-mono before:content-none after:content-none"
              {...rest}
            >
              {children}
            </code>
          ) : (
            <SyntaxHighlighter
              PreTag="div"
              children={codeContent}
              language={language}
              style={isDarkMode ? vs2015 : vs}
              customStyle={{
                margin: '1rem 0',
                borderRadius: '0.2rem',
                fontSize: '15px',
                lineHeight: '1.5',
                overflowWrap: 'break-word',
                ...(isDarkMode ? {} : { background: 'rgba(0, 0, 0, 0.0175)' }),
              }}
              codeTagProps={{
                style: {
                  fontFamily: 'JetBrains Mono, Monaco, "Courier New", monospace',
                },
              }}
            />
          )
        },
        pre: ({ children }) => (
          <pre className="w-full mb-4 bg-transparent overflow-hidden rounded">
            {children}
          </pre>
        ),
        img: ({ src, alt }) => {
          const finalSrc = src ? toLocalFileUrl(src, selectedNotePath, rootDir) : src
          return (
            <div className={previewReadableWidthClass}>
              <img 
                src={finalSrc} 
                alt={alt} 
                className="max-w-full w-auto h-auto rounded-lg shadow-[0_10px_28px_rgba(0,0,0,0.18)] my-4 border border-[var(--obsidian-border)]" 
                style={{ maxWidth: 'min(100%, 720px)' }}
              />
            </div>
          )
        },
      }}
    >
      {previewMarkdown}
    </ReactMarkdown>
  )
})
