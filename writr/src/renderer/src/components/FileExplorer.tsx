import { FileNode } from '@shared/models'
import {
  activeTabPathAtom,
  createDirectoryAtom,
  createNoteAtom,
  deleteNodeAtom,
  fileTreeAtom,
  movePathAtom,
  openTabAtom,
  selectedNodeAtom
} from '@renderer/store'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { ComponentProps, useEffect, useMemo, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { FileTreeItem } from './FileTreeItem'
import { VscNewFile, VscNewFolder, VscCollapseAll, VscExpandAll } from 'react-icons/vsc'
import { ContextMenu, ContextMenuItem } from './ContextMenu'

export const FileExplorer = ({ className, ...props }: ComponentProps<'aside'>) => {
  const fileTree = useAtomValue(fileTreeAtom)
  const activeTabPath = useAtomValue(activeTabPathAtom)
  const [selectedNode, setSelectedNode] = useAtom(selectedNodeAtom)
  const createNote = useSetAtom(createNoteAtom)
  const createDirectory = useSetAtom(createDirectoryAtom)
  const deleteNode = useSetAtom(deleteNodeAtom)
  const movePath = useSetAtom(movePathAtom)
  const openTab = useSetAtom(openTabAtom)

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FileNode } | null>(null)
  const [isDraggingOverRoot, setIsDraggingOverRoot] = useState(false)

  const allFolderPaths = useMemo(() => {
    const collectFolders = (nodes: FileNode[]): string[] => {
      return nodes.flatMap((node) => {
        if (node.type !== 'folder') return []
        return [node.path, ...(node.children ? collectFolders(node.children) : [])]
      })
    }
    return collectFolders(fileTree ?? [])
  }, [fileTree])

  const isAllExpanded = allFolderPaths.length > 0 && allFolderPaths.every((path) => expandedNodes.has(path))

  useEffect(() => {
    if (!activeTabPath) return

    const findNodeByPath = (nodes: FileNode[], path: string): FileNode | null => {
      for (const node of nodes) {
        if (node.path === path) return node
        if (node.children?.length) {
          const found = findNodeByPath(node.children, path)
          if (found) return found
        }
      }
      return null
    }

    const treeMatch = findNodeByPath(fileTree ?? [], activeTabPath)
    if (treeMatch) {
      setSelectedNode(treeMatch)
      return
    }

    setSelectedNode((prev) => {
      if (prev?.path === activeTabPath) return prev
      const name = activeTabPath.substring(Math.max(activeTabPath.lastIndexOf('/'), activeTabPath.lastIndexOf('\\')) + 1)
      return {
        id: activeTabPath,
        name,
        path: activeTabPath,
        type: 'file',
        isExpanded: false
      }
    })
  }, [activeTabPath, fileTree, setSelectedNode])

  const handleNodeSelect = (node: FileNode) => {
    setSelectedNode(node)
    if (node.type === 'file') {
      openTab(node)
    }
  }

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
    <aside 
      className={twMerge(
        'flex flex-col h-full border-r border-[var(--obsidian-border)] bg-[var(--obsidian-sidebar)]',
        className
      )} 
      style={{ fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
      {...props}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--obsidian-border-soft)]">
        <span className="min-w-0 truncate text-[10px] font-semibold tracking-[0.12em] text-[var(--obsidian-text-muted)]">
          FILES
        </span>
        <div className="flex items-center gap-1 shrink-0">
            <button
            onClick={() => {
                const parent = getCreationParent()
                createNote(parent)
                // If creating in a folder, ensure it's expanded
                if (parent && parent !== '') {
                   setExpandedNodes(prev => new Set(prev).add(parent))
                }
            }}
            className="p-1.5 rounded text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)] transition-colors"
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
            className="p-1.5 rounded text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)] transition-colors"
            title="New Folder"
            >
            <VscNewFolder className="w-4 h-4" />
            </button>
            {isAllExpanded ? (
              <button
                onClick={() => {
                  setExpandedNodes(new Set())
                }}
                className="p-1.5 rounded text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)] transition-colors"
                title="Collapse All"
              >
                <VscCollapseAll className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => {
                  setExpandedNodes(new Set(allFolderPaths))
                }}
                className="p-1.5 rounded text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)] transition-colors"
                title="Expand All"
              >
                <VscExpandAll className="w-4 h-4" />
              </button>
            )}
        </div>
      </div>

      <div 
        className={twMerge(
            "flex-1 overflow-auto py-1 transition-colors",
            isDraggingOverRoot && "bg-[var(--obsidian-accent-dim)]"
        )}
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
        onDragOver={(e) => {
            e.preventDefault()
            e.stopPropagation()
            e.dataTransfer.dropEffect = 'move'
            setIsDraggingOverRoot(true)
        }}
        onDragLeave={(e) => {
            e.preventDefault()
            e.stopPropagation()
            // Only unhighlight if leaving the container, not entering a child
            if (e.currentTarget.contains(e.relatedTarget as Node)) return
            setIsDraggingOverRoot(false)
        }}
        onDrop={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsDraggingOverRoot(false)
            
            const src = e.dataTransfer.getData('text/plain')
            if (src) {
                // Calculate Root Path
                // We assume the first node's parent is the root or the node itself is at root.
                // If the tree is empty, we can't drag anything anyway.
                if (fileTree && fileTree.length > 0) {
                    const sampleNode = fileTree[0]
                    const lastSlash = sampleNode.path.lastIndexOf('/')
                    const lastBackslash = sampleNode.path.lastIndexOf('\\')
                    const maxIndex = Math.max(lastSlash, lastBackslash)
                    
                    if (maxIndex !== -1) {
                        const rootPath = sampleNode.path.substring(0, maxIndex)
                        const fileName = src.substring(Math.max(src.lastIndexOf('/'), src.lastIndexOf('\\')) + 1)
                        const dest = `${rootPath}/${fileName}`
                        
                        if (dest !== src) {
                            movePath({ src, dest })
                        }
                    }
                }
            }
        }}
      >
        {fileTree && fileTree.length > 0 ? (
          <ul>
            {fileTree.map((node) => (
              <FileTreeItem
                key={node.path}
                node={node}
                onNodeSelect={handleNodeSelect}
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
          <div className="px-4 mt-4 text-center text-xs text-[var(--obsidian-text-muted)]">
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
           </ContextMenu>
       )}
    </aside>
  )
}
