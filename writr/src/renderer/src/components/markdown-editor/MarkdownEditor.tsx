'use client'
import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, drawSelection } from '@codemirror/view'
import { defaultKeymap, historyKeymap, history } from '@codemirror/commands'
import { vim } from '@replit/codemirror-vim'
import { throttle, debounce } from 'lodash'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { createNoteAtom, noteStatusByPathAtom, noteTagByPathAtom, saveNoteAtom, selectedNoteAtom } from '@renderer/store'
import { autoSavingTime } from '@shared/constants'
import ReactMarkdown from 'react-markdown'
import { relativeLineNumbers } from '../code-mirror-ui/relativeLineNumbers'
import { HiOutlineEye } from "react-icons/hi2";
import { markdown } from '@codemirror/lang-markdown'
import { syntaxHighlighting } from '@codemirror/language'
import { markdownLanguage } from "@codemirror/lang-markdown"
import SyntaxHighlighter from 'react-syntax-highlighter'
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
import { 
  FaBold, FaItalic, FaStrikethrough, FaQuoteRight, 
  FaListUl, FaCheckSquare, FaCode, 
  FaLink, FaImage, FaTable, FaHeading 
} from 'react-icons/fa'
import { MdHorizontalRule } from 'react-icons/md'
import { VscSparkle } from 'react-icons/vsc'
import { VscChevronDown, VscChromeClose, VscSplitHorizontal } from 'react-icons/vsc'
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
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

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
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [exportNotice, setExportNotice] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiModels, setAiModels] = useState<AiModelInfo[]>([])
  const [selectedAiModel, setSelectedAiModel] = useState('')
  const [aiApiKey, setAiApiKey] = useState('')
  const [isLoadingAiModels, setIsLoadingAiModels] = useState(false)
  const [isGeneratingWithAi, setIsGeneratingWithAi] = useState(false)
  const [aiProgress, setAiProgress] = useState(0)
  const [aiError, setAiError] = useState<string | null>(null)
  const [showFAB, setShowFAB] = useState(false)

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
    debouncedSetContent(currentContent)
    return debouncedSetContent.cancel
  }, [currentContent, debouncedSetContent])

  const baseExtensions = useMemo(
    () => [
      history(),
      getEditorTheme(isDarkMode),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      vim(),
      drawSelection(),
      closeBrackets(),
      autoCloseTags,
      gutterTheme,
      markdown({ base: markdownLanguage, codeLanguages, addKeymap: true }),
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
      syntaxHighlighting(isDarkMode ? markdownHighlightStyleDark : markdownHighlightStyle),
      autocompletion({ activateOnTyping: true, icons: true }),
      relativeLineNumbers(),
      markdownTableEnhancement,
      EditorView.lineWrapping,
      checkboxExtension,
      statusBarExtension,
      tabAsSpaces,
      codeBlockCopy,
      codeBlockBackground,
      quoteLineStyling,
      tripleBacktickExtension,
      createLivePreviewImages(selectedNote?.path),
    ],
    [isDarkMode, selectedNote?.path]
  )

  // Optimized save function with queue
  const executeSave = useCallback(
    async (content: string, noteTitle: string) => {
      if (isSwitchingRef.current || currentNoteTitleRef.current !== noteTitle) return
      isSavingRef.current = true
      try {
        await saveNote(content)
      } catch (error) {
        console.error('Save failed:', error)
      } finally {
        isSavingRef.current = false
      }
    },
    [saveNote]
  )

  const queueSave = useCallback(
    (content: string, noteTitle: string) => {
      saveQueueRef.current = saveQueueRef.current.then(() =>
        executeSave(content, noteTitle)
      )
      return saveQueueRef.current
    },
    [executeSave]
  )

  const debouncedSave = useMemo(
    () =>
      throttle(
        (content: string, noteTitle: string) => queueSave(content, noteTitle),
        autoSavingTime,
        { leading: false, trailing: true }
      ),
    [queueSave]
  )

  const handleBlurSave = useCallback(async () => {
    if (!selectedNote?.path || !viewRef.current || isSwitchingRef.current) return
    const content = viewRef.current.state.doc.toString()
    const noteTitle = selectedNote.title
    debouncedSave.cancel()
    await saveQueueRef.current
    currentNoteTitleRef.current = noteTitle
    if (currentNoteTitleRef.current !== noteTitle) return
    await queueSave(content, noteTitle)
  }, [selectedNote, queueSave, debouncedSave])

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
      for (const file of imageFiles) {
        const sourcePath = (file as File & { path?: string }).path
        if (!sourcePath) continue

        const result = await window.context.importImageToNoteFolder(selectedNote.path, sourcePath)
        if (result?.markdownPath) {
          insertedLinks.push(`![[${result.markdownPath}]]`)
        }
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

  // Initialize editor
  useEffect(() => {
    if (!selectedNote?.path || !editorRef.current) {
      setCurrentContent('')
      return
    }

    const switchNote = async () => {
      isSwitchingRef.current = true
      const newTitle = selectedNote.title
      const newContent = selectedNote.content

      debouncedSave.cancel()
      await saveQueueRef.current

      currentNoteTitleRef.current = newTitle
      setCurrentContent(newContent)

      const state = EditorState.create({
        doc: newContent,
        extensions: [
          ...baseExtensions,
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !isSwitchingRef.current) {
              const content = update.state.doc.toString()
              setCurrentContent(content)
              debouncedSave(content, currentNoteTitleRef.current)
            }
          }),
          EditorView.domEventHandlers({
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
          }),
        ],
      })

      if (viewRef.current) viewRef.current.destroy()
      viewRef.current = new EditorView({ state, parent: editorRef.current! })
      isSwitchingRef.current = false
    }

    switchNote()
    return () => {
      debouncedSave.cancel()
    }
  }, [
    selectedNote?.path,
    selectedNote?.title,
    selectedNote?.content,
    baseExtensions,
    debouncedSave,
    selectedNote,
    handleBlurSave,
    handleEditorImageDrop
  ])

  // Destroy editor if no note is selected
  useEffect(() => {
    if (!selectedNote?.path && viewRef.current) {
        viewRef.current.destroy()
        viewRef.current = null
    }
  }, [selectedNote?.path])

  // Update editor content if note changes
  useEffect(() => {
    if (!viewRef.current || !selectedNote?.path || isSwitchingRef.current) return
    const editorContent = viewRef.current.state.doc.toString()
    if (editorContent !== selectedNote.content) {
      viewRef.current.dispatch({
        changes: { from: 0, to: editorContent.length, insert: selectedNote.content },
      })
      setCurrentContent(selectedNote.content)
    }
  }, [selectedNote?.content, selectedNote])

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
    // Small delay to ensure render is complete and scroll heights are correct
    const timer = setTimeout(restoreScrollPosition, 50)
    return () => clearTimeout(timer)
  }, [isPreview, isFullPreview, restoreScrollPosition])

  const handleFullPreviewToggle = () => {
    captureScrollPercentage()
    // If already in full preview, switch to edit mode.
    // Otherwise, switch to full preview mode.
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

      {!isFullPreview && <MarkdownToolbar view={viewRef.current} onWriteWithAi={() => void openAiModal()} />}

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

        {isPreview && (
          <>
            {!isFullPreview && (
              <div
                ref={dragBarRef}
                className="w-1.5 cursor-col-resize bg-[var(--obsidian-border)] hover:bg-[var(--obsidian-accent)] z-10 flex items-center justify-center transition-colors"
              >
                <MdDragIndicator className="w-3 h-3 text-[var(--obsidian-text-muted)]" />
              </div>
            )}
            <div
              ref={previewContainerRef}
              className="h-full preview-scrollbar overflow-auto p-8 bg-[var(--obsidian-workspace)]"
              style={{ width: isFullPreview ? '100%' : '50%' }}
            >
              <div className="prose prose-sm max-w-none w-full break-words text-[var(--obsidian-text)]">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="font-sans text-2xl font-semibold mt-8 mb-4 pb-2 border-b border-[var(--obsidian-border)] text-[var(--obsidian-text)]">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-xl font-sans text-[var(--obsidian-text)] font-semibold mt-6 mb-3">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-lg font-sans font-medium mt-5 mb-2 text-[var(--obsidian-text)]">
                        {children}
                      </h3>
                    ),
                    h4: ({ children }) => (
                      <h4 className="text-md font-sans font-medium mt-5 mb-2 text-[var(--obsidian-text)]">
                        {children}
                      </h4>
                    ),
                    h5: ({ children }) => (
                      <h5 className="text-md font-sans font-medium mt-5 mb-2 text-[var(--obsidian-text)]">
                        {children}
                      </h5>
                    ),
                    p: ({ children }) => (
                      <p className="mb-4 text-[14px] leading-7 font-sans text-[var(--obsidian-text)]">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul className="font-sans mb-4 pl-6 space-y-1 text-[var(--obsidian-text)]">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="text-[var(--obsidian-text)] text-sm font-sans mb-4 pl-6 space-y-1">
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
                    blockquote: ({ children }) => (
                      <blockquote className="pl-2 my-4 italic text-[var(--obsidian-quote-text)] [&_p]:!text-[var(--obsidian-quote-text)] [&_p]:italic [&_li]:!text-[var(--obsidian-quote-text)] [&_li]:italic">
                        {children}
                      </blockquote>
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
                        const finalSrc = href ? toLocalFileUrl(href, selectedNote.path) : href
                        return (
                          <img 
                            src={finalSrc} 
                            alt={String(children)} 
                            className="block max-w-full w-auto h-auto rounded-lg shadow-sm my-4 border border-[var(--obsidian-border)]" 
                            style={{ maxWidth: 'min(100%, 720px)' }}
                          />
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
                      <hr className="my-8 border-t border-[var(--obsidian-border)]" />
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-6 border border-[var(--obsidian-border)] rounded-lg">
                        <table className="min-w-full w-max border-collapse">
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
                      <th className="px-4 py-2.5 text-left text-xs font-bold text-[var(--obsidian-text-muted)] uppercase tracking-tight border-r border-[var(--obsidian-border)] last:border-r-0 whitespace-nowrap">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="px-4 py-2 text-sm text-[var(--obsidian-text)] border-r border-[var(--obsidian-border-soft)] last:border-r-0 whitespace-nowrap">
                        {children}
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
                          customStyle={{
                            margin: '1rem 0',
                            borderRadius: '0.2rem',
                            fontSize: '0.675rem',
                            lineHeight: '1.5',
                            overflowWrap: 'break-word'
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
                      <pre className="mb-4 bg-transparent overflow-hidden rounded">
                        {children}
                      </pre>
                    ),
                    img: ({ src, alt }) => {
                      const finalSrc = src ? toLocalFileUrl(src, selectedNote.path) : src
                      return (
                        <img 
                          src={finalSrc} 
                          alt={alt} 
                          className="block max-w-full w-auto h-auto rounded-lg shadow-sm my-4 border border-[var(--obsidian-border)]" 
                          style={{ maxWidth: 'min(100%, 720px)' }}
                        />
                      )
                    }
                  }}
                >
                  {debouncedContent.replace(/!\[\[(.*?)\]\]/g, '![$1]($1)')}
                </ReactMarkdown>
              </div>
            </div>
          </>
        )}
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
          <ContextMenuItem onClick={() => { commands.applyFormat(viewRef.current, "**", "**"); setContextMenu(null); }}>
             <FaBold className="w-3 h-3 opacity-60" />
             <span>Bold</span>
             <span className="ml-auto text-[10px] opacity-40">Ctrl+B</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => { commands.applyFormat(viewRef.current, "*", "*"); setContextMenu(null); }}>
             <FaItalic className="w-3 h-3 opacity-60" />
             <span>Italic</span>
             <span className="ml-auto text-[10px] opacity-40">Ctrl+I</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => { commands.applyFormat(viewRef.current, "~~", "~~"); setContextMenu(null); }}>
             <FaStrikethrough className="w-3 h-3 opacity-60" />
             <span>Strikethrough</span>
             <span className="ml-auto text-[10px] opacity-40">Ctrl+D</span>
          </ContextMenuItem>

          <ContextMenuItem onClick={() => { void openAiModal(); }}>
             <VscSparkle className="w-3 h-3 opacity-60" />
             <span>Write with AI</span>
          </ContextMenuItem>

          <div className="h-px bg-[var(--obsidian-border-soft)] my-1" />
          
          <ContextMenuItem onClick={() => { commands.applyHeaderFormat(viewRef.current, 1); setContextMenu(null); }}>
            <FaHeading className="w-3 h-3 opacity-60" />
            <span>Header 1</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => { commands.applyHeaderFormat(viewRef.current, 2); setContextMenu(null); }}>
            <FaHeading className="w-3 h-3 opacity-60" />
            <span>Header 2</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => { commands.applyHeaderFormat(viewRef.current, 3); setContextMenu(null); }}>
            <FaHeading className="w-3 h-3 opacity-60" />
            <span>Header 3</span>
          </ContextMenuItem>

          <div className="h-px bg-[var(--obsidian-border-soft)] my-1" />

          <ContextMenuItem onClick={() => { commands.applyLineFormat(viewRef.current, "> "); setContextMenu(null); }}>
            <FaQuoteRight className="w-3 h-3 opacity-60" />
            <span>Quote</span>
            <span className="ml-auto text-[10px] opacity-40">Ctrl+Q</span>
          </ContextMenuItem>
          
          <ContextMenuItem onClick={() => { commands.applyLineFormat(viewRef.current, "- "); setContextMenu(null); }}>
            <FaListUl className="w-3 h-3 opacity-60" />
            <span>Bullet List</span>
            <span className="ml-auto text-[10px] opacity-40">Ctrl+L</span>
          </ContextMenuItem>

          <ContextMenuItem onClick={() => { commands.insertCheckbox(viewRef.current); setContextMenu(null); }}>
            <FaCheckSquare className="w-3 h-3 opacity-60" />
            <span>Task List</span>
            <span className="ml-auto text-[10px] opacity-40">Ctrl+T</span>
          </ContextMenuItem>

          <div className="h-px bg-[var(--obsidian-border-soft)] my-1" />

          <ContextMenuItem onClick={() => { commands.applyLinkFormat(viewRef.current); setContextMenu(null); }}>
            <FaLink className="w-3 h-3 opacity-60" />
            <span>Link</span>
            <span className="ml-auto text-[10px] opacity-40">Ctrl+K</span>
          </ContextMenuItem>

          <ContextMenuItem onClick={() => { commands.applyImageFormat(viewRef.current); setContextMenu(null); }}>
            <FaImage className="w-3 h-3 opacity-60" />
            <span>Image</span>
          </ContextMenuItem>

          <ContextMenuItem onClick={() => { commands.insertTable(viewRef.current); setContextMenu(null); }}>
            <FaTable className="w-3 h-3 opacity-60" />
            <span>Table</span>
            <span className="ml-auto text-[10px] opacity-40">Ctrl+Shift+T</span>
          </ContextMenuItem>

          <ContextMenuItem onClick={() => { commands.insertHorizontalRule(viewRef.current); setContextMenu(null); }}>
            <MdHorizontalRule className="w-3 h-3 opacity-60" />
            <span>Horizontal Rule</span>
            <span className="ml-auto text-[10px] opacity-40">Ctrl+H</span>
          </ContextMenuItem>

          <div className="h-px bg-[var(--obsidian-border-soft)] my-1" />

          <ContextMenuItem onClick={() => { commands.insertCodeBlock(viewRef.current); setContextMenu(null); }}>
            <FaCode className="w-3 h-3 opacity-60" />
            <span>Code Block</span>
            <span className="ml-auto text-[10px] opacity-40">Ctrl+Shift+`</span>
          </ContextMenuItem>
        </ContextMenu>
      )}
    </div>
  )
}
