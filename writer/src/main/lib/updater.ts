/* eslint-disable no-console */
import { app, ipcMain, BrowserWindow, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'path'
import * as fsSync from 'fs'
import { promises as fs } from 'fs'
import crypto from 'crypto'
import http from 'http'
import https from 'https'

const GITHUB_OWNER = 'git-emran'
const GITHUB_REPO = 'simple-notes'
const CONFIG_FILE = path.join(app.getPath('userData'), 'update-config.json')

interface UpdateConfig {
  uuid: string
  bucket: number
  lastPromptedVersion?: string
}

interface GitHubReleaseAsset {
  name: string
  browser_download_url: string
  size: number
}

interface GitHubReleaseData {
  tag_name: string
  name: string
  body: string
  published_at: string
  html_url: string
  draft: boolean
  prerelease: boolean
  assets: GitHubReleaseAsset[]
}

interface DirectReleaseInfo {
  version: string
  releaseNotes: string
  releaseDate: string
  downloadUrl: string | null
  htmlUrl: string
  fileName: string | null
}

let cachedConfig: UpdateConfig | null = null
let lastStatus: { event: string; payload?: unknown } = { event: 'idle' }
let lastKnownVersion: string | null = null
let latestDirectRelease: DirectReleaseInfo | null = null
let lastDownloadedInstallerPath: string | null = null

/**
 * Cleanly format error messages into human-friendly, actionable text
 * and prevent raw Node.js ENOENT or internal filesystem paths from being exposed.
 */
export function formatUpdaterError(err: unknown): string {
  if (!err) return 'Check failed. Please check your internet connection.'
  const msg = err instanceof Error ? err.message : String(err)
  const lower = msg.toLowerCase()

  if (lower.includes('app-update.yml') || lower.includes('enoent')) {
    return 'Update configuration not found in this build. Please download the latest update from GitHub.'
  }
  if (
    lower.includes('net::err') ||
    lower.includes('enotfound') ||
    lower.includes('econnrefused') ||
    lower.includes('etimedout') ||
    lower.includes('timeout') ||
    lower.includes('network')
  ) {
    return 'Unable to reach the update server. Please check your internet connection.'
  }
  if (lower.includes('rate limit') || lower.includes('403')) {
    return 'GitHub API rate limit reached. Please try again in a few minutes or check GitHub releases.'
  }
  if (lower.includes('404')) {
    return 'No update releases found for this version.'
  }
  if (lower.includes('code signature') || lower.includes('could not get code signature')) {
    return 'Automatic update installation cannot be verified on this macOS build. Please download the latest DMG from GitHub.'
  }
  if (lower.includes('permission') || lower.includes('eacces')) {
    return 'Insufficient disk permissions to install update. Please download the latest version directly.'
  }

  // Strip file paths from generic error message so internal paths are never shown
  const sanitized = msg.replace(/\/[a-zA-Z0-9_.\-/]+\.(yml|json|js|ts|dmg|exe|zip)/g, '')
  return sanitized.trim() || 'Failed to check for updates. Please try again later.'
}

/**
 * Compare two semver strings: returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal.
 */
export function compareSemver(v1: string, v2: string): number {
  const clean = (v: string) => v.replace(/^v/, '').trim().split('-')[0]
  const p1 = clean(v1).split('.').map((n) => parseInt(n, 10) || 0)
  const p2 = clean(v2).split('.').map((n) => parseInt(n, 10) || 0)
  const len = Math.max(p1.length, p2.length)
  for (let i = 0; i < len; i++) {
    const num1 = p1[i] || 0
    const num2 = p2[i] || 0
    if (num1 > num2) return 1
    if (num1 < num2) return -1
  }
  return 0
}

/**
 * Ensure app-update.yml exists in process.resourcesPath if the directory is writable
 */
function ensureAppUpdateConfig(): void {
  try {
    const resourcesDir = process.resourcesPath
    if (!resourcesDir || !app.isPackaged) return
    const updateYamlPath = path.join(resourcesDir, 'app-update.yml')
    if (!fsSync.existsSync(updateYamlPath)) {
      const content = `owner: ${GITHUB_OWNER}\nrepo: ${GITHUB_REPO}\nprovider: github\n`
      fsSync.writeFileSync(updateYamlPath, content, 'utf-8')
    }
  } catch {
    // If process.resourcesPath is read-only, silently continue
  }
}

/**
 * Fetch releases directly from GitHub API
 */
function fetchGitHubReleases(): Promise<GitHubReleaseData[]> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`,
      method: 'GET',
      headers: {
        'User-Agent': 'Writer-App',
        'Accept': 'application/vnd.github.v3+json'
      }
    }

    const req = https.request(options, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https
          .get(res.headers.location, { headers: options.headers }, (redirectRes) => {
            let data = ''
            redirectRes.on('data', (c) => (data += c))
            redirectRes.on('end', () => {
              try {
                resolve(JSON.parse(data))
              } catch (err) {
                reject(err)
              }
            })
          })
          .on('error', reject)
        return
      }

      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        reject(new Error(`GitHub API returned status ${res.statusCode}`))
        return
      }

      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          resolve(Array.isArray(parsed) ? parsed : [parsed])
        } catch (err) {
          reject(err)
        }
      })
    })

    req.on('error', reject)
    req.setTimeout(10000, () => {
      req.destroy(new Error('GitHub API request timed out'))
    })
    req.end()
  })
}

/**
 * Find matching installer asset for the current OS and architecture
 */
function findPlatformAsset(assets: GitHubReleaseAsset[]): GitHubReleaseAsset | null {
  const isMac = process.platform === 'darwin'
  const isWin = process.platform === 'win32'
  const isArm = process.arch === 'arm64'

  if (isMac) {
    if (isArm) {
      const armAsset = assets.find(
        (a) => a.name.endsWith('.dmg') && (a.name.includes('arm64') || a.name.includes('aarch64'))
      )
      if (armAsset) return armAsset
    } else {
      const intelAsset = assets.find(
        (a) => a.name.endsWith('.dmg') && (a.name.includes('x64') || !a.name.includes('arm64'))
      )
      if (intelAsset) return intelAsset
    }
    return assets.find((a) => a.name.endsWith('.dmg')) || null
  }

  if (isWin) {
    return assets.find((a) => a.name.endsWith('.exe')) || null
  }

  return assets.find((a) => a.name.endsWith('.AppImage') || a.name.endsWith('.deb')) || null
}

/**
 * Fallback: Query GitHub Releases directly to determine if an update is available
 */
async function checkDirectGitHubUpdate(forceCheck = false): Promise<boolean> {
  try {
    const releases = await fetchGitHubReleases()
    if (!releases || releases.length === 0) return false

    const validReleases = releases.filter((r) => !r.draft)
    const latest = validReleases[0]
    if (!latest) return false

    const rawVersion = latest.tag_name || latest.name || ''
    const cleanVersion = rawVersion.replace(/^v/, '').trim()
    const currentVersion = app.getVersion()

    const isNewer = compareSemver(cleanVersion, currentVersion) > 0
    if (!isNewer && !forceCheck) {
      return false
    }

    const platformAsset = findPlatformAsset(latest.assets || [])
    latestDirectRelease = {
      version: cleanVersion,
      releaseNotes: latest.body || '',
      releaseDate: latest.published_at || '',
      downloadUrl: platformAsset?.browser_download_url || latest.html_url,
      htmlUrl: latest.html_url,
      fileName: platformAsset?.name || null
    }

    return isNewer
  } catch (err) {
    console.warn('Direct GitHub release check failed:', err)
    return false
  }
}

/**
 * Download file from URL following 302 redirects to destination path with progress
 */
function downloadFileWithRedirects(
  targetUrl: string,
  destPath: string,
  onProgress: (percent: number) => void,
  maxRedirects = 5
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) {
      reject(new Error('Too many redirects'))
      return
    }

    const client = targetUrl.startsWith('http:') ? http : https
    const req = client.get(targetUrl, { headers: { 'User-Agent': 'Writer-App' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadFileWithRedirects(res.headers.location, destPath, onProgress, maxRedirects - 1)
          .then(resolve)
          .catch(reject)
        return
      }

      if (res.statusCode !== 200) {
        reject(new Error(`Download failed with status ${res.statusCode}`))
        return
      }

      const total = parseInt(res.headers['content-length'] || '0', 10)
      let current = 0
      const fileStream = fsSync.createWriteStream(destPath)

      res.on('data', (chunk: Buffer) => {
        current += chunk.length
        if (total > 0) {
          const percent = Math.min(100, Math.round((current / total) * 100))
          onProgress(percent)
        }
      })

      res.pipe(fileStream)

      fileStream.on('finish', () => {
        fileStream.close(() => resolve(destPath))
      })

      fileStream.on('error', (err) => {
        fsSync.unlink(destPath, () => {})
        reject(err)
      })
    })

    req.on('error', reject)
  })
}

/**
 * Helper: Perform a secure GET request to fetch JSON configuration
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
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
  if (forceCheck) return true

  try {
    const url = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/rollout.json`
    const rolloutData = await fetchJson(url)

    if (rolloutData && rolloutData.version === targetVersion) {
      const config = await getOrInitializeConfig()
      const percentage = typeof rolloutData.rolloutPercentage === 'number' ? rolloutData.rolloutPercentage : 100
      return config.bucket <= percentage
    }
  } catch {
    // Default to enabled if parsing or network fails
  }

  return true
}

