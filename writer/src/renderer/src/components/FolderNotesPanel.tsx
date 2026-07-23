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
} from '@renderer/store'
import { FileNode } from '@shared/models'
import { ComponentProps, useCallback, useMemo, useState, type MouseEvent } from 'react'
import { twMerge } from 'tailwind-merge'
import { FileTreeItem } from './FileTreeItem'
import { ContextMenu, ContextMenuItem } from './ContextMenu'
import { VscNewFile, VscEdit, VscTrash } from 'react-icons/vsc'

const FILE_TREE_FILE_ROW_HEIGHT = 46
const FILE_TREE_FILE_ROW_HEIGHT_WITH_PROGRESS = 56

export const FolderNotesPanel = ({
  className,
  ...props
}: ComponentProps<'aside'>) => {
  const fileTreeIndex = useAtomValue(fileTreeIndexAtom)
  const activeTabPath = useAtomValue(activeTabPathAtom)
  const [selectedNode, setSelectedNode] = useAtom(selectedNodeAtom)
  const [renamingPath, setRenamingPath] = useAtom(renamingPathAtom)
  const noteStatuses = useAtomValue(noteStatusByPathAtom)
  const noteTags = useAtomValue(noteTagByPathAtom)
  const openTab = useSetAtom(openTabAtom)
  const createNote = useSetAtom(createNoteAtom)
  const deleteNode = useSetAtom(deleteNodeAtom)

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FileNode } | null>(null)

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

  /**
   * Visible rows of the active folder: only files.
   */
  const visibleRows = useMemo(() => {
    type Row = {
      node: FileNode
      depth: number
      isExpanded: boolean
      hideChevron: boolean
    }

    const rows: Row[] = []
    if (!activeFolder || !activeFolder.children) return rows

    const files = activeFolder.children.filter((c) => c.type === 'file')

    for (const file of files) {
      rows.push({ node: file, depth: 0, isExpanded: false, hideChevron: false })
    }

    return rows
  }, [activeFolder])

  if (!activeFolder) {
    return (
      <aside
        className={twMerge(
          'flex flex-col h-full border-r border-[var(--obsidian-border)] bg-[var(--obsidian-sidebar)]',
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
        'relative flex flex-col h-full border-r border-[var(--obsidian-border)] bg-[var(--obsidian-sidebar)]',
        className
      )}
      style={{ fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
      {...props}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-[var(--obsidian-border-soft)] select-none">
        <span
          className="font-bold text-[10px] tracking-wider uppercase text-[var(--obsidian-text-muted)] opacity-85 truncate"
          title={activeFolder.name}
        >
          {activeFolder.name}
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => handleCreateFile()}
            className="p-1 rounded text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)] transition-colors"
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
            {visibleRows.map(({ node, depth, isExpanded, hideChevron }) => {
              const noteStatus = node.type === 'file' ? noteStatuses[node.path] : undefined
              const noteTag = node.type === 'file' ? noteTags[node.path] : undefined
              const todoTotal = node.todoTotal ?? 0
              const hasMeta = node.type === 'file' && (!!node.lastEditTime || !!noteStatus || !!noteTag)
              
              const rowHeight = node.type === 'folder' 
                ? 26 
                : todoTotal > 0
                  ? FILE_TREE_FILE_ROW_HEIGHT_WITH_PROGRESS
                  : hasMeta
                    ? FILE_TREE_FILE_ROW_HEIGHT
                    : 26

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
                  showFolderIcons={false}
                  noteStatus={noteStatus}
                  noteTag={noteTag}
                  renderChildren={false}
                  isRenaming={renamingPath === node.path}
                  onRenameComplete={() => setRenamingPath(null)}
                  onNodeContextMenu={handleNodeContextMenu}
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
