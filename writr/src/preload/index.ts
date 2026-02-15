import { CreateNote, DeleteNote, GetNotes, ReadNote, WriteNote, GetFileTree, CreateNoteNew, CreateDirectory, DeletePath, ReadFile, WriteFile, MovePath } from '@shared/types'
import { contextBridge, ipcRenderer } from 'electron'

if (!process.contextIsolated) {
  throw new Error('contextIsolation must be enabled in the BrowserWindow')
}

//Contextbridge Parameters

try {
  contextBridge.exposeInMainWorld('context', {
    locale: navigator.language,
    getNotes: (...args: Parameters<GetNotes>) => ipcRenderer.invoke('getNotes', ...args),
    readNote: (...args: Parameters<ReadNote>) => ipcRenderer.invoke('readNote', ...args),
    writeNote: (...args: Parameters<WriteNote>) => ipcRenderer.invoke('writeNote', ...args),
    createNote: (...args: Parameters<CreateNote>) => ipcRenderer.invoke('createNote', ...args),
    deleteNote: (...args: Parameters<DeleteNote>) => ipcRenderer.invoke('deleteNote', ...args),
    getFileTree: (...args: Parameters<GetFileTree>) => ipcRenderer.invoke('getFileTree', ...args),
    createNoteNew: (...args: Parameters<CreateNoteNew>) => ipcRenderer.invoke('createNoteNew', ...args),
    createDirectory: (...args: Parameters<CreateDirectory>) => ipcRenderer.invoke('createDirectory', ...args),
    deletePath: (...args: Parameters<DeletePath>) => ipcRenderer.invoke('deletePath', ...args),
    readFileNew: (...args: Parameters<ReadFile>) => ipcRenderer.invoke('readFileNew', ...args),
    writeFileNew: (...args: Parameters<WriteFile>) => ipcRenderer.invoke('writeFileNew', ...args),
    movePath: (...args: Parameters<MovePath>) => ipcRenderer.invoke('movePath', ...args)
  })
} catch (error) {
  console.error(error)
}
