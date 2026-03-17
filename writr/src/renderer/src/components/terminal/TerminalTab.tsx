import '@xterm/xterm/css/xterm.css'

import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { Terminal } from '@xterm/xterm'
import type { TerminalDataEvent } from '@shared/types'
import {
  closeTabAtom,
  editorFontAtom,
  editorFontSizeAtom,
  notesRootDirAtom,
  setTerminalSessionIdAtom,
  themeModeAtom,
  type EditorTab,
} from '@renderer/store'
import { useAtomValue, useSetAtom } from 'jotai'
import { useEffect, useRef, useState } from 'react'
import { VscTerminal } from 'react-icons/vsc'

type TerminalTabProps = {
  tab: EditorTab & { kind: 'terminal' }
}

const MIN_FONT_SIZE = 12
const MAX_FONT_SIZE = 22
const WRITE_BATCH_SIZE = 32_768
const MAX_PENDING_PRE_SNAPSHOT_EVENTS = 2_000
const SNAPSHOT_FALLBACK_MS = 1_200

const getTerminalTheme = (isDarkMode: boolean) => {
  if (isDarkMode) {
    return {
      background: '#16181f',
      foreground: '#d7dde8',
      cursor: '#8fb8ff',
      cursorAccent: '#16181f',
      black: '#20232b',
      red: '#ff7b72',
      green: '#7ee787',
      yellow: '#f2cc60',
      blue: '#79c0ff',
      magenta: '#d2a8ff',
      cyan: '#76e3ea',
      white: '#c9d1d9',
      brightBlack: '#6e7681',
      brightRed: '#ffa198',
      brightGreen: '#56d364',
      brightYellow: '#e3b341',
      brightBlue: '#58a6ff',
      brightMagenta: '#bc8cff',
      brightCyan: '#39c5cf',
      brightWhite: '#f0f6fc',
      selectionBackground: 'rgba(88, 166, 255, 0.28)',
      selectionInactiveBackground: 'rgba(88, 166, 255, 0.18)',
    }
  }

  return {
    background: '#fcfcfd',
    foreground: '#1f2937',
    cursor: '#2563eb',
    cursorAccent: '#fcfcfd',
    black: '#1f2937',
    red: '#dc2626',
    green: '#15803d',
    yellow: '#b45309',
    blue: '#2563eb',
    magenta: '#9333ea',
    cyan: '#0f766e',
    white: '#6b7280',
    brightBlack: '#4b5563',
    brightRed: '#ef4444',
    brightGreen: '#16a34a',
    brightYellow: '#d97706',
    brightBlue: '#3b82f6',
    brightMagenta: '#a855f7',
    brightCyan: '#14b8a6',
    brightWhite: '#111827',
    selectionBackground: 'rgba(37, 99, 235, 0.18)',
    selectionInactiveBackground: 'rgba(37, 99, 235, 0.12)',
  }
}

const getTerminalFontFamily = (font: string) =>
  `"${font}", "JetBrainsMono Nerd Font", "MesloLGS NF", "SauceCodePro Nerd Font", "CaskaydiaMono Nerd Font", "Symbols Nerd Font", monospace`

const getShellLabel = (shellPath: string) => {
  const normalized = shellPath.replace(/\\/g, '/')
  const lastSlash = normalized.lastIndexOf('/')
  return lastSlash === -1 ? normalized : normalized.slice(lastSlash + 1)
}

