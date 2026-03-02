import { FileNode } from '@shared/models'
import { NOTE_STATUS_META } from '@renderer/constants/noteStatus'
import { CUSTOM_TAG_STYLE } from '@renderer/constants/noteTag'
import { ComponentProps, memo, useEffect, useRef, useState, type DragEvent, type KeyboardEvent, type MouseEvent } from 'react'
import { VscChevronDown, VscChevronRight, VscFile, VscFolder, VscFolderOpened, VscTrash } from 'react-icons/vsc'
import { twMerge } from 'tailwind-merge'

const INDENT_PX = 12
const BASE_PADDING_LEFT_PX = 8

const getBasenameFromPath = (fullPath: string) => {
  const lastSlash = fullPath.lastIndexOf('/')
  const lastBackslash = fullPath.lastIndexOf('\\')
  const idx = Math.max(lastSlash, lastBackslash)
  return idx === -1 ? fullPath : fullPath.substring(idx + 1)
}

const getParentPath = (fullPath: string) => {
  const lastSlash = fullPath.lastIndexOf('/')
  const lastBackslash = fullPath.lastIndexOf('\\')
  const idx = Math.max(lastSlash, lastBackslash)
  return idx === -1 ? '' : fullPath.substring(0, idx)
}

const joinPath = (parentPath: string, name: string) => {
  if (!parentPath) return name
  const separator = parentPath.includes('\\') ? '\\' : '/'
  return `${parentPath}${separator}${name}`
}

const splitFileName = (name: string) => {
  const lastDotIndex = name.lastIndexOf('.')
  if (lastDotIndex <= 0) return { base: name, ext: '' }
  return { base: name.substring(0, lastDotIndex), ext: name.substring(lastDotIndex) }
}

