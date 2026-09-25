import { app, BrowserWindow, dialog } from 'electron'
import { ensureDir, pathExists, readJson, writeJson } from 'fs-extra'
import { homedir } from 'os'
import path from 'path'
import { appDirectoryName } from '@shared/constants'

interface VaultConfigFile {
  customVaultPath: string | null
}

const getConfigFile = () => {
  return path.join(app.getPath('userData'), 'vault-config.json')
}

let cachedCustomVaultPath: string | null | undefined = undefined

const loadVaultConfig = async (): Promise<VaultConfigFile> => {
  if (cachedCustomVaultPath !== undefined) {
    return { customVaultPath: cachedCustomVaultPath }
  }

  try {
    const configFile = getConfigFile()
    if (await pathExists(configFile)) {
      const data = await readJson(configFile)
      if (data && typeof data.customVaultPath === 'string' && data.customVaultPath.trim()) {
        const resolved = path.resolve(data.customVaultPath.trim())
        if (await pathExists(resolved)) {
          cachedCustomVaultPath = resolved
          return { customVaultPath: resolved }
        }
      }
    }
  } catch {
    // Ignore read errors and fallback
  }

  cachedCustomVaultPath = null
  return { customVaultPath: null }
}

const saveVaultConfig = async (config: VaultConfigFile) => {
  cachedCustomVaultPath = config.customVaultPath ? path.resolve(config.customVaultPath) : null
  try {
    const configFile = getConfigFile()
    await ensureDir(path.dirname(configFile))
    await writeJson(configFile, { customVaultPath: cachedCustomVaultPath }, { spaces: 2 })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to save vault config:', error)
  }
}

export const getDefaultRootDir = () => {
  return path.resolve(`${homedir()}/${appDirectoryName}`)
}

export const getRootDir = () => {
  if (cachedCustomVaultPath) {
    return cachedCustomVaultPath
  }
  return getDefaultRootDir()
}

export const isCustomVaultSet = () => {
  return Boolean(cachedCustomVaultPath)
}

export const initVaultConfig = async () => {
  await loadVaultConfig()
  return getRootDir()
}

export const selectVaultDirectory = async (parentWindow?: BrowserWindow) => {
  const currentRoot = getRootDir()
  const result = await dialog.showOpenDialog(parentWindow ?? (BrowserWindow.getFocusedWindow() || undefined)!, {
    title: 'Select Notes Directory / Vault',
    defaultPath: currentRoot,
    properties: ['openDirectory', 'createDirectory']
  })

  if (result.canceled || !result.filePaths.length) {
    return { canceled: true as const }
  }

  const selectedPath = path.resolve(result.filePaths[0])
  await ensureDir(selectedPath)
  await saveVaultConfig({ customVaultPath: selectedPath })

  return { canceled: false as const, path: selectedPath }
}

export const setVaultDirectory = async (dirPath: string) => {
  if (!dirPath || typeof dirPath !== 'string') {
    throw new Error('Invalid directory path')
  }

  const resolved = path.resolve(dirPath)
  await ensureDir(resolved)
  await saveVaultConfig({ customVaultPath: resolved })

  return { success: true, path: resolved }
}

export const resetVaultDirectory = async () => {
  await saveVaultConfig({ customVaultPath: null })
  const defaultDir = getDefaultRootDir()
  return { success: true, path: defaultDir }
}
