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
  CreateTerminalSession,
  GetTerminalSnapshot,
  CloseTerminalSession,
  TerminalDataEvent,
  TerminalExitEvent
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
      ensureDirectory: EnsureDirectory
      movePath: MovePath
      exportNoteToPdf: ExportNoteToPdf
      exportCanvasToPdf: ExportCanvasToPdf
      importImageToNoteFolder: ImportImageToNoteFolder
      importImageToRootImageFolder: ImportImageToRootImageFolder
      getRootDir: GetRootDir
      listFreeAiModels: ListFreeAiModels
      generateWithAi: GenerateWithAi
      createTerminalSession: CreateTerminalSession
      getTerminalSnapshot: GetTerminalSnapshot
      closeTerminalSession: CloseTerminalSession
      writeTerminalInput: (sessionId: string, data: string) => void
      resizeTerminalSession: (sessionId: string, cols: number, rows: number) => void
      onTerminalData: (callback: (event: TerminalDataEvent) => void) => () => void
      onTerminalExit: (callback: (event: TerminalExitEvent) => void) => () => void
      checkForUpdates: (force?: boolean) => Promise<{ status: string; error?: string }>
      restartAndInstall: () => Promise<void>
      getUpdateConfig: () => Promise<{ uuid: string; bucket: number; lastPromptedVersion?: string }>
      getAppVersion: () => Promise<string>
      dismissWelcome: (version: string) => Promise<boolean>
      onUpdaterStatus: (callback: (data: { event: string; payload?: any }) => void) => () => void
    }
  }
}

export {}
