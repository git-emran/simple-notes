import type { EditorView } from '@codemirror/view'
import type React from 'react'

/**
 * The shape that `selectedNoteAtom` (unwrapped) resolves to.
 * Combines NoteInfo fields with content + path.
 */
export type SelectedNote = {
  title: string
  lastEditTime: number
  content: string
  path: string
  readError?: string | null
}

/**
 * A MutableRefObject holding an EditorView (or null before mount).
 * Use this instead of React.RefObject so hooks can assign .current.
 */
export type ViewRef = React.MutableRefObject<EditorView | null>

/**
 * A MutableRefObject holding an HTMLDivElement (or null before mount).
 */
export type DivRef = React.MutableRefObject<HTMLDivElement | null>
