'use client'
import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, drawSelection } from '@codemirror/view'
import { defaultKeymap, historyKeymap, history } from '@codemirror/commands'
import { vim } from '@replit/codemirror-vim'
import { throttle } from 'lodash'
import { useAtomValue, useSetAtom } from 'jotai'
import { selectedNoteAtom, saveNoteAtom } from '@renderer/store'
import { autoSavingTime } from '@shared/constants'
import ReactMarkdown from 'react-markdown'
import { relativeLineNumbers } from '../code-mirror-ui/relativeLineNumbers'
import { HiOutlineEye } from "react-icons/hi2";
import { markdown } from '@codemirror/lang-markdown'
import { syntaxHighlighting } from '@codemirror/language'
import { markdownLanguage } from "@codemirror/lang-markdown"
import SyntaxHighlighter from 'react-syntax-highlighter'
import { gutterTheme, markdownEditorTheme, markdownHighlightStyle, markdownHighlightStyleDark } from './editorTheme'
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
import { TbLayoutSidebarRightExpandFilled } from "react-icons/tb";
import { TbLayoutSidebarRightCollapse } from "react-icons/tb";
import { markdownTableEnhancement } from './extendTableEditing'

export const MarkdownEditor = () => {
  const selectedNote = useAtomValue(selectedNoteAtom)
  const saveNote = useSetAtom(saveNoteAtom)
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const dragBarRef = useRef<HTMLDivElement>(null)

  const currentNoteTitleRef = useRef<string>('')
  const isSwitchingRef = useRef(false)
  const [isPreview, setIsPreview] = useState(false)
  const [isFullPreview, setIsFullPreview] = useState(false) // New state for full preview
  const [currentContent, setCurrentContent] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Save queue management
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const isSavingRef = useRef(false)

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(
        document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches
      )
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

  const baseExtensions = useMemo(
    () => [
      history(),
      markdownEditorTheme,
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
          light: '#B9B9B9',
          dark: '#434343',
          activeLight: '#B9B9B9',
          activeDark: '#434343',
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
    ],
    [isDarkMode]
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
    if (!selectedNote || !viewRef.current || isSwitchingRef.current) return
    const content = viewRef.current.state.doc.toString()
    const noteTitle = selectedNote.title
    debouncedSave.cancel()
    await saveQueueRef.current
    currentNoteTitleRef.current = noteTitle
    if (currentNoteTitleRef.current !== noteTitle) return
    await queueSave(content, noteTitle)
  }, [selectedNote, queueSave, debouncedSave])

  // Initialize editor
  useEffect(() => {
    if (!selectedNote || !editorRef.current) {
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
  }, [selectedNote?.title, selectedNote?.content, baseExtensions, debouncedSave, selectedNote, handleBlurSave])

  // Update editor content if note changes
  useEffect(() => {
    if (!viewRef.current || !selectedNote || isSwitchingRef.current) return
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
    }
  }, [isPreview, isFullPreview])

  const handleFullPreviewToggle = () => {
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
    if (isFullPreview) {
      setIsFullPreview(false)
      setIsPreview(true)
    } else {
      setIsPreview(!isPreview)
    }
  }

  if (!selectedNote) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Select a note to start editing
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-2 my-2 border-b border-gray-400/30 dark:border-gray-500 bg-transparent relative z-10">
        <h2 className="text-sm font-sans font-medium text-gray-700 dark:text-white truncate">
          {selectedNote.title}
        </h2>
        <div className='flex gap-2'>
          {!isFullPreview && (
            <button
              onClick={handleSplitViewToggle}
              className={`px-3 py-1 text-xs font-medium rounded transition-all ${isPreview && !isFullPreview
                ? 'bg-blue-500 text-white shadow-sm'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
                }`}
              type="button"
            >
              {isPreview ? <TbLayoutSidebarRightCollapse /> : <TbLayoutSidebarRightExpandFilled />}
            </button>
          )}
          <button
            onClick={handleFullPreviewToggle}
            className={`px-3 py-1 text-xs font-medium rounded transition-all ${isFullPreview
              ? 'bg-blue-500 text-white shadow-sm'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
              }`}
            type="button"
          >
            <HiOutlineEye />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      {!isFullPreview && <MarkdownToolbar view={viewRef.current} />}

      {/* Editor + Preview */}
      <div
        ref={containerRef}
        className="flex-1 flex h-full overflow-hidden relative"
      >
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
                className="w-1 cursor-col-resize bg-gray-300 dark:bg-gray-600 hover:bg-gray-500 z-10"
              />
            )}
            <div
              ref={previewContainerRef}
              className="h-full preview-scrollbar overflow-auto p-6 bg-transparent dark:bg-transparent"
              style={{ width: isFullPreview ? '100%' : '50%' }}
            >
              <div className="prose prose-sm max-w-fit">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className=" text-gray-800 dark:text-white font-sans text-2xl font-bold mt-8 mb-4 pb-2 border-b border-gray-400">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-lg font-sans text-gray-800 dark:text-white font-semibold mt-6 mb-3">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-md font-sans font-medium mt-5 mb-2 text-gray-800 dark:text-white">
                        {children}
                      </h3>
                    ),
                    h4: ({ children }) => (
                      <h4 className="text-md font sans font-medium mt-5 mb-2 text-gray-800 dark:text-white">
                        {children}
                      </h4>),

                    h5: ({ children }) => (
                      <h5 className="text-md font sans font-medium mt-5 mb-2 text-gray-800 dark:text-white">
                        {children}
                      </h5>
                    ),

                    p: ({ children }) => (
                      <p className="mb-4 text-sm font-sans text-gray-800 dark:text-white">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul className="font-sans mb-4 pl-6 space-y-1 text-gray-800 dark:text-white">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="text-gray-800 dark:text-whitetext-xs font-sans mb-4 pl-6 space-y-1">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="font-sans text-xs text-gray-800 dark:text-white">
                        {children}
                      </li>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-bold text-gray-900 dark:text-white">
                        {children}
                      </strong>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-lime-200 pl-4 py-2 mb-4 bg-lime-300/20 italic dark:text-white text-gray-700">
                        {children}
                      </blockquote>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-6">
                        <table className="min-w-full font-sans text-sm border-collapse bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        {children}
                      </thead>
                    ),
                    tbody: ({ children }) => (
                      <tbody className="divide-y font-light divide-gray-200 dark:divide-gray-700">
                        {children}
                      </tbody>
                    ),
                    tr: ({ children }) => (
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        {children}
                      </tr>
                    ),
                    th: ({ children }) => (
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600 last:border-r-0">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="px-4 py-3 text-sm text-gray-800 dark:text-white border-r border-gray-200 dark:border-gray-600 last:border-r-0">
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
                          className="px-1.5 py-0.5 bg-emerald-50/50 dark:bg-gray-700 dark:text-yellow-200 text-gray-800 rounded text-sm font-mono"
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
                            fontSize: '0.875rem',
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
                  }}
                >
                  {currentContent}
                </ReactMarkdown>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
