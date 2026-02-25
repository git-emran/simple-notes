import {
  Content,
  RootLayout,
  Sidebar,
  DraggableTopBar,
  EditorTabs
} from './components'
import { FileExplorer } from './components/FileExplorer'
import { SidebarSearch } from './components/SidebarSearch'
import { MarkdownEditor } from './components/markdown-editor/MarkdownEditor'
import { useRef, useState, useEffect } from 'react'
import { useSetAtom } from 'jotai'
import { switchTabByIndexAtom } from '@renderer/store'
import {
  VscFiles,
  VscSearch,
  VscChevronLeft,
  VscChevronRight,
  VscColorMode
} from 'react-icons/vsc'

const App = () => {
  const minSidebarWidth = 170
  const contentContainerRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [sidebarView, setSidebarView] = useState<'files' | 'search'>('files')
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [sidebarWidth, setSidebarWidth] = useState(220) // default width
  const isDragging = useRef(false)

  const switchTabByIndex = useSetAtom(switchTabByIndexAtom)

  const applyTheme = (mode: 'light' | 'dark') => {
    document.documentElement.classList.toggle('dark', mode === 'dark')
    document.documentElement.classList.toggle('light', mode === 'light')
    localStorage.setItem('writr-theme', mode)
    setTheme(mode)
  }

  useEffect(() => {
    const storedTheme = localStorage.getItem('writr-theme') as 'light' | 'dark' | null
    const preferredDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    applyTheme(storedTheme ?? (preferredDark ? 'dark' : 'light'))
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
    <>
      <DraggableTopBar />

      <RootLayout className="obsidian-shell">
        <aside className="obsidian-ribbon mt-8">
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
            }}
          >
            <VscSearch />
          </button>
          <button
            className="obsidian-ribbon-btn mt-auto"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={() => applyTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <VscColorMode />
          </button>
        </aside>

        {!collapsed && (
          <Sidebar
            width={sidebarWidth}
            minWidth={minSidebarWidth}
            onClose={() => setCollapsed(true)}
            className="mt-8"
          >
            {sidebarView === 'files' ? <FileExplorer /> : <SidebarSearch />}
          </Sidebar>
        )}

        <Content
          ref={contentContainerRef}
          className="relative h-full flex flex-col obsidian-workspace mt-8"
        >
          <EditorTabs />
          <div className="flex-1 overflow-hidden">
            <MarkdownEditor />
          </div>
        </Content>
      </RootLayout>
    </>
  )
}

export default App
