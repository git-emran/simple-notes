import { app, shell, BrowserWindow, ipcMain, protocol, Menu, type MenuItemConstructorOptions } from 'electron'
import { join } from 'path'
import path from 'path'
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
  createCanvasNew,
  createDirectory,
  deletePath,
  readFileNew,
  writeFileNew,
  movePath,
  exportNoteToPdf,
  exportCanvasToPdf,
  importImageToNoteFolder,
  importImageToRootImageFolder,
  getRootDir,
  listFreeAiModels,
  generateWithAi
} from '@/lib'
import {
  closeTerminalSession,
  createTerminalSession,
  disposeTerminalSessionsForSender,
  getTerminalSnapshot,
  resizeTerminalSession,
  writeTerminalInput,
} from '@/lib/terminal'
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
  GetRootDir,
  ImportImageToNoteFolder,
  ImportImageToRootImageFolder,
  ListFreeAiModels,
  GenerateWithAi,
  CreateTerminalSession,
  GetTerminalSnapshot,
  CloseTerminalSession
} from '@shared/types'

protocol.registerSchemesAsPrivileged([
  { scheme: 'local-file', privileges: { standard: true, secure: true, supportFetchAPI: true } }
])

if (process.platform === 'darwin') {
  // Extra hard-disable to avoid native menu churn warnings on keypress.
  app.commandLine.appendSwitch('disable-spell-checking')
}

