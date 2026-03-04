import { NoteContent, FileNode } from '@shared/models'
import { atom } from 'jotai'
import { atomWithStorage, unwrap } from 'jotai/utils'
import { NoteStatus } from '@renderer/constants/noteStatus'
export * from './settingsStore'
export * from './kanbanStore'

// File Tree Atoms
const loadFileTree = async () => {
  if (!window.context) {
    console.warn('window.context is not defined. Are you running in Electron?')
    return []
  }
  return await window.context.getFileTree()
}

export const saveCanvasAtom = atom(null, async (get, set, jsonContent: string) => {
  const selectedNode = get(selectedNodeAtom)
  if (!selectedNode || !selectedNode.path || !selectedNode.path.endsWith('.canvas')) return

  await window.context.writeFileNew(selectedNode.path, jsonContent)
  const currentTree = get(fileTreeAtom) ?? []
  if (currentTree.length > 0) {
    set(
      fileTreeAtom,
      updateFileNodeInTree(currentTree, selectedNode.path, {
        lastEditTime: Date.now()
      })
    )
    return
  }
  set(fileTreeAtom, await loadFileTree())
})

const fileTreeAtomAsync = atom<FileNode[] | Promise<FileNode[]>>(loadFileTree())
export const fileTreeAtom = unwrap(fileTreeAtomAsync, (prev) => prev)

const inferRootDirFromTree = (nodes: FileNode[]) => {
  if (!nodes.length) return null
  const firstPath = nodes[0].path
  const lastSlash = firstPath.lastIndexOf('/')
  const lastBackslash = firstPath.lastIndexOf('\\')
  const maxIndex = Math.max(lastSlash, lastBackslash)
  if (maxIndex === -1) return null
  return firstPath.substring(0, maxIndex)
}

export const notesRootDirAtom = atom<string | null>((get) => inferRootDirFromTree(get(fileTreeAtom) ?? []))

export const fileTreeIndexAtom = atom<Map<string, FileNode>>((get) => {
  const tree = get(fileTreeAtom) ?? []
  const index = new Map<string, FileNode>()
  const stack: FileNode[] = [...tree]
  while (stack.length) {
    const node = stack.pop()!
    index.set(node.path, node)
    if (node.children?.length) {
      stack.push(...node.children)
    }
  }
  return index
})

export const selectedNodeAtom = atom<FileNode | null>(null)

// Tabs State
export type EditorTab = {
  id: string
  kind: 'empty' | 'file' | 'kanban'
  path: string | null
  name: string
}

const getNameFromPath = (filePath: string) => {
  const normalized = filePath.replace(/\\/g, '/')
  return normalized.substring(normalized.lastIndexOf('/') + 1)
}

const createEmptyTab = (): EditorTab => ({
  id: `tab-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  kind: 'empty',
  path: null,
  name: 'New Tab',
})

export const tabsAtom = atom<EditorTab[]>([{ id: 'tab-1', kind: 'empty', path: null, name: 'New Tab' }])
export const closedTabsHistoryAtom = atom<EditorTab[]>([])
export const activeTabIdAtom = atom<string>('tab-1')

export const activeTabPathAtom = atom<string | null>((get) => {
  const tabs = get(tabsAtom)
  const activeId = get(activeTabIdAtom)
  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0]
  return activeTab?.path ?? null
})

export const activeTabKindAtom = atom<EditorTab['kind']>((get) => {
  const tabs = get(tabsAtom)
  const activeId = get(activeTabIdAtom)
  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0]
  return activeTab?.kind ?? 'empty'
})

export const setActiveTabAtom = atom(null, (get, set, tabId: string) => {
  set(activeTabIdAtom, tabId)
  const tabs = get(tabsAtom)
  const next = tabs.find((t) => t.id === tabId) ?? tabs[0]
  if (!next || next.kind !== 'file' || !next.path) {
    set(selectedNodeAtom, null)
    return
  }
  set(selectedNodeAtom, createFileNodeFromPath(next.path))
})

export const switchTabByIndexAtom = atom(null, (get, set, index: number) => {
  const tabs = get(tabsAtom)
  if (index >= 0 && index < tabs.length) {
    set(setActiveTabAtom, tabs[index].id)
  }
})

export const createNewTabAtom = atom(null, (get, set) => {
  const tabs = get(tabsAtom)
  const nextTab = createEmptyTab()
  set(tabsAtom, [...tabs, nextTab])
  set(activeTabIdAtom, nextTab.id)
  set(selectedNodeAtom, null)
})

export const createKanbanTabAtom = atom(null, (get, set) => {
  const tabs = get(tabsAtom)
  const existing = tabs.find((t) => t.kind === 'kanban')
  if (existing) {
    set(activeTabIdAtom, existing.id)
    set(selectedNodeAtom, null)
    return
  }
  const nextTab: EditorTab = {
    id: `tab-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind: 'kanban',
    path: null,
    name: 'Kanban',
  }
  set(tabsAtom, [...tabs, nextTab])
  set(activeTabIdAtom, nextTab.id)
  set(selectedNodeAtom, null)
})

