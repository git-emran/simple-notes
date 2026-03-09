import { NoteContent, NoteInfo, FileNode } from './models'

export type GetNotes = () => Promise<NoteInfo[]>
export type ReadNote = (title: NoteInfo['title']) => Promise<NoteContent>
export type WriteNote = (title: NoteInfo['title'], content: NoteContent) => Promise<void>
export type CreateNote = () => Promise<NoteInfo['title'] | false>
export type DeleteNote = (title: NoteInfo['title']) => Promise<boolean>

export type GetFileTree = () => Promise<FileNode[]>
export type ReadFile = (path: string) => Promise<string>
export type WriteFile = (path: string, content: string) => Promise<void>
export type CreateNoteNew = (parentDir: string) => Promise<string | false>
export type CreateCanvasNew = (parentDir?: string) => Promise<string | false>
export type DeletePath = (path: string) => Promise<boolean>
export type CreateDirectory = (parentDir: string) => Promise<string | false>
export type MovePath = (src: string, dest: string) => Promise<boolean>
export type ExportNoteToPdf = (notePath: string, noteTitle: string, content: string) => Promise<boolean>
export type ExportCanvasToPdf = (
  canvasPath: string,
  canvasTitle: string,
  rect: { x: number; y: number; width: number; height: number }
) => Promise<boolean>
export type GetRootDir = () => Promise<string>
export type ImportImageToNoteFolder = (
  notePath: string,
  sourceImagePath: string
) => Promise<{ markdownPath: string; absolutePath: string } | null>
export type ImportImageToRootImageFolder = (source: {
  sourcePath?: string
  fileName?: string
  data?: Uint8Array
}) => Promise<{ markdownPath: string; absolutePath: string } | null>

export type AiModelInfo = {
  id: string
  name: string
}

export type ListFreeAiModels = (apiKey?: string) => Promise<AiModelInfo[]>

export type GenerateWithAiParams = {
  model: string
  prompt: string
  content: string
  apiKey?: string
}

export type GenerateWithAi = (
  params: GenerateWithAiParams
) => Promise<{ text: string } | { error: string }>

export type CreateTerminalSessionParams = {
  cwd?: string
  cols?: number
  rows?: number
}

export type TerminalSessionInfo = {
  sessionId: string
  cwd: string
  shell: string
}

export type TerminalSnapshot = TerminalSessionInfo & {
  buffer: string
  sequence: number
}

export type TerminalDataEvent = {
  sessionId: string
  data: string
  sequence: number
}

export type TerminalExitEvent = {
  sessionId: string
  exitCode: number
  signal?: number
}

export type CreateTerminalSession = (
  params?: CreateTerminalSessionParams
) => Promise<TerminalSessionInfo>
export type GetTerminalSnapshot = (sessionId: string) => Promise<TerminalSnapshot | null>
export type CloseTerminalSession = (sessionId: string) => Promise<void>
export type WriteTerminalInput = (sessionId: string, data: string) => void
export type ResizeTerminalSession = (sessionId: string, cols: number, rows: number) => void
