import { useEffect, useRef } from 'react'
import { useAtom } from 'jotai'
import { Univer, LocaleType } from '@univerjs/core'
import { FUniver } from '@univerjs/core/facade'
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import { defaultTheme } from '@univerjs/themes'
import UniverSheetsCorePresetEnUS from '@univerjs/preset-sheets-core/locales/en-US'
import {
  DEFAULT_UNIVER_WORKBOOK_DATA,
  isValidWorkbookData,
  univerWorkbookAtom
} from '@renderer/store'
import { VscRefresh, VscTable } from 'react-icons/vsc'

// Import Univer CSS Stylesheet Bundle
import '@univerjs/preset-sheets-core/lib/index.css'

interface UniverSpreadsheetProps {
  isActive?: boolean
}

export const UniverSpreadsheet = ({ isActive = true }: UniverSpreadsheetProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const univerRef = useRef<Univer | null>(null)
  const univerAPIRef = useRef<FUniver | null>(null)
  const [workbookData, setWorkbookData] = useAtom(univerWorkbookAtom)

  const initUniverInstance = (data: typeof DEFAULT_UNIVER_WORKBOOK_DATA) => {
    if (!containerRef.current) return false

    // Ensure container has visible layout dimensions before mounting
    if (containerRef.current.offsetWidth === 0 || containerRef.current.offsetHeight === 0) {
      return false
    }

    // Clean up existing instance if present
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

    univerRef.current = univer
    univerAPIRef.current = univerAPI

    return true
  }

  // Handle initialization and tab visibility changes
  useEffect(() => {
    if (!isActive) return

    const dataToLoad = isValidWorkbookData(workbookData)
      ? workbookData
      : DEFAULT_UNIVER_WORKBOOK_DATA

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

  // Handle container resize & cleanup lifecycle
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      if (isActive && univerRef.current) {
        window.dispatchEvent(new Event('resize'))
      } else if (isActive && !univerRef.current && containerRef.current) {
        if (containerRef.current.offsetWidth > 0 && containerRef.current.offsetHeight > 0) {
          const dataToLoad = isValidWorkbookData(workbookData)
            ? workbookData
            : DEFAULT_UNIVER_WORKBOOK_DATA
          initUniverInstance(dataToLoad)
        }
      }
    })

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      resizeObserver.disconnect()
      if (univerRef.current && univerAPIRef.current) {
        try {
          const activeWorkbook = univerAPIRef.current.getActiveWorkbook()
          if (activeWorkbook) {
            const snapshot = activeWorkbook.save()
            if (snapshot && isValidWorkbookData(snapshot)) {
              setWorkbookData(snapshot as typeof DEFAULT_UNIVER_WORKBOOK_DATA)
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

  const handleReset = () => {
    if (!window.confirm('Reset spreadsheet to default sheets (Roadmap, Tasks, Expenses)?')) return
    const freshDefaults = {
      ...DEFAULT_UNIVER_WORKBOOK_DATA,
      id: `univer-workbook-${Date.now()}`
    }
    setWorkbookData(freshDefaults)
    initUniverInstance(freshDefaults)
  }

  return (
    <div className="h-full w-full flex flex-col bg-[var(--obsidian-workspace)] relative overflow-hidden">
      {/* Spreadsheet Header Bar */}
      <div className="h-10 px-4 border-b border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <VscTable className="w-4 h-4 text-[var(--obsidian-accent)]" />
          <span className="font-medium text-xs text-[var(--obsidian-text)]">
            Spreadsheet
          </span>
        </div>

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
      </div>

      {/* Univer Canvas Grid Container */}
      <div className="flex-1 w-full h-full relative overflow-hidden">
        <div
          ref={containerRef}
          id="univer-container"
          className="h-full w-full relative"
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  )
}
