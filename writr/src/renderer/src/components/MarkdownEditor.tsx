'use client'
import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import { defaultKeymap } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { vim } from '@replit/codemirror-vim'
import { throttle } from 'lodash'
import { useAtomValue, useSetAtom } from 'jotai'
import { selectedNoteAtom, saveNoteAtom } from '@renderer/store'
import { autoSavingTime } from '@shared/constants'
import { javascript } from '@codemirror/lang-javascript'
import ReactMarkdown from 'react-markdown'

export const MarkdownEditor = () => {
  const selectedNote = useAtomValue(selectedNoteAtom)
  const saveNote = useSetAtom(saveNoteAtom)
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  // Track the current note title to prevent cross-note saves
  const currentNoteTitleRef = useRef<string>('')
  // Track pending saves
  const pendingSaveRef = useRef<Promise<void> | null>(null)
  // Track if we're switching notes
  const isSwitchingRef = useRef(false)

  const [isPreview, setIsPreview] = useState(false)
  const [currentContent, setCurrentContent] = useState('')

  // Memoized extensions
  const baseExtensions = useMemo(
    () => [
      keymap.of(defaultKeymap),
      vim(),
      lineNumbers(),
      javascript(),
      markdown(),
      EditorView.lineWrapping,
      EditorView.theme({
        '&': { height: '100%' },
        '.cm-scroller': { fontFamily: 'inherit' },
        '.cm-focused': { outline: 'none' }
      })
    ],
    []
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
      <div className="flex items-center justify-between p-2 my-2 border-b bg-transparent relative z-10">
        <h2 className="text-sm font-medium text-gray-700 dark:text-white truncate">
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
          {isPreview ? 'Edit' : 'Preview'}
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
                    <h1 className=" text-gray-800 dark:text-white text-2xl font-bold mt-8 mb-4 pb-2 border-b border-gray-200">
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
                  p: ({ children }) => (
                    <p className="mb-4 leading-relaxed text-gray-800 dark:text-white">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-4 pl-6 space-y-1 text-gray-800 dark:text-white">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-4 pl-6 space-y-1">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-gray-800">
                      {children}
                    </li>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-blue-200 pl-4 py-2 mb-4 bg-blue-50 italic dark:text-white text-gray-700">
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
