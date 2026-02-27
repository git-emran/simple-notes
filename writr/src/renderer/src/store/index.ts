import { NoteContent, FileNode } from '@shared/models'
import { atom } from 'jotai'
import { atomWithStorage, unwrap } from 'jotai/utils'
import { NoteStatus } from '@renderer/constants/noteStatus'

// File Tree Atoms
const loadFileTree = async () => {
  if (!window.context) {
    console.warn('window.context is not defined. Are you running in Electron?')
    return []
  }
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

const createFileNodeFromPath = (filePath: string): FileNode => {
  const normalized = filePath.replace(/\\/g, '/')
  const name = normalized.substring(normalized.lastIndexOf('/') + 1)
  return {
    id: filePath,
    name,
    path: filePath,
    type: 'file',
    isExpanded: false
  }
}

const getTodoStats = (content: string) => {
  const todoMatches = content.match(/^\s*[-*]\s+\[( |x|X)\]\s+/gm) ?? []
  const completedMatches = content.match(/^\s*[-*]\s+\[(x|X)\]\s+/gm) ?? []
  return {
    todoTotal: todoMatches.length,
    todoCompleted: completedMatches.length
  }
}

const updateFileNodeInTree = (
  nodes: FileNode[],
  targetPath: string,
  patch: Partial<FileNode>
): FileNode[] =>
  nodes.map((node) => {
    if (node.path === targetPath) {
      return { ...node, ...patch }
    }

    if (node.children?.length) {
      return { ...node, children: updateFileNodeInTree(node.children, targetPath, patch) }
    }

    return node
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
export const noteStatusByPathAtom = atomWithStorage<Record<string, NoteStatus>>(
  'writr-note-status-by-path',
  {}
)
export const noteTagByPathAtom = atomWithStorage<Record<string, string>>(
  'writr-note-tag-by-path',
  {}
)

// Notes Atoms (derived from selectedNode)
export const selectedNoteAtomAsync = atom(async (get) => {
  const activeTabPath = get(activeTabPathAtom)

  if (!activeTabPath) return null

  if (!window.context) {
    console.warn('window.context is not defined.')
    return {
      title: activeTabPath.split('/').pop()?.replace(/\.md$/, '') || 'Untitled',
      lastEditTime: Date.now(),
      content: '',
      path: activeTabPath
    }
  }

  const content = await window.context.readFileNew(activeTabPath)
  
  // Extract name for title
  
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

export const saveNoteAtom = atom(null, async (get, set, newContent: NoteContent) => {
  const selectedNote = get(selectedNoteAtom)

  if (!selectedNote || !selectedNote.path) return

  await window.context.writeFileNew(selectedNote.path, newContent)
  const currentTree = get(fileTreeAtom) ?? []
  if (currentTree.length > 0) {
    const todoStats = getTodoStats(newContent)
    set(
      fileTreeAtom,
      updateFileNodeInTree(currentTree, selectedNote.path, {
        lastEditTime: Date.now(),
        todoTotal: todoStats.todoTotal,
        todoCompleted: todoStats.todoCompleted
      })
    )
    return
  }

  set(fileTreeAtom, await loadFileTree())

})

export const createNoteAtom = atom(null, async (get, set, parentDir: string) => {
  const filePath = await window.context.createNoteNew(parentDir)
  if (!filePath) return

  const newNode = createFileNodeFromPath(filePath)
  const currentTree = get(fileTreeAtom) ?? []

  const addNodeToTree = (nodes: FileNode[], targetDir: string, node: FileNode): FileNode[] => {
    if (!targetDir) return [...nodes, node].sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name)
        return a.type === 'folder' ? -1 : 1
    })

    return nodes.map(n => {
      if (n.path === targetDir && n.type === 'folder') {
        const children = [...(n.children ?? []), node].sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name)
            return a.type === 'folder' ? -1 : 1
        })
        return { ...n, children }
      }
      if (n.children) {
        return { ...n, children: addNodeToTree(n.children, targetDir, node) }
      }
      return n
    })
  }

  // If parentDir is empty string, getRootDir() might be relevant, but Main returns absolute path.
  // We need to know where it was created. main/lib/index.ts:237 returns absolute filePath.
  // Extracting parent path from filePath:
  const lastSlash = filePath.lastIndexOf('/')
  const lastBackslash = filePath.lastIndexOf('\\')
  const maxIndex = Math.max(lastSlash, lastBackslash)
  const actualParent = maxIndex === -1 ? '' : filePath.substring(0, maxIndex)

  // Find root path from tree if not provided
  const root = inferRootDirFromTree(currentTree)
  const targetPath = actualParent === root ? '' : actualParent

  set(fileTreeAtom, addNodeToTree([...currentTree], targetPath, newNode))
  set(openTabAtom, newNode)

  return filePath
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

  const currentTree = get(fileTreeAtom) ?? []
  
  const removeNodeFromTree = (nodes: FileNode[], targetPath: string): FileNode[] => {
    return nodes.filter(node => {
      if (node.path === targetPath) return false
      if (node.children) {
        node.children = removeNodeFromTree(node.children, targetPath)
      }
      return true
    })
  }

  set(fileTreeAtom, removeNodeFromTree([...currentTree], path))
  set(selectedNodeAtom, null)
  
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

const toLocalDateFileName = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}.md`
}

const inferRootDirFromTree = (nodes: FileNode[]) => {
  if (!nodes.length) return null
  const firstPath = nodes[0].path
  const lastSlash = firstPath.lastIndexOf('/')
  const lastBackslash = firstPath.lastIndexOf('\\')
  const maxIndex = Math.max(lastSlash, lastBackslash)
  if (maxIndex === -1) return null
  return firstPath.substring(0, maxIndex)
}

export const createDailyNoteAtom = atom(null, async (get, set) => {
  const fileName = toLocalDateFileName()
  const tree = get(fileTreeAtom) ?? (await loadFileTree())
  const rootDir = inferRootDirFromTree(tree)

  if (rootDir) {
    const separator = rootDir.includes('\\') ? '\\' : '/'
    const filePath = `${rootDir}${separator}${fileName}`

    try {
      await window.context.readFileNew(filePath)
    } catch {
      await window.context.writeFileNew(filePath, '')
    }

    set(fileTreeAtom, await loadFileTree())
    set(openTabAtom, createFileNodeFromPath(filePath))
    return filePath
  }

  const createdPath = await window.context.createNoteNew('')
  if (!createdPath) return null

  const lastSlash = createdPath.lastIndexOf('/')
  const lastBackslash = createdPath.lastIndexOf('\\')
  const maxIndex = Math.max(lastSlash, lastBackslash)
  const parentDir = maxIndex === -1 ? '' : createdPath.substring(0, maxIndex)
  const separator = createdPath.includes('\\') ? '\\' : '/'

  let nextPath = `${parentDir}${separator}${fileName}`
  let counter = 1
  let finalPath = createdPath

  while (counter <= 100) {
    if (await window.context.movePath(createdPath, nextPath)) {
      finalPath = nextPath
      break
    }
    nextPath = `${parentDir}${separator}${fileName.replace('.md', ` (${counter}).md`)}`
    counter += 1
  }

  set(fileTreeAtom, await loadFileTree())
  set(openTabAtom, createFileNodeFromPath(finalPath))
  return finalPath
})
