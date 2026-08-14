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
  EnsureDirectory,
  DeletePath,
  RevealPath,
  ReadFile,
  WriteFile,
  MovePath,
  ExportNoteToPdf,
  ExportCanvasToPdf,
  ImportImageToNoteFolder,
  ImportImageToRootImageFolder,
  GetRootDir,
  ListFreeAiModels,
  GenerateWithAi,
  StreamWithAi
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
      ensureDirectory: EnsureDirectory
      deletePath: DeletePath
      revealPath: RevealPath
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
      streamWithAi: StreamWithAi
    }
  }
}
