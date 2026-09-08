import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'

type ExcalidrawOnChange = NonNullable<React.ComponentProps<typeof Excalidraw>['onChange']>
type ExcalidrawOnChangeParams = Parameters<ExcalidrawOnChange>
import { useAtomValue, useSetAtom } from 'jotai'
import { noteByPathAtomFamily, saveCanvasAtom, movePathAtom } from '../../store'
import { VscTypeHierarchy, VscFilePdf } from 'react-icons/vsc'

/**
 * Parse canvas content string into Excalidraw-compatible data.
 * Returns null if content looks like it hasn't loaded yet (empty string
 * from the async atom's unwrap default).
 */
function parseCanvasContent(content: string) {
  if (!content) return null
  try {
    const parsed = JSON.parse(content)
    /* If old React Flow format (nodes/edges), return fresh empty canvas */
    if (parsed.nodes || parsed.edges) {
      return { elements: [] as const, appState: { theme: 'dark' as const }, files: {} }
    }
    return {
      elements: parsed.elements || [],
      appState: { ...(parsed.appState || {}), theme: 'dark' as const },
      files: parsed.files || {}
    }
  } catch {
    /* Genuinely malformed content — treat as a loaded but empty canvas */
    return { elements: [] as const, appState: { theme: 'dark' as const }, files: {} }
  }
}

