import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
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
  VscTerminal
} from 'react-icons/vsc'
import { twMerge } from 'tailwind-merge'

interface DedicatedTab {
  id: string
  name: string
  terminalSessionId: string | null
}

const isMacPlatform = () =>
  typeof navigator !== 'undefined' &&
  (/Mac|iPhone|iPod|iPad/.test(navigator.platform || '') || /Mac/.test(navigator.userAgent || ''))

const getInitialParams = () => {
  const searchParams = new URLSearchParams(window.location.search)
  let sessionId = searchParams.get('sessionId')
  let cwd = searchParams.get('cwd')

  if (!sessionId && window.location.hash.includes('?')) {
    const hashQuery = window.location.hash.slice(window.location.hash.indexOf('?') + 1)
    const hashParams = new URLSearchParams(hashQuery)
    sessionId = hashParams.get('sessionId') || sessionId
    cwd = hashParams.get('cwd') || cwd
  }

  return { sessionId: sessionId || null, cwd: cwd || null }
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
    const { sessionId } = getInitialParams()
    return [
      {
        id: `term-tab-${Date.now()}`,
        name: 'Terminal',
        terminalSessionId: sessionId
      }
    ]
  })
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0]?.id ?? 'term-tab-1')

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
    const existingNums = tabs
      .map((t) => {
        const match = t.name.match(/^Terminal(?: (\d+))?$/)
        return match ? (match[1] ? parseInt(match[1], 10) : 1) : null
      })
      .filter((n): n is number => n !== null)

    let nextNum = 2
    while (existingNums.includes(nextNum)) {
      nextNum++
    }

    const newTab: DedicatedTab = {
      id: `term-tab-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: `Terminal ${nextNum}`,
      terminalSessionId: null
    }

    setTabs((prev) => [...prev, newTab])
    setActiveTabId(newTab.id)
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
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--obsidian-workspace)] text-[var(--obsidian-text)] select-none">
      {/* Titlebar with window dragging and tabs */}
      <div
        className="flex h-10 shrink-0 items-center border-b border-obsidian-border-soft bg-[var(--obsidian-titlebar)] z-50 px-1"
        style={{ WebkitAppRegion: 'drag' } as CSSProperties}
      >
        {/* macOS traffic light spacer */}
        {isMac && !isFullScreen && <div className="shrink-0 w-[78px]" />}

        {/* Tab Bar */}
        <div className="flex h-full min-w-0 flex-1 items-center gap-1 overflow-x-auto no-scrollbar px-1">
          {tabs.map((tab) => {
            const isActive = activeTabId === tab.id
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}
                className={twMerge(
                  'group relative flex h-7 shrink min-w-[70px] max-w-[200px] items-center rounded-md border border-transparent px-2.5 cursor-pointer select-none transition-colors',
                  isActive
                    ? 'bg-[var(--obsidian-workspace)] border-obsidian-border-soft text-[var(--obsidian-text)] shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                    : 'text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover-soft)]'
                )}
              >
                <VscTerminal className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-80" />
                <span className="text-[11px] font-medium truncate flex-1 tracking-tight">
                  {tab.name}
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
            title="New terminal tab"
          >
            <VscAdd className="w-3.5 h-3.5" />
          </button>
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

      {/* Terminal View Container */}
      <div className="relative min-h-0 flex-1">
        {tabs.map((tab) => {
          const isActive = activeTabId === tab.id
          return (
            <div
              key={tab.id}
              className="h-full w-full"
              style={{
                display: isActive ? 'flex' : 'none',
                flexDirection: 'column'
              }}
            >
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
            </div>
          )
        })}
      </div>
    </div>
  )
}

