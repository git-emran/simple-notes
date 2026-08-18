import { NoteContent, FileNode } from '@shared/models'
import { atom, type Getter } from 'jotai'
import { atomWithStorage, unwrap, atomFamily } from 'jotai/utils'
import { NoteStatus } from '@renderer/constants/noteStatus'
export * from './settingsStore'
export * from './kanbanStore'
export * from './spreadsheetStore'

/* File Tree Atoms */
const loadFileTree = async () => {
  if (!window.context) {
    return []
  }
  return await window.context.getFileTree()
}

export const saveCanvasAtom = atom(
  null,
  async (get, set, payload: { path: string; jsonContent: string }) => {
    const { path, jsonContent } = payload
    if (!path || !path.endsWith('.canvas')) return

    await window.context.writeFileNew(path, jsonContent)
    const currentTree = get(fileTreeAtom) ?? []
    if (currentTree.length > 0) {
      set(
        fileTreeAtom,
        updateFileNodeInTree(currentTree, path, {
          lastEditTime: Date.now()
        })
      )
      return
    }
    set(fileTreeAtom, await loadFileTree())
  }
)

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

export const notesRootDirAtom = atom<string | null>((get) =>
  inferRootDirFromTree(get(fileTreeAtom) ?? [])
)

export const vaultRootDirAtomAsync = atom(async () => {
  if (!window.context) return ''
  try {
    return await window.context.getRootDir()
  } catch {
    return ''
  }
})
export const vaultRootDirAtom = unwrap(vaultRootDirAtomAsync, (prev) => prev ?? '')

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

/* Tabs State */
export type EditorTab = {
  id: string
  kind: 'empty' | 'file' | 'kanban' | 'terminal' | 'spreadsheet' | 'settings'
  path: string | null
  name: string
  terminalSessionId?: string | null
}

const getNameFromPath = (filePath: string) => {
  const normalized = filePath.replace(/\\/g, '/')
  return normalized.substring(normalized.lastIndexOf('/') + 1)
}

