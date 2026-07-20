import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import {
  activeTabPathAtom,
  fileTreeIndexAtom,
  noteStatusByPathAtom,
  noteTagByPathAtom,
  openTabAtom,
  selectedNodeAtom,
} from '@renderer/store'
import { FileNode } from '@shared/models'
import { ComponentProps, useCallback, useMemo, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { FileTreeItem } from './FileTreeItem'

const FILE_TREE_FILE_ROW_HEIGHT = 46
const FILE_TREE_FILE_ROW_HEIGHT_WITH_PROGRESS = 56

/** True when a folder has at least one direct child that is itself a folder. */
const hasFolderChildren = (node: FileNode): boolean =>
  !!node.children?.some((child) => child.type === 'folder')

export const FolderNotesPanel = ({
  className,
  ...props
}: ComponentProps<'aside'>) => {
  const fileTreeIndex = useAtomValue(fileTreeIndexAtom)
  const activeTabPath = useAtomValue(activeTabPathAtom)
  const [selectedNode, setSelectedNode] = useAtom(selectedNodeAtom)
  const noteStatuses = useAtomValue(noteStatusByPathAtom)
  const noteTags = useAtomValue(noteTagByPathAtom)
  const openTab = useSetAtom(openTabAtom)

  /** Set of folder paths currently expanded within this panel. */
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())

  const handleToggleExpand = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
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

  const handleNodeSelect = useCallback(
    (node: FileNode) => {
      setSelectedNode(node)
      openTab(node)
    },
    [openTab, setSelectedNode]
  )

  /**
   * Flattened visible rows of the active folder: sub-folders first, then files.
   * Both types are included so the panel is a complete view of the folder.
   * Flattening ensures a single, valid <ul> without nested lists, preventing layout shifts.
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

    const folders = activeFolder.children.filter((c) => c.type === 'folder')
    const files = activeFolder.children.filter((c) => c.type === 'file')
    const initialNodes = [...folders, ...files]

    const stack: Array<{ nodes: FileNode[]; index: number; depth: number }> = [
      { nodes: initialNodes, index: 0, depth: 0 }
    ]

    while (stack.length) {
      const frame = stack[stack.length - 1]
      if (frame.index >= frame.nodes.length) {
        stack.pop()
        continue
      }

      const node = frame.nodes[frame.index++]
      const isExpanded = node.type === 'folder' && expandedPaths.has(node.path)
      const hideChevron = node.type === 'folder' && !hasFolderChildren(node)

      rows.push({ node, depth: frame.depth, isExpanded, hideChevron })

      if (node.type === 'folder' && isExpanded && node.children?.length) {
        const childFolders = node.children.filter((c) => c.type === 'folder')
        const childFiles = node.children.filter((c) => c.type === 'file')
        stack.push({ nodes: [...childFolders, ...childFiles], index: 0, depth: frame.depth + 1 })
      }
    }

    return rows
  }, [activeFolder, expandedPaths])

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
    </aside>
  )
}
