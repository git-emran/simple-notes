import { FileNode } from '@shared/models'
import { ComponentProps, useState, useEffect, useRef } from 'react'
import { VscChevronRight, VscChevronDown, VscFolder, VscFolderOpened, VscFile, VscTrash } from 'react-icons/vsc'
import { twMerge } from 'tailwind-merge'
import { useAtomValue } from 'jotai'
import { noteStatusByPathAtom } from '@renderer/store'
import { NOTE_STATUS_META } from '@renderer/constants/noteStatus'

export type FileTreeItemProps = ComponentProps<'li'> & {
  node: FileNode
  depth?: number
  onNodeSelect: (node: FileNode) => void
  selectedNode: FileNode | null
  expandedNodes: Set<string>
  onToggleExpand: (nodeId: string) => void
  onDelete?: (path: string) => void
  onDropNode?: (src: string, dest: string) => void
  onNodeContextMenu?: (node: FileNode, e: React.MouseEvent) => void
}

export const FileTreeItem = ({
  node,
  depth = 0,
  onNodeSelect,
  selectedNode,
  expandedNodes,
  onToggleExpand,
  onDelete,
  onDropNode,
  onNodeContextMenu,
  className,
  ...props
}: FileTreeItemProps) => {
  const isExpanded = expandedNodes.has(node.path)
  const isSelected = selectedNode?.path === node.path
  const noteStatuses = useAtomValue(noteStatusByPathAtom)
  const noteStatus = node.type === 'file' ? noteStatuses[node.path] : undefined
  const todoTotal = node.todoTotal ?? 0
  const todoCompleted = node.todoCompleted ?? 0
  const todoProgress = todoTotal > 0 ? Math.round((todoCompleted / todoTotal) * 100) : 0
  
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(node.name)
  const [extension, setExtension] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) {
        inputRef.current?.focus()
        // Select logic handled by focus? No, need to select all text in input.
        inputRef.current?.select()
    }
  }, [isEditing])

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (node.type === 'folder') {
      onToggleExpand(node.path)
    } 
    onNodeSelect(node)
  }
  
  const handleDoubleClick = (e: React.MouseEvent) => {
      e.stopPropagation()
      setIsEditing(true)
      
      if (node.type === 'file') {
          const lastDotIndex = node.name.lastIndexOf('.')
          if (lastDotIndex !== -1) {
              setEditName(node.name.substring(0, lastDotIndex))
              setExtension(node.name.substring(lastDotIndex))
          } else {
              setEditName(node.name)
              setExtension('')
          }
      } else {
          setEditName(node.name)
          setExtension('')
      }
  }
  
  const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onNodeContextMenu?.(node, e)
  }

  
  const handleDragStart = (e: React.DragEvent) => {
      e.dataTransfer.setData('text/plain', node.path)
      e.dataTransfer.effectAllowed = 'move'
  }
  
  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault() // Essential to allow dropping
      e.stopPropagation()
      
      // Allow dropping on both folders and files
      e.dataTransfer.dropEffect = 'move'
      e.currentTarget.classList.add('obsidian-tree-drop')
  }
  
  const handleDragLeave = (e: React.DragEvent) => {
       e.currentTarget.classList.remove('obsidian-tree-drop')
  }
  
  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      e.currentTarget.classList.remove('obsidian-tree-drop')
      
      const src = e.dataTransfer.getData('text/plain')
      if (src && src !== node.path) {
          const fileName = src.substring(Math.max(src.lastIndexOf('/'), src.lastIndexOf('\\')) + 1)
          
          if (node.type === 'folder') {
            // Move into folder
            const dest = `${node.path}/${fileName}` 
            onDropNode?.(src, dest)
          } else {
            // Move to same directory as file (rearrangement/sibling)
            // Get parent directory of the target file
            const parentPath = node.path.substring(0, Math.max(node.path.lastIndexOf('/'), node.path.lastIndexOf('\\')))
            const dest = `${parentPath}/${fileName}`
            
            // Avoid moving to same location
            if (dest !== src) {
                onDropNode?.(src, dest)
            }
          }
      }
  }
  
  const handleSubmitRename = () => {
      setIsEditing(false)
      const newName = editName + extension
      if (newName !== node.name && editName.trim() !== '') {
          // Calculate new path
          const parentPath = node.path.substring(0, Math.max(node.path.lastIndexOf('/'), node.path.lastIndexOf('\\')))
          const newPath = `${parentPath}/${newName}`
          onDropNode?.(node.path, newPath) 
      } else {
          setEditName(node.name) // Reset logic if cancelled/invalid might need more care, but this handles basic reset to *something* safe. 
          // Actually if we cancel we should reset to node.name, handled in effect or by re-render?
          // If node changes, component re-renders. 
      }
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          handleSubmitRename()
      } else if (e.key === 'Escape') {
          setIsEditing(false)
          setEditName(node.name) // This might be buggy if we split it.
          // Better: just let re-render handle it if we don't save.
          // Or reset explicitly:
          /* 
          if (node.type === 'file' ...) { ... }
          */
         // For simplicity, just relying on next render or resetting:
         // Re-run the double click logic essentially? No.
         // Just set isEditing false.
      }
      e.stopPropagation() 
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

  return (
    <>
      <li
        className={twMerge(
          'group cursor-pointer py-[3px] flex items-start gap-1 transition-colors text-[12px] select-none relative rounded-sm mx-1',
          isSelected
            ? 'bg-[var(--obsidian-accent-dim)] text-[var(--obsidian-text)]'
            : 'text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover-soft)]',
          className
        )}
        style={{ 
          paddingLeft: `${depth * 12 + 8}px`,
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
            {node.type === 'folder' && (
                isExpanded ? <VscChevronDown className="w-3.5 h-3.5" /> : <VscChevronRight className="w-3.5 h-3.5" />
            )}
        </span>
        
        <span className="flex-shrink-0">
          {node.type === 'folder' && (
            isExpanded ? (
              <VscFolderOpened
                className={twMerge(
                  'w-4 h-4',
                  isSelected ? 'text-[var(--obsidian-text)]' : 'text-[var(--obsidian-accent)]'
                )}
              />
            ) : (
              <VscFolder
                className={twMerge(
                  'w-4 h-4',
                  isSelected ? 'text-[var(--obsidian-text)]' : 'text-[var(--obsidian-accent)]'
                )}
              />
            )
          )}
          {node.type === 'file' && !node.name.toLowerCase().endsWith('.md') && (
            <VscFile
              className={twMerge(
                'w-4 h-4',
                isSelected ? 'text-[var(--obsidian-text)]' : 'text-[var(--obsidian-text-muted)]'
              )}
            />
          )}
        </span>
        
         {isEditing ? (
            <div className="flex items-center ml-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                <input 
                    ref={inputRef}
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleSubmitRename}
                    onKeyDown={handleKeyDown}
                    className="bg-[var(--obsidian-workspace)] border border-[var(--obsidian-accent)] outline-none text-[11px] px-1 rounded-sm min-w-0 flex-shrink text-[var(--obsidian-text)]"
                />
                <span className="text-[var(--obsidian-text-muted)] whitespace-pre">{extension}</span>
            </div>
        ) : (
            <div
              className={twMerge(
                'flex flex-1 min-w-0 flex-col gap-0.5',
                node.type === 'file' && node.name.toLowerCase().endsWith('.md') ? 'ml-0' : 'ml-1'
              )}
            >
              {node.type === 'file' && node.lastEditTime && (
                <span className="text-[9px] text-[var(--obsidian-text-muted)] opacity-70">
                  {formatRelativeEditedTime(node.lastEditTime)}
                </span>
              )}
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={twMerge(
                    'truncate',
                    node.type === 'folder' && 'font-medium text-[var(--obsidian-text)]'
                  )}
                >
                  {node.name}
                </span>
                {noteStatus && (
                  <span
                    className={`shrink-0 rounded-full border px-1.5 py-[1px] text-[9px] font-semibold ${NOTE_STATUS_META[noteStatus].className}`}
                  >
                    {NOTE_STATUS_META[noteStatus].label}
                  </span>
                )}
              </div>
              {node.type === 'file' && todoTotal > 0 && (
                <div className="flex items-center gap-1.5 pr-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--obsidian-border-soft)]">
                    <div
                      className="h-full rounded-full bg-[var(--obsidian-accent)] transition-all"
                      style={{ width: `${todoProgress}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-[9px] text-[var(--obsidian-text-muted)]">
                    {todoCompleted}/{todoTotal}
                  </span>
                </div>
              )}
            </div>
        )}
        
        {/* Delete on Hover (only when not editing) */}
        {!isEditing && (
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    onDelete?.(node.path)
                }}
                className="invisible group-hover:visible p-0.5 hover:bg-[var(--obsidian-hover)] rounded mr-2 text-[var(--obsidian-text-muted)] hover:text-red-400 transition-colors"
                title="Delete"
            >
                <VscTrash className="w-3.5 h-3.5" />
            </button>
        )}
      </li>
      {node.type === 'folder' && isExpanded && node.children && (
        <ul>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              onNodeSelect={onNodeSelect}
              selectedNode={selectedNode}
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