const createEmptyTab = (): EditorTab => ({
  id: `tab-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  kind: 'empty',
  path: null,
  name: 'New Tab'
})

export const tabsAtom = atomWithStorage<EditorTab[]>('writr-open-tabs', [
  { id: 'tab-1', kind: 'empty', path: null, name: 'New Tab' }
])
export const closedTabsHistoryAtom = atom<EditorTab[]>([])
export const activeTabIdAtom = atomWithStorage<string>('writr-active-tab-id', 'tab-1')

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

export const activeTabAtom = atom<EditorTab | null>((get) => {
  const tabs = get(tabsAtom)
  const activeId = get(activeTabIdAtom)
  return tabs.find((t) => t.id === activeId) ?? tabs[0] ?? null
})

export type EditorSaveState = {
  hasUnsavedChanges: boolean
  hasSaveError: boolean
}

export const editorSaveStateByPathAtom = atom<Record<string, EditorSaveState>>({})

/* Renderer-side content cache: avoids re-reading unchanged files from disk on tab re-visits.
   Max 30 entries (LRU-evict oldest). Updated on save, populated on first read. */
export const noteContentCacheAtom = atom<Map<string, string>>(new Map())

const canLeaveActiveFileTab = (get: Getter) => {
  const activePath = get(activeTabPathAtom)
  if (!activePath) return true

  const state = get(editorSaveStateByPathAtom)[activePath]
  if (!state?.hasUnsavedChanges && !state?.hasSaveError) return true

  return window.confirm(
    'This note has unsaved changes or a failed save. Leave it anyway? Your latest edits may not be on disk.'
  )
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const generateTabId = () =>
  `tab-${Date.now()}-${Math.random().toString(16).slice(2)}`

/** Prefetch content for neighboring file tabs so they feel instant. */
const prefetchNeighborTabs = (get: Getter, set: any, tabId: string) => {
  const tabs = get(tabsAtom)
  const activeIndex = tabs.findIndex((t) => t.id === tabId)
  const neighbors = [tabs[activeIndex - 1], tabs[activeIndex + 1]]
  for (const neighbor of neighbors) {
    if (neighbor?.kind === 'file' && neighbor.path) {
      const cache = get(noteContentCacheAtom)
      if (!cache.has(neighbor.path) && window.context) {
        void window.context.readFileNew(neighbor.path).then((text) => {
          if (text === undefined) return
          set(noteContentCacheAtom, (prev: Map<string, string>) => {
            const next = new Map(prev)
            next.set(neighbor.path!, text)
            if (next.size > 30) {
              const firstKey = next.keys().next().value
              if (firstKey) next.delete(firstKey)
            }
            return next
          })
        }).catch(() => {})
      }
    }
  }
}

/* ── Tab Actions ─────────────────────────────────────────────────────────── */

/** Switch to an existing tab by its ID. */
export const setActiveTabAtom = atom(null, (get, set, tabId: string) => {
  if (get(activeTabIdAtom) === tabId) return
  if (!canLeaveActiveFileTab(get)) return
  set(activeTabIdAtom, tabId)

  const tabs = get(tabsAtom)
  const next = tabs.find((t) => t.id === tabId) ?? tabs[0]
  if (next?.kind === 'file' && next.path) {
    set(selectedNodeAtom, createFileNodeFromPath(next.path))
  }

  prefetchNeighborTabs(get, set, tabId)
})

/** Switch to a tab by its zero-based index. */
export const switchTabByIndexAtom = atom(null, (get, set, index: number) => {
  const tabs = get(tabsAtom)
  if (index >= 0 && index < tabs.length) {
    set(setActiveTabAtom, tabs[index].id)
  }
})

/** Cycle to the next tab. */
export const switchTabNextAtom = atom(null, (get, set) => {
  const tabs = get(tabsAtom)
  const activeId = get(activeTabIdAtom)
  const currentIndex = tabs.findIndex(t => t.id === activeId)
  if (currentIndex !== -1) {
    set(setActiveTabAtom, tabs[(currentIndex + 1) % tabs.length].id)
  }
})

/** Cycle to the previous tab. */
export const switchTabPrevAtom = atom(null, (get, set) => {
  const tabs = get(tabsAtom)
  const activeId = get(activeTabIdAtom)
  const currentIndex = tabs.findIndex(t => t.id === activeId)
  if (currentIndex !== -1) {
    set(setActiveTabAtom, tabs[(currentIndex - 1 + tabs.length) % tabs.length].id)
  }
})

/** Create a new empty tab. */
export const createNewTabAtom = atom(null, (get, set) => {
  if (!canLeaveActiveFileTab(get)) return
  const nextTab = createEmptyTab()
  set(tabsAtom, [...get(tabsAtom), nextTab])
  set(activeTabIdAtom, nextTab.id)
})

/** Drag-reorder tabs. */
export const reorderTabsAtom = atom(
  null,
  (
    get,
    set,
    payload: { sourceTabId: string; targetTabId: string; position: 'before' | 'after' }
  ) => {
    const { sourceTabId, targetTabId, position } = payload
    if (sourceTabId === targetTabId) return

    const tabs = get(tabsAtom)
    const sourceIndex = tabs.findIndex((t) => t.id === sourceTabId)
    const targetIndex = tabs.findIndex((t) => t.id === targetTabId)
    if (sourceIndex === -1 || targetIndex === -1) return

    const nextTabs = [...tabs]
    const [moved] = nextTabs.splice(sourceIndex, 1)
    const nextTargetIndex = nextTabs.findIndex((t) => t.id === targetTabId)
    if (nextTargetIndex === -1) return

    const insertIndex = position === 'before' ? nextTargetIndex : nextTargetIndex + 1
    nextTabs.splice(insertIndex, 0, moved)
    set(tabsAtom, nextTabs)
  }
)

/* ── Special / Singleton Tab Helper ──────────────────────────────────────── */

type SpecialTabKind = 'kanban' | 'terminal' | 'spreadsheet' | 'settings'

const openSpecialTab = (
  get: Getter,
  set: any,
  kind: SpecialTabKind,
  name: string,
  extra?: Partial<EditorTab>
) => {
  const tabs = get(tabsAtom)
  const existing = tabs.find((t) => t.kind === kind)
  if (existing) {
    set(activeTabIdAtom, existing.id)
    return
  }
  const nextTab: EditorTab = {
    id: generateTabId(),
    kind,
    path: null,
    name,
    ...extra
  }
  set(tabsAtom, [...tabs, nextTab])
  set(activeTabIdAtom, nextTab.id)
}

export const createKanbanTabAtom = atom(null, (get, set) => {
  openSpecialTab(get, set, 'kanban', 'Kanban')
})

export const createTerminalTabAtom = atom(null, (get, set) => {
  openSpecialTab(get, set, 'terminal', 'Terminal', { terminalSessionId: null })
})

export const createSpreadsheetTabAtom = atom(null, (get, set) => {
  openSpecialTab(get, set, 'spreadsheet', 'Spreadsheet')
})

export const createSettingsTabAtom = atom(null, (get, set) => {
  openSpecialTab(get, set, 'settings', 'Settings')
})

export const setTerminalSessionIdAtom = atom(
  null,
  (get, set, payload: { tabId: string; sessionId: string | null }) => {
    set(
      tabsAtom,
      get(tabsAtom).map((tab) =>
        tab.id === payload.tabId ? { ...tab, terminalSessionId: payload.sessionId } : tab
      )
    )
  }
)

/* ── Open File Tab (Standard IDE Behavior) ───────────────────────────────
   1. If the file is already open in a tab → switch to it.
   2. If the active tab is an empty "New Tab" → replace it with the file.
   3. Otherwise → open a new tab for the file.
──────────────────────────────────────────────────────────────────────────── */
export const openTabAtom = atom(null, (get, set, node: FileNode) => {
  if (node.type !== 'file') return

  const tabs = get(tabsAtom)
  const activeId = get(activeTabIdAtom)
  const name = getNameFromPath(node.path)

  // 1. Already open? Just switch to it.
  const existingTab = tabs.find((t) => t.kind === 'file' && t.path === node.path)
  if (existingTab) {
    set(setActiveTabAtom, existingTab.id)
    set(selectedNodeAtom, node)
    return
  }

  // Guard: confirm leaving unsaved tab
  if (get(activeTabPathAtom) !== node.path && !canLeaveActiveFileTab(get)) return

  // 2. Active tab is empty? Replace it with the file.
  const activeTab = tabs.find((t) => t.id === activeId)
  if (activeTab?.kind === 'empty') {
    set(
      tabsAtom,
      tabs.map((tab) =>
        tab.id === activeId
          ? { ...tab, kind: 'file' as const, path: node.path, name, terminalSessionId: null }
          : tab
      )
    )
    set(selectedNodeAtom, node)
    prefetchNeighborTabs(get, set, activeId)
    return
  }

  // 3. Open in a new tab.
  const nextTab: EditorTab = { id: generateTabId(), kind: 'file', path: node.path, name }
  set(tabsAtom, [...tabs, nextTab])
  set(activeTabIdAtom, nextTab.id)
  set(selectedNodeAtom, node)
  prefetchNeighborTabs(get, set, nextTab.id)
})

const createFileNodeFromPath = (filePath: string): FileNode => {
  const normalized = filePath.replace(/\\/g, '/')
  const name = normalized.substring(normalized.lastIndexOf('/') + 1)
  return {
    id: filePath,
    name,
    path: filePath,
    type: 'file',
    isExpanded: false,
    lastEditTime: Date.now()
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

const getFirstLine = (content: string): string | undefined => {
  const lines = content.split('\n')
  let inFrontmatter = false
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === '---') {
      inFrontmatter = !inFrontmatter
      continue
    }
    if (inFrontmatter) continue
    if (!trimmed) continue
    return trimmed.replace(/^#{1,6}\s+/, '')
  }
  return undefined
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
  if (closingTab.id === activeId && !canLeaveActiveFileTab(get)) return

  const history = get(closedTabsHistoryAtom)
  const historyEntry =
    closingTab.kind === 'terminal' ? { ...closingTab, terminalSessionId: null } : closingTab
  set(closedTabsHistoryAtom, [...history, historyEntry])

  if (closingTab.kind === 'terminal' && closingTab.terminalSessionId) {
    void window.context.closeTerminalSession(closingTab.terminalSessionId)
  }

  const nextTabs = tabs.filter((t) => t.id !== tabId)
  if (nextTabs.length === 0) {
    set(tabsAtom, [{ id: 'tab-1', kind: 'empty', path: null, name: 'New Tab' }])
    set(activeTabIdAtom, 'tab-1')
    return
  }

  set(tabsAtom, nextTabs)
  if (activeId !== tabId) return

  const nextActive = nextTabs[Math.max(0, nextTabs.length - 1)]
  set(activeTabIdAtom, nextActive.id)
  if (nextActive.path) {
    set(selectedNodeAtom, createFileNodeFromPath(nextActive.path))
  }
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

export const pinnedNotePathsAtom = atomWithStorage<string[]>('writr-pinned-note-paths', [])

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

const patchFileNodesInTree = (
  nodes: FileNode[],
  patchByPath: Map<string, Partial<FileNode>>
): FileNode[] => {
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

  /* 1) Apply cached stats immediately (so progress bars show on reload) */
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

  /* 2) Find files missing cached stats for their current mtime */
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

  /* 3) Background scan in small chunks; keep UI responsive */
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
          const stats = { ...getTodoStats(content), firstLine: getFirstLine(content) }
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
        todoCompleted: r.stats.todoCompleted,
        firstLine: r.stats.firstLine
      })
    }

    if (pendingPatchMap.size >= BATCH_PATCH_MAX) {
      const currentTree = get(fileTreeAtom) ?? []
      set(fileTreeAtom, patchFileNodesInTree(currentTree, pendingPatchMap))
      set(todoStatsByPathAtom, nextCache)
      pendingPatchMap = new Map()
      /* Yield back to the event loop */
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

/* Notes Atoms (derived from selectedNode) */
export const selectedNoteAtomAsync = atom(async (get) => {
  const activeTabPath = get(activeTabPathAtom)

  if (!activeTabPath) return null

  if (!window.context) {
    return {
      title: activeTabPath.split('/').pop()?.replace(/\.md$/, '') || 'Untitled',
      lastEditTime: Date.now(),
      content: '',
      path: activeTabPath
    }
  }

  /* Check renderer-side cache first — avoids IPC roundtrip on tab re-visits */
  const cache = get(noteContentCacheAtom)
  const cached = cache.get(activeTabPath)

  let content = ''
  let readError: string | null = null

  if (cached !== undefined) {
    content = cached
  } else {
    try {
      const text = await window.context.readFileNew(activeTabPath)
      if (text === undefined) {
        throw new Error('Not found')
      }
      content = text
    } catch (error) {
      readError = error instanceof Error ? error.message : 'Unable to read this note.'
    }
  }

  if (get(activeTabPathAtom) !== activeTabPath) return null

  /* Extract name for title */
  const name = activeTabPath.split('/').pop()?.split('\\').pop() || 'Untitled'

  return {
    title: name.replace(/\.(md|canvas)$/, ''),
    lastEditTime: Date.now(),
    content: content,
    path: activeTabPath,
    readError
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

export const noteByPathAtomFamilyAsync = atomFamily((path: string | null) => atom(async (get) => {
  if (!path) return null

  if (!window.context) {
    return {
      title: path.split('/').pop()?.replace(/\.md$/, '') || 'Untitled',
      lastEditTime: Date.now(),
      content: '',
      path: path
    }
  }

  /* Check renderer-side cache first */
  const cache = get(noteContentCacheAtom)
  const cached = cache.get(path)

  let content = ''
  let readError: string | null = null

  if (cached !== undefined) {
    content = cached
  } else {
    try {
      const text = await window.context.readFileNew(path)
      if (text === undefined) {
        throw new Error('Not found')
      }
      content = text
    } catch (error) {
      readError = error instanceof Error ? error.message : 'Unable to read this note.'
    }
  }

  /* Extract name for title */
  const name = path.split('/').pop()?.split('\\').pop() || 'Untitled'

  return {
    title: name.replace(/\.(md|canvas)$/, ''),
    lastEditTime: Date.now(),
    content: content,
    path: path,
    readError
  }
}))

export const noteByPathAtomFamily = atomFamily((path: string | null) => unwrap(
  noteByPathAtomFamilyAsync(path),
  (prev) =>
    prev ?? {
      title: '',
      content: '',
      lastEditTime: Date.now(),
      path: path ?? ''
    }
))

export const saveNoteAtom = atom(
  null,
  async (get, set, payload: { path: string; newContent: NoteContent }) => {
    const { path, newContent } = payload

    if (!path) return

    await window.context.writeFileNew(path, newContent)

    /* Keep renderer cache in sync so the next tab-switch is instant */
    set(noteContentCacheAtom, (prev) => {
      const next = new Map(prev)
      next.set(path, newContent)
      return next
    })

    const currentTree = get(fileTreeAtom) ?? []
    if (currentTree.length > 0) {
      const todoStats = getTodoStats(newContent)
      const nextCache = {
        ...get(todoStatsByPathAtom),
        [path]: {
          mtimeMs: Date.now(),
          todoTotal: todoStats.todoTotal,
          todoCompleted: todoStats.todoCompleted
        }
      }
      set(
        fileTreeAtom,
        updateFileNodeInTree(currentTree, path, {
          lastEditTime: Date.now(),
          todoTotal: todoStats.todoTotal,
          todoCompleted: todoStats.todoCompleted,
          firstLine: getFirstLine(newContent)
        })
      )
      set(todoStatsByPathAtom, nextCache)
      return
    }

    set(fileTreeAtom, await loadFileTree())
  }
)

export const duplicateNoteAtom = atom(null, async (_get, set, path: string) => {
  if (!window.context) return

  try {
    const content = await window.context.readFileNew(path)
    const lastDot = path.lastIndexOf('.')
    const newPath =
      lastDot === -1
        ? `${path}_copy`
        : `${path.substring(0, lastDot)}_copy${path.substring(lastDot)}`

    await window.context.writeFileNew(newPath, content)
    set(fileTreeAtom, await loadFileTree())
    /* Open the new note */
    const newNode = createFileNodeFromPath(newPath)
    set(openTabAtom, newNode)
  } catch {
    return
  }
})

export const createNoteAtom = atom(null, async (get, set, parentDir: string) => {
  const filePath = await window.context.createNoteNew(parentDir)
  if (!filePath) return

  const newNode = { ...createFileNodeFromPath(filePath), lastEditTime: Date.now() }
  const currentTree = get(fileTreeAtom) ?? []

  const addNodeToTree = (nodes: FileNode[], targetDir: string, node: FileNode): FileNode[] => {
    if (!targetDir)
      return [...nodes, node].sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name)
        return a.type === 'folder' ? -1 : 1
      })

    return nodes.map((n) => {
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

  /* If parentDir is empty string, getRootDir() might be relevant, but Main returns absolute path. */
  /* We need to know where it was created. main/lib/index.ts:237 returns absolute filePath. */
  /* Extracting parent path from filePath: */
  const lastSlash = filePath.lastIndexOf('/')
  const lastBackslash = filePath.lastIndexOf('\\')
  const maxIndex = Math.max(lastSlash, lastBackslash)
  const actualParent = maxIndex === -1 ? '' : filePath.substring(0, maxIndex)

  /* Find root path from tree if not provided */
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
    if (!targetDir)
      return [...nodes, node].sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name)
        return a.type === 'folder' ? -1 : 1
      })

    return nodes.map((n) => {
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

  /* Refresh tree */
  set(fileTreeAtom, await loadFileTree())

  return dirPath
})

export const deleteNodeAtom = atom(null, async (get, set, path: string) => {
  const isDeleted = await window.context.deletePath(path)
  if (!isDeleted) return

  const currentTree = get(fileTreeAtom) ?? []

  const removeNodeFromTree = (nodes: FileNode[], targetPath: string): FileNode[] => {
    return nodes
      .filter((node) => node.path !== targetPath)
      .map((node) => {
        if (node.children) {
          return { ...node, children: removeNodeFromTree(node.children, targetPath) }
        }
        return node
      })
  }

  set(fileTreeAtom, removeNodeFromTree([...currentTree], path))
  
  const currentSelected = get(selectedNodeAtom)
  if (currentSelected && (currentSelected.path === path || currentSelected.path.startsWith(path + '/'))) {
    const parentDir = path.substring(0, Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')))
    const parentNode = get(fileTreeIndexAtom).get(parentDir)
    if (parentNode) {
      set(selectedNodeAtom, parentNode)
    } else {
      set(selectedNodeAtom, null)
    }
  }

  /* Close tab if it was open */
  const tabs = get(tabsAtom)
  const idsToClose = tabs.filter((t) => t.path === path).map((t) => t.id)
  for (const tabId of idsToClose) {
    set(closeTabAtom, tabId)
  }
})

export const movePathAtom = atom(
  null,
  async (get, set, { src, dest }: { src: string; dest: string }) => {
    const success = await window.context.movePath(src, dest)
    if (success) {
      /* Load tree first so we can remap cache keys to the exact path formatting returned by the backend. */
      const loadedTree = await loadFileTree()
      const normalizedLookup = buildNormalizedPathLookup(loadedTree)

      const canonicalize = (path: string) => normalizedLookup.get(normalizePath(path)) ?? path

      /* Move any per-path metadata (status/tag/todos/pins) so it persists after move. */
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
        /* Remove any duplicates created by renames/moves. */
        .filter((p, i, arr) => arr.indexOf(p) === i)
      if (
        nextPinned.length !== pinnedPaths.length ||
        nextPinned.some((p, i) => p !== pinnedPaths[i])
      ) {
        set(pinnedNotePathsAtom, nextPinned)
      }

      let nextTree = loadedTree

      /* Re-apply todo stats for moved nodes immediately so progress bars don't disappear. */
      if (todoMoves.size > 0) {
        const patchMap = new Map<string, Partial<FileNode>>()
        for (const [path, entry] of todoMoves.entries()) {
          patchMap.set(path, { todoTotal: entry.todoTotal, todoCompleted: entry.todoCompleted })
        }
        nextTree = patchFileNodesInTree(nextTree, patchMap)
      }

      set(fileTreeAtom, nextTree)

      /* Update tabs if any tab matches the moved path */
      const tabs = get(tabsAtom)

      let tabMatched = false
      const newTabs = tabs.map((tab) => {
        if (!tab.path) return tab
        const nextPath = remapPathPrefix(tab.path, src, dest)
        if (!nextPath) return tab
        tabMatched = true
        const canonicalNext = canonicalize(nextPath)
        const name = canonicalNext.substring(
          Math.max(canonicalNext.lastIndexOf('/'), canonicalNext.lastIndexOf('\\')) + 1
        )
        return { ...tab, path: canonicalNext, name }
      })

      if (tabMatched) {
        set(tabsAtom, newTabs)
      }

      /* Update selected node if it was the one moved/renamed */
      const selectedNode = get(selectedNodeAtom)
      if (selectedNode?.path) {
        const nextPath = remapPathPrefix(selectedNode.path, src, dest)
        if (nextPath) {
          const canonicalNext = canonicalize(nextPath)
          const name = canonicalNext.substring(
            Math.max(canonicalNext.lastIndexOf('/'), canonicalNext.lastIndexOf('\\')) + 1
          )
          set(selectedNodeAtom, { ...selectedNode, path: canonicalNext, name })
        }
      }
    }
  }
)

const toLocalDateFileName = () => {
  const now = new Date()
  const year = now.getFullYear()
  const monthIndex = now.getMonth()
  const day = now.getDate()

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ] as const

  const toOrdinalSuffix = (n: number) => {
    const mod100 = n % 100
    if (mod100 >= 11 && mod100 <= 13) return 'th'
    const mod10 = n % 10
    if (mod10 === 1) return 'st'
    if (mod10 === 2) return 'nd'
    if (mod10 === 3) return 'rd'
    return 'th'
  }

  const monthName = monthNames[monthIndex] ?? String(monthIndex + 1)
  return `${day}${toOrdinalSuffix(day)} ${monthName}-${year}.md`
}

export const createDailyNoteAtom = atom(null, async (get, set) => {
  const fileName = toLocalDateFileName()
  const tree = get(fileTreeAtom) ?? (await loadFileTree())
  const rootDir = inferRootDirFromTree(tree) ?? (await window.context.getRootDir())

  if (rootDir) {
    const separator = rootDir.includes('\\') ? '\\' : '/'
    const dailyDir = `${rootDir}${separator}Daily-Note`
    await window.context.ensureDirectory(dailyDir)
    const filePath = `${dailyDir}${separator}${fileName}`

    try {
      if ((await window.context.readFileNew(filePath)) === undefined) {
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
export const renamingPathAtom = atom<string | null>(null)
