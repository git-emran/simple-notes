import {
  CreateNote,
  DeleteNote,
  GetNotes,
  ReadNote,
  WriteNote,
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
  GenerateWithAi,
  CreateTerminalSession,
  GetTerminalSnapshot,
  CloseTerminalSession,
  TerminalDataEvent,
  TerminalExitEvent
} from '@shared/types'
import type { IpcRendererEvent } from 'electron'
import { contextBridge, ipcRenderer } from 'electron'

if (!process.contextIsolated) {
  throw new Error('contextIsolation must be enabled in the BrowserWindow')
}

/* Contextbridge Parameters */
contextBridge.exposeInMainWorld('context', {
  locale: navigator.language,
  getNotes: (...args: Parameters<GetNotes>) => ipcRenderer.invoke('getNotes', ...args),
  readNote: (...args: Parameters<ReadNote>) => ipcRenderer.invoke('readNote', ...args),
  writeNote: (...args: Parameters<WriteNote>) => ipcRenderer.invoke('writeNote', ...args),
  createNote: (...args: Parameters<CreateNote>) => ipcRenderer.invoke('createNote', ...args),
  deleteNote: (...args: Parameters<DeleteNote>) => ipcRenderer.invoke('deleteNote', ...args),
  getFileTree: (...args: Parameters<GetFileTree>) => ipcRenderer.invoke('getFileTree', ...args),
  createNoteNew: (...args: Parameters<CreateNoteNew>) => ipcRenderer.invoke('createNoteNew', ...args),
  createCanvasNew: (...args: Parameters<CreateCanvasNew>) =>
    ipcRenderer.invoke('createCanvasNew', ...args),
  createDirectory: (...args: Parameters<CreateDirectory>) => ipcRenderer.invoke('createDirectory', ...args),
  deletePath: (...args: Parameters<DeletePath>) => ipcRenderer.invoke('deletePath', ...args),
  readFileNew: (...args: Parameters<ReadFile>) => ipcRenderer.invoke('readFileNew', ...args),
  writeFileNew: (...args: Parameters<WriteFile>) => ipcRenderer.invoke('writeFileNew', ...args),
  movePath: (...args: Parameters<MovePath>) => ipcRenderer.invoke('movePath', ...args),
  exportNoteToPdf: (...args: Parameters<ExportNoteToPdf>) => ipcRenderer.invoke('exportNoteToPdf', ...args),
  exportCanvasToPdf: (...args: Parameters<ExportCanvasToPdf>) =>
    ipcRenderer.invoke('exportCanvasToPdf', ...args),
  importImageToNoteFolder: (...args: Parameters<ImportImageToNoteFolder>) =>
    ipcRenderer.invoke('importImageToNoteFolder', ...args),
  importImageToRootImageFolder: (...args: Parameters<ImportImageToRootImageFolder>) =>
    ipcRenderer.invoke('importImageToRootImageFolder', ...args),
  getRootDir: (...args: Parameters<GetRootDir>) => ipcRenderer.invoke('getRootDir', ...args),
  listFreeAiModels: (...args: Parameters<ListFreeAiModels>) => ipcRenderer.invoke('listFreeAiModels', ...args),
  generateWithAi: (...args: Parameters<GenerateWithAi>) => ipcRenderer.invoke('generateWithAi', ...args),
  createTerminalSession: (...args: Parameters<CreateTerminalSession>) =>
    ipcRenderer.invoke('terminal:create', ...args),
  getTerminalSnapshot: (...args: Parameters<GetTerminalSnapshot>) => ipcRenderer.invoke('terminal:snapshot', ...args),
  closeTerminalSession: (...args: Parameters<CloseTerminalSession>) => ipcRenderer.invoke('terminal:close', ...args),
  writeTerminalInput: (sessionId: string, data: string) => ipcRenderer.send('terminal:input', { sessionId, data }),
  resizeTerminalSession: (sessionId: string, cols: number, rows: number) =>
    ipcRenderer.send('terminal:resize', { sessionId, cols, rows }),
  onTerminalData: (callback: (event: TerminalDataEvent) => void) => {
    const listener = (_event: IpcRendererEvent, payload: TerminalDataEvent) => callback(payload)
    ipcRenderer.on('terminal:data', listener)
    return () => ipcRenderer.removeListener('terminal:data', listener)
  },
  onTerminalExit: (callback: (event: TerminalExitEvent) => void) => {
    const listener = (_event: IpcRendererEvent, payload: TerminalExitEvent) => callback(payload)
    ipcRenderer.on('terminal:exit', listener)
    return () => ipcRenderer.removeListener('terminal:exit', listener)
  }
})
