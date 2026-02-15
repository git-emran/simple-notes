import { NoteContent, NoteInfo, FileNode } from '@shared/models'
import { atom } from 'jotai'
import { unwrap } from 'jotai/utils'

// File Tree Atoms
const loadFileTree = async () => {
  return await window.context.getFileTree()
}

const fileTreeAtomAsync = atom<FileNode[] | Promise<FileNode[]>>(loadFileTree())
export const fileTreeAtom = unwrap(fileTreeAtomAsync, (prev) => prev)

export const selectedNodeAtom = atom<FileNode | null>(null)

// Tabs State
export const tabsAtom = atom<FileNode[]>([])
export const activeTabPathAtom = atom<string | null>(null)

export const setActiveTabAtom = atom(null, (get, set, path: string) => {
  set(activeTabPathAtom, path)
  
  // Find node in tabs to update selectedNodeAtom
  const tabs = get(tabsAtom)
  const node = tabs.find(t => t.path === path)
  if (node) {
    set(selectedNodeAtom, node)
  }
})

export const switchTabByIndexAtom = atom(null, (get, set, index: number) => {
  const tabs = get(tabsAtom)
  if (index >= 0 && index < tabs.length) {
    set(setActiveTabAtom, tabs[index].path)
  }
})

export const openTabAtom = atom(null, (get, set, node: FileNode) => {
  if (node.type !== 'file') return

  const tabs = get(tabsAtom)
  if (!tabs.find((t) => t.path === node.path)) {
    set(tabsAtom, [...tabs, node])
  }
  set(activeTabPathAtom, node.path)
  set(selectedNodeAtom, node)
})

export const closeTabAtom = atom(null, (get, set, path: string) => {
  const tabs = get(tabsAtom)
  const activeTabPath = get(activeTabPathAtom)
  const newTabs = tabs.filter((t) => t.path !== path)
  set(tabsAtom, newTabs)

  if (activeTabPath === path) {
    if (newTabs.length > 0) {
      const nextTab = newTabs[newTabs.length - 1]
      set(activeTabPathAtom, nextTab.path)
      set(selectedNodeAtom, nextTab)
    } else {
      set(activeTabPathAtom, null)
      set(selectedNodeAtom, null)
    }
  }
})

export const isDarkModeAtom = atom(false)

// Notes Atoms (derived from selectedNode)
export const selectedNoteAtomAsync = atom(async (get) => {
  const activeTabPath = get(activeTabPathAtom)

  if (!activeTabPath) return null

  // Find the node in the tree or tabs to get the name
  // For simplicity, we can just use the path to read content
  const content = await window.context.readFileNew(activeTabPath)
  
  // Extract name for title
  const lastSlash = activeTabPath.lastIndexOf('/')
  const lastBackslash = activeTabPath.lastIndexOf('\\')
  const maxIndex = Math.max(lastSlash, lastBackslash)
  const name = maxIndex === -1 ? activeTabPath : activeTabPath.substring(maxIndex + 1)

  return {
    title: name.replace(/\.md$/, ''),
    lastEditTime: Date.now(),
    content: content,
    path: activeTabPath
  }
})

export const selectedNoteAtom = unwrap(
  selectedNoteAtomAsync,
  (prev) =>
    prev ?? {
      title: '',
      content: '',
      lastEditTime: Date.now(),
      path: ''
    }
)

export const saveNoteAtom = atom(null, async (get, _set, newContent: NoteContent) => {
  const selectedNote = get(selectedNoteAtom)

  if (!selectedNote || !selectedNote.path) return

  await window.context.writeFileNew(selectedNote.path, newContent)

})

export const createNoteAtom = atom(null, async (_, set, parentDir: string) => {
  const filePath = await window.context.createNoteNew(parentDir)
  if (!filePath) return

  // Refresh tree
  set(fileTreeAtom, await loadFileTree())
})

export const createDirectoryAtom = atom(null, async (_, set, parentDir: string) => {
  const dirPath = await window.context.createDirectory(parentDir)
  if (!dirPath) return

  // Refresh tree
  set(fileTreeAtom, await loadFileTree())
})

export const deleteNodeAtom = atom(null, async (get, set, path: string) => {
  const isDeleted = await window.context.deletePath(path)
  if (!isDeleted) return

  set(selectedNodeAtom, null)
  set(fileTreeAtom, await loadFileTree())
  
  // Close tab if it was open
  const tabs = get(tabsAtom)
  if (tabs.find(t => t.path === path)) {
    set(closeTabAtom, path)
  }
})

export const movePathAtom = atom(null, async (get, set, { src, dest }: { src: string; dest: string }) => {
  const success = await window.context.movePath(src, dest)
  if (success) {
    set(fileTreeAtom, await loadFileTree())

    // Update tabs if any tab matches the moved path
    const tabs = get(tabsAtom)
    const activeTabPath = get(activeTabPathAtom)
    
    let tabMatched = false
    const newTabs = tabs.map(tab => {
      if (tab.path === src) {
        tabMatched = true
        const name = dest.substring(Math.max(dest.lastIndexOf('/'), dest.lastIndexOf('\\')) + 1)
        return { ...tab, path: dest, name }
      }
      return tab
    })
    
    if (tabMatched) {
      set(tabsAtom, newTabs)
      if (activeTabPath === src) {
        set(activeTabPathAtom, dest)
      }
    }

    // Update selected node if it was the one moved/renamed
    const selectedNode = get(selectedNodeAtom)
    if (selectedNode?.path === src) {
        const name = dest.substring(Math.max(dest.lastIndexOf('/'), dest.lastIndexOf('\\')) + 1)
        set(selectedNodeAtom, { ...selectedNode, path: dest, name })
    }
  }
})
