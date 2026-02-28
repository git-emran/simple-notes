import {
  GetNotes,
  ReadNote,
  WriteNote,
  CreateNote,
  DeleteNote,
  GetFileTree,
  CreateNoteNew,
  CreateCanvasNew,
  CreateDirectory,
  DeletePath,
  ReadFile,
  WriteFile,
  MovePath,
  ExportNoteToPdf,
  ImportImageToNoteFolder,
  ListFreeAiModels,
  GenerateWithAi
} from '@shared/types'

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
      readFileNew: ReadFile
      writeFileNew: WriteFile
      createNoteNew: CreateNoteNew
      createCanvasNew: CreateCanvasNew
      deletePath: DeletePath
      createDirectory: CreateDirectory
      movePath: MovePath
      exportNoteToPdf: ExportNoteToPdf
      importImageToNoteFolder: ImportImageToNoteFolder
      listFreeAiModels: ListFreeAiModels
      generateWithAi: GenerateWithAi
    }
  }
}

export {}
