import { FileNode } from '@shared/models'
import {
  fileTreeAtom,
  fileTreeIndexAtom,
  openTabAtom,
  selectedNodeAtom,
  noteTagByPathAtom,
  createNoteAtom,
  createDirectoryAtom,
  noteStatusByPathAtom,
  deleteNodeAtom,
  openInNewTabAtom,
  movePathAtom,
  notesRootDirAtom,
  showFolderIconsAtom
} from '@renderer/store'
import { NOTE_STATUS_META } from '@renderer/constants/noteStatus'
import { useAtomValue, useSetAtom } from 'jotai'
import { useState, useMemo, useCallback, useRef, useEffect, MouseEvent, DragEvent } from 'react'
import { LiaBookSolid } from 'react-icons/lia'
import { twMerge } from 'tailwind-merge'
import {
  VscSearch,
  VscAdd,
  VscChevronDown,
  VscChevronRight,
  VscEdit,
  VscGoToFile,
  VscNewFile,
  VscNewFolder,
  VscTrash
} from 'react-icons/vsc'
import { SidebarSearch } from './SidebarSearch'
import { ContextMenu, ContextMenuItem } from './ContextMenu'
import {
  MAX_FOLDER_PANEL_WIDTH,
  MIN_FOLDER_PANEL_WIDTH,
  MIN_NOTES_PANEL_WIDTH,
  MIN_SIDEBAR_WIDTH,
  SIDEBAR_PANEL_DIVIDER_WIDTH
} from '@renderer/constants/sidebarLayout'
import {
  buildMoveDestination,
  canMovePathToDirectory,
  getParentPath,
  joinPath
} from '@renderer/utils/fileTreeDrag'

/** Returns a human-friendly relative time string for a lastEditTime timestamp.
 *  - < 60s      → "5s ago"
 *  - < 60min    → "12min ago"
 *  - < 24hr     → "3hr ago"
 *  - < 30d      → "8d ago"
 *  - < 90d      → "2mo ago"
 *  - >= 90d     → "4 June 2026"
 */
