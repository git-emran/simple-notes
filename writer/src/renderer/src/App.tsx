import {
  Content,
  RootLayout,
  Sidebar,
  EditorTabs,
  ErrorBoundary
} from './components'
// import { FileExplorer } from './components/FileExplorer'
import { VirtualFilesList } from './components/VirtualFilesList'
import { MarkdownEditor } from './components/markdown-editor/MarkdownEditor'
import { CanvasEditor } from './components/canvas/CanvasEditor'
import { SettingsModal } from './components/SettingsModal'
import { KanbanBoard } from './components/kanban/KanbanBoard'
import { KanbanReminderHost } from './components/kanban/KanbanReminderHost'
import { TerminalTab } from './components/terminal/TerminalTab'
import { Tooltip } from './components/Tooltip'
import { UpdateManager } from './components/updater/UpdateManager'
import { MIN_SIDEBAR_WIDTH } from './constants/sidebarLayout'
import { useRef, useState, useEffect } from 'react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { 
  activeTabAtom,
  createDailyNoteAtom, 
  switchTabByIndexAtom, 
  closeActiveTabAtom, 
  restoreClosedTabAtom,
  createCanvasAtom,
  createTerminalTabAtom,
  selectedNodeAtom,
  createKanbanTabAtom,
  editorFontAtom,
  editorFontSizeAtom,
  themeModeAtom,
  fileTreeAtom,
  openTabAtom,
  tabsAtom,
  activeTabIdAtom,
  rememberLastStateAtom,
  isDarkModeAtom,
  accentColorAtom,
  type EditorFontOption
} from '@renderer/store'
import {
  VscFiles,
  VscCalendar,
  VscLayoutSidebarLeft,
  VscLayoutSidebarLeftOff,
  VscProject,
  VscSymbolRuler,
  VscTerminal,
  VscSettingsGear
} from 'react-icons/vsc'

const toCssFontFamily = (family: string) => {
  if (
    family === 'monospace' ||
    family === 'sans-serif' ||
    family === 'serif' ||
    family === 'system-ui' ||
    family === '-apple-system' ||
    family === 'BlinkMacSystemFont'
  ) {
    return family
  }
  return family.includes(' ') ? `"${family}"` : `"${family}"`
}

const getEditorFontStack = (font: EditorFontOption) => {
  if (font === 'SF Pro') {
    return [
      '-apple-system',
      'BlinkMacSystemFont',
      'system-ui',
      'SF Pro Text',
      'SF Pro Display',
      'Segoe UI',
      'Inter',
      'sans-serif',
    ]
  }

  return [font, 'SFMono-Regular', 'Menlo', 'JetBrains Mono', 'Courier', 'monospace']
}