const formatRelativeEditedTime = (timeMs?: number) => {
  if (!timeMs) return ''
  const diffMs = Date.now() - timeMs
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const month = 30 * day

  if (diffMs < minute) return 'just now'
  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))} min`
  if (diffMs < day) return `${Math.floor(diffMs / hour)} hr${diffMs >= 2 * hour ? 's' : ''}`
  if (diffMs < month) return `${Math.floor(diffMs / day)} day${diffMs >= 2 * day ? 's' : ''}`
  return `${Math.floor(diffMs / month)} mo`
}

export type FileTreeItemProps = ComponentProps<'li'> & {
  node: FileNode
  depth?: number
  rowHeight?: number
  onNodeSelect: (node: FileNode) => void
  selectedPath: string | null
  expandedNodes?: Set<string>
  isExpanded?: boolean
  onToggleExpand: (nodeId: string) => void
  onDelete?: (path: string) => void
  onDropNode?: (src: string, dest: string) => void
  onNodeContextMenu?: (node: FileNode, e: MouseEvent) => void
  renderChildren?: boolean
  noteStatus?: string
  noteTag?: string
}

const FileTreeItemComponent = ({
  node,
  depth = 0,
  rowHeight = 26,
  onNodeSelect,
  selectedPath,
  expandedNodes,
  isExpanded: isExpandedProp,
  onToggleExpand,
  onDelete,
  onDropNode,
  onNodeContextMenu,
  renderChildren = true,
  noteStatus,
  noteTag,
  className,
  ...props
}: FileTreeItemProps) => {
  const isExpanded = isExpandedProp ?? !!expandedNodes?.has(node.path)
  const isSelected = selectedPath === node.path

  const todoTotal = node.todoTotal ?? 0
  const todoCompleted = node.todoCompleted ?? 0
  const showProgress = node.type === 'file' && todoTotal > 0
  const todoProgress = showProgress && todoTotal > 0 ? Math.round((todoCompleted / todoTotal) * 100) : 0

  const showMeta = node.type === 'file' && (!!node.lastEditTime || !!noteStatus || !!noteTag)

  const nodeNameLower = node.name.toLowerCase()
  const isMarkdownOrCanvas =
    node.type === 'file' && (nodeNameLower.endsWith('.md') || nodeNameLower.endsWith('.canvas'))

  const [isEditing, setIsEditing] = useState(false)
  const [editParts, setEditParts] = useState(() => splitFileName(node.name))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) return
    setEditParts(splitFileName(node.name))
  }, [isEditing, node.name])

  useEffect(() => {
    if (!isEditing) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [isEditing])

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation()
    if (node.type === 'folder') {
      onToggleExpand(node.path)
    }
    onNodeSelect(node)
  }

  const handleDoubleClick = (e: MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
    setEditParts(node.type === 'file' ? splitFileName(node.name) : { base: node.name, ext: '' })
  }

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onNodeContextMenu?.(node, e)
  }

  const handleDragStart = (e: DragEvent) => {
    e.dataTransfer.setData('text/plain', node.path)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    e.currentTarget.classList.add('obsidian-tree-drop')
  }

  const handleDragLeave = (e: DragEvent) => {
    e.currentTarget.classList.remove('obsidian-tree-drop')
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.classList.remove('obsidian-tree-drop')

    const src = e.dataTransfer.getData('text/plain')
    if (!src || src === node.path) return

    const fileName = getBasenameFromPath(src)

    if (node.type === 'folder') {
      const dest = joinPath(node.path, fileName)
      onDropNode?.(src, dest)
      return
    }

    const parentPath = getParentPath(node.path)
    const dest = joinPath(parentPath, fileName)
    if (dest !== src) {
      onDropNode?.(src, dest)
    }
  }

  const handleSubmitRename = () => {
    setIsEditing(false)

    const newName = `${editParts.base}${editParts.ext}`
    if (newName === node.name) return

    if (editParts.base.trim() === '') {
      setEditParts(splitFileName(node.name))
      return
    }

    const parentPath = getParentPath(node.path)
    const newPath = joinPath(parentPath, newName)
    onDropNode?.(node.path, newPath)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmitRename()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setEditParts(splitFileName(node.name))
    }
    e.stopPropagation()
  }

  const layoutClasses = showProgress
    ? 'pt-[2px] pb-[1.5px] flex items-start'
    : showMeta
      ? 'pt-[2px] pb-[2px] flex items-start'
      : 'pt-[2px] pb-0 flex items-center'

  const baseRowClasses =
    'group cursor-pointer gap-1 transition-colors text-[12px] select-none relative rounded-sm mx-1 overflow-hidden'

  const interactiveClasses = isSelected
    ? 'bg-[var(--obsidian-accent-dim)] text-[var(--obsidian-text)]'
    : 'text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover-soft)]'

  const contentLeftMargin = isMarkdownOrCanvas ? 'ml-0' : 'ml-1'

  const renderMetaRow = () => {
    if (!showMeta) return null
    return (
      <div className="flex min-w-0 flex-nowrap items-center gap-1.5 overflow-hidden">
        {node.lastEditTime && (
          <span className="shrink-0 whitespace-nowrap tabular-nums text-[9px] text-[var(--obsidian-text-muted)] opacity-70">
            {formatRelativeEditedTime(node.lastEditTime)}
          </span>
        )}
        {noteStatus && (
          <span
            className={`shrink-0 inline-flex items-center whitespace-nowrap rounded-full border px-1.5 py-[1px] text-[9px] font-semibold leading-[1.1] ${NOTE_STATUS_META[noteStatus].className}`}
          >
            {NOTE_STATUS_META[noteStatus].label}
          </span>
        )}
        {noteTag && (
          <span
            className={`shrink-0 inline-flex items-center max-w-[140px] truncate whitespace-nowrap rounded-full border px-1.5 py-[1px] text-[9px] font-semibold leading-[1.1] ${CUSTOM_TAG_STYLE}`}
          >
            {noteTag}
          </span>
        )}
      </div>
    )
  }

  const renderTitleRow = () => (
    <div className="flex min-w-0 items-center gap-2">
      <span className={twMerge('truncate', node.type === 'folder' && 'font-medium text-[var(--obsidian-text)]')}>
        {node.name}
      </span>
    </div>
  )

  const renderProgressRow = () => {
    if (!showProgress) return null
    return (
      <div className="mt-[1.5px] flex items-center gap-1.5 pr-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--obsidian-border-soft)]">
          <div
            className="h-full rounded-full bg-[var(--obsidian-accent)] transition-all"
            style={{ width: `${todoProgress}%` }}
          />
        </div>
        <span className="shrink-0 text-[9px] text-[var(--obsidian-text-muted)] tabular-nums">
          {todoCompleted}/{todoTotal}
        </span>
      </div>
    )
  }

  const renderNodeIcon = () => {
    if (node.type === 'folder') {
      const FolderIcon = isExpanded ? VscFolderOpened : VscFolder
      return (
        <FolderIcon
          className={twMerge('w-4 h-4', isSelected ? 'text-[var(--obsidian-text)]' : 'text-[var(--obsidian-accent)]')}
        />
      )
    }

    if (node.type === 'file' && !isMarkdownOrCanvas) {
      return (
        <VscFile
          className={twMerge('w-4 h-4', isSelected ? 'text-[var(--obsidian-text)]' : 'text-[var(--obsidian-text-muted)]')}
        />
      )
    }

    return null
  }

  const renderContent = () => {
    if (isEditing) {
      return (
        <div className="flex items-center ml-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
          <input
            ref={inputRef}
            type="text"
            value={editParts.base}
            onChange={(e) => setEditParts((prev) => ({ ...prev, base: e.target.value }))}
            onBlur={handleSubmitRename}
            onKeyDown={handleKeyDown}
            className="bg-[var(--obsidian-workspace)] border border-[var(--obsidian-accent)] outline-none text-[11px] px-1 rounded-sm min-w-0 flex-shrink text-[var(--obsidian-text)]"
          />
          <span className="text-[var(--obsidian-text-muted)] whitespace-pre">{editParts.ext}</span>
        </div>
      )
    }

    if (showProgress) {
      return (
        <div className={twMerge('flex flex-1 min-w-0 h-full flex-col justify-start gap-[1.5px]', contentLeftMargin)}>
          {renderMetaRow()}
          {renderTitleRow()}
          {renderProgressRow()}
        </div>
      )
    }

    if (showMeta) {
      return (
        <div className={twMerge('flex flex-1 min-w-0 flex-col justify-center gap-[1.5px]', contentLeftMargin)}>
          {renderMetaRow()}
          {renderTitleRow()}
        </div>
      )
    }

    return <div className={twMerge('flex flex-1 min-w-0 items-center gap-2', contentLeftMargin)}>{renderTitleRow()}</div>
  }

  return (
    <>
      <li
        className={twMerge(baseRowClasses, layoutClasses, interactiveClasses, className)}
        style={{
          paddingLeft: `${depth * INDENT_PX + BASE_PADDING_LEFT_PX}px`,
          height: rowHeight,
          minHeight: rowHeight
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        draggable={!isEditing}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        {...props}
      >
        <span className="flex-shrink-0 w-4 flex justify-center">
          {node.type === 'folder' &&
            (isExpanded ? <VscChevronDown className="w-3.5 h-3.5" /> : <VscChevronRight className="w-3.5 h-3.5" />)}
        </span>

        <span className="flex-shrink-0">{renderNodeIcon()}</span>

        {renderContent()}

        {!isEditing && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete?.(node.path)
            }}
            className="invisible group-hover:visible self-center p-0.5 hover:bg-[var(--obsidian-hover)] rounded mr-2 text-[var(--obsidian-text-muted)] hover:text-red-400 transition-colors"
            title="Delete"
          >
            <VscTrash className="w-3.5 h-3.5" />
          </button>
        )}
      </li>

      {renderChildren && node.type === 'folder' && isExpanded && node.children && expandedNodes && (
        <ul>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              onNodeSelect={onNodeSelect}
              selectedPath={selectedPath}
              expandedNodes={expandedNodes}
              onToggleExpand={onToggleExpand}
              onDelete={onDelete}
              onDropNode={onDropNode}
              onNodeContextMenu={onNodeContextMenu}
            />
          ))}
        </ul>
      )}
    </>
  )
}

const propsAreEqual = (prev: FileTreeItemProps, next: FileTreeItemProps) => {
  return (
    prev.node === next.node &&
    prev.depth === next.depth &&
    prev.rowHeight === next.rowHeight &&
    prev.selectedPath === next.selectedPath &&
    prev.isExpanded === next.isExpanded &&
    prev.noteStatus === next.noteStatus &&
    prev.noteTag === next.noteTag &&
    prev.renderChildren === next.renderChildren &&
    prev.expandedNodes === next.expandedNodes &&
    prev.onNodeSelect === next.onNodeSelect &&
    prev.onToggleExpand === next.onToggleExpand &&
    prev.onDelete === next.onDelete &&
    prev.onDropNode === next.onDropNode &&
    prev.onNodeContextMenu === next.onNodeContextMenu &&
    prev.className === next.className
  )
}

// Memoization is critical for scroll performance, especially with large trees.
export const FileTreeItem = memo(FileTreeItemComponent, propsAreEqual)
