import { FileNode } from '@shared/models'
import {
  createDirectoryAtom,
  createNoteAtom,
  deleteNodeAtom,
  fileTreeAtom,
  selectedNodeAtom,
  movePathAtom
} from '@renderer/store'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { ComponentProps, useState, useEffect } from 'react'
import { twMerge } from 'tailwind-merge'
import { FileTreeItem } from './FileTreeItem'
import { VscNewFile, VscNewFolder, VscTrash, VscCollapseAll } from 'react-icons/vsc'
import { ContextMenu, ContextMenuItem } from './ContextMenu'

export const FileExplorer = ({ className, ...props }: ComponentProps<'aside'>) => {
  const fileTree = useAtomValue(fileTreeAtom)
  const [selectedNode, setSelectedNode] = useAtom(selectedNodeAtom)
  const createNote = useSetAtom(createNoteAtom)
  const createDirectory = useSetAtom(createDirectoryAtom)
  const deleteNode = useSetAtom(deleteNodeAtom)
  const movePath = useSetAtom(movePathAtom)

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FileNode } | null>(null)

  const handleToggleExpand = (path: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }
  
  const getCreationParent = () => {
    if (!selectedNode) return '' // root
    if (selectedNode.type === 'folder') return selectedNode.path
    
    // It's a file, return parent dir
    // Since we don't have 'path' module in renderer, we do string manipulation
    // Assuming forward slashes (mac/linux) or whatever electron provides.
    // Ideally we should use IPC for path.dirname but for now string manip is faster for UI immediate feedback 
    // BUT wait, Windows uses backslashes. 
    // Better to check if we can rely on node.path format.
    // Electron paths are usually normalized?
    // Let's safe bet: substring to last separator.
    const lastSlash = selectedNode.path.lastIndexOf('/')
    const lastBackslash = selectedNode.path.lastIndexOf('\\')
    const maxIndex = Math.max(lastSlash, lastBackslash)
    
    if (maxIndex === -1) return ''
    return selectedNode.path.substring(0, maxIndex)
  }

  return (
    <aside className={twMerge('flex flex-col h-full bg-zinc-50 dark:bg-[#252526] border-r border-zinc-200 dark:border-[#1e1e1e]', className)} {...props}>
      {/* Title & Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
        <span>Explorer</span>
        <div className="flex items-center gap-1">
            <button
            onClick={() => {
                const parent = getCreationParent()
                createNote(parent)
                // If creating in a folder, ensure it's expanded
                if (parent && parent !== '') {
                   setExpandedNodes(prev => new Set(prev).add(parent))
                }
            }}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700/50 rounded transition-colors"
            title="New File"
            >
            <VscNewFile className="w-4 h-4" />
            </button>
            <button
            onClick={() => {
                const parent = getCreationParent()
                createDirectory(parent)
                 if (parent && parent !== '') {
                   setExpandedNodes(prev => new Set(prev).add(parent))
                }
            }}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700/50 rounded transition-colors"
            title="New Folder"
            >
            <VscNewFolder className="w-4 h-4" />
            </button>
             <button
            onClick={() => {
                setExpandedNodes(new Set())
            }}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700/50 rounded transition-colors"
            title="Collapse All"
            >
            <VscCollapseAll className="w-4 h-4" />
            </button>
        </div>
      </div>

      {/* Tree */}
      <div 
        className="flex-1 overflow-auto py-1"
        onClick={(e) => {
            if (e.target === e.currentTarget) {
                setSelectedNode(null)
            }
        }}
        onContextMenu={(e) => {
            if (e.target === e.currentTarget) {
                setContextMenu(null)
            }
        }}
      >
        {fileTree && fileTree.length > 0 ? (
          <ul>
            {fileTree.map((node) => (
              <FileTreeItem
                key={node.path}
                node={node}
                onNodeSelect={setSelectedNode}
                selectedNode={selectedNode}
                expandedNodes={expandedNodes}
                onToggleExpand={handleToggleExpand}
                onDelete={(path) => deleteNode(path)}
                onDropNode={(src, dest) => movePath({ src, dest })}
                onNodeContextMenu={(node, e) => {
                    setContextMenu({ x: e.clientX, y: e.clientY, node })
                }}
              />
            ))}
          </ul>
        ) : (
          <div className="text-zinc-500 px-4 text-xs mt-4 text-center">
            No files found.<br/>
            Create a file to start.
          </div>
        )}
      </div>
      
       {/* Context Actions (Delete - temporary place as standard toolbar) */}
       {/* Context Menu */}
       {contextMenu && (
           <ContextMenu 
            x={contextMenu.x} 
            y={contextMenu.y} 
            onClose={() => setContextMenu(null)}
           >
               <ContextMenuItem onClick={() => {
                   deleteNode(contextMenu.node.path)
                   setContextMenu(null)
               }}>
                   Delete
               </ContextMenuItem>
               {/* Add Rename later if needed */}
           </ContextMenu>
       )}
    </aside>
  )
}
