import { app, ipcMain, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'path'
import { promises as fs } from 'fs'
import crypto from 'crypto'
import http from 'https'

const CONFIG_FILE = path.join(app.getPath('userData'), 'update-config.json')

interface UpdateConfig {
  uuid: string
  bucket: number
  lastPromptedVersion?: string
}

let cachedConfig: UpdateConfig | null = null

/**
 * Helper: Perform a secure GET request to fetch JSON configuration
 */
function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch config, status code: ${res.statusCode}`))
        return
      }
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', (err) => {
      reject(err)
    })
  })
}

/**
 * Helper: Load or initialize the application update configuration
 */
async function getOrInitializeConfig(): Promise<UpdateConfig> {
  if (cachedConfig) return cachedConfig

  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8')
    cachedConfig = JSON.parse(data)
    if (cachedConfig && cachedConfig.uuid && cachedConfig.bucket) {
      return cachedConfig
    }
  } catch {
    /* file doesn't exist or is invalid; proceed to initialize */
  }

  const uuid = crypto.randomUUID()
  const hash = crypto.createHash('md5').update(uuid).digest('hex')
  const bucket = (parseInt(hash.slice(0, 8), 16) % 100) + 1

  cachedConfig = { uuid, bucket }
  try {
    await fs.writeFile(CONFIG_FILE, JSON.stringify(cachedConfig, null, 2), 'utf-8')
  } catch (e) {
    console.error('Failed to write update config:', e)
  }

  return cachedConfig
}

/**
 * Check if the current client bucket qualifies for the rollout version
 */
async function checkRolloutEligibility(targetVersion: string, forceCheck = false): Promise<boolean> {
  if (forceCheck) return true // User manual check bypasses rollout gating

  try {
    // Fetch from the main branch of the repository
    const url = 'https://raw.githubusercontent.com/git-emran/simple-notes/main/rollout.json'
    const rolloutData = await fetchJson(url)

    if (rolloutData && rolloutData.version === targetVersion) {
      const config = await getOrInitializeConfig()
      const percentage = typeof rolloutData.rolloutPercentage === 'number' ? rolloutData.rolloutPercentage : 100
      return config.bucket <= percentage
    }
  } catch (e) {
    console.warn('Rollout lookup failed, defaulting to enabled:', e)
  }

  return true // Default to enabled if parsing or network fails
}

let lastStatus: { event: string; payload?: any } = { event: 'idle' }
let lastKnownVersion: string | null = null

/**
 * Configure and register the auto-update lifecycle
 */
export async function initializeUpdater(mainWindow: BrowserWindow) {
  // Prevent duplicate event listeners during hot reloads or window recreation
  autoUpdater.removeAllListeners()

  // Prevent "Attempted to register a second handler" errors by removing existing handlers
  ipcMain.removeHandler('updater:check')
  ipcMain.removeHandler('updater:download')
  ipcMain.removeHandler('updater:restart-and-install')
  ipcMain.removeHandler('updater:get-status')
  ipcMain.removeHandler('updater:get-config')
  ipcMain.removeHandler('updater:get-version')
  ipcMain.removeHandler('updater:dismiss-welcome')

  // Disable automatic downloading so we can run eligibility gating checks first
  autoUpdater.autoDownload = false
  autoUpdater.logger = console

  // Notify renderer process on events
  const sendStatus = (event: string, payload?: any) => {
    lastStatus = { event, payload }
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:status', { event, payload })
    }
  }

  autoUpdater.on('checking-for-update', () => {
    lastKnownVersion = null
    sendStatus('checking')
  })

  autoUpdater.on('update-available', async (info) => {
    lastKnownVersion = info.version
    sendStatus('available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
      releaseDate: info.releaseDate
    })

    // Gated check: download package only if user is eligible or forced check
    const isEligible = await checkRolloutEligibility(info.version, false)
    if (isEligible) {
      sendStatus('downloading', { version: info.version })
      autoUpdater.downloadUpdate()
    } else {
      sendStatus('gated', {
        version: info.version,
        releaseNotes: info.releaseNotes,
        releaseDate: info.releaseDate
      })
    }
  })

  autoUpdater.on('update-not-available', () => {
    sendStatus('not-available')
  })

  autoUpdater.on('error', (err) => {
    const errorMsg = err == null ? 'unknown' : (err.stack || err).toString()
    sendStatus('error', errorMsg)
  })

  autoUpdater.on('download-progress', (progressObj) => {
    sendStatus('progress', { ...progressObj, version: lastKnownVersion })
  })

  autoUpdater.on('update-downloaded', (info) => {
    sendStatus('downloaded', {
      version: info.version,
      releaseNotes: info.releaseNotes,
      releaseDate: info.releaseDate
    })
  })

  // Handle IPC calls from the renderer
  ipcMain.handle('updater:check', async (_, args: { force?: boolean } = {}) => {
    if (!app.isPackaged) {
      // Bypassed in development mode
      sendStatus('dev-bypass')
      return { status: 'dev-bypass' }
    }
    try {
      sendStatus('checking')
      if (args.force) {
        // Force check: bypass rollout gating entirely by checking and downloading if available
        const eligible = await autoUpdater.checkForUpdates()
        if (eligible && eligible.updateInfo) {
          sendStatus('downloading', { version: eligible.updateInfo.version })
          autoUpdater.downloadUpdate()
        }
        return { status: 'checking' }
      } else {
        await autoUpdater.checkForUpdates()
        return { status: 'checking' }
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e)
      console.error('Update check failed:', e)
      sendStatus('error', errMsg)
      return { status: 'error', error: errMsg }
    }
  })

  ipcMain.handle('updater:download', async () => {
    if (!app.isPackaged) {
      sendStatus('dev-bypass')
      return { status: 'dev-bypass' }
    }
    try {
      sendStatus('downloading', { version: lastKnownVersion })
      await autoUpdater.downloadUpdate()
      return { status: 'downloading' }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e)
      console.error('Download update failed:', e)
      sendStatus('error', errMsg)
      return { status: 'error', error: errMsg }
    }
  })

  ipcMain.handle('updater:restart-and-install', () => {
    if (app.isPackaged) {
      autoUpdater.quitAndInstall()
    }
  })

  ipcMain.handle('updater:get-status', () => {
    return lastStatus
  })

  ipcMain.handle('updater:get-config', async () => {
    return await getOrInitializeConfig()
  })

  ipcMain.handle('updater:get-version', () => {
    return app.getVersion()
  })

  ipcMain.handle('updater:dismiss-welcome', async (_, version: string) => {
    const config = await getOrInitializeConfig()
    config.lastPromptedVersion = version
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
    return true
  })
}
