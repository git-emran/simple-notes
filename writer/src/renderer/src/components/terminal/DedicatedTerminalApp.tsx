import { type CSSProperties, Suspense, lazy, useEffect, useRef, useState } from 'react'
import { useAtom, useAtomValue } from 'jotai'
import {
  themeModeAtom,
  isDarkModeAtom,
  editorFontAtom,
  editorFontSizeAtom,
  accentColorAtom,
  transparentBgAtom,
  getEditorFontStack,
  toCssFontFamily
} from '@renderer/store'
import { applyThemeToDocument } from '@renderer/themes/themeManager'
import { TerminalTab } from './TerminalTab'
import {
  VscAdd,
  VscChromeClose,
  VscChromeMaximize,
  VscChromeMinimize,
  VscClose,
  VscProject,
  VscSettingsGear,
  VscTable,
  VscTerminal
} from 'react-icons/vsc'
import { twMerge } from 'tailwind-merge'

const MarkdownEditor = lazy(() =>
  import('../markdown-editor/MarkdownEditor').then((m) => ({ default: m.MarkdownEditor }))
)
const CanvasEditor = lazy(() =>
  import('../canvas/CanvasEditor').then((m) => ({ default: m.CanvasEditor }))
)
const SettingsPanel = lazy(() =>
  import('../SettingsModal').then((m) => ({ default: m.SettingsPanel }))
)
const KanbanBoard = lazy(() =>
  import('../kanban/KanbanBoard').then((m) => ({ default: m.KanbanBoard }))
)
const SpreadsheetPanel = lazy(() =>
  import('../spreadsheet').then((m) => ({ default: m.SpreadsheetPanel }))
)

interface DedicatedTab {
  id: string
  name: string
  kind?: string
  path?: string | null
  terminalSessionId?: string | null
}

const isMacPlatform = () =>
  typeof navigator !== 'undefined' &&
  (/Mac|iPhone|iPod|iPad/.test(navigator.platform || '') || /Mac/.test(navigator.userAgent || ''))

const getInitialParams = () => {
  const searchParams = new URLSearchParams(window.location.search)
  let sessionId = searchParams.get('sessionId')
  let cwd = searchParams.get('cwd')
  let tabParam = searchParams.get('tab')

  if (window.location.hash.includes('?')) {
    const hashQuery = window.location.hash.slice(window.location.hash.indexOf('?') + 1)
    const hashParams = new URLSearchParams(hashQuery)
    sessionId = hashParams.get('sessionId') || sessionId
    cwd = hashParams.get('cwd') || cwd
    tabParam = hashParams.get('tab') || tabParam
  }

  let parsedTab: DedicatedTab | null = null
  if (tabParam) {
    try {
      parsedTab = JSON.parse(decodeURIComponent(tabParam))
    } catch {
      try {
        parsedTab = JSON.parse(tabParam)
      } catch {
        // fallback
      }
    }
  }

  return { sessionId: sessionId || null, cwd: cwd || null, tab: parsedTab }
}