export const TerminalTab = ({ tab }: TerminalTabProps) => {
  const themeMode = useAtomValue(themeModeAtom)
  const editorFont = useAtomValue(editorFontAtom)
  const editorFontSize = useAtomValue(editorFontSizeAtom)
  const notesRootDir = useAtomValue(notesRootDirAtom)
  const setTerminalSessionId = useSetAtom(setTerminalSessionIdAtom)
  const closeTab = useSetAtom(closeTabAtom)
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const resizeFrameRef = useRef<number | null>(null)
  const resizeDebounceRef = useRef<number | null>(null)
  const resizeSettleRef = useRef<number | null>(null)
  const resizeUnlockFrameRef = useRef<number | null>(null)
  const isResizeActiveRef = useRef(false)
  const focusTimerRef = useRef<number | null>(null)
  const scheduleFitRef = useRef<(() => void) | null>(null)
  const lastAppliedSizeRef = useRef<{ cols: number; rows: number } | null>(null)
  const writeQueueRef = useRef<string[]>([])
  const isWritingRef = useRef(false)
  const snapshotReadyRef = useRef(false)
  const lastSequenceRef = useRef(0)
  const pendingEventsRef = useRef<TerminalDataEvent[]>([])
  const initRunRef = useRef(0)
  const [sessionId, setSessionId] = useState<string | null>(tab.terminalSessionId ?? null)
  const [shellLabel, setShellLabel] = useState('shell')
  const [cwdLabel, setCwdLabel] = useState(notesRootDir ?? '')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [statusText, setStatusText] = useState('Starting shell...')

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const syncTheme = () => {
      setIsDarkMode(themeMode === 'dark' || (themeMode === 'system' && mediaQuery.matches))
    }

    syncTheme()
    mediaQuery.addEventListener('change', syncTheme)
    return () => mediaQuery.removeEventListener('change', syncTheme)
  }, [themeMode])

  useEffect(() => {
    let cancelled = false
    const runId = initRunRef.current + 1
    initRunRef.current = runId

    const initializeSession = async () => {
      const existingSessionId = tab.terminalSessionId
      if (existingSessionId) {
        let snapshot: Awaited<ReturnType<typeof window.context.getTerminalSnapshot>> = null
        try {
          snapshot = await window.context.getTerminalSnapshot(existingSessionId)
        } catch {
          snapshot = null
        }

        if (!snapshot) {
          if (cancelled || initRunRef.current !== runId) return
          setTerminalSessionId({ tabId: tab.id, sessionId: null })
          setSessionId(null)
        } else if (!cancelled && initRunRef.current === runId) {
          setSessionId(snapshot.sessionId)
          setShellLabel(getShellLabel(snapshot.shell))
          setCwdLabel(snapshot.cwd)
          setStatusText('Connected')
          return
        }
      }

      let session: Awaited<ReturnType<typeof window.context.createTerminalSession>>
      try {
        session = await window.context.createTerminalSession({
          cwd: notesRootDir ?? undefined,
        })
      } catch (error) {
        if (!cancelled && initRunRef.current === runId) {
          setStatusText('Failed to start shell')
        }
        return
      }

      if (cancelled || initRunRef.current !== runId) {
        await window.context.closeTerminalSession(session.sessionId)
        return
      }

      setTerminalSessionId({ tabId: tab.id, sessionId: session.sessionId })
      setSessionId(session.sessionId)
      setShellLabel(getShellLabel(session.shell))
      setCwdLabel(session.cwd)
      setStatusText('Connected')
    }

    void initializeSession()

    return () => {
      cancelled = true
    }
  }, [notesRootDir, setTerminalSessionId, tab.id, tab.terminalSessionId])

  useEffect(() => {
    const term = terminalRef.current
    if (!term) return

    term.options.theme = getTerminalTheme(isDarkMode)
    term.options.fontFamily = getTerminalFontFamily(editorFont)
    term.options.fontSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, editorFontSize))
    window.requestAnimationFrame(() => {
      scheduleFitRef.current?.()
    })
  }, [editorFont, editorFontSize, isDarkMode])

  useEffect(() => {
    const element = containerRef.current
    if (!element || !sessionId) return

    let disposed = false

    const term = new Terminal({
      allowTransparency: true,
      cursorBlink: true,
      cursorStyle: 'block',
      convertEol: false,
      drawBoldTextInBrightColors: true,
      fontFamily: getTerminalFontFamily(editorFont),
      fontSize: Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, editorFontSize)),
      lineHeight: 1.2,
      macOptionIsMeta: true,
      minimumContrastRatio: 1,
      scrollback: 10000,
      smoothScrollDuration: 0,
      theme: getTerminalTheme(isDarkMode),
    })
    const fitAddon = new FitAddon()
    const linksAddon = new WebLinksAddon((_event, uri) => {
      window.open(uri, '_blank', 'noopener,noreferrer')
    })

    terminalRef.current = term
    fitAddonRef.current = fitAddon
    writeQueueRef.current = []
    isWritingRef.current = false
    snapshotReadyRef.current = false
    lastSequenceRef.current = 0
    pendingEventsRef.current = []
    setStatusText('Connecting...')

    term.loadAddon(fitAddon)
    term.loadAddon(linksAddon)
    term.open(element)

    const flushWriteQueue = () => {
      if (disposed || isWritingRef.current || writeQueueRef.current.length === 0) return
      const nextChunk = writeQueueRef.current.shift()
      if (!nextChunk) return

      isWritingRef.current = true
      term.write(nextChunk, () => {
        isWritingRef.current = false
        flushWriteQueue()
      })
    }

    const enqueueTerminalWrite = (data: string) => {
      if (!data) return
      if (data.length <= WRITE_BATCH_SIZE) {
        writeQueueRef.current.push(data)
      } else {
        for (let i = 0; i < data.length; i += WRITE_BATCH_SIZE) {
          writeQueueRef.current.push(data.slice(i, i + WRITE_BATCH_SIZE))
        }
      }
      flushWriteQueue()
    }

    const hasRenderableSize = () => element.clientWidth > 8 && element.clientHeight > 8

    const applyPtyResize = () => {
      if (!hasRenderableSize()) return
      const cols = term.cols
      const rows = term.rows
      if (cols <= 0 || rows <= 0) return
      const last = lastAppliedSizeRef.current
      if (last && last.cols === cols && last.rows === rows) return
      lastAppliedSizeRef.current = { cols, rows }
      window.context.resizeTerminalSession(sessionId, cols, rows)
    }

    const fitTerminal = () => {
      if (!hasRenderableSize()) return
      try {
        fitAddon.fit()
      } catch {
        return
      }
      applyPtyResize()
    }

    const setResizeVisualState = (active: boolean) => {
      if (!term.element) return
      if (active) {
        term.element.classList.add('terminal-resizing')
        return
      }
      term.element.classList.remove('terminal-resizing')
    }

    const scheduleFit = () => {
      if (resizeFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeFrameRef.current)
      }
      resizeFrameRef.current = window.requestAnimationFrame(() => {
        resizeFrameRef.current = null
        if (disposed) return
        fitTerminal()
        if (resizeDebounceRef.current !== null) {
          window.clearTimeout(resizeDebounceRef.current)
        }
        resizeDebounceRef.current = window.setTimeout(() => {
          resizeDebounceRef.current = null
          if (disposed) return
          fitTerminal()
          applyPtyResize()
        }, 90)
      })
    }

    const scheduleResizeFit = () => {
      if (!isResizeActiveRef.current) {
        isResizeActiveRef.current = true
        setResizeVisualState(true)
      }
      if (resizeSettleRef.current !== null) {
        window.clearTimeout(resizeSettleRef.current)
      }
      resizeSettleRef.current = window.setTimeout(() => {
        resizeSettleRef.current = null
        if (disposed) return
        scheduleFit()
        if (resizeUnlockFrameRef.current !== null) {
          window.cancelAnimationFrame(resizeUnlockFrameRef.current)
        }
        resizeUnlockFrameRef.current = window.requestAnimationFrame(() => {
          resizeUnlockFrameRef.current = null
          isResizeActiveRef.current = false
          setResizeVisualState(false)
        })
      }, 120)
    }

    scheduleFitRef.current = scheduleFit

    const resizeObserver = new ResizeObserver(() => {
      scheduleResizeFit()
    })
    resizeObserver.observe(element)
    window.addEventListener('resize', scheduleResizeFit)
    window.addEventListener('focus', scheduleFit)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        scheduleFit()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    const inputDisposable = term.onData((data) => {
      window.context.writeTerminalInput(sessionId, data)
    })

    const queueOrWriteDataEvent = (event: TerminalDataEvent) => {
      if (!snapshotReadyRef.current) {
        pendingEventsRef.current.push(event)
        if (pendingEventsRef.current.length > MAX_PENDING_PRE_SNAPSHOT_EVENTS) {
          pendingEventsRef.current.splice(
            0,
            pendingEventsRef.current.length - MAX_PENDING_PRE_SNAPSHOT_EVENTS
          )
        }
        return
      }

      if (event.sequence <= lastSequenceRef.current) return
      lastSequenceRef.current = event.sequence
      enqueueTerminalWrite(event.data)
    }

    const flushPendingEvents = () => {
      if (pendingEventsRef.current.length === 0) return
      pendingEventsRef.current.sort((a, b) => a.sequence - b.sequence)
      for (const event of pendingEventsRef.current) {
        if (event.sequence <= lastSequenceRef.current) continue
        lastSequenceRef.current = event.sequence
        enqueueTerminalWrite(event.data)
      }
      pendingEventsRef.current = []
    }

    const unlockLiveStreamWithoutSnapshot = () => {
      if (snapshotReadyRef.current) return
      snapshotReadyRef.current = true
      setStatusText('Connected')
      flushPendingEvents()
      lastAppliedSizeRef.current = null
      scheduleFit()
    }

    const unsubscribeData = window.context.onTerminalData((event) => {
      if (event.sessionId !== sessionId) return
      queueOrWriteDataEvent(event)
    })

    const unsubscribeExit = window.context.onTerminalExit((event) => {
      if (event.sessionId !== sessionId) return
      setStatusText(`Exited (${event.exitCode})`)
      setTerminalSessionId({ tabId: tab.id, sessionId: null })
      window.setTimeout(() => {
        closeTab(tab.id)
      }, 0)
    })

    let snapshotSettled = false
    const snapshotFallbackTimer = window.setTimeout(() => {
      if (disposed || snapshotSettled) return
      unlockLiveStreamWithoutSnapshot()
    }, SNAPSHOT_FALLBACK_MS)

    void window.context
      .getTerminalSnapshot(sessionId)
      .then((snapshot) => {
        if (disposed) return
        snapshotSettled = true
        window.clearTimeout(snapshotFallbackTimer)

        const liveFallbackAlreadyUnlocked = snapshotReadyRef.current
        if (!snapshot) {
          if (!liveFallbackAlreadyUnlocked) {
            setStatusText('Reconnecting...')
            setTerminalSessionId({ tabId: tab.id, sessionId: null })
            setSessionId(null)
          }
          return
        }

        setShellLabel(getShellLabel(snapshot.shell))
        setCwdLabel(snapshot.cwd)

        if (liveFallbackAlreadyUnlocked) {
          return
        }

        snapshotReadyRef.current = true
        setStatusText('Connected')
        lastSequenceRef.current = snapshot.sequence
        if (snapshot.buffer) {
          enqueueTerminalWrite(snapshot.buffer)
        }

        flushPendingEvents()
        lastAppliedSizeRef.current = null
        scheduleFit()
        focusTimerRef.current = window.setTimeout(() => {
          if (!disposed) term.focus()
        }, 20)
      })
      .catch(() => {
        if (disposed) return
        snapshotSettled = true
        window.clearTimeout(snapshotFallbackTimer)
        unlockLiveStreamWithoutSnapshot()
      })
    void document.fonts?.ready.then(() => {
      if (!disposed) scheduleFit()
    })

    return () => {
      disposed = true
      if (scheduleFitRef.current === scheduleFit) {
        scheduleFitRef.current = null
      }
      if (resizeFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeFrameRef.current)
        resizeFrameRef.current = null
      }
      if (resizeDebounceRef.current !== null) {
        window.clearTimeout(resizeDebounceRef.current)
        resizeDebounceRef.current = null
      }
      if (resizeSettleRef.current !== null) {
        window.clearTimeout(resizeSettleRef.current)
        resizeSettleRef.current = null
      }
      if (resizeUnlockFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeUnlockFrameRef.current)
        resizeUnlockFrameRef.current = null
      }
      if (focusTimerRef.current !== null) {
        window.clearTimeout(focusTimerRef.current)
        focusTimerRef.current = null
      }
      window.clearTimeout(snapshotFallbackTimer)
      isResizeActiveRef.current = false
      setResizeVisualState(false)
      unsubscribeData()
      unsubscribeExit()
      resizeObserver.disconnect()
      window.removeEventListener('resize', scheduleResizeFit)
      window.removeEventListener('focus', scheduleFit)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      inputDisposable.dispose()
      term.dispose()
      if (terminalRef.current === term) {
        terminalRef.current = null
      }
      if (fitAddonRef.current === fitAddon) {
        fitAddonRef.current = null
      }
      lastAppliedSizeRef.current = null
      writeQueueRef.current = []
      isWritingRef.current = false
      snapshotReadyRef.current = false
      pendingEventsRef.current = []
      lastSequenceRef.current = 0
    }
  }, [closeTab, sessionId, setTerminalSessionId, tab.id])

  return (
    <div className="flex h-full flex-col bg-[var(--obsidian-workspace)]">
      <div className="flex h-9 min-h-9 shrink-0 items-center gap-3 border-b border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] px-4 text-[11px] leading-none text-[var(--obsidian-text-muted)]">
        <div className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-[var(--obsidian-text)]">
          <VscTerminal className="h-4 w-4" />
          <span className="font-medium">{shellLabel}</span>
        </div>
        <span className="min-w-0 flex-1 truncate">{cwdLabel}</span>
        <div className="ml-auto shrink-0 whitespace-nowrap text-[10px] uppercase tracking-[0.18em]">
          {statusText}
        </div>
      </div>
      <div className="terminal-host min-h-0 flex-1">
        <div
          ref={containerRef}
          className="h-full w-full overflow-hidden bg-[#16181f]"
          style={{ backgroundColor: isDarkMode ? '#16181f' : '#fcfcfd' }}
        />
      </div>
    </div>
  )
}
