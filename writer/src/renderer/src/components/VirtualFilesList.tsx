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
  showFolderIconsAtom
} from '@renderer/store'
import { NOTE_STATUS_META } from '@renderer/constants/noteStatus'
import { useAtomValue, useSetAtom } from 'jotai'
import { useState, useMemo, useCallback, useRef, MouseEvent } from 'react'
import { twMerge } from 'tailwind-merge'
import { 
  VscFolder, VscSearch, VscAdd, VscChevronDown, VscChevronRight, 
  VscEdit, VscGoToFile, VscNewFile, VscNewFolder, VscTrash 
} from 'react-icons/vsc'
import { SidebarSearch } from './SidebarSearch'
import { ContextMenu, ContextMenuItem } from './ContextMenu'

// Helper to get parent path
const getParentPath = (fullPath: string) => {
  const lastSlash = fullPath.lastIndexOf('/')
  const lastBackslash = fullPath.lastIndexOf('\\')
  const idx = Math.max(lastSlash, lastBackslash)
  return idx === -1 ? '' : fullPath.substring(0, idx)
}

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
  const diffHr  = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr  / 24)
  const diffMo  = Math.floor(diffDay / 30)

  if (diffSec < 60)  return `${Math.max(1, diffSec)}s ago`
  if (diffMin < 60)  return `${diffMin}min ago`
  if (diffHr  < 24)  return `${diffHr}hr ago`
  if (diffDay < 30)  return `${diffDay}d ago`
  if (diffMo  < 3)   return `${diffMo}mo ago`

  // Older than 3 months — absolute date e.g. "4 June 2026"
  const d = new Date(ts)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

const joinPath = (parentPath: string, name: string) => {
  if (!parentPath) return name
  const separator = parentPath.includes('\\') ? '\\' : '/'
  return `${parentPath}${separator}${name}`
}