export const CanvasEditor = ({
  path,
  tabId: _tabId,
  isActive: _isActive
}: {
  path: string | null
  tabId: string
  isActive: boolean
}) => {
  const selectedNote = useAtomValue(noteByPathAtomFamily(path))
  const saveCanvas = useSetAtom(saveCanvasAtom)
  const movePath = useSetAtom(movePathAtom)
  const rootRef = useRef<HTMLDivElement>(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const canvasTitle = selectedNote?.title || 'Canvas'
  const isCanvasFile = !!selectedNote?.path && selectedNote.path.endsWith('.canvas')
  const canvasPath = selectedNote?.path ?? ''
  const canvasContent = selectedNote?.content ?? ''

  /* ── Determine if the atom has actually resolved ──────────────── */
  const parsedData = useMemo(() => parseCanvasContent(canvasContent), [canvasContent])
  const hasLoaded = parsedData !== null

  /*
   * `readyRef` guards onChange from saving before the Excalidraw instance
   * has been hydrated with file content. It is flipped to true only AFTER
   * the first Excalidraw onChange fires following initialData hydration,
   * which means we safely skip the very first (empty) onChange that
   * Excalidraw emits on mount.
   */
  const readyRef = useRef(false)
  const mountCountRef = useRef(0)

  /* Reset readiness when the canvas path or parsed data changes, which
     also causes a new Excalidraw key and therefore a fresh mount. */
  useEffect(() => {
    readyRef.current = false
  }, [canvasPath, hasLoaded])

  /* Debounced auto-save canvas edits */
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = useCallback(
    (elements: ExcalidrawOnChangeParams[0], appState: ExcalidrawOnChangeParams[1], files: ExcalidrawOnChangeParams[2]) => {
      if (!isCanvasFile || !selectedNote?.path) return

      /*
       * Excalidraw fires onChange once right after mounting with
       * initialData.  We skip that first call by checking readyRef,
       * then enable saving for all subsequent calls.
       */
      if (!readyRef.current) {
        readyRef.current = true
        return
      }

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(() => {
        const contentToSave = JSON.stringify(
          {
            elements,
            appState: {
              viewBackgroundColor: appState.viewBackgroundColor,
              gridSize: appState.gridSize,
              theme: appState.theme
            },
            files
          },
          null,
          2
        )

        saveCanvas({ path: selectedNote.path, jsonContent: contentToSave })
      }, 500)
    },
    [isCanvasFile, selectedNote?.path, saveCanvas]
  )

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  const exportAsPdf = async () => {
    const currentPath = selectedNote?.path
    if (!currentPath) return

    const canvasEl = rootRef.current?.querySelector('.excalidraw') as HTMLElement | null
    if (!canvasEl) return

    document.documentElement.classList.add('canvas-exporting')
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    })

    try {
      const rect = canvasEl.getBoundingClientRect()
      await window.context.exportCanvasToPdf(currentPath, canvasTitle, {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      })
    } finally {
      document.documentElement.classList.remove('canvas-exporting')
    }
  }

  const handleRename = () => {
    setIsRenaming(false)
    if (editTitle.trim() && editTitle !== canvasTitle && selectedNote?.path) {
      const currentPath = selectedNote.path
      const currentName = currentPath.substring(
        Math.max(currentPath.lastIndexOf('/'), currentPath.lastIndexOf('\\')) + 1
      )
      const ext = currentName.includes('.') ? currentName.substring(currentName.lastIndexOf('.')) : ''
      const newFileName = editTitle.trim().endsWith(ext)
        ? editTitle.trim()
        : `${editTitle.trim()}${ext}`

      const parentPath = currentPath.substring(
        0,
        Math.max(currentPath.lastIndexOf('/'), currentPath.lastIndexOf('\\'))
      )
      const separator = currentPath.includes('\\') ? '\\' : '/'
      const newPath = parentPath ? `${parentPath}${separator}${newFileName}` : newFileName

      if (newPath !== currentPath) {
        void movePath({ src: currentPath, dest: newPath })
      }
    }
  }

  useEffect(() => {
    if (isRenaming) {
      setEditTitle(canvasTitle)
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 0)
    }
  }, [isRenaming, canvasTitle])

  if (!isCanvasFile) {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--obsidian-workspace)]">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-[var(--obsidian-text)]">No canvas selected</h2>
          <p className="mt-2 text-sm text-[var(--obsidian-text-muted)]">
            Create or select a <span className="font-mono">.canvas</span> file to start.
          </p>
        </div>
      </div>
    )
  }

  /* ── Wait for atom to resolve before rendering Excalidraw ──── */
  if (!hasLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--obsidian-workspace)]">
        <div className="text-sm text-[var(--obsidian-text-muted)]">Loading Canvas...</div>
      </div>
    )
  }

  /*
   * Use a key that changes whenever the canvas path or content identity
   * changes, so Excalidraw re-mounts cleanly with fresh initialData
   * instead of keeping stale internal state.
   */
  const excalidrawKey = `${canvasPath}-${mountCountRef.current}`

  return (
    <div ref={rootRef} className="w-full h-full bg-[var(--obsidian-workspace)] relative overflow-hidden">
      <Excalidraw
        key={excalidrawKey}
        theme="dark"
        initialData={{
          elements: parsedData.elements,
          appState: parsedData.appState,
          files: parsedData.files
        }}
        onChange={handleChange}
        UIOptions={{
          canvasActions: {
            toggleTheme: true,
            export: {
              saveFileToDisk: true
            }
          }
        }}
      />

      {/* Floating Header */}
      <div className="absolute top-4 left-16 z-20 pointer-events-none">
        <div className="bg-[var(--obsidian-pane)]/90 backdrop-blur-md px-4 py-2 rounded-full border border-obsidian-border shadow-lg flex items-center gap-2 pointer-events-auto">
          <VscTypeHierarchy className="w-4 h-4 text-[var(--obsidian-accent)]" />
          {isRenaming ? (
            <input
              ref={inputRef}
              type="text"
              className="text-xs font-bold tracking-wider text-[var(--obsidian-text)] bg-transparent border-none outline-none uppercase w-48"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') setIsRenaming(false)
              }}
            />
          ) : (
            <span
              className="text-xs font-bold tracking-wider text-[var(--obsidian-text)] uppercase cursor-text"
              onDoubleClick={() => setIsRenaming(true)}
            >
              {canvasTitle}
            </span>
          )}

          <button
            onClick={exportAsPdf}
            className="p-1 hover:bg-[var(--obsidian-hover)] rounded text-red-500 transition-all active:scale-95 ml-2"
            title="Export as PDF"
          >
            <VscFilePdf className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
