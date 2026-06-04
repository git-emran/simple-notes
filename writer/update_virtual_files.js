const fs = require('fs');
const vfPath = '/Users/emranhossain/portfolio-projects/simple-notes/writer/src/renderer/src/components/VirtualFilesList.tsx';

const vfCode = `import { FileNode } from '@shared/models'
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
  movePathAtom
} from '@renderer/store'
import { NOTE_STATUS_META } from '@renderer/constants/noteStatus'
import { useAtomValue, useSetAtom } from 'jotai'
import { useState, useMemo, useCallback } from 'react'
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
  const lastBackslash = fullPath.lastIndexOf('\\\\')
  const idx = Math.max(lastSlash, lastBackslash)
  return idx === -1 ? '' : fullPath.substring(0, idx)
}

const joinPath = (parentPath: string, name: string) => {
  if (!parentPath) return name
  const separator = parentPath.includes('\\\\') ? '\\\\' : '/'
  return \`\${parentPath}\${separator}\${name}\`
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
  
  const createNote = useSetAtom(createNoteAtom)
  const createDirectory = useSetAtom(createDirectoryAtom)
  const deleteNode = useSetAtom(deleteNodeAtom)
  const movePath = useSetAtom(movePathAtom)

  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FileNode } | null>(null)
  const [renamingPath, setRenamingPath] = useState<string | null>(null)

  const toggleExpand = (path: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const getFolders = useCallback((nodes: FileNode[], depth = 0): { node: FileNode; depth: number; isExpanded: boolean; hasChildren: boolean }[] => {
    let result: { node: FileNode; depth: number; isExpanded: boolean; hasChildren: boolean }[] = []
    for (const node of nodes) {
      if (node.type === 'folder') {
        const isExpanded = expandedFolders.has(node.path)
        const hasFolderChildren = !!node.children?.some(c => c.type === 'folder')
        result.push({ node, depth, isExpanded, hasChildren: hasFolderChildren })
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

  const handleNodeContextMenu = (node: FileNode, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, node })
  }

  const handleRenameSubmit = (node: FileNode, newName: string) => {
    setRenamingPath(null)
    if (newName.trim() === '') return
    const actualNewName = node.type === 'file' && !newName.endsWith('.md') ? \`\${newName}.md\` : newName
    if (actualNewName === node.name) return
    const parentPath = getParentPath(node.path)
    const newPath = joinPath(parentPath, actualNewName)
    void movePath({ src: node.path, dest: newPath })
  }

  return (
    <div 
      className="flex h-full w-full bg-[var(--obsidian-sidebar)] overflow-hidden min-w-[400px]"
      onClick={() => setContextMenu(null)}
      onContextMenu={() => setContextMenu(null)}
    >
      {/* Folders Panel */}
      <div className="w-2/5 min-w-[150px] flex flex-col border-r border-[var(--obsidian-border)] bg-[var(--obsidian-sidebar)]">
        <div className="px-4 py-3 text-xs font-bold text-[var(--obsidian-text-muted)] uppercase tracking-wider border-b border-[var(--obsidian-border-soft)] flex items-center justify-between">
          <span>Folders</span>
          <button 
            onClick={() => handleCreateFolder()}
            className="p-1 rounded-full hover:bg-[var(--obsidian-hover)] text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] transition-colors"
            title="Create Folder"
          >
            <VscAdd className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <div 
            className={twMerge(
              "flex items-center px-4 py-1.5 cursor-pointer text-sm transition-colors mx-2 rounded-md mb-1",
              selectedFolder === null ? "bg-[var(--obsidian-accent)] text-white shadow-sm" : "text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)]"
            )}
            onClick={() => setSelectedFolder(null)}
          >
            <VscFolder className="mr-3 w-4 h-4 opacity-80 shrink-0" />
            <span className="font-medium">All Notes</span>
          </div>
          {folders.map(({ node, depth, isExpanded, hasChildren }) => (
            <div 
              key={node.path}
              className="mx-2 mb-1"
              onContextMenu={(e) => handleNodeContextMenu(node, e)}
            >
              <div
                className={twMerge(
                  "flex items-center px-2 py-1.5 cursor-pointer text-sm transition-colors rounded-md",
                  selectedFolder === node.path ? "bg-[var(--obsidian-accent)] text-white shadow-sm" : "text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)]",
                  depth > 0 && "border-l border-[var(--obsidian-border-soft)] rounded-l-none"
                )}
                style={{ marginLeft: \`\${depth * 12}px\` }}
                onClick={() => setSelectedFolder(node.path)}
              >
                <div 
                  className="w-4 h-4 mr-1 flex items-center justify-center shrink-0 text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)]"
                  onClick={(e) => hasChildren && toggleExpand(node.path, e)}
                >
                  {hasChildren ? (
                    isExpanded ? <VscChevronDown className="w-3.5 h-3.5" /> : <VscChevronRight className="w-3.5 h-3.5" />
                  ) : null}
                </div>
                <VscFolder className="mr-2 w-4 h-4 opacity-80 shrink-0" />
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
            </div>
          ))}
        </div>
      </div>

      {/* Notes List Panel */}
      <div className="w-3/5 flex flex-col bg-[var(--obsidian-workspace)] border-r border-[var(--obsidian-border)]">
        {sidebarView === 'search' ? (
           <SidebarSearch onCloseRequested={onCloseSearch} className="h-full border-0" />
        ) : (
          <>
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--obsidian-border-soft)]">
              <span className="font-semibold text-sm text-[var(--obsidian-text)]">Notes</span>
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
                const date = note.lastEditTime ? new Date(note.lastEditTime).toLocaleDateString() : ''
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
                          defaultValue={note.name.replace(/\\.md$/, '')}
                          onBlur={(e) => handleRenameSubmit(note, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameSubmit(note, e.currentTarget.value)
                            if (e.key === 'Escape') setRenamingPath(null)
                          }}
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        note.name.replace(/\\.md$/, '')
                      )}
                    </div>
                    <div className={twMerge(
                      "text-[11px] flex justify-between items-center",
                      isSelected ? "text-white/80" : "text-[var(--obsidian-text-muted)]"
                    )}>
                      <span>{date}</span>
                      <div className="flex items-center gap-1.5 overflow-hidden">
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
`

fs.writeFileSync(vfPath, vfCode);
