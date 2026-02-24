import { app, shell, BrowserWindow, ipcMain, protocol } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  createNote,
  deleteNote,
  getNotes,
  readNote,
  writeNote,
  getFileTree,
  createNoteNew,
  createDirectory,
  deletePath,
  readFileNew,
  writeFileNew,
  movePath,
  exportNoteToPdf,
  importImageToNoteFolder,
  listFreeAiModels,
  generateWithAi
} from '@/lib'
import {
  CreateNote,
  DeleteNote,
  GetNotes,
  ReadNote,
  WriteNote,
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

protocol.registerSchemesAsPrivileged([
  { scheme: 'local-file', privileges: { standard: true, secure: true, supportFetchAPI: true } }
])

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    center: true,
    title: 'Writer',
    frame: false,
    vibrancy: 'under-window',
    visualEffectState: 'active',
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 15, y: 10 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.handle('getNotes', (_, ...args: Parameters<GetNotes>) => getNotes(...args))
  ipcMain.handle('readNote', (_, ...args: Parameters<ReadNote>) => readNote(...args))
  ipcMain.handle('writeNote', (_, ...args: Parameters<WriteNote>) => writeNote(...args))
  ipcMain.handle('createNote', (_, ...args: Parameters<CreateNote>) => createNote(...args))
  ipcMain.handle('deleteNote', (_, ...args: Parameters<DeleteNote>) => deleteNote(...args))
  ipcMain.handle('getFileTree', (_, ...args: Parameters<GetFileTree>) => getFileTree(...args))
  ipcMain.handle('createNoteNew', (_, ...args: Parameters<CreateNoteNew>) => createNoteNew(...args))
  ipcMain.handle('createDirectory', (_, ...args: Parameters<CreateDirectory>) => createDirectory(...args))
  ipcMain.handle('deletePath', (_, ...args: Parameters<DeletePath>) => deletePath(...args))
  ipcMain.handle('readFileNew', (_, ...args: Parameters<ReadFile>) => readFileNew(...args))
  ipcMain.handle('writeFileNew', (_, ...args: Parameters<WriteFile>) => writeFileNew(...args))
  ipcMain.handle('movePath', (_, ...args: Parameters<MovePath>) => movePath(...args))
  ipcMain.handle('exportNoteToPdf', (event, ...args: Parameters<ExportNoteToPdf>) => {
    const parent = BrowserWindow.fromWebContents(event.sender)
    if (!parent) return false
    return exportNoteToPdf(parent, ...args)
  })
  ipcMain.handle('importImageToNoteFolder', (_, ...args: Parameters<ImportImageToNoteFolder>) =>
    importImageToNoteFolder(...args)
  )
  ipcMain.handle('listFreeAiModels', (_, ...args: Parameters<ListFreeAiModels>) =>
    listFreeAiModels(...args)
  )
  ipcMain.handle('generateWithAi', (_, ...args: Parameters<GenerateWithAi>) => generateWithAi(...args))
  
  protocol.handle('local-file', async (request) => {
    try {
      console.log('Main: local-file request:', request.url)
      const url = new URL(request.url)
      const hostPart = decodeURIComponent(url.host || '')
      const pathPart = decodeURIComponent(url.pathname || '')
      let filePath = pathPart

      // Handle malformed URLs like local-file://image.png/ where path becomes "/"
      if ((filePath === '/' || filePath === '') && hostPart) {
        filePath = hostPart
      }

      // local-file://host/path -> /host/path on POSIX, host/path on Windows.
      if (hostPart && pathPart && pathPart !== '/') {
        if (pathPart.startsWith('/')) {
          filePath = `/${hostPart}${pathPart}`
        } else {
          filePath = `${hostPart}/${pathPart}`
        }
      }

      // Remove leading slash on Windows if present (e.g. /C:/ -> C:/)
      if (process.platform === 'win32' && filePath.startsWith('/') && !filePath.startsWith('//')) {
          filePath = filePath.slice(1);
      }

      const fileStat = await fs.stat(filePath)
      if (!fileStat.isFile()) {
        return new Response('Not Found', { status: 404 })
      }
      
      console.log('Main: serving file:', filePath)
      const data = await fs.readFile(filePath)
      return new Response(data as any)
    } catch (e) {
      console.error('Failed to serve local file:', e)
      return new Response('Not Found', { status: 404 })
    }
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
