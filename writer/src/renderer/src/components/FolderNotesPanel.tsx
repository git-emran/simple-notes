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
import { ComponentProps, useCallback, useMemo } from 'react'
import { twMerge } from 'tailwind-merge'
import { FileTreeItem } from './FileTreeItem'

const FILE_TREE_FILE_ROW_HEIGHT = 46
const FILE_TREE_FILE_ROW_HEIGHT_WITH_PROGRESS = 56

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

  const visibleFiles = useMemo(() => {
    if (!activeFolder || !activeFolder.children) return []
    return activeFolder.children.filter((child) => child.type === 'file')
  }, [activeFolder])

  const handleNodeSelect = useCallback(
    (node: FileNode) => {
      setSelectedNode(node)
      openTab(node)
    },
    [openTab, setSelectedNode]
  )

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
        <span className="font-bold text-[10px] tracking-wider uppercase text-[var(--obsidian-text-muted)] opacity-85 truncate" title={activeFolder.name}>
          {activeFolder.name}
        </span>
      </div>

      <div className="flex-1 overflow-auto py-1 filetree-scroll">
        <ul>
          {visibleFiles.map((node) => {
            const noteStatus = noteStatuses[node.path]
            const noteTag = noteTags[node.path]
            const todoTotal = node.todoTotal ?? 0
            const hasMeta = !!node.lastEditTime || !!noteStatus || !!noteTag
            const rowHeight =
              todoTotal > 0
                ? FILE_TREE_FILE_ROW_HEIGHT_WITH_PROGRESS
                : hasMeta
                  ? FILE_TREE_FILE_ROW_HEIGHT
                  : 26

            return (
              <FileTreeItem
                key={node.path}
                className="mt-3"
                node={node}
                depth={0}
                rowHeight={rowHeight}
                onNodeSelect={handleNodeSelect}
                selectedPath={activeTabPath}
                isExpanded={false}
                onToggleExpand={() => {}}
                noteStatus={noteStatus}
                noteTag={noteTag}
                showFolderIcons={false}
              />
            )
          })}
        </ul>
        {visibleFiles.length === 0 && (
          <div className="p-4 text-center text-[11px] text-[var(--obsidian-text-muted)] opacity-70">
            No notes in this folder.
          </div>
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