export const DedicatedTerminalApp = () => {
  const themeMode = useAtomValue(themeModeAtom)
  const [isDarkMode, setIsDarkMode] = useAtom(isDarkModeAtom)
  const editorFont = useAtomValue(editorFontAtom)
  const editorFontSize = useAtomValue(editorFontSizeAtom)
  const accentColor = useAtomValue(accentColorAtom)
  const transparentBg = useAtomValue(transparentBgAtom)

  const [isFullScreen, setIsFullScreen] = useState(false)
  const isMac = useRef(isMacPlatform()).current

  const [tabs, setTabs] = useState<DedicatedTab[]>(() => {
    const { sessionId, tab } = getInitialParams()
    if (tab && tab.id) {
      return [
        {
          ...tab,
          terminalSessionId: tab.terminalSessionId || sessionId || null
        }
      ]
    }
    return [
      {
        id: `term-tab-${Date.now()}`,
        name: 'Terminal',
        kind: 'terminal',
        terminalSessionId: sessionId
      }
    ]
  })
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0]?.id ?? 'term-tab-1')

  const titlebarRef = useRef<HTMLDivElement>(null)
  const draggedTabIdRef = useRef<string | null>(null)
  const isDraggingOffRef = useRef(false)
  const lastDragPosRef = useRef<{ screenX: number; screenY: number; clientX: number; clientY: number } | null>(null)
  const [dropIndicator, setDropIndicator] = useState<{ tabId: string; position: 'before' | 'after' } | null>(null)
  const [rejoinedTabId, setRejoinedTabId] = useState<string | null>(null)

  /* Listen to Fullscreen State */
  useEffect(() => {
    if (window.context?.isFullscreen) {
      window.context.isFullscreen().then(setIsFullScreen).catch(() => {})
    }
    if (window.context?.onFullscreenChanged) {
      return window.context.onFullscreenChanged((fs) => setIsFullScreen(fs))
    }
    return undefined
  }, [])

  /* Listen for tab docked events from other windows */
  useEffect(() => {
    if (window.context?.onTabDocked) {
      return window.context.onTabDocked(({ tabId }) => {
        handleRemoveDockedTab(tabId)
      })
    }
    return undefined
  }, [tabs, activeTabId])

  /* Sync Theme */
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const syncTheme = (systemDark?: boolean) => {
      const isSystemDark = typeof systemDark === 'boolean' ? systemDark : mediaQuery.matches
      const { isDark } = applyThemeToDocument(themeMode, isSystemDark)
      setIsDarkMode(isDark)
    }

    syncTheme()

    if (window.context?.getSystemThemeInfo) {
      window.context
        .getSystemThemeInfo()
        .then((info) => {
          if (info && typeof info.shouldUseDarkColors === 'boolean') {
            syncTheme(info.shouldUseDarkColors)
          }
        })
        .catch(() => {})
    }

    const handleMediaChange = (e: MediaQueryListEvent) => syncTheme(e.matches)
    mediaQuery.addEventListener('change', handleMediaChange)

    let unsubNativeTheme: (() => void) | undefined
    if (window.context?.onSystemThemeUpdated) {
      unsubNativeTheme = window.context.onSystemThemeUpdated((info) => {
        syncTheme(info.shouldUseDarkColors)
      })
    }

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange)
      unsubNativeTheme?.()
    }
  }, [themeMode, setIsDarkMode])

  /* Sync Font */
  useEffect(() => {
    const root = document.documentElement
    const stack = getEditorFontStack(editorFont).map(toCssFontFamily).join(', ')
    root.style.setProperty('--writr-editor-font-family', stack)
    root.style.setProperty(
      '--writr-editor-font-size',
      `${Math.max(11, Math.min(20, editorFontSize))}px`
    )
  }, [editorFont, editorFontSize])

  /* Sync Accent Color */
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--obsidian-accent', accentColor)
    const hex = accentColor.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      root.style.setProperty('--obsidian-accent-dim', `rgba(${r}, ${g}, ${b}, 0.15)`)
    }
  }, [accentColor])

  /* Sync Transparency */
  useEffect(() => {
    document.documentElement.classList.toggle('no-transparency', !transparentBg)
  }, [transparentBg])

  /* Handle Tab Operations */
  const handleNewTab = () => {
    const activeTab = tabs.find((t) => t.id === activeTabId)
    const isTerminalFocused = activeTab?.kind === 'terminal' || (!activeTab?.kind && tabs.every(t => t.kind === 'terminal' || !t.kind))

    if (isTerminalFocused) {
      const existingNums = tabs
        .filter((t) => t.kind === 'terminal' || !t.kind)
        .map((t) => {
          const match = t.name.match(/^Terminal(?: (\d+))?$/)
          return match ? (match[1] ? parseInt(match[1], 10) : 1) : null
        })
        .filter((n): n is number => n !== null)

      let nextNum = 1
      while (existingNums.includes(nextNum)) {
        nextNum++
      }

      const newTab: DedicatedTab = {
        id: `term-tab-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: nextNum === 1 ? 'Terminal' : `Terminal ${nextNum}`,
        kind: 'terminal',
        terminalSessionId: null
      }

      setTabs((prev) => [...prev, newTab])
      setActiveTabId(newTab.id)
    } else {
      const newTab: DedicatedTab = {
        id: `tab-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: 'New Tab',
        kind: 'empty',
        path: null,
        terminalSessionId: null
      }

      setTabs((prev) => [...prev, newTab])
      setActiveTabId(newTab.id)
    }
  }

  const handleCloseTab = (tabId: string) => {
    const closing = tabs.find((t) => t.id === tabId)
    if (closing?.terminalSessionId && window.context?.closeTerminalSession) {
      void window.context.closeTerminalSession(closing.terminalSessionId)
    }

    const nextTabs = tabs.filter((t) => t.id !== tabId)
    if (nextTabs.length === 0) {
      if (window.context?.closeWindow) {
        void window.context.closeWindow()
      } else {
        window.close()
      }
      return
    }

    setTabs(nextTabs)
    if (activeTabId === tabId) {
      setActiveTabId(nextTabs[nextTabs.length - 1].id)
    }
  }

  const handleRemoveDockedTab = (tabId: string) => {
    setTabs((prev) => {
      const remaining = prev.filter((t) => t.id !== tabId)
      if (remaining.length === 0) {
        setTimeout(() => {
          if (window.context?.closeWindow) {
            void window.context.closeWindow()
          } else {
            window.close()
          }
        }, 50)
        return []
      }
      if (activeTabId === tabId) {
        setActiveTabId(remaining[remaining.length - 1].id)
      }
      return remaining
    })
  }

  /* Keyboard shortcuts */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey
      if (isCmdOrCtrl && e.key.toLowerCase() === 't') {
        e.preventDefault()
        handleNewTab()
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'w') {
        e.preventDefault()
        if (activeTabId) {
          handleCloseTab(activeTabId)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTabId, tabs])

  return (
    <div className="animate-window-bloom flex h-screen w-screen flex-col overflow-hidden bg-[var(--obsidian-workspace)] text-[var(--obsidian-text)] select-none">
      {/* Titlebar with window dragging and tabs */}
      <div
        ref={titlebarRef}
        className="flex h-10 shrink-0 items-center border-b border-obsidian-border-soft bg-[var(--obsidian-titlebar)] z-50 px-1"
        style={{ WebkitAppRegion: 'drag' } as CSSProperties}
      >
        {/* macOS traffic light spacer */}
        {isMac && !isFullScreen && <div className="shrink-0 w-[78px]" />}

        {/* Tab Bar */}
        <div className="flex h-full min-w-0 flex-1 items-center gap-1 overflow-x-auto no-scrollbar px-1">
          {tabs.map((tab) => {
            const isActive = activeTabId === tab.id
            const isRejoined = rejoinedTabId === tab.id
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                draggable
                onDragStart={(e) => {
                  draggedTabIdRef.current = tab.id
                  isDraggingOffRef.current = false
                  lastDragPosRef.current = {
                    screenX: e.screenX,
                    screenY: e.screenY,
                    clientX: e.clientX,
                    clientY: e.clientY
                  }
                  e.dataTransfer.setData('application/x-writr-tab-id', tab.id)
                  e.dataTransfer.setData('application/x-writr-tab', JSON.stringify(tab))
                  e.dataTransfer.setData('text/plain', tab.id)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDrag={(e) => {
                  if (e.screenX !== 0 || e.screenY !== 0) {
                    lastDragPosRef.current = {
                      screenX: e.screenX,
                      screenY: e.screenY,
                      clientX: e.clientX,
                      clientY: e.clientY
                    }
                  }
                }}
                onDragEnd={(e) => {
                  const draggedId = draggedTabIdRef.current
                  draggedTabIdRef.current = null
                  setDropIndicator(null)

                  if (!draggedId) return

                  const dropEffect = e.dataTransfer.dropEffect
                  const lastPos = lastDragPosRef.current
                  const screenX = e.screenX !== 0 ? e.screenX : (lastPos?.screenX ?? 0)
                  const screenY = e.screenY !== 0 ? e.screenY : (lastPos?.screenY ?? 0)
                  const clientX = e.clientX !== 0 ? e.clientX : (lastPos?.clientX ?? 0)
                  const clientY = e.clientY !== 0 ? e.clientY : (lastPos?.clientY ?? 0)

                  const winX = window.screenX
                  const winY = window.screenY
                  const winW = window.outerWidth
                  const winH = window.outerHeight

                  const isOutsideWindow =
                    screenX < winX || screenX > winX + winW || screenY < winY || screenY > winY + winH

                  const stripRect = titlebarRef.current?.getBoundingClientRect()
                  const isOffStrip = stripRect
                    ? clientY > stripRect.bottom + 30 ||
                      clientY < stripRect.top - 15 ||
                      clientX < stripRect.left - 30 ||
                      clientX > stripRect.right + 30
                    : true

                  const isTornOff =
                    (dropEffect === 'none' && (isOutsideWindow || isOffStrip)) ||
                    (e.clientX === 0 && e.clientY === 0 && isOutsideWindow)

                  if (isTornOff && !isDraggingOffRef.current) {
                    isDraggingOffRef.current = true
                    const targetX = Math.round(screenX - 120)
                    const targetY = Math.round(screenY - 20)

                    window.context?.openSeparatedWindow?.({
                      tab,
                      sessionId: tab.terminalSessionId ?? undefined,
                      x: targetX,
                      y: targetY
                    }).then(() => {
                      handleRemoveDockedTab(draggedId)
                    }).catch((err) => {
                      console.error('Failed to tear off tab into window:', err)
                    })
                  }
                }}
                onDragOver={(e) => {
                  const dragged = draggedTabIdRef.current
                  if (dragged === tab.id) return
                  e.preventDefault()

                  const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
                  const position: 'before' | 'after' = e.clientX < rect.left + rect.width / 2 ? 'before' : 'after'
                  setDropIndicator({ tabId: tab.id, position })
                }}
                onDragLeave={(e) => {
                  if (!dropIndicator) return
                  const related = e.relatedTarget
                  if (related && e.currentTarget.contains(related as Node)) return
                  setDropIndicator(null)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  const position = dropIndicator?.position ?? 'after'
                  setDropIndicator(null)

                  const tabDataStr = e.dataTransfer.getData('application/x-writr-tab')
                  const source =
                    draggedTabIdRef.current ?? e.dataTransfer.getData('application/x-writr-tab-id') ?? e.dataTransfer.getData('text/plain')

                  // Check if tab is from another window
                  if (tabDataStr) {
                    try {
                      const incomingTab = JSON.parse(tabDataStr)
                      if (incomingTab && incomingTab.id && !tabs.some((t) => t.id === incomingTab.id)) {
                        if (incomingTab.terminalSessionId && window.context?.transferTerminalSession) {
                          void window.context.transferTerminalSession(incomingTab.terminalSessionId)
                        }
                        const targetIndex = tabs.findIndex((t) => t.id === tab.id)
                        const insertIndex = position === 'after' ? targetIndex + 1 : targetIndex
                        const nextTabs = [...tabs]
                        nextTabs.splice(insertIndex, 0, incomingTab)
                        setTabs(nextTabs)
                        setActiveTabId(incomingTab.id)
                        window.context?.notifyTabDocked?.(incomingTab.id)
                        setRejoinedTabId(incomingTab.id)
                        setTimeout(() => setRejoinedTabId(null), 1000)
                        return
                      }
                    } catch {}
                  }

                  if (!source || source === tab.id) return
                  const sourceIndex = tabs.findIndex((t) => t.id === source)
                  const targetIndex = tabs.findIndex((t) => t.id === tab.id)
                  if (sourceIndex === -1 || targetIndex === -1) return
                  const nextTabs = [...tabs]
                  const [moved] = nextTabs.splice(sourceIndex, 1)
                  const newTargetIndex = nextTabs.findIndex((t) => t.id === tab.id)
                  const insertIndex = position === 'after' ? newTargetIndex + 1 : newTargetIndex
                  nextTabs.splice(insertIndex, 0, moved)
                  setTabs(nextTabs)
                }}
                style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}
                className={twMerge(
                  'group relative flex h-7 shrink min-w-[70px] max-w-[200px] items-center rounded-md border border-transparent px-2.5 cursor-pointer select-none transition-colors',
                  isActive
                    ? 'bg-[var(--obsidian-workspace)] border-obsidian-border-soft text-[var(--obsidian-text)] shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                    : 'text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover-soft)]',
                  isRejoined && 'animate-tab-rejoin'
                )}
              >
                {dropIndicator?.tabId === tab.id && dropIndicator.position === 'before' && (
                  <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-[var(--obsidian-accent)] rounded" />
                )}
                {dropIndicator?.tabId === tab.id && dropIndicator.position === 'after' && (
                  <div className="absolute right-0 top-1 bottom-1 w-[2px] bg-[var(--obsidian-accent)] rounded" />
                )}

                {tab.kind === 'terminal' || (!tab.kind && tab.terminalSessionId) ? (
                  <VscTerminal className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-80" />
                ) : tab.kind === 'kanban' ? (
                  <VscProject className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-80" />
                ) : tab.kind === 'spreadsheet' ? (
                  <VscTable className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-80" />
                ) : tab.kind === 'settings' ? (
                  <VscSettingsGear className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-80" />
                ) : null}

                <span className="text-[11px] font-medium truncate flex-1 tracking-tight">
                  {(tab.kind === 'file' && tab.path ? tab.name.replace(/\.(md|canvas)$/, '') : tab.name)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCloseTab(tab.id)
                  }}
                  className={twMerge(
                    'ml-1.5 flex h-4 w-4 shrink-0 items-center justify-center rounded text-[var(--obsidian-text-muted)] opacity-0 hover:bg-[var(--obsidian-hover)] hover:text-[var(--obsidian-text)] transition-opacity',
                    isActive ? 'opacity-70 hover:opacity-100' : 'group-hover:opacity-70 hover:!opacity-100'
                  )}
                  title="Close tab"
                >
                  <VscClose className="h-3 w-3" />
                </button>
              </div>
            )
          })}
          <button
            onClick={handleNewTab}
            style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover-soft)] transition-colors"
            title="New tab"
          >
            <VscAdd className="w-3.5 h-3.5" />
          </button>
          {/* Fill remaining space & accept tab drops */}
          <div
            className="h-full flex-1 min-w-[20px]"
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes('application/x-writr-tab') || draggedTabIdRef.current) {
                e.preventDefault()
              }
            }}
            onDrop={(e) => {
              e.preventDefault()
              const tabDataStr = e.dataTransfer.getData('application/x-writr-tab')
              if (tabDataStr) {
                try {
                  const incomingTab = JSON.parse(tabDataStr)
                  if (incomingTab && incomingTab.id && !tabs.some((t) => t.id === incomingTab.id)) {
                    if (incomingTab.terminalSessionId && window.context?.transferTerminalSession) {
                      void window.context.transferTerminalSession(incomingTab.terminalSessionId)
                    }
                    setTabs((prev) => [...prev, incomingTab])
                    setActiveTabId(incomingTab.id)
                    window.context?.notifyTabDocked?.(incomingTab.id)
                    setRejoinedTabId(incomingTab.id)
                    setTimeout(() => setRejoinedTabId(null), 1000)
                  }
                } catch {}
              }
            }}
          />
        </div>

        {/* Non-Mac Window Controls */}
        {!isMac && (
          <div
            className="flex h-full items-center shrink-0"
            style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}
          >
            <button
              onClick={() => window.context?.minimizeWindow?.()}
              className="flex h-full w-10 items-center justify-center text-[var(--obsidian-text-muted)] hover:bg-[var(--obsidian-hover-soft)] hover:text-[var(--obsidian-text)] transition-colors"
              title="Minimize"
            >
              <VscChromeMinimize className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => window.context?.maximizeWindow?.()}
              className="flex h-full w-10 items-center justify-center text-[var(--obsidian-text-muted)] hover:bg-[var(--obsidian-hover-soft)] hover:text-[var(--obsidian-text)] transition-colors"
              title="Maximize"
            >
              <VscChromeMaximize className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => window.context?.closeWindow?.()}
              className="flex h-full w-10 items-center justify-center text-[var(--obsidian-text-muted)] hover:bg-red-500 hover:text-white transition-colors"
              title="Close"
            >
              <VscChromeClose className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Tab Content Container */}
      <div className="relative min-h-0 flex-1">
        {tabs.map((tab) => {
          const isActive = activeTabId === tab.id
          const isTerminal = tab.kind === 'terminal' || (!tab.kind && tab.terminalSessionId)
          const isFileOrEmpty = tab.kind === 'file' || tab.kind === 'empty' || (!tab.kind && !tab.terminalSessionId)
          const isCanvas = tab.path ? tab.path.endsWith('.canvas') : false
          const isKanban = tab.kind === 'kanban'
          const isSpreadsheet = tab.kind === 'spreadsheet'
          const isSettings = tab.kind === 'settings'

          return (
            <div
              key={tab.id}
              className="h-full w-full"
              style={{
                display: isActive ? 'flex' : 'none',
                flexDirection: 'column'
              }}
            >
              {isTerminal && (
                <TerminalTab
                  tab={tab}
                  isActive={isActive}
                  showSeparateButton={false}
                  onClose={() => handleCloseTab(tab.id)}
                  onSessionIdChange={(newSessionId) => {
                    setTabs((prev) =>
                      prev.map((t) =>
                        t.id === tab.id ? { ...t, terminalSessionId: newSessionId } : t
                      )
                    )
                  }}
                />
              )}

              {isFileOrEmpty && (
                <Suspense
                  fallback={
                    <div className="h-full w-full flex items-center justify-center text-[var(--obsidian-text-muted)] text-sm">
                      Loading Editor...
                    </div>
                  }
                >
                  {isCanvas ? (
                    <CanvasEditor tabId={tab.id} path={tab.path ?? null} isActive={isActive} />
                  ) : (
                    <MarkdownEditor tabId={tab.id} path={tab.path ?? null} isActive={isActive} />
                  )}
                </Suspense>
              )}

              {isKanban && (
                <Suspense
                  fallback={
                    <div className="h-full w-full flex items-center justify-center text-[var(--obsidian-text-muted)] text-sm">
                      Loading Kanban...
                    </div>
                  }
                >
                  <KanbanBoard />
                </Suspense>
              )}

              {isSpreadsheet && (
                <Suspense
                  fallback={
                    <div className="h-full w-full flex items-center justify-center text-[var(--obsidian-text-muted)] text-sm">
                      Loading Spreadsheet...
                    </div>
                  }
                >
                  <SpreadsheetPanel isActive={isActive} />
                </Suspense>
              )}

              {isSettings && (
                <Suspense
                  fallback={
                    <div className="h-full w-full flex items-center justify-center text-[var(--obsidian-text-muted)] text-sm">
                      Loading Settings...
                    </div>
                  }
                >
                  <SettingsPanel />
                </Suspense>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
