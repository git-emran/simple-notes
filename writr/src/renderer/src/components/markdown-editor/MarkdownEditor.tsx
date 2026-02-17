'use client'
import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, drawSelection } from '@codemirror/view'
import { defaultKeymap, historyKeymap, history } from '@codemirror/commands'
import { vim } from '@replit/codemirror-vim'
import { throttle, debounce } from 'lodash'
import { useAtomValue, useSetAtom } from 'jotai'
import { selectedNoteAtom, saveNoteAtom } from '@renderer/store'
import { autoSavingTime } from '@shared/constants'
import ReactMarkdown from 'react-markdown'
import { relativeLineNumbers } from '../code-mirror-ui/relativeLineNumbers'
import { HiOutlineEye } from "react-icons/hi2";
import { VscFile } from "react-icons/vsc";
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
import { TbLayoutSidebarRightExpandFilled } from "react-icons/tb";
import { TbLayoutSidebarRightCollapse } from "react-icons/tb";
import { markdownTableEnhancement } from './extendTableEditing'
import { codeBlockCopy } from './codeBlockCopy'
import { codeBlockBackground } from './codeBlockBackground'
import { livePreviewImages } from './livePreviewImages'
import { MdDragIndicator } from "react-icons/md";
import { ContextMenu, ContextMenuItem } from '../ContextMenu'
import * as commands from './editorCommands'
import { 
  FaBold, FaItalic, FaStrikethrough, FaQuoteRight, 
  FaListUl, FaListOl, FaCheckSquare, FaCode, 
  FaLink, FaImage, FaTable, FaHeading 
} from 'react-icons/fa'
import { MdHorizontalRule } from 'react-icons/md'

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
  const [debouncedContent, setDebouncedContent] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

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
      livePreviewImages,
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
      {/* Header Controls */}
      <div className="flex items-center justify-between px-6 py-2 bg-transparent shrink-0">
        <div className="text-[11px] font-sans text-zinc-400 dark:text-zinc-500 truncate flex items-center gap-2">
          <VscFile className="w-3 h-3" />
          <span>{selectedNote.path}</span>
        </div>
        <div className='flex gap-1.5'>
          {!isFullPreview && (
            <button
              onClick={handleSplitViewToggle}
              className={`p-1.5 rounded-md transition-all ${isPreview && !isFullPreview
                ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              type="button"
              title="Toggle Split View"
            >
              {isPreview ? <TbLayoutSidebarRightCollapse className="w-4 h-4" /> : <TbLayoutSidebarRightExpandFilled className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={handleFullPreviewToggle}
            className={`p-1.5 rounded-md transition-all ${isFullPreview
              ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100'
              : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            type="button"
            title="Toggle Preview Mode"
          >
            <HiOutlineEye className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      {!isFullPreview && <MarkdownToolbar view={viewRef.current} />}

      {/* Editor + Preview */}
      <div
        ref={containerRef}
        className="flex-1 flex h-full overflow-hidden relative"
        onContextMenu={(e) => {
          if (isFullPreview) return
          e.preventDefault()
          setContextMenu({ x: e.clientX, y: e.clientY })
        }}
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
                className="w-1.5 cursor-col-resize bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-400 dark:hover:bg-zinc-600 z-10 flex items-center justify-center transition-colors"
              >
                <MdDragIndicator className="w-3 h-3 text-zinc-400 dark:text-zinc-600" />
              </div>
            )}
            <div
              ref={previewContainerRef}
              className="h-full preview-scrollbar overflow-auto p-6 bg-transparent dark:bg-transparent"
              style={{ width: isFullPreview ? '100%' : '50%' }}
            >
              <div className="prose prose-sm max-w-none w-full break-words">
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
                      <h4 className="text-md font-sans font-medium mt-5 mb-2 text-gray-800 dark:text-white">
                        {children}
                      </h4>
                    ),
                    h5: ({ children }) => (
                      <h5 className="text-md font-sans font-medium mt-5 mb-2 text-gray-800 dark:text-white">
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
                        const isRelative = href && !href.startsWith('http') && !href.startsWith('data:') && !href.startsWith('local-file://')
                        const finalSrc = isRelative ? `local-file://${encodeURI(href)}` : href
                        return (
                          <img 
                            src={finalSrc} 
                            alt={String(children)} 
                            className="max-w-full h-auto rounded-lg shadow-sm mx-auto my-4 border border-zinc-200 dark:border-zinc-800" 
                          />
                        )
                      }

                      return (
                        <a 
                          href={href} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-4"
                        >
                          {children}
                        </a>
                      )
                    },
                    hr: () => (
                      <hr className="my-8 border-t border-gray-400 dark:border-gray-500" />
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-6 border border-zinc-300 dark:border-zinc-700 rounded-lg">
                        <table className="min-w-full w-max border-collapse">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-300 dark:border-zinc-700">
                        {children}
                      </thead>
                    ),
                    tbody: ({ children }) => (
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {children}
                      </tbody>
                    ),
                    tr: ({ children }) => (
                      <tr className="even:bg-zinc-50/30 dark:even:bg-zinc-800/10 transition-colors">
                        {children}
                      </tr>
                    ),
                    th: ({ children }) => (
                      <th className="px-4 py-2.5 text-left text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-tight border-r border-zinc-300 dark:border-zinc-700 last:border-r-0 whitespace-nowrap">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="px-4 py-2 text-sm text-zinc-800 dark:text-zinc-200 border-r border-zinc-300 dark:border-zinc-700 last:border-r-0 whitespace-nowrap">
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
                          className="px-1.5 py-0.5 bg-emerald-50/50 dark:bg-gray-700 dark:text-yellow-200 text-gray-800 rounded text-sm font-mono before:content-none after:content-none"
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
                      const isRelative = src && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('local-file://')
                      const finalSrc = isRelative ? `local-file://${encodeURI(src)}` : src
                      return (
                        <img 
                          src={finalSrc} 
                          alt={alt} 
                          className="max-w-full h-auto rounded-lg shadow-sm mx-auto my-4 border border-zinc-200 dark:border-zinc-800" 
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
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          className="fixed z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-md py-1 min-w-[180px] max-h-[350px] overflow-y-auto preview-scrollbar"
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

          <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />
          
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

          <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />

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

          <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />

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

          <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />

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
