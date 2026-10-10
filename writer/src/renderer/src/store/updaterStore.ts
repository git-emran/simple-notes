import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useEffect, useCallback } from 'react'
import { autoUpdateEnabledAtom } from './settingsStore'

export type UpdaterStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'gated'
  | 'not-available'
  | 'error'
  | 'dev-bypass'

export interface UpdateInfo {
  version: string
  releaseNotes?: string | null
  releaseDate?: string | null
}

export const updaterStatusAtom = atom<UpdaterStatus>('idle')
export const updaterInfoAtom = atom<UpdateInfo | null>(null)
export const updaterProgressAtom = atom<number>(0)
export const updaterErrorAtom = atom<string>('')
export const appVersionAtom = atom<string>('')

export const hasUpdateAvailableAtom = atom((get) => {
  const status = get(updaterStatusAtom)
  return status === 'available' || status === 'downloading' || status === 'downloaded' || status === 'gated'
})

export const isCheckingOrDownloadingAtom = atom((get) => {
  const status = get(updaterStatusAtom)
  return status === 'checking' || status === 'downloading'
})

/**
 * Custom hook to subscribe to Electron auto-updater events and manage state.
 * Centralized so all components (SettingsPanel, UpdateManager, etc.) share
 * real-time, synchronized update state.
 */
export const useUpdater = () => {
  const [status, setStatus] = useAtom(updaterStatusAtom)
  const [updateInfo, setUpdateInfo] = useAtom(updaterInfoAtom)
  const [progress, setProgress] = useAtom(updaterProgressAtom)
  const [error, setError] = useAtom(updaterErrorAtom)
  const [appVersion, setAppVersion] = useAtom(appVersionAtom)
  const hasUpdateAvailable = useAtomValue(hasUpdateAvailableAtom)
  const isCheckingOrDownloading = useAtomValue(isCheckingOrDownloadingAtom)
  const autoUpdateEnabled = useAtomValue(autoUpdateEnabledAtom)

  const handleStatusEvent = useCallback(
    (event: string, payload?: unknown) => {
      const p = payload as Record<string, unknown> | null | undefined
      switch (event) {
        case 'checking':
          setStatus('checking')
          setError('')
          break
        case 'available': {
          setStatus('available')
          setError('')
          if (p && typeof p.version === 'string') {
            setUpdateInfo({
              version: p.version,
              releaseNotes: (p.releaseNotes as string) || null,
              releaseDate: (p.releaseDate as string) || null
            })
          }
          break
        }
        case 'not-available':
          setStatus('not-available')
          setError('')
          break
        case 'downloading':
          setStatus('downloading')
          setError('')
          if (p && typeof p.version === 'string') {
            setUpdateInfo((prev) => ({
              version: (p.version as string) || prev?.version || '',
              releaseNotes: (p.releaseNotes as string) || prev?.releaseNotes || null,
              releaseDate: (p.releaseDate as string) || prev?.releaseDate || null
            }))
          }
          break
        case 'progress': {
          setStatus('downloading')
          if (p && typeof p.percent === 'number') {
            setProgress(Math.round(p.percent))
          }
          if (p && typeof p.version === 'string' && p.version) {
            setUpdateInfo((prev) => ({
              version: p.version as string,
              releaseNotes: prev?.releaseNotes || null,
              releaseDate: prev?.releaseDate || null
            }))
          }
          break
        }
        case 'downloaded': {
          setStatus('downloaded')
          setError('')
          if (p && typeof p.version === 'string') {
            setUpdateInfo({
              version: p.version,
              releaseNotes: (p.releaseNotes as string) || null,
              releaseDate: (p.releaseDate as string) || null
            })
          }
          break
        }
        case 'gated': {
          setStatus('gated')
          if (p && typeof p.version === 'string') {
            setUpdateInfo({
              version: p.version,
              releaseNotes: (p.releaseNotes as string) || null,
              releaseDate: (p.releaseDate as string) || null
            })
          }
          break
        }
        case 'error':
          setStatus('error')
          setError(typeof payload === 'string' ? payload : 'Failed to check or download updates.')
          break
        case 'dev-bypass':
          setStatus('dev-bypass')
          setError('')
          break
        default:
          break
      }
    },
    [setError, setProgress, setStatus, setUpdateInfo]
  )

  // Initialize and listen to IPC events
  useEffect(() => {
    if (!window.context) return

    // Fetch current app version
    window.context.getAppVersion?.().then((v) => {
      if (v) setAppVersion(v)
    })

    // Fetch initial status from main process if available
    window.context.getUpdaterStatus?.().then((statusObj) => {
      if (statusObj && statusObj.event && statusObj.event !== 'idle') {
        handleStatusEvent(statusObj.event, statusObj.payload)
      }
    })

    // Listen for live updates
    if (window.context.onUpdaterStatus) {
      const unsubscribe = window.context.onUpdaterStatus(({ event, payload }) => {
        handleStatusEvent(event, payload)
      })
      return () => {
        unsubscribe()
      }
    }
    return undefined
  }, [handleStatusEvent, setAppVersion])

  const checkForUpdates = useCallback(
    async (force = true) => {
      if (!window.context?.checkForUpdates) return
      setStatus('checking')
      setError('')
      try {
        const res = await window.context.checkForUpdates(force)
        if (res?.status === 'dev-bypass') {
          setStatus('dev-bypass')
        }
      } catch (err: unknown) {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Failed to check for updates.')
      }
    },
    [setError, setStatus]
  )

  const downloadUpdate = useCallback(async () => {
    if (!window.context?.downloadUpdate) return
    setStatus('downloading')
    setError('')
    try {
      const res = await window.context.downloadUpdate()
      if (res?.status === 'dev-bypass') {
        setStatus('dev-bypass')
      }
    } catch (err: unknown) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to download update.')
    }
  }, [setError, setStatus])

  const restartAndInstall = useCallback(() => {
    if (window.context?.restartAndInstall) {
      window.context.restartAndInstall()
    }
  }, [])

  return {
    status,
    setStatus,
    updateInfo,
    progress,
    error,
    appVersion,
    hasUpdateAvailable,
    isCheckingOrDownloading,
    autoUpdateEnabled,
    checkForUpdates,
    downloadUpdate,
    restartAndInstall
  }
}
