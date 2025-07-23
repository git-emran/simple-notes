import { contextBridge } from 'electron'
// Custom APIs for renderer

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (!process.contextIsolated) {
  throw new Error('contextIsoation must be enabled in the BrowserWindow')
}

try {
  contextBridge.exposeInMainWorld('context', {
    //Todo
  })
} catch (error) {
  console.error(error)
}
