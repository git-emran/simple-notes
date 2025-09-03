'use client'
import { useEffect, useRef, useCallback, useMemo } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import { defaultKeymap } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { vim } from '@replit/codemirror-vim'
import { throttle } from 'lodash'
import { useAtomValue, useSetAtom } from 'jotai'
import { selectedNoteAtom, saveNoteAtom } from '@renderer/store'
import { autoSavingTime } from '@shared/constants'
import { solarizedDark } from '@ddietr/codemirror-themes/solarized-dark'


export const MarkdownEditor = () => {
  const selectedNote = useAtomValue(selectedNoteAtom)
  const saveNote = useSetAtom(saveNoteAtom)
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  // Throttled auto-save
  const handleAutoSave = useMemo(
    () =>
      throttle(
        async (content: string) => {
          if (!selectedNote) return
          try {
            await saveNote(content)
            console.info('Auto saved:', selectedNote.title)
          } catch (error) {
            console.error('Auto-save failed:', error)
          }
        },
        autoSavingTime,
        { leading: false, trailing: true }
      ),
    [selectedNote, saveNote]
  )

  // Manual save (blur event)
  const handleImmediateSave = useCallback(async () => {
    if (!selectedNote || !viewRef.current) return
    handleAutoSave.cancel()
    try {
      const content = viewRef.current.state.doc.toString()
      await saveNote(content)
      console.info('Manual save:', selectedNote.title)
    } catch (error) {
      console.error('Manual save failed:', error)
    }
  }, [selectedNote, saveNote, handleAutoSave])

  // Stable base extensions
  const baseExtensions = useMemo(
    () => [
      keymap.of(defaultKeymap),
      markdown(),
      EditorView.lineWrapping,

    ],
    []
  )

  // Create editor when switching notes
  useEffect(() => {
    if (!selectedNote || !editorRef.current) return

    const state = EditorState.create({
      doc: selectedNote.content,
      extensions: [
        ...baseExtensions,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            handleAutoSave(update.state.doc.toString())
          }
        }),
        EditorView.domEventHandlers({
          blur: () => {
            handleImmediateSave()
            return false
          },
        }),
      ],
    })

    if (viewRef.current) {
      viewRef.current.destroy()
      viewRef.current = null
    }

    viewRef.current = new EditorView({
      state,
      parent: editorRef.current,
    })

    return () => {
      viewRef.current?.destroy()
      viewRef.current = null
      handleAutoSave.cancel()
    }
  }, [selectedNote, baseExtensions, handleAutoSave, handleImmediateSave])

  // Sync external content changes without recreating the editor
  useEffect(() => {
    if (!viewRef.current || !selectedNote) return
    const currentDoc = viewRef.current.state.doc.toString()
    if (currentDoc !== selectedNote.content) {
      viewRef.current.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: selectedNote.content },
      })
    }
  }, [selectedNote?.content])

  // Cancel auto-save on unmount
  useEffect(() => {
    return () => {
      handleAutoSave.cancel()
    }
  }, [handleAutoSave])

  return (
    <div
      ref={editorRef}
      className="rounded-sm overflow-hidden min-h-[60vh]"
    />
  )
}

