import { GetNotes, ReadNote, WriteNote, CreateNote, DeleteNote, GetFileTree, CreateNoteNew, CreateDirectory, DeletePath, ReadFile, WriteFile, MovePath } from '@shared/types'

declare global {
  interface Window {
    context: {
      locale: string
      getNotes: GetNotes
      readNote: ReadNote
      writeNote: WriteNote
      createNote: CreateNote
      deleteNote: DeleteNote
      getFileTree: GetFileTree
      createNoteNew: CreateNoteNew
      createDirectory: CreateDirectory
      deletePath: DeletePath
      readFileNew: ReadFile
      writeFileNew: WriteFile
      movePath: MovePath
    }
  }
}

export {}
