const fs = require('fs');
const path = require('path');

const appPath = '/Users/emranhossain/portfolio-projects/simple-notes/writer/src/renderer/src/App.tsx';
let appCode = fs.readFileSync(appPath, 'utf8');

// Replace conditional SidebarSearch with VirtualFilesList managing sidebarView
appCode = appCode.replace(
  /\{\s*sidebarView === 'files'\s*\?\s*\(\s*\/\*[\s\S]*?\*\/\s*<VirtualFilesList[\s\S]*?\/>\s*\)\s*:\s*\(\s*<SidebarSearch[\s\S]*?\/>\s*\)\s*\}/,
  `<VirtualFilesList 
                  sidebarView={sidebarView}
                  onSearchRequested={() => {
                    setSidebarView('search')
                    setAppMode('editor')
                  }}
                  onCloseSearch={() => {
                    setSidebarView('files')
                    setAppMode('editor')
                  }}
                />`
);
fs.writeFileSync(appPath, appCode);

const vfPath = '/Users/emranhossain/portfolio-projects/simple-notes/writer/src/renderer/src/components/VirtualFilesList.tsx';
let vfCode = fs.readFileSync(vfPath, 'utf8');

// Re-write VirtualFilesList
vfCode = `import { FileNode } from '@shared/models'
import {
  fileTreeAtom,
  fileTreeIndexAtom,
  openTabAtom,
  selectedNodeAtom,
  noteTagByPathAtom,
  createNoteAtom,
  createDirectoryAtom,
  noteStatusByPathAtom
} from '@renderer/store'
import { NOTE_STATUS_META } from '@renderer/constants/noteStatus'
import { useAtomValue, useSetAtom } from 'jotai'
import { useState, useMemo } from 'react'
import { twMerge } from 'tailwind-merge'
import { VscFolder, VscSearch, VscAdd } from 'react-icons/vsc'
import { SidebarSearch } from './SidebarSearch'

// recursively get all folders
function getFolders(nodes: FileNode[], depth = 0): { name: string; path: string; depth: number }[] {
  let result: { name: string; path: string; depth: number }[] = []
  for (const node of nodes) {
    if (node.type === 'folder') {
      result.push({ name: node.name, path: node.path, depth })
      if (node.children) {
        result = result.concat(getFolders(node.children, depth + 1))
      }
    }
  }
  return result
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
  const noteTags = useAtomValue(noteTagByPathAtom)
  const noteStatuses = useAtomValue(noteStatusByPathAtom)
  
  const createNote = useSetAtom(createNoteAtom)
  const createDirectory = useSetAtom(createDirectoryAtom)

  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)

  const folders = useMemo(() => {
    return fileTree ? getFolders(fileTree) : []
  }, [fileTree])

  // Get notes for selected folder (or root if null)
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
    
    // just get direct files for now
    return targetNodes.filter(n => n.type === 'file')
  }, [fileTree, fileTreeIndex, selectedFolder])

  const handleCreateFolder = () => {
    void createDirectory(selectedFolder || '')
  }
  
  const handleCreateNote = () => {
    void createNote(selectedFolder || '')
  }

  return (
    <div className="flex h-full w-full bg-[var(--obsidian-sidebar)] overflow-hidden min-w-[400px]">
      {/* Folders Panel */}
      <div className="w-2/5 min-w-[100px] flex flex-col border-r border-[var(--obsidian-border)] bg-[var(--obsidian-sidebar)]">
        <div className="px-4 py-2 text-xs font-bold text-[var(--obsidian-text-muted)] uppercase tracking-wider border-b border-[var(--obsidian-border-soft)] flex items-center justify-between">
          <span>Folders</span>
          <button 
            onClick={handleCreateFolder}
            className="p-1 rounded-full hover:bg-[var(--obsidian-hover)] text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] transition-colors"
            title="Create Folder"
          >
            <VscAdd className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <div 
            className={twMerge(
              "flex items-center px-4 py-2 cursor-pointer text-sm transition-colors mx-2 rounded-md mb-1",
              selectedFolder === null ? "bg-[var(--obsidian-accent)] text-white shadow-sm" : "text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)]"
            )}
            onClick={() => setSelectedFolder(null)}
          >
            <VscFolder className="mr-3 w-4 h-4 opacity-80 shrink-0" />
            <span className="font-medium">All Notes</span>
          </div>
          {folders.map(folder => (
            <div 
              key={folder.path}
              className="mx-2 mb-1"
            >
              <div
                className={twMerge(
                  "flex items-center px-2 py-1.5 cursor-pointer text-sm transition-colors rounded-md",
                  selectedFolder === folder.path ? "bg-[var(--obsidian-accent)] text-white shadow-sm" : "text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)]",
                  folder.depth > 0 && "border-l border-[var(--obsidian-border-soft)] rounded-l-none"
                )}
                style={{ marginLeft: \`\${folder.depth * 12}px\` }}
                onClick={() => setSelectedFolder(folder.path)}
              >
                <VscFolder className="mr-3 w-4 h-4 opacity-80 shrink-0" />
                <span className="truncate font-medium">{folder.name}</span>
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
                  onClick={handleCreateNote}
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
                      "p-3 cursor-pointer transition-colors border-b border-[var(--obsidian-border-soft)]",
                      isSelected 
                        ? "bg-[var(--obsidian-accent)] text-white" 
                        : "bg-transparent hover:bg-[var(--obsidian-hover)]"
                    )}
                    onClick={() => openTab(note)}
                  >
                    <div className="font-semibold text-sm truncate mb-2">
                      {note.name.replace(/\\.md$/, '')}
                    </div>
                    <div className={twMerge(
                      "text-[11px] flex justify-between items-center",
                      isSelected ? "text-white/80" : "text-[var(--obsidian-text-muted)]"
                    )}>
                      <span>{date}</span>
                      <div className="flex items-center gap-1.5">
                        {status && (
                          <span className={twMerge(
                            "px-1.5 py-[1px] rounded-full border text-[9px] font-semibold",
                            isSelected ? "border-white/30" : NOTE_STATUS_META[status].className
                          )}>
                            {NOTE_STATUS_META[status].label}
                          </span>
                        )}
                        {tag && (
                          <span className={twMerge(
                            "px-2 py-0.5 rounded-full font-medium",
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
    </div>
  )
}
`

fs.writeFileSync(vfPath, vfCode);
