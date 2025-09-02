/// <reference types="vite/client" />
// (any existing content)

import { GetNotes, ReadNote, WriteNote, CreateNote, DeleteNote } from '@shared/types'

declare global {
  interface Window {
    context: {
      locale: string
      getNotes: GetNotes
      readNote: ReadNote
      writeNote: WriteNote
      createNote: CreateNote
      deleteNote: DeleteNote
    }
  }
}

export {} // This makes it a module
