import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import {
  activeTabPathAtom,
  fileTreeIndexAtom,
  noteStatusByPathAtom,
  noteTagByPathAtom,
  openTabAtom,
  selectedNodeAtom,
  renamingPathAtom,
  createNoteAtom,
  deleteNodeAtom,
  movePathAtom,
  activeFilterAtom,
} from '@renderer/store'
import { FileNode } from '@shared/models'
import { ComponentProps, useCallback, useMemo, useState, type MouseEvent } from 'react'
import { twMerge } from 'tailwind-merge'
import { FileTreeItem } from './FileTreeItem'
import { ContextMenu, ContextMenuItem } from './ContextMenu'
import { VscNewFile, VscEdit, VscTrash, VscFolderOpened } from 'react-icons/vsc'

export const FolderNotesPanel = ({
  className,
  ...props
}: ComponentProps<'aside'>) => {
  const fileTreeIndex = useAtomValue(fileTreeIndexAtom)
  const activeTabPath = useAtomValue(activeTabPathAtom)
  const activeFilter = useAtomValue(activeFilterAtom)
  const [selectedNode, setSelectedNode] = useAtom(selectedNodeAtom)
  const [renamingPath, setRenamingPath] = useAtom(renamingPathAtom)
  const noteStatuses = useAtomValue(noteStatusByPathAtom)
  const noteTags = useAtomValue(noteTagByPathAtom)
  const openTab = useSetAtom(openTabAtom)
  const createNote = useSetAtom(createNoteAtom)
  const deleteNode = useSetAtom(deleteNodeAtom)
  const movePath = useSetAtom(movePathAtom)

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FileNode } | null>(null)

  const handleDropNode = useCallback(
    (src: string, dest: string) => {
      void movePath({ src, dest })
    },
    [movePath]
  )

  const handleToggleExpand = useCallback(() => {}, [])

  const handleNodeContextMenu = useCallback((node: FileNode, e: MouseEvent) => {
    setContextMenu({ x: e.clientX, y: e.clientY, node })
  }, [])

  const getParentDir = useCallback((fullPath: string) => {
    const lastSlash = fullPath.lastIndexOf('/')
    const lastBackslash = fullPath.lastIndexOf('\\')
    const maxIndex = Math.max(lastSlash, lastBackslash)
    if (maxIndex === -1) return ''
    return fullPath.substring(0, maxIndex)
  }, [])

  const activeFolder = useMemo(() => {
    if (!selectedNode) return null
    if (selectedNode.type === 'folder') return selectedNode
    const parentDir = getParentDir(selectedNode.path)
    return fileTreeIndex.get(parentDir) ?? null
  }, [selectedNode, fileTreeIndex, getParentDir])

  const handleCreateFile = useCallback(() => {
    void (async () => {
      if (!activeFolder) return
      const createdPath = await createNote(activeFolder.path)
      if (createdPath) {
        setRenamingPath(createdPath)
      }
    })()
  }, [activeFolder, createNote, setRenamingPath])

  const handleNodeSelect = useCallback(
    (node: FileNode) => {
      setSelectedNode(node)
      openTab(node)
    },
    [openTab, setSelectedNode]
  )

  const getTimelineGroup = (timeMs?: number) => {
    if (!timeMs) return 'Older'
    const diffMs = Date.now() - timeMs
    const day = 24 * 60 * 60 * 1000
    if (diffMs < day) return 'Recent'
    if (diffMs < 7 * day) return '1 week'
    if (diffMs < 21 * day) return '3 weeks'
    if (diffMs < 30 * day) return '1 month'
    
    const months = Math.floor(diffMs / (30 * day))
    if (months < 12) return `${months + 1} months`
    return 'Older'
  }

  const filesToShow = useMemo(() => {
    if (activeFilter) {
      const allFiles = Array.from(fileTreeIndex.values()).filter(node => node.type === 'file')
      if (activeFilter.type === 'status') {
        return allFiles.filter(f => noteStatuses[f.path] === activeFilter.value)
      }
      if (activeFilter.type === 'tag') {
        return allFiles.filter(f => {
          const tags = noteTags[f.path]
          if (!tags) return false
          return tags.split(',').map(t => t.trim()).includes(activeFilter.value)
        })
      }
    }
    if (activeFolder && activeFolder.children) {
      return activeFolder.children.filter((c) => c.type === 'file')
    }
    return []
  }, [activeFilter, fileTreeIndex, noteStatuses, noteTags, activeFolder])

  /**
   * Visible rows of the active folder: files sorted by edit time, separated by timeline groups.
   */
  const visibleRows = useMemo(() => {
    type Row = {
      type: 'file'
      node: FileNode
      depth: number
      isExpanded: boolean
      hideChevron: boolean
    } | {
      type: 'header'
      label: string
    }

    const rows: Row[] = []
    
    const files = [...filesToShow]
    if (files.length === 0) return rows
    
    files.sort((a, b) => {
      const timeA = a.lastEditTime ?? 0
      const timeB = b.lastEditTime ?? 0
      return timeB - timeA
    })

    let currentGroup = ''

    for (const file of files) {
      const group = getTimelineGroup(file.lastEditTime)
      if (group !== currentGroup) {
        rows.push({ type: 'header', label: group })
        currentGroup = group
      }
      rows.push({ type: 'file', node: file, depth: 0, isExpanded: false, hideChevron: false })
    }

    return rows
  }, [filesToShow])

  if (!activeFolder && !activeFilter) {
    return (
      <aside
        className={twMerge(
          'flex flex-col h-full border-r border-obsidian-border bg-[var(--obsidian-sidebar)]',
          className
        )}
        style={{ fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
        {...props}
      >
        <div className="flex flex-1 items-center justify-center p-4 text-center text-[11px] text-[var(--obsidian-text-muted)]">
          Select a folder
        </div>
      </aside>
    )
  }

  return (
    <aside
      className={twMerge(
        'relative flex flex-col h-full border-r border-obsidian-border bg-[var(--obsidian-sidebar)]',
        className
      )}
      style={{ fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
      {...props}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-obsidian-border-soft select-none">
        <span
          className="font-bold text-[10px] tracking-wider uppercase text-[var(--obsidian-text-muted)] opacity-85 truncate"
          title={activeFilter ? `${activeFilter.type}: ${activeFilter.value}` : activeFolder?.name}
        >
          {activeFilter ? `${activeFilter.type}: ${activeFilter.value}` : activeFolder?.name}
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => handleCreateFile()}
            disabled={!activeFolder}
            className="p-1 rounded text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)] transition-colors disabled:opacity-50"
            title="New File"
          >
            <VscNewFile className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto py-1 filetree-scroll">
        {visibleRows.length === 0 ? (
          <div className="p-4 text-center text-[11px] text-[var(--obsidian-text-muted)] opacity-70">
            No notes in this folder.
          </div>
        ) : (
          <ul className="list-none p-0 m-0">
            {visibleRows.map((row) => {
              if (row.type === 'header') {
                return (
                  <li key={`header-${row.label}`} className="pt-4 pb-1.5 px-4 select-none">
                    <div className="text-[10px] font-semibold text-[var(--obsidian-text-muted)] opacity-50 uppercase tracking-widest pb-1 border-b border-obsidian-border-soft mb-0.5">
                      {row.label}
                    </div>
                  </li>
                )
              }

              const { node, depth, isExpanded, hideChevron } = row
              const noteStatus = node.type === 'file' ? noteStatuses[node.path] : undefined
              const noteTag = node.type === 'file' ? noteTags[node.path] : undefined
              const todoTotal = node.todoTotal ?? 0
              const hasMetaRow = todoTotal > 0 || !!noteStatus || !!noteTag
              const hasFirstLine = !!node.firstLine
              
              const rowHeight = node.type === 'folder' 
                ? 30 
                : (hasMetaRow && hasFirstLine) ? 62 : (hasMetaRow || hasFirstLine) ? 46 : 32

              return (
                <FileTreeItem
                  key={node.path}
                  node={node}
                  depth={depth}
                  rowHeight={rowHeight}
                  onNodeSelect={handleNodeSelect}
                  selectedPath={activeTabPath}
                  isExpanded={isExpanded}
                  onToggleExpand={handleToggleExpand}
                  hideChevron={hideChevron}
                  hideRelativeTime={false}
                  inlineMeta={true}
                  showFolderIcons={false}
                  noteStatus={noteStatus}
                  noteTag={noteTag}
                  renderChildren={false}
                  isRenaming={renamingPath === node.path}
                  onRenameComplete={() => setRenamingPath(null)}
                  onNodeContextMenu={handleNodeContextMenu}
                  onDropNode={handleDropNode}
                  textSize="default"
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    setRenamingPath(node.path)
                  }}
                />
              )
            })}
          </ul>
        )}
      </div>

      <div
        className="absolute top-0 -right-1 h-full w-2 cursor-col-resize bg-transparent hover:bg-[var(--obsidian-accent-dim)] z-50"
        id="notes-resize-handle"
        data-notes-resize-handle="true"
      />

      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)}>
          <ContextMenuItem
            onClick={() => {
              setRenamingPath(contextMenu.node.path)
              setContextMenu(null)
            }}
          >
            <VscEdit className="h-4 w-4 text-[var(--obsidian-text-muted)]" />
            <span>Rename</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => { handleCreateFile(); setContextMenu(null) }}>
            <VscNewFile className="h-4 w-4 text-[var(--obsidian-text-muted)]" />
            <span>New File</span>
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              void window.context.revealPath(contextMenu.node.path)
              setContextMenu(null)
            }}
          >
            <VscFolderOpened className="h-4 w-4 text-[var(--obsidian-text-muted)]" />
            <span>Reveal location</span>
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              void deleteNode(contextMenu.node.path)
              setContextMenu(null)
            }}
          >
            <VscTrash className="h-4 w-4 text-[var(--obsidian-text-muted)]" />
            <span>Delete</span>
          </ContextMenuItem>
        </ContextMenu>
      )}
    </aside>
  )
}
