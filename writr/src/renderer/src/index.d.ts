import {
  GetNotes,
  ReadNote,
  WriteNote,
  CreateNote,
  DeleteNote,
  GetFileTree,
  CreateNoteNew,
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
      createNoteNew: CreateNoteNew
      createDirectory: CreateDirectory
      deletePath: DeletePath
      readFileNew: ReadFile
      writeFileNew: WriteFile
      movePath: MovePath
      exportNoteToPdf: ExportNoteToPdf
      importImageToNoteFolder: ImportImageToNoteFolder
      listFreeAiModels: ListFreeAiModels
      generateWithAi: GenerateWithAi
    }
  }
}
