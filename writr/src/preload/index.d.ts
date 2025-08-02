import { GetNotes, ReadNote, WriteNote, CreateNote, DeleteNote } from '@shared/types'

export {}

declare global {
  interface Window {
    //electron: ElectronAPI
    context: {
      locale: string
      getNotes: GetNotes
      readNotes: ReadNote
      writeNote: WriteNote
      createNote: CreateNote // You have this type, good to include
      deleteNote: DeleteNote // You have this type, good to include
      // Make sure all context-related functions/properties are listed here
    }
  }
}