export const VirtualFilesList = ({ 
  sidebarView = 'files',
  onSearchRequested,
  onCloseSearch
}: { 
  sidebarView?: 'files' | 'search',
  onSearchRequested?: () => void,
  onCloseSearch?: () => void
}) => {
  const fileTree = useAtomValue(fileTreeAtom)
  const fileTreeIndex = useAtomValue(fileTreeIndexAtom)
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
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FileNode } | null>(null)
  const [renamingPath, setRenamingPath] = useState<string | null>(null)

  // Resizable panels
  const MIN_FOLDER_WIDTH = 120
  const MAX_FOLDER_WIDTH = 320
  const [folderWidth, setFolderWidth] = useState(160)
  const isDraggingDivider = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingDivider.current = true
    const onMove = (ev: globalThis.MouseEvent) => {
      if (!isDraggingDivider.current) return
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const newWidth = ev.clientX - rect.left
      setFolderWidth(Math.min(MAX_FOLDER_WIDTH, Math.max(MIN_FOLDER_WIDTH, newWidth)))
    }
    const onUp = () => {
      isDraggingDivider.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const toggleExpand = (path: string, e: MouseEvent) => {
    e.stopPropagation()
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const getFolders = useCallback((nodes: FileNode[], depth = 0): { node: FileNode; depth: number; isExpanded: boolean; hasChildren: boolean; noteCount: number }[] => {
    let result: { node: FileNode; depth: number; isExpanded: boolean; hasChildren: boolean; noteCount: number }[] = []
    for (const node of nodes) {
      if (node.type === 'folder') {
        const isExpanded = expandedFolders.has(node.path)
        const hasFolderChildren = !!node.children?.some(c => c.type === 'folder')
        const noteCount = node.children?.filter(c => c.type === 'file').length || 0
        result.push({ node, depth, isExpanded, hasChildren: hasFolderChildren, noteCount })
        if (isExpanded && node.children) {
          result = result.concat(getFolders(node.children, depth + 1))
        }
      }
    }
    return result
  }, [expandedFolders])

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
    return targetNodes.filter(n => n.type === 'file')
  }, [fileTree, fileTreeIndex, selectedFolder])

  const handleCreateFolder = (parentPath?: string) => {
    const parent = parentPath ?? (selectedFolder || '')
    void createDirectory(parent).then((createdPath) => {
      if (parent) {
        setExpandedFolders(prev => {
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
        setExpandedFolders(prev => {
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

  const handleRenameSubmit = (node: FileNode, newName: string) => {
    setRenamingPath(null)
    if (newName.trim() === '') return
    const actualNewName = node.type === 'file' && !newName.endsWith('.md') ? `${newName}.md` : newName
    if (actualNewName === node.name) return
    const parentPath = getParentPath(node.path)
    const newPath = joinPath(parentPath, actualNewName)
    void movePath({ src: node.path, dest: newPath })
  }

  return (
    <div 
      ref={containerRef}
      className="flex h-full w-full bg-[var(--obsidian-sidebar)] overflow-hidden"
      style={{ minWidth: MIN_FOLDER_WIDTH + 180 }}
      onClick={() => setContextMenu(null)}
      onContextMenu={() => setContextMenu(null)}
    >
      {/* Folders Panel */}
      <div
        className="flex flex-col border-r border-[var(--obsidian-border)] bg-[var(--obsidian-sidebar)] shrink-0"
        style={{ width: folderWidth, minWidth: MIN_FOLDER_WIDTH }}
      >
        <div className="px-2 py-3 text-xs font-bold text-[var(--obsidian-text-muted)] uppercase tracking-wider border-b border-[var(--obsidian-border-soft)] flex items-center justify-between">
          <span>Folders</span>
          <button 
            onClick={() => handleCreateFolder()}
            className="p-1 rounded-full hover:bg-[var(--obsidian-hover)] text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] transition-colors"
            title="Create Folder"
          >
            <VscAdd className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto py-1">
          {folders.map(({ node, depth, isExpanded, hasChildren, noteCount }) => (
            <div 
              key={node.path}
              className="mx-1"
              onContextMenu={(e) => handleNodeContextMenu(node, e)}
            >
              <div
                className={twMerge(
                  "flex items-center justify-between px-2 py-1.5 cursor-pointer text-[12px] transition-colors rounded-md",
                  selectedFolder === node.path ? "bg-[var(--obsidian-accent)] text-white shadow-sm" : "text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)]",
                  depth > 0 && "border-l border-[var(--obsidian-border-soft)] rounded-l-none"
                )}
                style={{ marginLeft: `${depth * 12}px` }}
                onClick={() => setSelectedFolder(node.path)}
              >
                <div className="flex items-center min-w-0 flex-1">
                  <div 
                    className="w-4 h-4 mr-1 flex items-center justify-center shrink-0 text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)]"
                    onClick={(e) => hasChildren && toggleExpand(node.path, e)}
                  >
                    {hasChildren ? (
                      isExpanded ? <VscChevronDown className="w-3.5 h-3.5" /> : <VscChevronRight className="w-3.5 h-3.5" />
                    ) : null}
                  </div>
                  {showFolderIcons && (
                    <VscFolder className={twMerge("mr-2 opacity-80 shrink-0", depth > 0 ? "w-3 h-3" : "w-4 h-4")} />
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
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      node.name
                    )}
                  </span>
                </div>
                <span className={twMerge(
                  "text-[10px] font-semibold ml-2 shrink-0",
                  selectedFolder === node.path ? "text-white/80" : "text-[var(--obsidian-text-muted)]"
                )}>
                  {noteCount}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Drag divider */}
      <div
        className="w-1 shrink-0 cursor-col-resize bg-transparent hover:bg-[var(--obsidian-accent)] transition-colors z-10"
        onMouseDown={handleDividerMouseDown}
        title="Drag to resize"
      />

      {/* Notes List Panel */}
      <div className="flex-1 min-w-[180px] flex flex-col bg-[var(--obsidian-workspace)] border-r border-[var(--obsidian-border)] overflow-hidden">
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
                <div className="text-center mt-12 text-sm text-[var(--obsidian-text-muted)]">No notes here</div>
              )}
              {notes.map(note => {
                const isSelected = selectedNode?.path === note.path
                const tag = noteTags[note.path]
                const status = noteStatuses[note.path]
                const date = note.lastEditTime ? formatRelativeTime(note.lastEditTime) : ''
                return (
                  <div 
                    key={note.path}
                    className={twMerge(
                      "p-3.5 cursor-pointer transition-colors border-b border-[var(--obsidian-border-soft)]",
                      isSelected 
                        ? "bg-[var(--obsidian-accent)] text-white" 
                        : "bg-transparent hover:bg-[var(--obsidian-hover)]"
                    )}
                    onClick={() => openTab(note)}
                    onContextMenu={(e) => handleNodeContextMenu(note, e)}
                  >
                    <div className="font-semibold text-sm truncate mb-2">
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
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        note.name.replace(/\.md$/, '')
                      )}
                    </div>
                    <div className={twMerge(
                      "text-[11px] flex items-center gap-1.5 min-w-0",
                      isSelected ? "text-white/80" : "text-[var(--obsidian-text-muted)]"
                    )}>
                      {/* Date — truncates when panel narrows */}
                      <span className="truncate shrink min-w-0 flex-1">{date}</span>
                      {/* Tags & status — sticky on right, never truncate */}
                      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                        {status && (
                          <span className={twMerge(
                            "px-1.5 py-[1px] rounded-full border text-[9px] font-semibold whitespace-nowrap",
                            isSelected ? "border-white/30" : NOTE_STATUS_META[status]?.className || ''
                          )}>
                            {NOTE_STATUS_META[status]?.label || status}
                          </span>
                        )}
                        {tag && (
                          <span className={twMerge(
                            "px-2 py-0.5 rounded-full font-medium whitespace-nowrap truncate max-w-[80px]",
                            isSelected ? "bg-white/20" : "bg-[var(--obsidian-accent-dim)] text-[var(--obsidian-accent)]"
                          )}>
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
          <ContextMenuItem
            onClick={(e) => {
              e.stopPropagation()
              setRenamingPath(contextMenu.node.path)
              setContextMenu(null)
            }}
          >
            <VscEdit className="h-4 w-4 text-[var(--obsidian-text-muted)]" />
            <span>Rename</span>
          </ContextMenuItem>
          {contextMenu.node.type === 'file' && (
            <ContextMenuItem
              onClick={(e) => {
                e.stopPropagation()
                openInNewTab(contextMenu.node)
                setContextMenu(null)
              }}
            >
              <VscGoToFile className="h-4 w-4 text-[var(--obsidian-text-muted)]" />
              <span>Open in New Tab</span>
            </ContextMenuItem>
          )}
          {contextMenu.node.type === 'folder' && (
            <>
              <ContextMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  handleCreateNote(contextMenu.node.path)
                }}
              >
                <VscNewFile className="h-4 w-4 text-[var(--obsidian-text-muted)]" />
                <span>New File</span>
              </ContextMenuItem>
              <ContextMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  handleCreateFolder(contextMenu.node.path)
                }}
              >
                <VscNewFolder className="h-4 w-4 text-[var(--obsidian-text-muted)]" />
                <span>New Folder</span>
              </ContextMenuItem>
            </>
          )}
          <ContextMenuItem
            onClick={(e) => {
              e.stopPropagation()
              void deleteNode(contextMenu.node.path)
              setContextMenu(null)
            }}
          >
            <VscTrash className="h-4 w-4 text-[var(--obsidian-text-muted)]" />
            <span>Delete</span>
          </ContextMenuItem>
        </ContextMenu>
      )}
    </div>
  )
}