const formatRelativeTime = (ts: number): string => {
  const now = Date.now()
  const diffMs = now - ts
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)
  const diffMo = Math.floor(diffDay / 30)

  if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`
  if (diffMin < 60) return `${diffMin}min ago`
  if (diffHr < 24) return `${diffHr}hr ago`
  if (diffDay < 30) return `${diffDay}d ago`
  if (diffMo < 3) return `${diffMo}mo ago`

  // Older than 3 months — absolute date e.g. "4 June 2026"
  const d = new Date(ts)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export const VirtualFilesList = ({
  sidebarView = 'files',
  sidebarWidth,
  setSidebarWidth,
  onSearchRequested,
  onCloseSearch
}: {
  sidebarView?: 'files' | 'search'
  sidebarWidth: number
  setSidebarWidth: (width: number | ((currentWidth: number) => number)) => void
  onSearchRequested?: () => void
  onCloseSearch?: () => void
}) => {
  const fileTree = useAtomValue(fileTreeAtom)
  const fileTreeIndex = useAtomValue(fileTreeIndexAtom)
  const notesRootDir = useAtomValue(notesRootDirAtom)
  const selectedNode = useAtomValue(selectedNodeAtom)
  const openTab = useSetAtom(openTabAtom)
  const openInNewTab = useSetAtom(openInNewTabAtom)
  const noteTags = useAtomValue(noteTagByPathAtom)
  const noteStatuses = useAtomValue(noteStatusByPathAtom)
  const showFolderIcons = useAtomValue(showFolderIconsAtom)

  const createNote = useSetAtom(createNoteAtom)
  const createDirectory = useSetAtom(createDirectoryAtom)
  const deleteNode = useSetAtom(deleteNodeAtom)
  const movePath = useSetAtom(movePathAtom)

  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    node: FileNode | null
  } | null>(null)
  const [renamingPath, setRenamingPath] = useState<string | null>(null)
  const [folderDropTarget, setFolderDropTarget] = useState<string | null>(null)
  const [isDraggingOverRoot, setIsDraggingOverRoot] = useState(false)

  const [folderWidth, setFolderWidth] = useState(160)
  const isDraggingDivider = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const previousBodyCursor = useRef('')
  const previousBodyUserSelect = useRef('')
  const dividerListenersRef = useRef<{
    onMove: (ev: globalThis.MouseEvent) => void
    onUp: () => void
  } | null>(null)

  const lockResizeInteraction = useCallback(() => {
    previousBodyCursor.current = document.body.style.cursor
    previousBodyUserSelect.current = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  const unlockResizeInteraction = useCallback(() => {
    document.body.style.cursor = previousBodyCursor.current
    document.body.style.userSelect = previousBodyUserSelect.current
  }, [])

  const cleanupDividerDrag = useCallback(() => {
    const listeners = dividerListenersRef.current
    if (listeners) {
      window.removeEventListener('mousemove', listeners.onMove)
      window.removeEventListener('mouseup', listeners.onUp)
      dividerListenersRef.current = null
    }

    if (!isDraggingDivider.current) return

    isDraggingDivider.current = false
    unlockResizeInteraction()
  }, [unlockResizeInteraction])

  const getMaxFolderWidth = useCallback((containerWidth: number) => {
    return Math.max(
      MIN_FOLDER_PANEL_WIDTH,
      Math.min(
        MAX_FOLDER_PANEL_WIDTH,
        containerWidth - SIDEBAR_PANEL_DIVIDER_WIDTH - MIN_NOTES_PANEL_WIDTH
      )
    )
  }, [])

  const handleDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    cleanupDividerDrag()
    isDraggingDivider.current = true
    lockResizeInteraction()

    const onMove = (ev: globalThis.MouseEvent) => {
      if (!isDraggingDivider.current) return
      ev.preventDefault()
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const newWidth = ev.clientX - rect.left
      const nextFolderWidth = Math.min(
        MAX_FOLDER_PANEL_WIDTH,
        Math.max(MIN_FOLDER_PANEL_WIDTH, newWidth)
      )
      const requiredSidebarWidth =
        nextFolderWidth + SIDEBAR_PANEL_DIVIDER_WIDTH + MIN_NOTES_PANEL_WIDTH

      if (requiredSidebarWidth > rect.width) {
        setSidebarWidth((currentWidth) => Math.max(currentWidth, requiredSidebarWidth))
      }

      setFolderWidth(nextFolderWidth)
    }
    const onUp = () => cleanupDividerDrag()

    dividerListenersRef.current = { onMove, onUp }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  useEffect(() => {
    return cleanupDividerDrag
  }, [cleanupDividerDrag])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const clampFolderWidth = () => {
      const maxFolderWidth = getMaxFolderWidth(container.getBoundingClientRect().width)
      setFolderWidth((currentWidth) =>
        Math.min(maxFolderWidth, Math.max(MIN_FOLDER_PANEL_WIDTH, currentWidth))
      )
    }

    clampFolderWidth()
    const resizeObserver = new ResizeObserver(clampFolderWidth)
    resizeObserver.observe(container)

    return () => resizeObserver.disconnect()
  }, [getMaxFolderWidth, sidebarWidth])

  const toggleExpand = (path: string, e: MouseEvent) => {
    e.stopPropagation()
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const getFolders = useCallback(
    (
      nodes: FileNode[],
      depth = 0
    ): {
      node: FileNode
      depth: number
      isExpanded: boolean
      hasChildren: boolean
      noteCount: number
    }[] => {
      let result: {
        node: FileNode
        depth: number
        isExpanded: boolean
        hasChildren: boolean
        noteCount: number
      }[] = []
      for (const node of nodes) {
        if (node.type === 'folder') {
          const isExpanded = expandedFolders.has(node.path)
          const hasFolderChildren = !!node.children?.some((c) => c.type === 'folder')
          const noteCount = node.children?.filter((c) => c.type === 'file').length || 0
          result.push({ node, depth, isExpanded, hasChildren: hasFolderChildren, noteCount })
          if (isExpanded && node.children) {
            result = result.concat(getFolders(node.children, depth + 1))
          }
        }
      }
      return result
    },
    [expandedFolders]
  )

  const folders = useMemo(() => {
    return fileTree ? getFolders(fileTree) : []
  }, [fileTree, getFolders])

  const notes = useMemo(() => {
    if (!fileTree) return []
    let targetNodes = fileTree
    if (selectedFolder) {
      const folderNode = fileTreeIndex.get(selectedFolder)
      if (folderNode && folderNode.children) {
        targetNodes = folderNode.children
      } else {
        targetNodes = []
      }
    }
    return targetNodes.filter((n) => n.type === 'file')
  }, [fileTree, fileTreeIndex, selectedFolder])

  const handleCreateFolder = (parentPath = '') => {
    const parent = parentPath
    void createDirectory(parent).then((createdPath) => {
      if (parent) {
        setExpandedFolders((prev) => {
          const next = new Set(prev)
          next.add(parent)
          return next
        })
      }
      if (createdPath) {
        setRenamingPath(createdPath)
      }
    })
    setContextMenu(null)
  }

  const handleCreateNote = (parentPath?: string) => {
    const parent = parentPath ?? (selectedFolder || '')
    void createNote(parent).then((createdPath) => {
      if (parent) {
        setExpandedFolders((prev) => {
          const next = new Set(prev)
          next.add(parent)
          return next
        })
      }
      if (createdPath) {
        setRenamingPath(createdPath)
      }
    })
    setContextMenu(null)
  }

  const handleNodeContextMenu = (node: FileNode, e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, node })
  }

  const handleRootContextMenu = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    e.preventDefault()
    e.stopPropagation()
    setSelectedFolder(null)
    setContextMenu({ x: e.clientX, y: e.clientY, node: null })
  }

  const handleFolderPanelClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    setSelectedFolder(null)
    setContextMenu(null)
  }

  const getDraggedNode = (e: DragEvent) => {
    const src = e.dataTransfer.getData('text/plain')
    if (!src) return null
    const node = fileTreeIndex.get(src)
    return node ? { src, node } : null
  }

  const moveDraggedNodeToDirectory = (e: DragEvent, destinationDir: string) => {
    const dragged = getDraggedNode(e)
    if (!dragged) return
    const { src, node } = dragged
    if (!canMovePathToDirectory(src, destinationDir, node.type)) return
    void movePath({ src, dest: buildMoveDestination(src, destinationDir) })
  }

  const handleRenameSubmit = (node: FileNode, newName: string) => {
    setRenamingPath(null)
    if (newName.trim() === '') return
    const actualNewName =
      node.type === 'file' && !newName.endsWith('.md') ? `${newName}.md` : newName
    if (actualNewName === node.name) return
    const parentPath = getParentPath(node.path)
    const newPath = joinPath(parentPath, actualNewName)
    void movePath({ src: node.path, dest: newPath })
  }

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full overflow-hidden bg-transparent"
      style={{ minWidth: MIN_SIDEBAR_WIDTH }}
      onClick={() => setContextMenu(null)}
      onContextMenu={() => setContextMenu(null)}
    >
      {/* Notebooks Panel */}
      <div
        className="writr-folders-glass flex shrink-0 flex-col border-r border-[var(--obsidian-border)]"
        style={{ width: folderWidth, minWidth: MIN_FOLDER_PANEL_WIDTH }}
      >
        <div className="px-2 py-3 text-xs font-bold text-[var(--obsidian-text-muted)] uppercase tracking-wider border-b border-[var(--obsidian-border-soft)] flex items-center justify-between">
          <span>NOTEBOOKS</span>
          <button
            onClick={() => handleCreateFolder()}
            className="p-1 rounded-full hover:bg-[var(--obsidian-hover)] text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] transition-colors"
            title="Create Folder"
          >
            <VscAdd className="w-4 h-4" />
          </button>
        </div>
        <div
          className={twMerge(
            'flex-1 overflow-auto py-1 transition-colors',
            isDraggingOverRoot && 'bg-[var(--obsidian-accent-dim)]'
          )}
          onClick={handleFolderPanelClick}
          onContextMenu={handleRootContextMenu}
          onDragOver={(e) => {
            if (!notesRootDir) return
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            setIsDraggingOverRoot(true)
          }}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return
            setIsDraggingOverRoot(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsDraggingOverRoot(false)
            setFolderDropTarget(null)
            if (!notesRootDir) return
            moveDraggedNodeToDirectory(e, notesRootDir)
          }}
        >
          {folders.map(({ node, depth, isExpanded, hasChildren, noteCount }) => (
            <div
              key={node.path}
              className="mx-1"
              onContextMenu={(e) => handleNodeContextMenu(node, e)}
            >
              <div
                className={twMerge(
                  'flex items-center justify-between px-2 py-1.5 cursor-pointer text-[12px] transition-colors rounded-md',
                  selectedFolder === node.path
                    ? 'bg-[var(--obsidian-accent)] text-white shadow-sm'
                    : 'text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)]',
                  folderDropTarget === node.path &&
                    'ring-1 ring-[var(--obsidian-accent)] bg-[var(--obsidian-accent-dim)]',
                  depth > 0 && 'border-l border-[var(--obsidian-border-soft)] rounded-l-none'
                )}
                style={{ marginLeft: `${depth * 12}px` }}
                onClick={() => setSelectedFolder(node.path)}
                draggable={renamingPath !== node.path}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', node.path)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragOver={(e) => {
                  const dragged = getDraggedNode(e)
                  if (
                    !dragged ||
                    !canMovePathToDirectory(dragged.src, node.path, dragged.node.type)
                  )
                    return
                  e.preventDefault()
                  e.stopPropagation()
                  e.dataTransfer.dropEffect = 'move'
                  setFolderDropTarget(node.path)
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return
                  setFolderDropTarget((current) => (current === node.path ? null : current))
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setFolderDropTarget(null)
                  setIsDraggingOverRoot(false)
                  moveDraggedNodeToDirectory(e, node.path)
                  setExpandedFolders((prev) => {
                    if (prev.has(node.path)) return prev
                    const next = new Set(prev)
                    next.add(node.path)
                    return next
                  })
                }}
              >
                <div className="flex items-center min-w-0 flex-1">
                  <div
                    className="w-4 h-4 mr-1 flex items-center justify-center shrink-0 text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)]"
                    onClick={(e) => hasChildren && toggleExpand(node.path, e)}
                  >
                    {hasChildren ? (
                      isExpanded ? (
                        <VscChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <VscChevronRight className="w-3.5 h-3.5" />
                      )
                    ) : null}
                  </div>
                  {showFolderIcons && (
                    <LiaBookSolid
                      className={twMerge(
                        'mr-2 opacity-80 shrink-0',
                        depth > 0 ? 'w-3 h-3' : 'w-4 h-4'
                      )}
                    />
                  )}
                  <span className="truncate font-medium flex-1">
                    {renamingPath === node.path ? (
                      <input
                        autoFocus
                        className="w-full bg-[var(--obsidian-workspace)] text-[var(--obsidian-text)] px-1 outline-none border border-[var(--obsidian-accent)] rounded"
                        defaultValue={node.name}
                        onBlur={(e) => handleRenameSubmit(node, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameSubmit(node, e.currentTarget.value)
                          if (e.key === 'Escape') setRenamingPath(null)
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      node.name
                    )}
                  </span>
                </div>
                <span
                  className={twMerge(
                    'text-[10px] font-semibold ml-2 shrink-0',
                    selectedFolder === node.path
                      ? 'text-white/80'
                      : 'text-[var(--obsidian-text-muted)]'
                  )}
                >
                  {noteCount}
                </span>
              </div>
            </div>
          ))}
          {folders.length === 0 && (
            <div className="pointer-events-none px-4 mt-8 text-center text-xs text-[var(--obsidian-text-muted)]">
              Right-click here or use + to create a root folder.
            </div>
          )}
        </div>
      </div>

      {/* Drag divider */}
      <div
        className="w-1 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-[var(--obsidian-accent)]"
        onMouseDown={handleDividerMouseDown}
        title="Drag to resize"
      />

      {/* Notes List Panel */}
      <div
        className="flex flex-1 flex-col overflow-hidden border-r border-[var(--obsidian-border)] bg-[var(--obsidian-workspace)]"
        style={{ minWidth: MIN_NOTES_PANEL_WIDTH }}
      >
        {sidebarView === 'search' ? (
          <SidebarSearch onCloseRequested={onCloseSearch} className="h-full border-0" />
        ) : (
          <>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--obsidian-border-soft)]">
              <span className="font-semibold text-sm text-[var(--obsidian-text)]">NOTES</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleCreateNote()}
                  className="text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)] rounded-full transition-colors p-1"
                  title="Create Note"
                >
                  <VscAdd className="w-4 h-4" />
                </button>
                <button
                  onClick={onSearchRequested}
                  className="text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)] rounded-full transition-colors p-1"
                  title="Search files"
                >
                  <VscSearch className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {notes.length === 0 && (
                <div className="text-center mt-12 text-sm text-[var(--obsidian-text-muted)]">
                  No notes here
                </div>
              )}
              {notes.map((note) => {
                const isSelected = selectedNode?.path === note.path
                const tag = noteTags[note.path]
                const status = noteStatuses[note.path]
                const date = note.lastEditTime ? formatRelativeTime(note.lastEditTime) : ''
                return (
                  <div
                    key={note.path}
                    className={twMerge(
                      'p-3.5 cursor-pointer transition-colors border-b border-[var(--obsidian-border-soft)]',
                      isSelected
                        ? 'bg-[var(--obsidian-accent)] text-white'
                        : 'bg-transparent hover:bg-[var(--obsidian-hover)]'
                    )}
                    onClick={() => openTab(note)}
                    onContextMenu={(e) => handleNodeContextMenu(note, e)}
                    draggable={renamingPath !== note.path}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', note.path)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                  >
                    <div className="font-semibold text-xs truncate mb-2">
                      {renamingPath === note.path ? (
                        <input
                          autoFocus
                          className="w-full bg-[var(--obsidian-workspace)] text-[var(--obsidian-text)] px-1 outline-none border border-white/50 rounded"
                          defaultValue={note.name.replace(/\.md$/, '')}
                          onBlur={(e) => handleRenameSubmit(note, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameSubmit(note, e.currentTarget.value)
                            if (e.key === 'Escape') setRenamingPath(null)
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        note.name.replace(/\.md$/, '')
                      )}
                    </div>
                    <div
                      className={twMerge(
                        'flex items-center gap-1.5 min-w-0',
                        isSelected ? 'text-white/80' : 'text-[var(--obsidian-text-muted)]'
                      )}
                    >
                      {/* Date — truncates when panel narrows */}
                      <span
                        className={twMerge(
                          'truncate shrink min-w-0 flex-1 text-[9.5px]',
                          isSelected ? 'text-white/80' : 'dark:text-sky-300'
                        )}
                      >
                        {date}
                      </span>
                      {/* Tags & status — sticky on right, never truncate */}
                      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                        {status && (
                          <span
                            className={twMerge(
                              'px-1.5 py-[1px] rounded-full border text-[9px] font-semibold whitespace-nowrap',
                              isSelected
                                ? 'border-white/30'
                                : NOTE_STATUS_META[status]?.className || ''
                            )}
                          >
                            {NOTE_STATUS_META[status]?.label || status}
                          </span>
                        )}
                        {tag && (
                          <span
                            className={twMerge(
                              'px-2 py-0.5 rounded-full font-medium whitespace-nowrap truncate max-w-[80px]',
                              isSelected
                                ? 'bg-white/20'
                                : 'bg-[var(--obsidian-accent-dim)] text-[var(--obsidian-accent)]'
                            )}
                          >
                            {tag}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)}>
          {contextMenu.node && (
            <ContextMenuItem
              onClick={(e) => {
                e.stopPropagation()
                setRenamingPath(contextMenu.node!.path)
                setContextMenu(null)
              }}
            >
              <VscEdit className="h-4 w-4 text-[var(--obsidian-text-muted)]" />
              <span>Rename</span>
            </ContextMenuItem>
          )}
          {contextMenu.node?.type === 'file' && (
            <ContextMenuItem
              onClick={(e) => {
                e.stopPropagation()
                openInNewTab(contextMenu.node!)
                setContextMenu(null)
              }}
            >
              <VscGoToFile className="h-4 w-4 text-[var(--obsidian-text-muted)]" />
              <span>Open in New Tab</span>
            </ContextMenuItem>
          )}
          {contextMenu.node?.type === 'folder' && (
            <>
              <ContextMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  handleCreateNote(contextMenu.node!.path)
                }}
              >
                <VscNewFile className="h-4 w-4 text-[var(--obsidian-text-muted)]" />
                <span>New File</span>
              </ContextMenuItem>
              <ContextMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  handleCreateFolder(contextMenu.node!.path)
                }}
              >
                <VscNewFolder className="h-4 w-4 text-[var(--obsidian-text-muted)]" />
                <span>New Folder</span>
              </ContextMenuItem>
            </>
          )}
          {!contextMenu.node && (
            <ContextMenuItem
              onClick={(e) => {
                e.stopPropagation()
                handleCreateFolder()
              }}
            >
              <VscNewFolder className="h-4 w-4 text-[var(--obsidian-text-muted)]" />
              <span>New Note Book</span>
            </ContextMenuItem>
          )}
          {contextMenu.node && (
            <ContextMenuItem
              onClick={(e) => {
                e.stopPropagation()
                void deleteNode(contextMenu.node!.path)
                setContextMenu(null)
              }}
            >
              <VscTrash className="h-4 w-4 text-[var(--obsidian-text-muted)]" />
              <span>Delete</span>
            </ContextMenuItem>
          )}
        </ContextMenu>
      )}
    </div>
  )
}
