import {
  Content,
  RootLayout,
  Sidebar,
  DraggableTopBar,
  EditorTabs
} from './components'
import { FileExplorer } from './components/FileExplorer'
import { MarkdownEditor } from './components/markdown-editor/MarkdownEditor'
import { useRef, useState, useEffect } from 'react'
import { useSetAtom } from 'jotai'
import { switchTabByIndexAtom } from '@renderer/store'

const App = () => {
  const contentContainerRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(200) // default width
  const isDragging = useRef(false)

  const resetScroll = () => {
    contentContainerRef.current?.scrollTo(0, 0)
  }

  const switchTabByIndex = useSetAtom(switchTabByIndexAtom)

  // Drag to resize logic
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).id === 'resize-handle') {
        isDragging.current = true
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        setSidebarWidth(Math.max(120, e.clientX)) // min 120px
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

      <RootLayout>
        {!collapsed && (
          <Sidebar
            width={sidebarWidth}
            onClose={() => setCollapsed(true)}
            className="mt-10"
          >
            <FileExplorer />
          </Sidebar>
        )}

        {/* Content */}
        <Content
          ref={contentContainerRef}
          className="relative h-full bg-white dark:bg-[#1e1e1e] flex flex-col"
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