export const openTabAtom = atom(null, (get, set, node: FileNode) => {
  if (node.type !== 'file') return

  const tabs = get(tabsAtom)
  const activeId = get(activeTabIdAtom)
  const name = getNameFromPath(node.path)

  if (tabs.length === 0) {
    const onlyTab: EditorTab = { id: 'tab-1', kind: 'file', path: node.path, name }
    set(tabsAtom, [onlyTab])
    set(activeTabIdAtom, onlyTab.id)
    set(selectedNodeAtom, node)
    return
  }

  const activeTab = tabs.find((t) => t.id === activeId)
  const targetId =
    activeTab?.kind === 'kanban'
      ? (tabs.find((t) => t.kind !== 'kanban')?.id ?? activeId)
      : activeId

  if (targetId !== activeId) {
    set(activeTabIdAtom, targetId)
  }

  const nextTabs = tabs.map((tab) => {
    if (tab.id !== targetId) return tab
    return { ...tab, kind: 'file' as const, path: node.path, name }
  })

  set(tabsAtom, nextTabs)
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

export const closeTabAtom = atom(null, (get, set, tabId: string) => {
  const tabs = get(tabsAtom)
  const activeId = get(activeTabIdAtom)
  const closingTab = tabs.find((t) => t.id === tabId)
  if (!closingTab) return

  const history = get(closedTabsHistoryAtom)
  set(closedTabsHistoryAtom, [...history, closingTab])

  const nextTabs = tabs.filter((t) => t.id !== tabId)
  if (nextTabs.length === 0) {
    set(tabsAtom, [{ id: 'tab-1', kind: 'empty', path: null, name: 'New Tab' }])
    set(activeTabIdAtom, 'tab-1')
    set(selectedNodeAtom, null)
    return
  }

  set(tabsAtom, nextTabs)
  if (activeId !== tabId) return

  const nextActive = nextTabs[Math.max(0, nextTabs.length - 1)]
  set(activeTabIdAtom, nextActive.id)
  set(selectedNodeAtom, nextActive.path ? createFileNodeFromPath(nextActive.path) : null)
})

export const restoreClosedTabAtom = atom(null, (get, set) => {
  const history = get(closedTabsHistoryAtom)
  if (history.length > 0) {
    const tabToRestore = history[history.length - 1]
    const newHistory = history.slice(0, -1)
    set(closedTabsHistoryAtom, newHistory)
    
    const currentTabs = get(tabsAtom)
    set(tabsAtom, [...currentTabs, tabToRestore])
    set(activeTabIdAtom, tabToRestore.id)
    set(selectedNodeAtom, tabToRestore.path ? createFileNodeFromPath(tabToRestore.path) : null)
  }
})

export const closeActiveTabAtom = atom(null, (get, set) => {
  const activeId = get(activeTabIdAtom)
  if (activeId) set(closeTabAtom, activeId)
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

export type TodoStatsCacheEntry = {
  mtimeMs: number
  todoTotal: number
  todoCompleted: number
}

export const todoStatsByPathAtom = atomWithStorage<Record<string, TodoStatsCacheEntry>>(
  'writr-todo-stats-by-path',
  {}
)

export const pinnedNotePathsAtom = atomWithStorage<string[]>(
  'writr-pinned-note-paths',
  []
)

type FileTreeUiState = {
  expanded: string[]
  scrollTop: number
}

export const fileTreeUiByRootAtom = atomWithStorage<Record<string, FileTreeUiState>>(
  'writr-filetree-ui-by-root',
  {}
)

const normalizePath = (path: string) => path.replace(/\\/g, '/')

const isSameOrChildPath = (path: string, parent: string) => {
  const pathN = normalizePath(path)
  const parentN = normalizePath(parent)
  return pathN === parentN || pathN.startsWith(`${parentN}/`)
}

const remapPathPrefix = (path: string, src: string, dest: string) => {
  const pathN = normalizePath(path)
  const srcN = normalizePath(src)
  const destN = normalizePath(dest)

  if (pathN === srcN) return dest
  if (!pathN.startsWith(`${srcN}/`)) return null

  const remainder = pathN.slice(srcN.length) // includes leading "/..."
  const destSep = dest.includes('\\') ? '\\' : '/'
  const nextN = `${destN}${remainder}`
  return destSep === '/' ? nextN : nextN.replace(/\//g, destSep)
}

const buildNormalizedPathLookup = (nodes: FileNode[]) => {
  const lookup = new Map<string, string>()
  const stack: FileNode[] = [...nodes]
  while (stack.length) {
    const node = stack.pop()!
    lookup.set(normalizePath(node.path), node.path)
    if (node.children?.length) stack.push(...node.children)
  }
  return lookup
}

const patchFileNodesInTree = (nodes: FileNode[], patchByPath: Map<string, Partial<FileNode>>): FileNode[] => {
  let mutated = false
  const next = nodes.map((node) => {
    const patch = patchByPath.get(node.path)
    let nextNode: FileNode = node
    if (patch) {
      nextNode = { ...nextNode, ...patch }
      mutated = true
    }

    if (nextNode.children?.length) {
      const nextChildren = patchFileNodesInTree(nextNode.children, patchByPath)
      if (nextChildren !== nextNode.children) {
        nextNode = { ...nextNode, children: nextChildren }
        mutated = true
      }
    }

    return nextNode
  })

  return mutated ? next : nodes
}

let todoReindexRunId = 0
export const reindexTodoStatsAtom = atom(null, async (get, set) => {
  const runId = (todoReindexRunId += 1)

  if (!window.context) return

  const tree = get(fileTreeAtom) ?? []
  const index = get(fileTreeIndexAtom)
  const cache = get(todoStatsByPathAtom)

  // 1) Apply cached stats immediately (so progress bars show on reload)
  const cachedPatches = new Map<string, Partial<FileNode>>()
  for (const [path, entry] of Object.entries(cache)) {
    const node = index.get(path)
    if (!node || node.type !== 'file') continue
    if (!node.lastEditTime || entry.mtimeMs !== node.lastEditTime) continue
    if (node.todoTotal === entry.todoTotal && node.todoCompleted === entry.todoCompleted) continue
    cachedPatches.set(path, { todoTotal: entry.todoTotal, todoCompleted: entry.todoCompleted })
  }
  if (cachedPatches.size > 0) {
    set(fileTreeAtom, patchFileNodesInTree(tree, cachedPatches))
  }

  // 2) Find files missing cached stats for their current mtime
  const needsScan: Array<{ path: string; mtimeMs: number }> = []
  for (const [path, node] of index.entries()) {
    if (node.type !== 'file') continue
    if (!path.toLowerCase().endsWith('.md')) continue
    const mtimeMs = node.lastEditTime
    if (!mtimeMs) continue
    const entry = cache[path]
    if (entry && entry.mtimeMs === mtimeMs) continue
    needsScan.push({ path, mtimeMs })
  }

  if (needsScan.length === 0) return

  // 3) Background scan in small chunks; keep UI responsive
  const CONCURRENCY = 4
  const BATCH_PATCH_MAX = 16

  let nextCache = { ...cache }
  let pendingPatchMap = new Map<string, Partial<FileNode>>()

  for (let i = 0; i < needsScan.length; i += CONCURRENCY) {
    if (runId !== todoReindexRunId) return

    const slice = needsScan.slice(i, i + CONCURRENCY)
    const results = await Promise.all(
      slice.map(async ({ path, mtimeMs }) => {
        try {
          const content = await window.context.readFileNew(path)
          const stats = getTodoStats(content)
          return { path, mtimeMs, stats }
        } catch {
          return null
        }
      })
    )

    for (const r of results) {
      if (!r) continue
      nextCache[r.path] = {
        mtimeMs: r.mtimeMs,
        todoTotal: r.stats.todoTotal,
        todoCompleted: r.stats.todoCompleted
      }

      pendingPatchMap.set(r.path, {
        todoTotal: r.stats.todoTotal,
        todoCompleted: r.stats.todoCompleted
      })
    }

    if (pendingPatchMap.size >= BATCH_PATCH_MAX) {
      const currentTree = get(fileTreeAtom) ?? []
      set(fileTreeAtom, patchFileNodesInTree(currentTree, pendingPatchMap))
      set(todoStatsByPathAtom, nextCache)
      pendingPatchMap = new Map()
      // Yield back to the event loop
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  if (runId !== todoReindexRunId) return

  if (pendingPatchMap.size > 0) {
    const currentTree = get(fileTreeAtom) ?? []
    set(fileTreeAtom, patchFileNodesInTree(currentTree, pendingPatchMap))
  }
  set(todoStatsByPathAtom, nextCache)
})

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

  let content = ''
  try {
    content = await window.context.readFileNew(activeTabPath)
  } catch {
    content = ''
  }
  
  // Extract name for title
  const name = activeTabPath.split('/').pop()?.split('\\').pop() || 'Untitled'
  
  return {
    title: name.replace(/\.(md|canvas)$/, ''),
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
    const nextCache = {
      ...get(todoStatsByPathAtom),
      [selectedNote.path]: {
        mtimeMs: Date.now(),
        todoTotal: todoStats.todoTotal,
        todoCompleted: todoStats.todoCompleted
      }
    }
    set(
      fileTreeAtom,
      updateFileNodeInTree(currentTree, selectedNote.path, {
        lastEditTime: Date.now(),
        todoTotal: todoStats.todoTotal,
        todoCompleted: todoStats.todoCompleted
      })
    )
    set(todoStatsByPathAtom, nextCache)
    return
  }

  set(fileTreeAtom, await loadFileTree())

})

export const duplicateNoteAtom = atom(null, async (_get, set, path: string) => {
  if (!window.context) return
  
  try {
    const content = await window.context.readFileNew(path)
    const lastDot = path.lastIndexOf('.')
    const newPath = lastDot === -1 ? `${path}_copy` : `${path.substring(0, lastDot)}_copy${path.substring(lastDot)}`
    
    await window.context.writeFileNew(newPath, content)
    set(fileTreeAtom, await loadFileTree())
    
    // Open the new note
    const newNode = createFileNodeFromPath(newPath)
    set(openTabAtom, newNode)
  } catch (error) {
    console.error('Failed to duplicate note:', error)
  }
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

export const createCanvasAtom = atom(null, async (get, set, parentDir: string) => {
  const filePath = await window.context.createCanvasNew(parentDir)
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

  const lastSlash = filePath.lastIndexOf('/')
  const lastBackslash = filePath.lastIndexOf('\\')
  const maxIndex = Math.max(lastSlash, lastBackslash)
  const actualParent = maxIndex === -1 ? '' : filePath.substring(0, maxIndex)

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
    return nodes.filter(node => node.path !== targetPath).map(node => {
      if (node.children) {
        return { ...node, children: removeNodeFromTree(node.children, targetPath) }
      }
      return node
    })
  }

  set(fileTreeAtom, removeNodeFromTree([...currentTree], path))
  set(selectedNodeAtom, null)
  
  // Close tab if it was open
  const tabs = get(tabsAtom)
  const idsToClose = tabs.filter((t) => t.path === path).map((t) => t.id)
  for (const tabId of idsToClose) {
    set(closeTabAtom, tabId)
  }
})

export const movePathAtom = atom(null, async (get, set, { src, dest }: { src: string; dest: string }) => {
  const success = await window.context.movePath(src, dest)
  if (success) {
    // Load tree first so we can remap cache keys to the exact path formatting returned by the backend.
    const loadedTree = await loadFileTree()
    const normalizedLookup = buildNormalizedPathLookup(loadedTree)

    const canonicalize = (path: string) => normalizedLookup.get(normalizePath(path)) ?? path

    // Move any per-path metadata (status/tag/todos/pins) so it persists after move.
    const todoCache = get(todoStatsByPathAtom)
    const statusByPath = get(noteStatusByPathAtom)
    const tagByPath = get(noteTagByPathAtom)
    const pinnedPaths = get(pinnedNotePathsAtom)

    const todoMoves = new Map<string, TodoStatsCacheEntry>()
    const statusMoves = new Map<string, NoteStatus>()
    const tagMoves = new Map<string, string>()

    for (const [path, entry] of Object.entries(todoCache)) {
      const nextPath = remapPathPrefix(path, src, dest)
      if (!nextPath) continue
      todoMoves.set(canonicalize(nextPath), entry)
    }
    for (const [path, entry] of Object.entries(statusByPath)) {
      const nextPath = remapPathPrefix(path, src, dest)
      if (!nextPath) continue
      statusMoves.set(canonicalize(nextPath), entry)
    }
    for (const [path, entry] of Object.entries(tagByPath)) {
      const nextPath = remapPathPrefix(path, src, dest)
      if (!nextPath) continue
      tagMoves.set(canonicalize(nextPath), entry)
    }

    if (todoMoves.size > 0) {
      const next = { ...todoCache }
      for (const key of Object.keys(next)) {
        if (isSameOrChildPath(key, src)) delete next[key]
      }
      for (const [nextPath, entry] of todoMoves) next[nextPath] = entry
      set(todoStatsByPathAtom, next)
    }

    if (statusMoves.size > 0) {
      const next = { ...statusByPath }
      for (const key of Object.keys(next)) {
        if (isSameOrChildPath(key, src)) delete next[key]
      }
      for (const [nextPath, entry] of statusMoves) next[nextPath] = entry
      set(noteStatusByPathAtom, next)
    }

    if (tagMoves.size > 0) {
      const next = { ...tagByPath }
      for (const key of Object.keys(next)) {
        if (isSameOrChildPath(key, src)) delete next[key]
      }
      for (const [nextPath, entry] of tagMoves) next[nextPath] = entry
      set(noteTagByPathAtom, next)
    }

    const nextPinned = pinnedPaths
      .map((p) => {
        const nextPath = remapPathPrefix(p, src, dest)
        return nextPath ? canonicalize(nextPath) : p
      })
      // Remove any duplicates created by renames/moves.
      .filter((p, i, arr) => arr.indexOf(p) === i)
    if (nextPinned.length !== pinnedPaths.length || nextPinned.some((p, i) => p !== pinnedPaths[i])) {
      set(pinnedNotePathsAtom, nextPinned)
    }

    let nextTree = loadedTree

    // Re-apply todo stats for moved nodes immediately so progress bars don't disappear.
    if (todoMoves.size > 0) {
      const patchMap = new Map<string, Partial<FileNode>>()
      for (const [path, entry] of todoMoves.entries()) {
        patchMap.set(path, { todoTotal: entry.todoTotal, todoCompleted: entry.todoCompleted })
      }
      nextTree = patchFileNodesInTree(nextTree, patchMap)
    }

    set(fileTreeAtom, nextTree)

    // Update tabs if any tab matches the moved path
    const tabs = get(tabsAtom)
    
    let tabMatched = false
    const newTabs = tabs.map((tab) => {
      if (!tab.path) return tab
      const nextPath = remapPathPrefix(tab.path, src, dest)
      if (!nextPath) return tab
      tabMatched = true
      const canonicalNext = canonicalize(nextPath)
      const name = canonicalNext.substring(Math.max(canonicalNext.lastIndexOf('/'), canonicalNext.lastIndexOf('\\')) + 1)
      return { ...tab, path: canonicalNext, name }
    })
    
    if (tabMatched) {
      set(tabsAtom, newTabs)
    }

    // Update selected node if it was the one moved/renamed
    const selectedNode = get(selectedNodeAtom)
    if (selectedNode?.path) {
      const nextPath = remapPathPrefix(selectedNode.path, src, dest)
      if (nextPath) {
        const canonicalNext = canonicalize(nextPath)
        const name = canonicalNext.substring(Math.max(canonicalNext.lastIndexOf('/'), canonicalNext.lastIndexOf('\\')) + 1)
        set(selectedNodeAtom, { ...selectedNode, path: canonicalNext, name })
      }
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

export const createDailyNoteAtom = atom(null, async (get, set) => {
  const fileName = toLocalDateFileName()
  const tree = get(fileTreeAtom) ?? (await loadFileTree())
  const rootDir = inferRootDirFromTree(tree)

  if (rootDir) {
    const separator = rootDir.includes('\\') ? '\\' : '/'
    const filePath = `${rootDir}${separator}${fileName}`

    try {
      if (await window.context.readFileNew(filePath) === undefined) {
        throw new Error('Not found')
      }
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
