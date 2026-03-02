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
  ExportCanvasToPdf,
  ImportImageToNoteFolder,
  ImportImageToRootImageFolder,
  GetRootDir,
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
      createCanvasNew: CreateCanvasNew
      createDirectory: CreateDirectory
      deletePath: DeletePath
      readFileNew: ReadFile
      writeFileNew: WriteFile
      movePath: MovePath
      exportNoteToPdf: ExportNoteToPdf
      exportCanvasToPdf: ExportCanvasToPdf
      importImageToNoteFolder: ImportImageToNoteFolder
      importImageToRootImageFolder: ImportImageToRootImageFolder
      getRootDir: GetRootDir
      listFreeAiModels: ListFreeAiModels
      generateWithAi: GenerateWithAi
    }
  }
}