/**
 * Configure and register the auto-update lifecycle
 */
export async function initializeUpdater(mainWindow: BrowserWindow) {
  autoUpdater.removeAllListeners()

  ipcMain.removeHandler('updater:check')
  ipcMain.removeHandler('updater:download')
  ipcMain.removeHandler('updater:restart-and-install')
  ipcMain.removeHandler('updater:get-status')
  ipcMain.removeHandler('updater:get-config')
  ipcMain.removeHandler('updater:get-version')
  ipcMain.removeHandler('updater:dismiss-welcome')

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  try {
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO
    })
  } catch {
    // Ignore feed URL assignment failures
  }

  ensureAppUpdateConfig()

  const sendStatus = (event: string, payload?: unknown) => {
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

    const isEligible = await checkRolloutEligibility(info.version, false)
    if (isEligible) {
      sendStatus('downloading', { version: info.version })
      try {
        await autoUpdater.downloadUpdate()
      } catch (err) {
        console.warn('autoUpdater download failed, will fallback if triggered manually:', err)
      }
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

  autoUpdater.on('error', async (err) => {
    const msg = (err?.message || String(err)).toLowerCase()

    // If app-update.yml is missing, seamlessly fallback to direct GitHub Releases check
    if (msg.includes('app-update.yml') || msg.includes('enoent')) {
      console.warn('app-update.yml missing, switching to direct GitHub Releases fallback')
      try {
        const isNewer = await checkDirectGitHubUpdate(true)
        if (isNewer && latestDirectRelease) {
          lastKnownVersion = latestDirectRelease.version
          sendStatus('available', {
            version: latestDirectRelease.version,
            releaseNotes: latestDirectRelease.releaseNotes,
            releaseDate: latestDirectRelease.releaseDate,
            downloadUrl: latestDirectRelease.downloadUrl,
            htmlUrl: latestDirectRelease.htmlUrl
          })
          return
        } else {
          sendStatus('not-available')
          return
        }
      } catch {
        // Fall through to error handler
      }
    }

    const friendlyMsg = formatUpdaterError(err)
    sendStatus('error', friendlyMsg)
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
    sendStatus('checking')

    // In dev mode, check GitHub releases directly if manually forced
    if (!app.isPackaged) {
      if (args.force) {
        try {
          const isNewer = await checkDirectGitHubUpdate(true)
          if (isNewer && latestDirectRelease) {
            lastKnownVersion = latestDirectRelease.version
            sendStatus('available', {
              version: latestDirectRelease.version,
              releaseNotes: latestDirectRelease.releaseNotes,
              releaseDate: latestDirectRelease.releaseDate,
              downloadUrl: latestDirectRelease.downloadUrl,
              htmlUrl: latestDirectRelease.htmlUrl
            })
            return { status: 'available' }
          }
          sendStatus('not-available')
          return { status: 'not-available' }
        } catch {
          sendStatus('dev-bypass')
          return { status: 'dev-bypass' }
        }
      }
      sendStatus('dev-bypass')
      return { status: 'dev-bypass' }
    }

    // Attempt electron-updater first
    let autoUpdaterError: unknown = null
    try {
      ensureAppUpdateConfig()
      const result = await autoUpdater.checkForUpdates()
      if (result && result.updateInfo) {
        lastKnownVersion = result.updateInfo.version
        return { status: 'checking' }
      }
    } catch (e) {
      autoUpdaterError = e
      console.warn('autoUpdater.checkForUpdates failed, falling back to direct GitHub API:', e)
    }

    // Fallback: Query GitHub Releases directly
    try {
      const isNewer = await checkDirectGitHubUpdate(args.force)
      if (isNewer && latestDirectRelease) {
        lastKnownVersion = latestDirectRelease.version
        sendStatus('available', {
          version: latestDirectRelease.version,
          releaseNotes: latestDirectRelease.releaseNotes,
          releaseDate: latestDirectRelease.releaseDate,
          downloadUrl: latestDirectRelease.downloadUrl,
          htmlUrl: latestDirectRelease.htmlUrl
        })
        return { status: 'available' }
      } else {
        sendStatus('not-available')
        return { status: 'not-available' }
      }
    } catch (fallbackError) {
      const finalError = autoUpdaterError || fallbackError
      const formatted = formatUpdaterError(finalError)
      sendStatus('error', formatted)
      return { status: 'error', error: formatted }
    }
  })

  ipcMain.handle('updater:download', async () => {
    sendStatus('downloading', { version: lastKnownVersion || latestDirectRelease?.version })

    // Try autoUpdater first if no direct release was loaded
    if (!latestDirectRelease?.downloadUrl) {
      try {
        await autoUpdater.downloadUpdate()
        return { status: 'downloading' }
      } catch (err) {
        console.warn('autoUpdater.downloadUpdate failed, attempting direct download fallback:', err)
      }
    }

    // Direct download fallback
    if (latestDirectRelease?.downloadUrl && latestDirectRelease.fileName) {
      try {
        const targetPath = path.join(app.getPath('downloads'), latestDirectRelease.fileName)
        await downloadFileWithRedirects(
          latestDirectRelease.downloadUrl,
          targetPath,
          (percent) => {
            sendStatus('progress', { percent, version: latestDirectRelease?.version })
          }
        )
        lastDownloadedInstallerPath = targetPath
        sendStatus('downloaded', {
          version: latestDirectRelease.version,
          releaseNotes: latestDirectRelease.releaseNotes,
          releaseDate: latestDirectRelease.releaseDate,
          installerPath: targetPath
        })
        return { status: 'downloaded' }
      } catch (e) {
        const formatted = formatUpdaterError(e)
        sendStatus('error', formatted)
        return { status: 'error', error: formatted }
      }
    }

    // If no direct binary asset, open release in default browser
    if (latestDirectRelease?.htmlUrl) {
      shell.openExternal(latestDirectRelease.htmlUrl)
      sendStatus('not-available')
      return { status: 'not-available' }
    }

    const err = 'Unable to find download asset for your platform. Please download directly from GitHub.'
    sendStatus('error', err)
    return { status: 'error', error: err }
  })

  ipcMain.handle('updater:restart-and-install', async () => {
    if (lastDownloadedInstallerPath && fsSync.existsSync(lastDownloadedInstallerPath)) {
      shell.openPath(lastDownloadedInstallerPath)
      return
    }
    if (app.isPackaged) {
      try {
        autoUpdater.quitAndInstall()
      } catch (err) {
        console.warn('quitAndInstall failed:', err)
        shell.openExternal(`https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`)
      }
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