function createWindow(): void {
  /* Create the browser window. */
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
      contextIsolation: true,
      spellcheck: false
    }
  })

  // Work around macOS log spam (triggered by native spellchecker menu churn on keypress).
  mainWindow.webContents.session.setSpellCheckerEnabled(false)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.once('destroyed', () => {
    disposeTerminalSessionsForSender(mainWindow.webContents)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    try {
      const url = new URL(details.url)
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        shell.openExternal(details.url)
      }
    } catch {
      /* ignore invalid URLs */
    }
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

const configureApplicationMenu = () => {
  // Work around macOS log spam:
  // "representedObject is not a WeakPtrToElectronMenuModelAsNSObject"
  //
  // The spam is triggered by native text services validating/churning menu items on keypress
  // (notably in Edit/Spelling-related menus). This app doesn't rely on a native application
  // menu for core functionality, so we install a minimal menu on macOS and remove it elsewhere.
  //
  // Note: On macOS, standard clipboard shortcuts (Cmd+C/V/X) are wired up via menu roles.
  // If the app menu does not include the relevant Edit roles, copy/paste can appear "broken"
  // across text inputs (including CodeMirror).
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null)
    return
  }

  const template: MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [{ role: 'quit' }],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')
  configureApplicationMenu()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  /* IPC test */
  ipcMain.handle('getNotes', (_, ...args: Parameters<GetNotes>) => getNotes(...args))
  ipcMain.handle('readNote', (_, ...args: Parameters<ReadNote>) => readNote(...args))
  ipcMain.handle('writeNote', (_, ...args: Parameters<WriteNote>) => writeNote(...args))
  ipcMain.handle('createNote', (_, ...args: Parameters<CreateNote>) => createNote(...args))
  ipcMain.handle('deleteNote', (_, ...args: Parameters<DeleteNote>) => deleteNote(...args))
  ipcMain.handle('getFileTree', (_, ...args: Parameters<GetFileTree>) => getFileTree(...args))
  ipcMain.handle('createNoteNew', (_, ...args: Parameters<CreateNoteNew>) => createNoteNew(...args))
  ipcMain.handle('createCanvasNew', (_, ...args: Parameters<CreateCanvasNew>) => createCanvasNew(...args))
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
  ipcMain.handle('exportCanvasToPdf', (event, ...args: Parameters<ExportCanvasToPdf>) => {
    const parent = BrowserWindow.fromWebContents(event.sender)
    if (!parent) return false
    return exportCanvasToPdf(parent, ...args)
  })
  ipcMain.handle('importImageToNoteFolder', (_, ...args: Parameters<ImportImageToNoteFolder>) =>
    importImageToNoteFolder(...args)
  )
  ipcMain.handle('importImageToRootImageFolder', (_, ...args: Parameters<ImportImageToRootImageFolder>) =>
    importImageToRootImageFolder(...args)
  )
  ipcMain.handle('getRootDir', (_, ...args: Parameters<GetRootDir>) => getRootDir(...args))
  ipcMain.handle('listFreeAiModels', (_, ...args: Parameters<ListFreeAiModels>) =>
    listFreeAiModels(...args)
  )
  ipcMain.handle('generateWithAi', (_, ...args: Parameters<GenerateWithAi>) => generateWithAi(...args))
  ipcMain.handle('terminal:create', (event, ...args: Parameters<CreateTerminalSession>) =>
    createTerminalSession(event.sender, ...args)
  )
  ipcMain.handle('terminal:snapshot', (event, ...args: Parameters<GetTerminalSnapshot>) =>
    getTerminalSnapshot(event.sender, ...args)
  )
  ipcMain.handle('terminal:close', (event, ...args: Parameters<CloseTerminalSession>) => {
    closeTerminalSession(event.sender, ...args)
  })
  ipcMain.on('terminal:input', (event, payload: { sessionId: string; data: string }) => {
    writeTerminalInput(event.sender, payload.sessionId, payload.data)
  })
  ipcMain.on('terminal:resize', (event, payload: { sessionId: string; cols: number; rows: number }) => {
    resizeTerminalSession(event.sender, payload.sessionId, payload.cols, payload.rows)
  })
  
  protocol.handle('local-file', async (request) => {
    try {
      const url = new URL(request.url)
      const hostPart = decodeURIComponent(url.host || '')
      const pathPart = decodeURIComponent(url.pathname || '')
      let filePath = pathPart

      /* Handle malformed URLs like local-file://image.png/ where path becomes "/" */
      if ((filePath === '/' || filePath === '') && hostPart) {
        filePath = hostPart
      }

      /* local-file://host/path -> /host/path on POSIX, host/path on Windows. */
      if (hostPart && pathPart && pathPart !== '/') {
        if (pathPart.startsWith('/')) {
          filePath = `/${hostPart}${pathPart}`
        } else {
          filePath = `${hostPart}/${pathPart}`
        }
      }

      /* Remove leading slash on Windows if present (e.g. /C:/ -> C:/) */
      if (process.platform === 'win32' && filePath.startsWith('/') && !filePath.startsWith('//')) {
          filePath = filePath.slice(1);
      }

      /* Some renderers/inputs may produce URLs like local-file://users/<name>/... */
      /* Normalize to the real macOS/Linux /Users/... path. */
      if (process.platform !== 'win32') {
        if (!filePath.startsWith('/') && /^users\//i.test(filePath)) {
          filePath = `/${filePath}`
        }
        if (filePath.startsWith('/users/')) {
          filePath = `/Users/${filePath.slice('/users/'.length)}`
        }
      }

      /* Normalize POSIX paths like //Users/... -> /Users/... */
      if (process.platform !== 'win32' && filePath.startsWith('//')) {
        filePath = filePath.replace(/^\/+/, '/')
      }

      const resolvedFilePath = path.resolve(filePath)
      const resolvedRootPath = path.resolve(getRootDir())
      const relativePath = path.relative(resolvedRootPath, resolvedFilePath)
      const isInsideRoot =
        relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))

      if (!isInsideRoot) {
        return new Response('Not Found', { status: 404 })
      }

      const fileStat = await fs.stat(resolvedFilePath)
      if (!fileStat.isFile()) {
        return new Response('Not Found', { status: 404 })
      }
      
      const { Readable } = await import('stream')
      const { createReadStream } = await import('fs')
      const stream = createReadStream(resolvedFilePath)
      
      return new Response(Readable.toWeb(stream) as any)
	    } catch (e) {
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
