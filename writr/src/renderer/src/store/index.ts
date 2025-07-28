import { atom } from 'jotai'
import { NoteInfo } from '@renderer/shared/models'
import { notesMock } from './mocks'

export const notesAtom = atom<NoteInfo[]>(notesMock)

export const selectedNoteIndexAtom = atom<number | null>(null)

export const selectedNoteAtom = atom((get) => {
  const notes = get(notesAtom)
  const selectedNoteIndex = get(selectedNoteIndexAtom)

  if (selectedNoteIndex == null) return null
  const selectedNotes = notes[selectedNoteIndex]

  return {
    ...selectedNotes,
    content: `Hello from Note${selectedNoteIndex}`
  }
})
