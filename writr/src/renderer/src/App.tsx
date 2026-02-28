import {
  Content,
  RootLayout,
  Sidebar,
  EditorTabs,
  ErrorBoundary
} from './components'
import { FileExplorer } from './components/FileExplorer'
import { SidebarSearch } from './components/SidebarSearch'
import { MarkdownEditor } from './components/markdown-editor/MarkdownEditor'
import { CanvasEditor } from './components/canvas/CanvasEditor'
import { useRef, useState, useEffect } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { 
  createDailyNoteAtom, 
  switchTabByIndexAtom, 
  closeActiveTabAtom, 
  restoreClosedTabAtom,
  createCanvasAtom,
  selectedNodeAtom
} from '@renderer/store'
import {
  VscFiles,
  VscSearch,
  VscCalendar,
  VscChevronLeft,
  VscChevronRight,
  VscSymbolRuler
} from 'react-icons/vsc'

const App = () => {
  const minSidebarWidth = 170
  const contentContainerRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [sidebarView, setSidebarView] = useState<'files' | 'search'>('files')
  const [appMode, setAppMode] = useState<'editor' | 'canvas'>('editor')
  const [sidebarWidth, setSidebarWidth] = useState(220) // default width
  const isDragging = useRef(false)

  const switchTabByIndex = useSetAtom(switchTabByIndexAtom)
  const createDailyNote = useSetAtom(createDailyNoteAtom)
  const closeActiveTab = useSetAtom(closeActiveTabAtom)
  const restoreClosedTab = useSetAtom(restoreClosedTabAtom)
  const createCanvas = useSetAtom(createCanvasAtom)
  const selectedNode = useAtomValue(selectedNodeAtom)

  // Automatically switch mode based on selected file extension
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
      // Already on a canvas file, just ensure mode is correct
      setAppMode('canvas')
      return
    }

    // Attempt to create a new canvas file
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
    const applySystemTheme = () => applyTheme(mediaQuery.matches ? 'dark' : 'light')

    applySystemTheme()
    mediaQuery.addEventListener('change', applySystemTheme)

    return () => {
      mediaQuery.removeEventListener('change', applySystemTheme)
    }
  }, [])

  // Drag to resize logic
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).id === 'resize-handle') {
        isDragging.current = true
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        setSidebarWidth(Math.max(minSidebarWidth, e.clientX))
      }
    }

    const handleMouseUp = () => {
      isDragging.current = false
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd + W
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'w') {
        e.preventDefault()
        closeActiveTab()
      }
      
      // Cmd + Shift + T
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault()
        restoreClosedTab()
      }

      // Cmd + 1-9 (or Ctrl on Windows)
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
    }
  }, [switchTabByIndex])

  return (
    <ErrorBoundary>
      <RootLayout className="obsidian-shell flex-col">
        {/* Persistent Title Bar */}
        <div 
          className="h-9 flex shrink-0 bg-[var(--obsidian-pane)] border-b border-[var(--obsidian-border)] z-50"
          style={{ WebkitAppRegion: 'drag' } as any}
        >
          {/* Spacer for Ribbon + Sidebar */}
          <div 
            className="flex shrink-0 border-r border-[var(--obsidian-border)] items-center pl-[72px]" 
            style={{ width: 46 + (collapsed ? 0 : sidebarWidth) }}
          />
          {/* Tabs Area */}
          <div className="flex-1 overflow-hidden" style={{ WebkitAppRegion: 'no-drag' } as any}>
            <EditorTabs />
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <aside className="obsidian-ribbon">
            <button
              className="obsidian-ribbon-btn"
              onClick={() => setCollapsed((prev) => !prev)}
              title={collapsed ? 'Show files' : 'Hide files'}
            >
              {collapsed ? <VscChevronRight /> : <VscChevronLeft />}
            </button>
            <button
              className={`obsidian-ribbon-btn ${sidebarView === 'files' ? 'is-active' : ''}`}
              title="Files"
              onClick={() => {
                setSidebarView('files')
                setCollapsed(false)
                setAppMode('editor')
              }}
            >
              <VscFiles />
            </button>
            <button
              className={`obsidian-ribbon-btn ${sidebarView === 'search' ? 'is-active' : ''}`}
              title="Search"
              onClick={() => {
                setSidebarView('search')
                setCollapsed(false)
                setAppMode('editor')
              }}
            >
              <VscSearch />
            </button>
            <button
              className="obsidian-ribbon-btn"
              title="Daily note"
              onClick={() => {
                setCollapsed(false)
                setAppMode('editor')
                void createDailyNote()
              }}
            >
              <VscCalendar />
            </button>
            <button
              className={`obsidian-ribbon-btn ${appMode === 'canvas' ? 'is-active' : ''}`}
              title="Canvas"
              onClick={handleCanvasClick}
            >
              <VscSymbolRuler />
            </button>
          </aside>

          {!collapsed && (
            <Sidebar
              width={sidebarWidth}
              minWidth={minSidebarWidth}
              onClose={() => setCollapsed(true)}
            >
              {sidebarView === 'files' ? <FileExplorer /> : <SidebarSearch />}
            </Sidebar>
          )}

          <Content
            ref={contentContainerRef}
            className="relative h-full flex flex-col obsidian-workspace"
          >
            <div className="flex-1 overflow-hidden h-full">
              {appMode === 'editor' ? <MarkdownEditor /> : <CanvasEditor />}
            </div>
          </Content>
        </div>
      </RootLayout>
    </ErrorBoundary>
  )
}

export default App