const App = () => {
  const contentContainerRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [sidebarView, setSidebarView] = useState<'files' | 'search'>('files')
  const [appMode, setAppMode] = useState<'editor' | 'canvas'>('editor')
  const [sidebarWidth, setSidebarWidth] = useState(450) // default width increased for VirtualFilesList
  const isDragging = useRef(false)
  const previousBodyCursor = useRef('')
  const previousBodyUserSelect = useRef('')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const switchTabByIndex = useSetAtom(switchTabByIndexAtom)
  const createDailyNote = useSetAtom(createDailyNoteAtom)
  const closeActiveTab = useSetAtom(closeActiveTabAtom)
  const restoreClosedTab = useSetAtom(restoreClosedTabAtom)
  const createCanvas = useSetAtom(createCanvasAtom)
  const createKanbanTab = useSetAtom(createKanbanTabAtom)
  const createTerminalTab = useSetAtom(createTerminalTabAtom)
  const selectedNode = useAtomValue(selectedNodeAtom)
  const setSelectedNode = useSetAtom(selectedNodeAtom)
  const activeTab = useAtomValue(activeTabAtom)
  const themeMode = useAtomValue(themeModeAtom)
  const editorFont = useAtomValue(editorFontAtom)
  const editorFontSize = useAtomValue(editorFontSizeAtom)
  const accentColor = useAtomValue(accentColorAtom)
  const fileTree = useAtomValue(fileTreeAtom)
  const openTab = useSetAtom(openTabAtom)
  const [tabs, setTabs] = useAtom(tabsAtom)
  const [activeTabId, setActiveTabId] = useAtom(activeTabIdAtom)
  const [rememberLastState] = useAtom(rememberLastStateAtom)
  const setIsDarkMode = useSetAtom(isDarkModeAtom)

  /* Startup session state loading / resetting */
  useEffect(() => {
    if (!rememberLastState) {
      setTabs([{ id: 'tab-1', kind: 'empty', path: null, name: 'New Tab' }])
      setActiveTabId('tab-1')
      setSelectedNode(null)
    } else {
      const active = tabs.find((t) => t.id === activeTabId) ?? tabs[0]
      if (active && active.kind === 'file' && active.path) {
        setSelectedNode({
          id: active.path,
          name: active.name,
          path: active.path,
          type: 'file',
          isExpanded: false
        })
      }
    }
  }, [])

  /* Auto-open welcome note if it's a first run/empty root */
  useEffect(() => {
    /* Only auto-open Welcome.md when the app root folder has nothing else in it. */
    if (!fileTree || fileTree.length === 0) return
    if (tabs.length !== 1 || tabs[0].kind !== 'empty') return
    if (fileTree.length !== 1) return
    if (fileTree[0].name !== 'Welcome.md') return
    openTab(fileTree[0])
  }, [fileTree, tabs, openTab])

  /* Automatically switch mode based on selected file extension */
  useEffect(() => {
    if (selectedNode?.path) {
      if (selectedNode.path.endsWith('.canvas')) {
        setAppMode('canvas')
      } else if (selectedNode.path.endsWith('.md')) {
        setAppMode('editor')
      }
    }
  }, [selectedNode])

  const handleCanvasClick = async () => {
    if (selectedNode?.path && selectedNode.path.endsWith('.canvas')) {
      /* Already on a canvas file, just ensure mode is correct */
      setAppMode('canvas')
      return
    }

    /* Attempt to create a new canvas file */
    const parentDir = selectedNode?.type === 'folder' 
      ? selectedNode.path 
      : selectedNode?.path?.substring(0, Math.max(selectedNode.path.lastIndexOf('/'), selectedNode.path.lastIndexOf('\\'))) || ''
    
    await createCanvas(parentDir)
    setAppMode('canvas')
  }

  const applyTheme = (mode: 'light' | 'dark') => {
    document.documentElement.classList.toggle('dark', mode === 'dark')
    document.documentElement.classList.toggle('light', mode === 'light')
  }

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const applyCurrentTheme = () => {
      const resolvedMode =
        themeMode === 'system' ? (mediaQuery.matches ? 'dark' : 'light') : themeMode
      applyTheme(resolvedMode)
      setIsDarkMode(resolvedMode === 'dark')
    }

    applyCurrentTheme()
    if (themeMode === 'system') {
      mediaQuery.addEventListener('change', applyCurrentTheme)
    }

    return () => {
      mediaQuery.removeEventListener('change', applyCurrentTheme)
    }
  }, [themeMode, setIsDarkMode])

  useEffect(() => {
    const root = document.documentElement
    const stack = getEditorFontStack(editorFont).map(toCssFontFamily).join(', ')
    root.style.setProperty('--writr-editor-font-family', stack)
    root.style.setProperty('--writr-editor-font-size', `${Math.max(11, Math.min(20, editorFontSize))}px`)
  }, [editorFont, editorFontSize])

  /* Apply user-chosen accent color as CSS custom properties */
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--obsidian-accent', accentColor)
    // Parse hex → r,g,b for the dim variant
    const hex = accentColor.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      root.style.setProperty('--obsidian-accent-dim', `rgba(${r}, ${g}, ${b}, 0.15)`)
    }
  }, [accentColor])

  /* Drag to resize logic */
  useEffect(() => {
    const lockResizeInteraction = () => {
      previousBodyCursor.current = document.body.style.cursor
      previousBodyUserSelect.current = document.body.style.userSelect
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    const unlockResizeInteraction = () => {
      document.body.style.cursor = previousBodyCursor.current
      document.body.style.userSelect = previousBodyUserSelect.current
    }

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target?.closest('[data-sidebar-resize-handle="true"]')) return

      e.preventDefault()
      e.stopPropagation()
      isDragging.current = true
      lockResizeInteraction()
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return

      e.preventDefault()
      setSidebarWidth(Math.max(MIN_SIDEBAR_WIDTH, e.clientX))
    }

    const handleMouseUp = () => {
      if (!isDragging.current) return

      isDragging.current = false
      unlockResizeInteraction()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      /* Cmd + , */
      if ((e.metaKey || e.ctrlKey) && (e.key === ',' || e.code === 'Comma')) {
        e.preventDefault()
        setIsSettingsOpen(true)
        return
      }

      /* Esc closes settings */
      if (e.key === 'Escape' && isSettingsOpen) {
        e.preventDefault()
        setIsSettingsOpen(false)
        return
      }

      /* Cmd + W */
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'w') {
        e.preventDefault()
        closeActiveTab()
      }
      
      /* Cmd + Shift + T */
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault()
        restoreClosedTab()
      }

      /* Cmd + 1-9 (or Ctrl on Windows) */
      if ((e.metaKey || e.ctrlKey) && /^[1-9]$/.test(e.key)) {
        e.preventDefault()
        const index = parseInt(e.key) - 1
        switchTabByIndex(index)
      }
    }

    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('keydown', handleKeyDown)
      if (isDragging.current) {
        isDragging.current = false
        unlockResizeInteraction()
      }
    }
  }, [closeActiveTab, isSettingsOpen, restoreClosedTab, switchTabByIndex])

  return (
    <ErrorBoundary>
      <RootLayout className="obsidian-shell flex-col">
        {/* Persistent Title Bar */}
        <div 
          className="h-9 flex shrink-0 bg-[var(--obsidian-pane)] border-b border-[var(--obsidian-border)] z-50"
          style={{ WebkitAppRegion: 'drag' } as any}
        >
          {/* macOS traffic lights safe area */}
          <div className="shrink-0 w-[82px]" />
          {/* Spacer for Ribbon + Sidebar */}
          <div 
            className="flex shrink-0 border-r border-[var(--obsidian-border)] items-center justify-end pr-2" 
            style={{ width: 30 + (collapsed ? 0 : sidebarWidth) }}
          >
            <Tooltip content={collapsed ? 'Show sidebar' : 'Hide sidebar'} position="bottom">
              <button
                className="writr-titlebar-sidebar-toggle"
                style={{ WebkitAppRegion: 'no-drag' } as any}
                onClick={() => setCollapsed((prev) => !prev)}
                aria-label={collapsed ? 'Show sidebar' : 'Hide sidebar'}
              >
                {collapsed ? (
                  <VscLayoutSidebarLeftOff className="w-4 h-4" />
                ) : (
                  <VscLayoutSidebarLeft className="w-4 h-4" />
                )}
              </button>
            </Tooltip>
          </div>
          {/* Tabs Area */}
          <div className="flex-1 overflow-hidden">
            <EditorTabs />
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <aside className="obsidian-ribbon">
            <Tooltip content="Files" position="right" icon={<VscFiles className="w-3.5 h-3.5" />}>
              <button
                className={`obsidian-ribbon-btn ${sidebarView === 'files' ? 'is-active' : ''}`}
                onClick={() => {
                  setSidebarView('files')
                  setCollapsed(false)
                  setAppMode('editor')
                }}
              >
                <VscFiles />
              </button>
            </Tooltip>
            <Tooltip content="Daily note" position="right" icon={<VscCalendar className="w-3.5 h-3.5" />}>
              <button
                className="obsidian-ribbon-btn"
                onClick={() => {
                  setCollapsed(false)
                  setAppMode('editor')
                  void createDailyNote()
                }}
              >
                <VscCalendar />
              </button>
            </Tooltip>
            <Tooltip content="Kanban" position="right" icon={<VscProject className="w-3.5 h-3.5" />}>
              <button
                className="obsidian-ribbon-btn"
                onClick={() => {
                  setCollapsed(false)
                  createKanbanTab()
                }}
              >
                <VscProject />
              </button>
            </Tooltip>
            <Tooltip content="Terminal" position="right" icon={<VscTerminal className="w-3.5 h-3.5" />}>
              <button
                className={`obsidian-ribbon-btn ${activeTab?.kind === 'terminal' ? 'is-active' : ''}`}
                onClick={() => {
                  setCollapsed(false)
                  createTerminalTab()
                }}
              >
                <VscTerminal />
              </button>
            </Tooltip>
            <Tooltip content="Canvas" position="right" icon={<VscSymbolRuler className="w-3.5 h-3.5" />}>
              <button
                className={`obsidian-ribbon-btn ${activeTab?.kind === 'file' && appMode === 'canvas' ? 'is-active' : ''}`}
                onClick={handleCanvasClick}
              >
                <VscSymbolRuler />
              </button>
            </Tooltip>
            <div className="flex-1" />
            <Tooltip content="Settings" position="right" icon={<VscSettingsGear className="w-3.5 h-3.5" />}>
              <button
                className="obsidian-ribbon-btn"
                onClick={() => setIsSettingsOpen(true)}
              >
                <VscSettingsGear />
              </button>
            </Tooltip>
          </aside>

          {!collapsed && (
            <Sidebar
              width={sidebarWidth}
              minWidth={MIN_SIDEBAR_WIDTH}
              onClose={() => setCollapsed(true)}
            >
              <VirtualFilesList 
                  sidebarView={sidebarView}
                  sidebarWidth={sidebarWidth}
                  setSidebarWidth={setSidebarWidth}
                  onSearchRequested={() => {
                    setSidebarView('search')
                    setAppMode('editor')
                  }}
                  onCloseSearch={() => {
                    setSidebarView('files')
                    setAppMode('editor')
                  }}
                />
            </Sidebar>
          )}

          <Content
            ref={contentContainerRef}
            className="relative h-full flex flex-col obsidian-workspace"
          >
            <div className="flex-1 overflow-hidden h-full">
              {activeTab?.kind === 'terminal' ? (
                <TerminalTab
                  key={activeTab.id}
                  tab={activeTab as typeof activeTab & { kind: 'terminal' }}
                />
              ) : activeTab?.kind === 'kanban' ? (
                <KanbanBoard />
              ) : (
                (appMode === 'editor' ? <MarkdownEditor /> : <CanvasEditor />)
              )}
            </div>
            {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
            <KanbanReminderHost />
            <UpdateManager />
          </Content>
        </div>
      </RootLayout>
    </ErrorBoundary>
  )
}

export default App
