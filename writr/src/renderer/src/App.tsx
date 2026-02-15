import {
  Content,
  RootLayout,
  Sidebar,
  DraggableTopBar
} from './components'
import { FileExplorer } from './components/FileExplorer'
import { MarkdownEditor } from './components/markdown-editor/MarkdownEditor'
import { useRef, useState, useEffect } from 'react'

const App = () => {
  const contentContainerRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(200) // default width
  const isDragging = useRef(false)

  const resetScroll = () => {
    contentContainerRef.current?.scrollTo(0, 0)
  }

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

    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

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
          className="relative border-l bg-zinc-300/20 border-l-black/20 dark:border-l-white/20"
        >
          <MarkdownEditor />
        </Content>
      </RootLayout>
    </>
  )
}

export default App

