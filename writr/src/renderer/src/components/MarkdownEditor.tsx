'use client'
import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { defaultKeymap, historyKeymap, history } from '@codemirror/commands'
import { vim } from '@replit/codemirror-vim'
import { throttle } from 'lodash'
import { useAtomValue, useSetAtom } from 'jotai'
import { selectedNoteAtom, saveNoteAtom } from '@renderer/store'
import { autoSavingTime } from '@shared/constants'
import ReactMarkdown from 'react-markdown'
import { relativeLineNumbers } from './code-mirror-ui/relativeLineNumbers'
import { AiOutlineRead } from "react-icons/ai";
import { TbEdit } from "react-icons/tb";
import { markdown } from '@codemirror/lang-markdown'
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language'
import { tags } from '@lezer/highlight'

export const MarkdownEditor = () => {
  const selectedNote = useAtomValue(selectedNoteAtom)
  const saveNote = useSetAtom(saveNoteAtom)
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  const gutterTheme = EditorView.theme({
    ".cm-gutters": {
      backgroundColor: "transparent",
      padding: "4px",
      textAlign: 'right',
      borderRight: '1px solid rgba(128, 128, 128, 0.5)'
    }
  });

  // Markdown syntax highlighting theme
  const markdownHighlightStyle = HighlightStyle.define([
    // Headers
    { tag: tags.heading1, color: '#2563eb', fontWeight: 'bold', fontSize: '1.5em' },
    { tag: tags.heading2, color: '#1d4ed8', fontWeight: 'bold', fontSize: '1.3em' },
    { tag: tags.heading3, color: '#1e40af', fontWeight: 'bold', fontSize: '1.2em' },
    { tag: tags.heading4, color: '#1e3a8a', fontWeight: 'bold', fontSize: '1.1em' },
    { tag: tags.heading5, color: '#1e3a8a', fontWeight: 'bold' },
    { tag: tags.heading6, color: '#1e3a8a', fontWeight: 'bold' },

    // Text formatting
    { tag: tags.strong, fontWeight: 'bold', color: '#374151' },
    { tag: tags.emphasis, fontStyle: 'italic', color: '#4b5563' },
    { tag: tags.strikethrough, textDecoration: 'line-through', color: '#6b7280' },

    // Code
    {
      tag: tags.monospace,
      backgroundColor: '#f3f4f6',
      color: '#dc2626',
      fontFamily: 'JetBrains Mono',
      padding: '2px 4px',
      borderRadius: '3px'
    },
    {
      tag: tags.special(tags.string),
      backgroundColor: '#1f2937',
      color: '#10b981',
      padding: '8px 12px',
      borderRadius: '6px'
    },

    // Links
    { tag: tags.link, color: '#2563eb', textDecoration: 'underline' },
    { tag: tags.url, color: '#2563eb', textDecoration: 'underline' },

    // Lists
    { tag: tags.list, color: '#374151' },
    { tag: tags.operator, color: '#6366f1', fontWeight: 'bold' },

    // Quotes
    {
      tag: tags.quote,
      color: '#6b7280',
      fontStyle: 'italic',
      borderLeft: '4px solid #d1d5db',
      paddingLeft: '12px'
    },

    // Markdown meta characters
    { tag: tags.meta, color: '#9ca3af', opacity: '0.7' },

    // Horizontal rules
    { tag: tags.contentSeparator, color: '#d1d5db' },

    // Default text
    { tag: tags.content, color: '#374151', },

    // Processing instructions (for things like front matter)
    { tag: tags.processingInstruction, color: '#7c3aed', fontStyle: 'italic' }
  ])

  // Dark theme variant
  const markdownHighlightStyleDark = HighlightStyle.define([
    // Headers
    { tag: tags.heading1, color: '#60a5fa', fontWeight: 'bold', fontSize: '1.5em' },
    { tag: tags.heading2, color: '#3b82f6', fontWeight: 'bold', fontSize: '1.3em' },
    { tag: tags.heading3, color: '#2563eb', fontWeight: 'bold', fontSize: '1.2em' },
    { tag: tags.heading4, color: '#60a5fa', fontWeight: 'bold', fontSize: '1.1em' },
    { tag: tags.heading5, color: '#60a5fa', fontWeight: 'bold' },
    { tag: tags.heading6, color: '#60a5fa', fontWeight: 'bold' },

    // Text formatting
    { tag: tags.strong, fontWeight: 'bold', color: '#f9fafb' },
    { tag: tags.emphasis, fontStyle: 'italic', color: '#e5e7eb' },
    { tag: tags.strikethrough, textDecoration: 'line-through', color: '#9ca3af' },


    // Code
    {
      tag: tags.special(tags.string),
      backgroundColor: '',
      color: '#34d399',
      padding: '8px 12px',
      borderRadius: '6px'
    },
    {
      tag: tags.special(tags.monospace),
      backgroundColor: '#f3f4f6',
      color: '#dc2626',
      fontFamily: 'JetBrains Mono',
      padding: '2px 4px',
      borderRadius: '3px'
    },



    // Links
    { tag: tags.link, color: '#60a5fa', textDecoration: 'underline' },
    { tag: tags.url, color: '#60a5fa', textDecoration: 'underline' },

    // Lists
    { tag: tags.list, color: '#f9fafb' },
    { tag: tags.operator, color: '#8b5cf6', fontWeight: 'bold' },

    // Quotes
    {
      tag: tags.quote,
      color: '#9ca3af',
      fontStyle: 'italic',
      borderLeft: '4px solid #4b5563',
      paddingLeft: '12px'
    },

    // Markdown meta characters
    { tag: tags.meta, color: '#6b7280', opacity: '0.7' },

    // Horizontal rules
    { tag: tags.contentSeparator, color: '#4b5563' },

    // Default text
    { tag: tags.content, color: '#D6D6D6' },

    // Processing instructions (for things like front matter)
    { tag: tags.processingInstruction, color: '#a78bfa', fontStyle: 'italic' }
  ])

  // Track the current note title to prevent cross-note saves
  const currentNoteTitleRef = useRef<string>('')
  // Track pending saves
  const pendingSaveRef = useRef<Promise<void> | null>(null)
  // Track if we're switching notes
  const isSwitchingRef = useRef(false)

  const [isPreview, setIsPreview] = useState(false)
  const [currentContent, setCurrentContent] = useState('')

  // Detect dark mode
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    }

    checkDarkMode()

    // Listen for theme changes
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', checkDarkMode)

    return () => {
      observer.disconnect()
      mediaQuery.removeEventListener('change', checkDarkMode)
    }
  }, [])

  // Additional theme for better markdown editing experience
  const markdownEditorTheme = EditorView.theme({
    '&': {
      height: '100%',
      fontSize: '14px',
      lineHeight: '1.6'
    },
    '.cm-scroller': {
      fontFamily: 'JetBrains Mono',
      padding: '16px'
    },
    '.cm-focused': { outline: 'none' },
    '.cm-editor': {
      fontSize: '14px'
    },
    '.cm-content': {
      minHeight: '100%',
      padding: '0'
    },
    // Style for code blocks
    '.cm-line': {
      paddingLeft: '0',
      paddingRight: '16px'
    },
    // Better spacing for headers
    '.cm-line:has(.ͼ1)': { // heading1
      marginTop: '1.5em',
      marginBottom: '0.5em'
    },
    '.cm-line:has(.ͼ2)': { // heading2
      marginTop: '1.2em',
      marginBottom: '0.4em'
    },
    '.cm-line:has(.ͼ3)': { // heading3
      marginTop: '1em',
      marginBottom: '0.3em'
    }
  })

  // Memoized extensions
  const baseExtensions = useMemo(
    () => [
      history(),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap, // Add this - provides Ctrl+Z/Ctrl+Y keybindings
      ]),
      vim(),
      gutterTheme,
      markdown(),
      syntaxHighlighting(isDarkMode ? markdownHighlightStyleDark : markdownHighlightStyle),
      relativeLineNumbers(),
      EditorView.lineWrapping,
      markdownEditorTheme
    ],
    [isDarkMode]
  )

  // Safe auto-save with note tracking
  const debouncedSave = useMemo(
    () =>
      throttle(
        async (content: string, noteTitle: string) => {
          // Skip if switching notes or note has changed
          if (isSwitchingRef.current || currentNoteTitleRef.current !== noteTitle) {
            return
          }

          // Wait for pending save
          if (pendingSaveRef.current) {
            try {
              await pendingSaveRef.current
            } catch (error) {
              console.warn('Previous save failed:', error)
            }
          }

          // Final check before saving
          if (currentNoteTitleRef.current !== noteTitle) {
            return
          }

          try {
            pendingSaveRef.current = saveNote(content)
            await pendingSaveRef.current
            console.info('Auto saved')
          } catch (error) {
            console.error('Auto-save failed:', error)
          } finally {
            pendingSaveRef.current = null
          }
        },
        autoSavingTime,
        { leading: false, trailing: true }
      ),
    [saveNote]
  )

  // Manual save on blur
  const handleBlurSave = useCallback(async () => {
    if (!selectedNote || !viewRef.current || isSwitchingRef.current) return

    const content = viewRef.current.state.doc.toString()
    const noteTitle = selectedNote.title

    debouncedSave.cancel()

    if (pendingSaveRef.current) {
      try {
        await pendingSaveRef.current
      } catch (error) {
        console.warn('Previous save failed:', error)
      }
    }

    if (currentNoteTitleRef.current !== noteTitle) return

    try {
      pendingSaveRef.current = saveNote(content)
      await pendingSaveRef.current
      console.info('Manual save')
    } catch (error) {
      console.error('Manual save failed:', error)
    } finally {
      pendingSaveRef.current = null
    }
  }, [selectedNote, saveNote, debouncedSave])

  // Initialize/switch notes
  useEffect(() => {
    if (!selectedNote || !editorRef.current) {
      setCurrentContent('')
      return
    }

    const switchNote = async () => {
      isSwitchingRef.current = true
      const newTitle = selectedNote.title
      const newContent = selectedNote.content

      // Cancel pending operations
      debouncedSave.cancel()

      if (pendingSaveRef.current) {
        try {
          await pendingSaveRef.current
        } catch (error) {
          console.warn('Save failed during switch:', error)
        }
      }

      // Update tracking
      currentNoteTitleRef.current = newTitle
      setCurrentContent(newContent)

      // Create editor state
      const state = EditorState.create({
        doc: newContent,
        extensions: [
          ...baseExtensions,
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !isSwitchingRef.current) {
              const content = update.state.doc.toString()
              setCurrentContent(content) // Update preview immediately
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

      // Replace editor
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

  // Handle external content updates
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

  // Cleanup on unmount
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
      {/* Header with toggle */}
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

      {/* Content area */}
      <div className="flex-1 overflow-hidden relative">
        {/* Editor - always rendered but conditionally visible */}
        <div
          ref={editorRef}
          className={`absolute inset-0 w-full h-full ${isPreview ? 'invisible' : 'visible'}`}
        />

        {/* Preview - conditionally rendered */}
        {isPreview && (
          <div className="absolute inset-0 h-full overflow-auto p-6 bg-transparent dark:bg-transparent">
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  // Obsidian-like styling
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
                  code: ({ children, className }) => {
                    const isInline = !className
                    return isInline ? (
                      <code className="px-1.5 py-0.5 bg-emerald-50/50 dark:text-white text-gray-800 rounded text-sm ">
                        {children}
                      </code>
                    ) : (
                      <code className="block p-3 bg-gray-900 text-green-300 rounded font-mono text-sm overflow-x-auto">
                        {children}
                      </code>
                    )
                  },
                  pre: ({ children }) => (
                    <pre className="mb-4 overflow-hidden rounded">
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
