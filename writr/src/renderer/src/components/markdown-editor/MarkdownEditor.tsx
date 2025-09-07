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
import { AiOutlineRead } from "react-icons/ai";
import { TbEdit } from "react-icons/tb";
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
import { indentationMarkers } from '@replit/codemirror-indentation-markers'
import { checkboxExtension } from './checkboxExtension'
import { statusBarExtension } from './statusbar'

export const MarkdownEditor = () => {
  const selectedNote = useAtomValue(selectedNoteAtom)
  const saveNote = useSetAtom(saveNoteAtom)
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)



  const currentNoteTitleRef = useRef<string>('')
  const isSwitchingRef = useRef(false)
  const [isPreview, setIsPreview] = useState(false)
  const [currentContent, setCurrentContent] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Save queue management
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const isSavingRef = useRef(false)

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    }

    checkDarkMode()
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
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
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
      ]),
      vim(),
      drawSelection(),
      closeBrackets(),

      autoCloseTags,
      gutterTheme,
      markdown({
        base: markdownLanguage,
        codeLanguages,
        addKeymap: true,

      }),
      javascript(),
      python(),
      indentationMarkers({
        highlightActiveBlock: false,
        hideFirstIndent: true,
        markerType: "codeOnly",
        thickness: 1,
        colors: {
          light: '#B9B9B9',
          dark: '#434343',
          activeLight: '#B9B9B9',
          activeDark: '#434343',
        }
      }),

      syntaxHighlighting(isDarkMode ? markdownHighlightStyleDark : markdownHighlightStyle),
      autocompletion({
        activateOnTyping: true,
        icons: true,
      }),
      relativeLineNumbers(),
      EditorView.lineWrapping,
      checkboxExtension,
      statusBarExtension,
    ],
    [isDarkMode, codeLanguages]
  )

  // Optimized save function with queue
  const executeSave = useCallback(async (content: string, noteTitle: string) => {
    if (isSwitchingRef.current || currentNoteTitleRef.current !== noteTitle) {
      return
    }

    isSavingRef.current = true
    try {
      await saveNote(content)
      console.info('Save completed')
    } catch (error) {
      console.error('Save failed:', error)
    } finally {
      isSavingRef.current = false
    }
  }, [saveNote])

  // Queue-based save manager
  const queueSave = useCallback((content: string, noteTitle: string) => {
    saveQueueRef.current = saveQueueRef.current.then(() =>
      executeSave(content, noteTitle)
    )
    return saveQueueRef.current
  }, [executeSave])

  // Optimized debounced autosave
  const debouncedSave = useMemo(
    () =>
      throttle(
        (content: string, noteTitle: string) => {
          return queueSave(content, noteTitle)
        },
        autoSavingTime,
        { leading: false, trailing: true }
      ),
    [queueSave]
  )

  // Optimized manual save
  const handleBlurSave = useCallback(async () => {
    if (!selectedNote || !viewRef.current || isSwitchingRef.current) return

    const content = viewRef.current.state.doc.toString()
    const noteTitle = selectedNote.title

    // Cancel pending autosaves
    debouncedSave.cancel()

    // Wait for any ongoing saves to complete
    await saveQueueRef.current
    currentNoteTitleRef.current = noteTitle

    // Only proceed if note hasn't changed
    if (currentNoteTitleRef.current !== noteTitle) return

    await queueSave(content, noteTitle)
  }, [selectedNote, queueSave, debouncedSave])

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
      await saveQueueRef.current // Wait for any pending saves

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

      if (viewRef.current) {
        viewRef.current.destroy()
      }

      viewRef.current = new EditorView({
        state,
        parent: editorRef.current!,
      })

      isSwitchingRef.current = false
    }

    switchNote()

    return () => {
      debouncedSave.cancel()
    }
  }, [selectedNote?.title, selectedNote?.content, baseExtensions, debouncedSave, handleBlurSave])

  useEffect(() => {
    if (!viewRef.current || !selectedNote || isSwitchingRef.current) return

    const editorContent = viewRef.current.state.doc.toString()
    if (editorContent !== selectedNote.content) {
      viewRef.current.dispatch({
        changes: { from: 0, to: editorContent.length, insert: selectedNote.content },
      })
      setCurrentContent(selectedNote.content)
    }
  }, [selectedNote?.content])

  useEffect(() => {
    return () => {
      if (viewRef.current) {
        viewRef.current.destroy()
        viewRef.current = null
      }
      debouncedSave.cancel()
    }
  }, [debouncedSave])

  if (!selectedNote) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Select a note to start editing
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center justify-between p-2 my-2 border-b border-gray-400/30 dark:border-gray-500 bg-transparent relative z-10">
        <h2 className="text-sm font-sans font-medium text-gray-700 dark:text-white truncate">
          {selectedNote.title}
        </h2>
        <button
          onClick={() => setIsPreview(!isPreview)}
          className={`px-3 py-1 text-xs font-medium rounded transition-all ${isPreview
            ? 'bg-blue-500 text-white shadow-sm'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          type="button"
        >
          {isPreview ? <TbEdit /> : <AiOutlineRead />}
        </button>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div
          ref={editorRef}
          className={`absolute inset-0 w-full h-full ${isPreview ? 'invisible' : 'visible'}`}
        />

        {isPreview && (
          <div className="absolute inset-0 h-full overflow-auto p-6 bg-transparent dark:bg-transparent">
            <div className="prose prose-sm max-w-fit">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className=" text-gray-800 dark:text-white font-sans text-2xl font-bold mt-8 mb-4 pb-2 border-b border-gray-400">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl text-gray-800 dark:text-white font-semibold mt-6 mb-3">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-medium mt-5 mb-2 text-gray-800 dark:text-white">
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
                  h6: ({ children }) => (
                    <h6 className="text-md font-sans font-medium mt-5 mb-2 text-gray-800 dark:text-white">
                      {children}
                    </h6>
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
                    <ol className="text-gray-800 dark:text-white font-sans mb-4 pl-6 space-y-1">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="font-sans text-sm text-gray-800 dark:text-white">
                      {children}
                    </li>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-lime-200 pl-4 py-2 mb-4 bg-lime-300/20 italic dark:text-white text-gray-700">
                      {children}
                    </blockquote>
                  ),
                  code: ({ children, className, node, ...rest }) => {
                    const match = /language-(\w+)/.exec(className || '')
                    const language = match ? match[1] : ''
                    const isInline = !match

                    return isInline ? (
                      <code
                        className="px-1.5 py-0.5 bg-emerald-50/50 dark:bg-gray-700 dark:text-yellow-300 text-gray-800 rounded text-sm font-mono"
                        {...rest}
                      >
                        {children}
                      </code>
                    ) : (
                      <SyntaxHighlighter
                        PreTag="div"
                        children={String(children).replace(/\n$/, '')}
                        language={language}
                        customStyle={{
                          margin: '1rem 0',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          lineHeight: '1.5',
                        }}
                        codeTagProps={{
                          style: {
                            fontFamily: 'JetBrains Mono, Monaco, "Courier New", monospace',
                          }
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
        )}
      </div>
    </div>
  )
}
