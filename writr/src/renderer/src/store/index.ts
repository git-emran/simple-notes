import { NoteContent, NoteInfo, FileNode } from '@shared/models'
import { atom } from 'jotai'
import { unwrap } from 'jotai/utils'

export const fileTreeAtom = atom<FileNode[]>([])
export const selectedNodeAtom = atom<FileNode | null>(null)

export const isDarkModeAtom = atom(false)

const loadNotes = async () => {
  const notes = await window.context.getNotes()

  // sort them by most recently edited
  return notes.sort((a, b) => b.lastEditTime - a.lastEditTime)
}

const notesAtomAsync = atom<NoteInfo[] | Promise<NoteInfo[]>>(loadNotes())

export const notesAtom = unwrap(notesAtomAsync, (prev) => prev)

export const selectedNoteIndexAtom = atom<number | null>(null)

const selectedNoteAtomAsync = atom(async (get) => {
  const notes = get(notesAtom)
  const selectedNoteIndex = get(selectedNoteIndexAtom)

  if (selectedNoteIndex == null || !notes) return null

  const selectedNote = notes[selectedNoteIndex]

  const noteContent = await window.context.readNote(selectedNote.title)

  return {
    ...selectedNote,
    content: noteContent
  }
})

export const selectedNoteAtom = unwrap(
  selectedNoteAtomAsync,
  (prev) =>
    prev ?? {
      title: '',
      content: '',
      lastEditTime: Date.now()
    }
)

export const saveNoteAtom = atom(null, async (get, set, newContent: NoteContent) => {
  const notes = get(notesAtom)
  const selectedNote = get(selectedNoteAtom)

  if (!selectedNote || !notes) return

  // save on disk
  await window.context.writeNote(selectedNote.title, newContent)

  // update the saved note's content in place to avoid remount
  set(selectedNoteAtom, {
    ...selectedNote,
    content: newContent,
    lastEditTime: Date.now() // optional: update lastEditTime here too
  })

  // update the saved note's last edit time in notesAtom
  set(
    notesAtom,
    notes.map((note) =>
      note.title === selectedNote.title ? { ...note, lastEditTime: Date.now() } : note
    )
  )
})

export const createEmptyNoteAtom = atom(null, async (get, set) => {
  const notes = get(notesAtom)

  if (!notes) return

  const title = await window.context.createNote()

  if (!title) return

  const newNote: NoteInfo = {
    title,
    lastEditTime: Date.now()
  }

  set(notesAtom, [newNote, ...notes.filter((note) => note.title !== newNote.title)])

  set(selectedNoteIndexAtom, 0)
})

export const deleteNoteAtom = atom(null, async (get, set) => {
  const notes = get(notesAtom)
  const selectedNote = get(selectedNoteAtom)

  if (!selectedNote || !notes) return

  const isDeleted = await window.context.deleteNote(selectedNote.title)

  if (!isDeleted) return

  // filter out the deleted note
  set(
    notesAtom,
    notes.filter((note) => note.title !== selectedNote.title)
  )

  // de select any note
  set(selectedNoteIndexAtom, null)
})
