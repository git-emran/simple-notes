import { useCallback, useEffect, useRef } from 'react'
import { useAtom, useAtomValue } from 'jotai'
import { Univer, LocaleType, IDisposable } from '@univerjs/core'
import { FUniver } from '@univerjs/core/facade'
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import { defaultTheme } from '@univerjs/themes'
import UniverSheetsCorePresetEnUS from '@univerjs/preset-sheets-core/locales/en-US'
import {
  DEFAULT_UNIVER_WORKBOOK_DATA,
  isValidWorkbookData,
  univerWorkbookAtom,
  isDarkModeAtom
} from '@renderer/store'
import { VscRefresh, VscTable } from 'react-icons/vsc'

// Import Univer CSS Stylesheet Bundle
import '@univerjs/preset-sheets-core/lib/index.css'

const STORAGE_KEY = 'writr-univer-workbook-state-v2'

interface UniverSpreadsheetProps {
  isActive?: boolean
}

export const UniverSpreadsheet = ({ isActive = true }: UniverSpreadsheetProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const univerRef = useRef<Univer | null>(null)
  const univerAPIRef = useRef<FUniver | null>(null)
  const commandListenerRef = useRef<IDisposable | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const isDarkMode = useAtomValue(isDarkModeAtom)
  const [workbookData, setWorkbookData] = useAtom(univerWorkbookAtom)

  // Immediately save the active workbook snapshot to Jotai atom and localStorage
  const saveImmediately = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }

    if (!univerAPIRef.current) return

    try {
      const activeWorkbook = univerAPIRef.current.getActiveWorkbook()
      if (activeWorkbook) {
        const snapshot = activeWorkbook.save()
        if (snapshot && isValidWorkbookData(snapshot)) {
          setWorkbookData(snapshot as typeof DEFAULT_UNIVER_WORKBOOK_DATA)
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
          } catch (storageErr) {
            // eslint-disable-next-line no-console
            console.error('Error writing spreadsheet snapshot to localStorage:', storageErr)
          }
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error saving Univer spreadsheet snapshot:', err)
    }
  }, [setWorkbookData])

  // Debounced save for continuous user operations (typing, formatting, adding sheets, etc.)
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveImmediately()
    }, 400)
  }, [saveImmediately])

  // Get the most up-to-date data from localStorage or memory
  const getStoredWorkbookData = useCallback((): typeof DEFAULT_UNIVER_WORKBOOK_DATA => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (isValidWorkbookData(parsed)) {
          return parsed
        }
      }
    } catch {
      // fallback
    }
    return isValidWorkbookData(workbookData) ? workbookData : DEFAULT_UNIVER_WORKBOOK_DATA
  }, [workbookData])

  const initUniverInstance = (data: typeof DEFAULT_UNIVER_WORKBOOK_DATA) => {
    if (!containerRef.current) return false

    // Ensure container has visible layout dimensions before mounting
    if (containerRef.current.offsetWidth === 0 || containerRef.current.offsetHeight === 0) {
      return false
    }

    // Clean up existing listener & instance if present
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }

    if (commandListenerRef.current) {
      try {
        commandListenerRef.current.dispose()
      } catch {
        // ignore
      }
      commandListenerRef.current = null
    }

    if (univerRef.current) {
      try {
        univerRef.current.dispose()
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error disposing Univer:', err)
      }
      univerRef.current = null
      univerAPIRef.current = null
    }

    // Clear DOM container to prevent residual HMR elements
    containerRef.current.innerHTML = ''

    // 1. Create Univer Instance with English Locale and Theme
    const univer = new Univer({
      theme: defaultTheme,
      darkMode: isDarkMode,
      locale: LocaleType.EN_US,
      locales: {
        [LocaleType.EN_US]: UniverSheetsCorePresetEnUS
      }
    })

    // 2. Register Sheet Core Preset Plugins with container
    const preset = UniverSheetsCorePreset({
      container: containerRef.current,
      header: true,
      toolbar: true,
      footer: { sheetBar: true },
      formulaBar: true,
      formula: {
        initialFormulaComputing: 0
      }
    })

    preset.plugins.forEach((item) => {
      if (Array.isArray(item)) {
        const [plugin, config] = item
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        univer.registerPlugin(plugin as any, config as any)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        univer.registerPlugin(item as any)
      }
    })

    // 3. Create Facade API & Load Workbook with Unique ID
    const univerAPI = FUniver.newAPI(univer)
    const freshData = {
      ...data,
      id: `univer-workbook-${Date.now()}`
    }

    univerAPI.createWorkbook(freshData)

    // 4. Listen to user command executions (cell edits, adding sheets, formatting, etc.)
    const listener = univerAPI.onCommandExecuted(() => {
      debouncedSave()
    })
    commandListenerRef.current = listener

    univerRef.current = univer
    univerAPIRef.current = univerAPI

    return true
  }

  // Handle initialization and tab visibility changes
  useEffect(() => {
    if (!isActive) {
      saveImmediately()
      return
    }

    const dataToLoad = getStoredWorkbookData()

    if (!univerRef.current) {
      // Defer slightly to ensure layout reflow has computed non-zero dimensions
      const timer = setTimeout(() => {
        initUniverInstance(dataToLoad)
      }, 50)
      return () => clearTimeout(timer)
    } else {
      // Already initialized, trigger resize so canvas updates bounds
      const timer = setTimeout(() => {
        window.dispatchEvent(new Event('resize'))
      }, 50)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive])

  // Save on window close, blur, or hide
  useEffect(() => {
    const handleSaveTrigger = () => {
      saveImmediately()
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveImmediately()
      }
    }

    window.addEventListener('beforeunload', handleSaveTrigger)
    window.addEventListener('pagehide', handleSaveTrigger)
    window.addEventListener('blur', handleSaveTrigger)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleSaveTrigger)
      window.removeEventListener('pagehide', handleSaveTrigger)
      window.removeEventListener('blur', handleSaveTrigger)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [saveImmediately])

  // Handle container resize & cleanup lifecycle
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      if (isActive && univerRef.current) {
        window.dispatchEvent(new Event('resize'))
      } else if (isActive && !univerRef.current && containerRef.current) {
        if (containerRef.current.offsetWidth > 0 && containerRef.current.offsetHeight > 0) {
          const dataToLoad = getStoredWorkbookData()
          initUniverInstance(dataToLoad)
        }
      }
    })

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      resizeObserver.disconnect()
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
      if (commandListenerRef.current) {
        try {
          commandListenerRef.current.dispose()
        } catch {
          // ignore
        }
        commandListenerRef.current = null
      }
      if (univerRef.current && univerAPIRef.current) {
        try {
          const activeWorkbook = univerAPIRef.current.getActiveWorkbook()
          if (activeWorkbook) {
            const snapshot = activeWorkbook.save()
            if (snapshot && isValidWorkbookData(snapshot)) {
              setWorkbookData(snapshot as typeof DEFAULT_UNIVER_WORKBOOK_DATA)
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
              } catch (storageErr) {
                // eslint-disable-next-line no-console
                console.error('Error writing spreadsheet snapshot to localStorage on unmount:', storageErr)
              }
            }
          }
          univerRef.current.dispose()
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Error cleaning up Univer:', err)
        }
        univerRef.current = null
        univerAPIRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Synchronize dark mode dynamically when theme changes
  useEffect(() => {
    if (univerAPIRef.current) {
      try {
        univerAPIRef.current.toggleDarkMode(isDarkMode)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error toggling Univer dark mode:', err)
      }
    }
  }, [isDarkMode])

  const handleReset = () => {
    if (!window.confirm('Reset spreadsheet to default sheets (Roadmap, Tasks, Expenses)?')) return
    const freshDefaults = {
      ...DEFAULT_UNIVER_WORKBOOK_DATA,
      id: `univer-workbook-${Date.now()}`
    }
    setWorkbookData(freshDefaults)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(freshDefaults))
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
    }
    initUniverInstance(freshDefaults)
  }

  return (
    <div className={`h-full w-full flex flex-col bg-[var(--obsidian-workspace)] relative overflow-hidden ${isDarkMode ? 'univer-dark' : ''}`}>
      {/* Spreadsheet Header Bar */}
      <div className="h-10 px-4 border-b border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <VscTable className="w-4 h-4 text-[var(--obsidian-accent)]" />
          <span className="font-medium text-xs text-[var(--obsidian-text)]">
            Spreadsheet
          </span>
        </div>

        {import.meta.env.DEV && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] hover:bg-[var(--obsidian-surface)] transition-colors"
              title="Reset to default sheets"
            >
              <VscRefresh className="w-3.5 h-3.5" />
              <span>Reset Demo Data</span>
            </button>
          </div>
        )}
      </div>

      {/* Univer Canvas Grid Container */}
      <div className="flex-1 w-full h-full relative overflow-hidden">
        <div
          ref={containerRef}
          id="univer-container"
          className={`h-full w-full relative ${isDarkMode ? 'univer-dark' : ''}`}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  )
}
