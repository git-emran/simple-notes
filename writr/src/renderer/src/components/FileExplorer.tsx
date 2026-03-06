import { FileNode } from '@shared/models'
import {
  activeTabPathAtom,
  createDirectoryAtom,
  createNoteAtom,
  deleteNodeAtom,
  fileTreeAtom,
  fileTreeIndexAtom,
  fileTreeUiByRootAtom,
  movePathAtom,
  notesRootDirAtom,
  noteStatusByPathAtom,
  noteTagByPathAtom,
  openTabAtom,
  reindexTodoStatsAtom,
  selectedNodeAtom
} from '@renderer/store'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { ComponentProps, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { twMerge } from 'tailwind-merge'
import { FileTreeItem } from './FileTreeItem'
import { VscNewFile, VscNewFolder, VscCollapseAll, VscExpandAll } from 'react-icons/vsc'
import { ContextMenu, ContextMenuItem } from './ContextMenu'

/* Compact row height (Obsidian-like density). Must match FileTreeItem styling. */
/* Heights are per-row to keep dense UI without sacrificing metadata readability. */
const FILE_TREE_FOLDER_ROW_HEIGHT = 26
/* Two-line layout (meta + title). Needs a little extra headroom for tag pills on some fonts. */
const FILE_TREE_FILE_ROW_HEIGHT = 44
const FILE_TREE_FILE_ROW_HEIGHT_WITH_PROGRESS = 54
const WINDOWED_THRESHOLD = 200

export const FileExplorer = ({ className, ...props }: ComponentProps<'aside'>) => {
  const fileTree = useAtomValue(fileTreeAtom)
  const fileTreeIndex = useAtomValue(fileTreeIndexAtom)
  const notesRootDir = useAtomValue(notesRootDirAtom)
  const activeTabPath = useAtomValue(activeTabPathAtom)
  const [selectedNode, setSelectedNode] = useAtom(selectedNodeAtom)
  const [fileTreeUiByRoot, setFileTreeUiByRoot] = useAtom(fileTreeUiByRootAtom)
  const noteStatuses = useAtomValue(noteStatusByPathAtom)
  const noteTags = useAtomValue(noteTagByPathAtom)
  const createNote = useSetAtom(createNoteAtom)
  const createDirectory = useSetAtom(createDirectoryAtom)
  const deleteNode = useSetAtom(deleteNodeAtom)
  const movePath = useSetAtom(movePathAtom)
  const openTab = useSetAtom(openTabAtom)
  const reindexTodoStats = useSetAtom(reindexTodoStatsAtom)

  const rootKey = notesRootDir ?? '__no_root__'
  const expandedNodeList = useMemo(() => fileTreeUiByRoot[rootKey]?.expanded ?? [], [fileTreeUiByRoot, rootKey])
  const persistedScrollTop = useMemo(() => fileTreeUiByRoot[rootKey]?.scrollTop ?? 0, [fileTreeUiByRoot, rootKey])
  const expandedNodes = useMemo(() => new Set(expandedNodeList), [expandedNodeList])
  const setExpandedNodes = useCallback(
    (updater: (prev: Set<string>) => Set<string>) => {
      setFileTreeUiByRoot((prev) => {
        const current = prev[rootKey] ?? { expanded: [], scrollTop: 0 }
        const nextSet = updater(new Set(current.expanded))
        return {
          ...prev,
          [rootKey]: {
            ...current,
            expanded: Array.from(nextSet).sort()
          }
        }
      })
    },
    [rootKey, setFileTreeUiByRoot]
  )
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FileNode } | null>(null)
  const [renamingPath, setRenamingPath] = useState<string | null>(null)
  const [isDraggingOverRoot, setIsDraggingOverRoot] = useState(false)
  const [showScrollbar, setShowScrollbar] = useState(false)
  const scrollbarTimerRef = useRef<number | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const scrollTopRef = useRef(0)
  const [viewportHeight, setViewportHeight] = useState(1)
  const rafScrollRef = useRef<number | null>(null)
  const rafResizeRef = useRef<number | null>(null)

  useEffect(() => {
    scrollTopRef.current = scrollTop
  }, [scrollTop])

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return

    const target = persistedScrollTop
    const raf = window.requestAnimationFrame(() => {
      el.scrollTop = target
      setScrollTop(el.scrollTop)
    })
    return () => window.cancelAnimationFrame(raf)
  }, [persistedScrollTop, rootKey])

  useEffect(() => {
    return () => {
      setFileTreeUiByRoot((prev) => {
        const current = prev[rootKey] ?? { expanded: [], scrollTop: 0 }
        if (current.scrollTop === scrollTopRef.current) return prev
        return {
          ...prev,
          [rootKey]: { ...current, scrollTop: scrollTopRef.current }
        }
      })
    }
  }, [rootKey, setFileTreeUiByRoot])

  const allFolderPaths = useMemo(() => {
    const paths: string[] = []
    const stack: FileNode[] = [...(fileTree ?? [])]
    while (stack.length) {
      const node = stack.pop()!
      if (node.type !== 'folder') continue
      paths.push(node.path)
      if (node.children?.length) stack.push(...node.children)
    }
    return paths
  }, [fileTree])

  const hasAnyExpanded = expandedNodes.size > 0

  const lastTodoIndexRootRef = useRef<string | null>(null)
  useEffect(() => {
    if (!notesRootDir) return
    if (lastTodoIndexRootRef.current === notesRootDir) return
    lastTodoIndexRootRef.current = notesRootDir
    void reindexTodoStats()
  }, [notesRootDir, reindexTodoStats])

  const getAllParentPaths = useCallback((path: string) => {
    const parents: string[] = []
    let current = path
    while (true) {
      const lastSlash = current.lastIndexOf('/')
      const lastBackslash = current.lastIndexOf('\\')
      const idx = Math.max(lastSlash, lastBackslash)
      if (idx === -1) break
      current = current.substring(0, idx)
      if (current) parents.push(current)
      else break
    }
    return parents
  }, [])

  useEffect(() => {
    if (!activeTabPath) return

    const treeMatch = fileTreeIndex.get(activeTabPath) ?? null
    if (treeMatch && treeMatch.path) {
      setSelectedNode((prev) => (prev?.path === treeMatch.path ? prev : treeMatch))
      
      /* Auto-reveal: expand all parents of the active note */
      const parents = getAllParentPaths(activeTabPath)
      if (parents.length > 0) {
        setExpandedNodes((prev) => {
          const next = new Set(prev)
          let changed = false
          for (const p of parents) {
            if (!next.has(p)) {
              next.add(p)
              changed = true
            }
          }
          return changed ? next : prev
        })
      }
      return
    }

    setSelectedNode((prev) => {
      if (prev?.path === activeTabPath) return prev
      const name = activeTabPath.substring(Math.max(activeTabPath.lastIndexOf('/'), activeTabPath.lastIndexOf('\\')) + 1)
      return {
        id: activeTabPath,
        name,
        path: activeTabPath,
        type: 'file',
        isExpanded: false
      }
    })
  }, [activeTabPath, fileTreeIndex, setSelectedNode, getAllParentPaths, setExpandedNodes])

  useEffect(() => {
    return () => {
      if (scrollbarTimerRef.current) {
        window.clearTimeout(scrollbarTimerRef.current)
      }
      if (rafScrollRef.current) {
        window.cancelAnimationFrame(rafScrollRef.current)
      }
      if (rafResizeRef.current) {
        window.cancelAnimationFrame(rafResizeRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return

    const ro = new ResizeObserver(() => {
      if (rafResizeRef.current) return
      rafResizeRef.current = window.requestAnimationFrame(() => {
        rafResizeRef.current = null
        setViewportHeight(el.clientHeight || 1)
      })
    })
    ro.observe(el)
    setViewportHeight(el.clientHeight || 1)

    return () => ro.disconnect()
  }, [])

  const getParentDir = useCallback((fullPath: string) => {
    const lastSlash = fullPath.lastIndexOf('/')
    const lastBackslash = fullPath.lastIndexOf('\\')
    const maxIndex = Math.max(lastSlash, lastBackslash)
    if (maxIndex === -1) return ''
    return fullPath.substring(0, maxIndex)
  }, [])

  const getCreationParent = useCallback(() => {
    if (!selectedNode) return '' // root
    if (selectedNode.type === 'folder') return selectedNode.path
    return getParentDir(selectedNode.path)
  }, [getParentDir, selectedNode])

  const handleNodeSelect = useCallback(
    (node: FileNode) => {
      setSelectedNode(node)
      if (node.type === 'file') {
        openTab(node)
      }
    },
    [openTab, setSelectedNode]
  )

  const handleToggleExpand = useCallback((path: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [setExpandedNodes])

  const handleCreateFile = useCallback((parentPath?: string) => {
    const parent = parentPath ?? getCreationParent()
    createNote(parent)
    if (parent) {
      setExpandedNodes((prev) => {
        if (prev.has(parent)) return prev
        const next = new Set(prev)
        next.add(parent)
        return next
      })
    }
    setContextMenu(null)
  }, [createNote, getCreationParent, setExpandedNodes])

  const handleCreateFolder = useCallback((parentPath?: string) => {
    const parent = parentPath ?? getCreationParent()
    createDirectory(parent)
    if (parent) {
      setExpandedNodes((prev) => {
        if (prev.has(parent)) return prev
        const next = new Set(prev)
        next.add(parent)
        return next
      })
    }
    setContextMenu(null)
  }, [createDirectory, getCreationParent, setExpandedNodes])

  const handleCollapseAll = useCallback(() => {
    setExpandedNodes(() => new Set())
  }, [setExpandedNodes])

  const handleExpandAll = useCallback(() => {
    setExpandedNodes(() => new Set(allFolderPaths))
  }, [allFolderPaths, setExpandedNodes])

  const handleDelete = useCallback(
    (path: string) => {
      void deleteNode(path)
    },
    [deleteNode]
  )

  const handleDropNode = useCallback(
    (src: string, dest: string) => {
      void movePath({ src, dest })
    },
    [movePath]
  )

  const handleNodeContextMenu = useCallback((node: FileNode, e: MouseEvent) => {
    setContextMenu({ x: e.clientX, y: e.clientY, node })
  }, [])

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return

    setShowScrollbar(true)
    if (scrollbarTimerRef.current) window.clearTimeout(scrollbarTimerRef.current)
    scrollbarTimerRef.current = window.setTimeout(() => setShowScrollbar(false), 1200)

    if (rafScrollRef.current) return
    rafScrollRef.current = window.requestAnimationFrame(() => {
      rafScrollRef.current = null
      setScrollTop(el.scrollTop)
    })
  }, [])

  const visibleNodes = useMemo(() => {
    type Row = {
      node: FileNode
      depth: number
      isExpanded: boolean
      noteStatus?: string
      noteTag?: string
      rowHeight: number
    }

    const rows: Row[] = []
    const roots = fileTree ?? []
    const stack: Array<{ nodes: FileNode[]; index: number; depth: number }> = [{ nodes: roots, index: 0, depth: 0 }]

    while (stack.length) {
      const frame = stack[stack.length - 1]
      if (frame.index >= frame.nodes.length) {
        stack.pop()
        continue
      }

      const node = frame.nodes[frame.index++]
      const isExpanded = node.type === 'folder' && expandedNodes.has(node.path)
      const noteStatus = node.type === 'file' ? noteStatuses[node.path] : undefined
      const noteTag = node.type === 'file' ? noteTags[node.path] : undefined
      const todoTotal = node.todoTotal ?? 0
      const hasMeta =
        node.type === 'file' && (!!node.lastEditTime || !!noteStatus || !!noteTag)
      const baseRowHeight =
        node.type === 'folder'
          ? FILE_TREE_FOLDER_ROW_HEIGHT
          : todoTotal > 0
            ? FILE_TREE_FILE_ROW_HEIGHT_WITH_PROGRESS
            : hasMeta
              ? FILE_TREE_FILE_ROW_HEIGHT
              : FILE_TREE_FOLDER_ROW_HEIGHT
      const rowHeight = baseRowHeight

      rows.push({ node, depth: frame.depth, isExpanded, noteStatus, noteTag, rowHeight })

      if (node.type === 'folder' && isExpanded && node.children?.length) {
        stack.push({ nodes: node.children, index: 0, depth: frame.depth + 1 })
      }
    }

    return rows
  }, [expandedNodes, fileTree, noteStatuses, noteTags])

  /* Virtualization: windowed rendering for large vaults */
  const overscan = 8
  const totalRows = visibleNodes.length
  const shouldWindow = totalRows > WINDOWED_THRESHOLD

  const windowingMetrics = useMemo(() => {
    if (!shouldWindow) return null
    const prefix: number[] = new Array(visibleNodes.length + 1)
    prefix[0] = 0
    for (let i = 0; i < visibleNodes.length; i += 1) {
      prefix[i + 1] = prefix[i] + visibleNodes[i].rowHeight
    }
    const totalHeight = prefix[prefix.length - 1]
    return { prefix, totalHeight }
  }, [shouldWindow, visibleNodes])

  const windowing = useMemo(() => {
    if (!shouldWindow || !windowingMetrics) {
      return {
        startIndex: 0,
        endIndex: totalRows,
        beforeHeight: 0,
        afterHeight: 0,
        windowedRows: visibleNodes
      }
    }

    const { prefix, totalHeight } = windowingMetrics

    const lowerBound = (value: number) => {
      let lo = 0
      let hi = prefix.length - 1
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (prefix[mid] < value) lo = mid + 1
        else hi = mid
      }
      return Math.max(0, lo - 1)
    }

    const start = Math.max(0, lowerBound(scrollTop) - overscan)
    const end = Math.min(totalRows, lowerBound(scrollTop + viewportHeight) + overscan + 1)
    const before = prefix[start]
    const after = Math.max(0, totalHeight - prefix[end])

    return {
      startIndex: start,
      endIndex: end,
      beforeHeight: before,
      afterHeight: after,
      windowedRows: visibleNodes.slice(start, end)
    }
  }, [overscan, scrollTop, shouldWindow, totalRows, viewportHeight, visibleNodes, windowingMetrics])

  return (
    <aside
      className={twMerge(
        'flex flex-col h-full border-r border-[var(--obsidian-border)] bg-[var(--obsidian-sidebar)]',
        className
      )}
      style={{ fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
      {...props}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--obsidian-border-soft)]">
        <span className="min-w-0 truncate text-[10px] font-semibold tracking-[0.12em] text-[var(--obsidian-text-muted)]">
          FILES
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => handleCreateFile()}
            className="p-1.5 rounded text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)] transition-colors"
            title="New File"
          >
            <VscNewFile className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleCreateFolder()}
            className="p-1.5 rounded text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)] transition-colors"
            title="New Folder"
          >
            <VscNewFolder className="w-4 h-4" />
          </button>

          {hasAnyExpanded ? (
            <button
              onClick={handleCollapseAll}
              className="p-1.5 rounded text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)] transition-colors"
              title="Collapse All"
            >
              <VscCollapseAll className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleExpandAll}
              className="p-1.5 rounded text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)] transition-colors"
              title="Expand All"
            >
              <VscExpandAll className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className={twMerge(
          'flex-1 overflow-auto py-1 transition-colors filetree-scroll',
          !showScrollbar && 'scrollbar-fade-out',
          isDraggingOverRoot && 'bg-[var(--obsidian-accent-dim)]'
        )}
        onScroll={handleScroll}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setSelectedNode(null)
          }
        }}
        onContextMenu={(e) => {
          if (e.target === e.currentTarget) {
            setContextMenu(null)
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          e.dataTransfer.dropEffect = 'move'
          setIsDraggingOverRoot(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          e.stopPropagation()
          /* Only unhighlight if leaving the container, not entering a child */
          if (e.currentTarget.contains(e.relatedTarget as Node)) return
          setIsDraggingOverRoot(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsDraggingOverRoot(false)

          const src = e.dataTransfer.getData('text/plain')
          if (!src) return
          if (!notesRootDir) return

          const separator = notesRootDir.includes('\\') ? '\\' : '/'
          const fileName = src.substring(Math.max(src.lastIndexOf('/'), src.lastIndexOf('\\')) + 1)
          const dest = `${notesRootDir}${separator}${fileName}`

          if (dest !== src) {
            void movePath({ src, dest })
          }
        }}
      >
        {windowing.windowedRows.length > 0 ? (
          <ul>
            {shouldWindow && windowing.beforeHeight > 0 && (
              <li aria-hidden style={{ height: windowing.beforeHeight, pointerEvents: 'none' }} />
            )}
            {windowing.windowedRows.map(({ node, depth, isExpanded, noteStatus, noteTag, rowHeight }) => (
              <FileTreeItem
                key={node.path}
                node={node}
                depth={depth}
                isExpanded={isExpanded}
                renderChildren={false}
                rowHeight={rowHeight}
                noteStatus={noteStatus}
                noteTag={noteTag}
                onNodeSelect={handleNodeSelect}
                selectedPath={selectedNode?.path ?? null}
                onToggleExpand={handleToggleExpand}
                onDelete={handleDelete}
                onDropNode={handleDropNode}
                onNodeContextMenu={handleNodeContextMenu}
                isRenaming={renamingPath === node.path}
                onRenameComplete={() => setRenamingPath(null)}
              />
            ))}
            {shouldWindow && windowing.afterHeight > 0 && (
              <li aria-hidden style={{ height: windowing.afterHeight, pointerEvents: 'none' }} />
            )}
          </ul>
        ) : (
          <div className="px-4 mt-4 text-center text-xs text-[var(--obsidian-text-muted)]">
            No files found.<br />
            Create a file to start.
          </div>
        )}
      </div>
      
       {/* Context Actions (Delete - temporary place as standard toolbar) */}
       {/* Context Menu */}
      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)}>
          <ContextMenuItem
            onClick={() => {
              setRenamingPath(contextMenu.node.path)
              setContextMenu(null)
            }}
          >
            Rename
          </ContextMenuItem>
          {contextMenu.node.type === 'folder' && (
            <>
              <ContextMenuItem
                onClick={() => handleCreateFile(contextMenu.node.path)}
              >
                New File
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => handleCreateFolder(contextMenu.node.path)}
              >
                New Folder
              </ContextMenuItem>
            </>
          )}
          <ContextMenuItem
            onClick={() => {
              void deleteNode(contextMenu.node.path)
              setContextMenu(null)
            }}
          >
            Delete
          </ContextMenuItem>
        </ContextMenu>
      )}
    </aside>
  )
}
