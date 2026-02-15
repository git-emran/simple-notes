import { FileNode } from '@shared/models'
import { ComponentProps, useState, useEffect, useRef } from 'react'
import { VscChevronRight, VscChevronDown, VscFolder, VscFolderOpened, VscFile, VscTrash } from 'react-icons/vsc'
import { twMerge } from 'tailwind-merge'

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
      e.currentTarget.classList.add('bg-blue-100/50', 'dark:bg-blue-900/30')
  }
  
  const handleDragLeave = (e: React.DragEvent) => {
       e.currentTarget.classList.remove('bg-blue-100/50', 'dark:bg-blue-900/30')
  }
  
  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      e.currentTarget.classList.remove('bg-blue-100/50', 'dark:bg-blue-900/30')
      
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

  return (
    <>
      <li
        className={twMerge(
          'group cursor-pointer py-[2px] flex items-center gap-1 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-colors text-sm font-light select-none relative',
          isSelected ? 'bg-blue-100 dark:bg-[#37373d] text-blue-600 dark:text-white' : 'text-zinc-600 dark:text-zinc-400',
          className
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
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
          {node.type === 'folder' ? (
            isExpanded ? (
              <VscFolderOpened className="w-4 h-4 text-blue-500" />
            ) : (
              <VscFolder className="w-4 h-4 text-blue-500" />
            )
          ) : (
            <VscFile className="w-4 h-4 text-zinc-500" />
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
                    className="bg-white dark:bg-black border border-blue-500 outline-none text-sm px-1 rounded-sm min-w-0 flex-shrink"
                />
                <span className="text-zinc-500 whitespace-pre">{extension}</span>
            </div>
        ) : (
            <span className="truncate ml-1 flex-1">{node.name}</span>
        )}
        
        {/* Delete on Hover (only when not editing) */}
        {!isEditing && (
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    onDelete?.(node.path)
                }}
                className="invisible group-hover:visible p-0.5 hover:bg-zinc-300 dark:hover:bg-zinc-600 rounded mr-2 text-zinc-500 hover:text-red-500 transition-colors"
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

