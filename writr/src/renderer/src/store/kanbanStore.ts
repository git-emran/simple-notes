import { atomWithStorage } from 'jotai/utils'

export type KanbanCard = {
  id: string
  text: string
  completed?: boolean
}

export type KanbanColumn = {
  id: string
  title: string
  cards: KanbanCard[]
  /**
   * Muted accent color used to tint the column background (persisted).
   * Stored as a CSS color string (e.g. "#A3BE8C").
   */
  color?: string
}

export type KanbanState = {
  activeWorkspaceId: string
  workspaces: KanbanWorkspace[]
}

export type KanbanWorkspace = {
  id: string
  name: string
  columns: KanbanColumn[]
}

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`

const KANBAN_COLUMN_COLORS = [
  '#88C0D0', // muted cyan
  '#8FBCBB', // muted teal
  '#A3BE8C', // muted green
  '#EBCB8B', // muted yellow
  '#D08770', // muted orange
  '#BF616A', // muted red
  '#B48EAD', // muted purple
  '#AFC1D6', // muted blue-gray
  '#C6A8A4', // muted rose
  '#B9CDA4', // muted sage
  '#D4B483', // muted sand
  '#9FB8D6', // muted sky
] as const

const hashString = (value: string) => {
  let hash = 5381
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i)
  }
  return hash >>> 0
}

export const stableKanbanColumnColor = (columnId: string): string => {
  const idx = hashString(columnId) % KANBAN_COLUMN_COLORS.length
  return KANBAN_COLUMN_COLORS[idx]
}

export const pickNewKanbanColumnColor = (used: Iterable<string> = []): string => {
  const usedSet = new Set(Array.from(used))
  const available = KANBAN_COLUMN_COLORS.filter((c) => !usedSet.has(c))
  const palette = available.length > 0 ? available : KANBAN_COLUMN_COLORS
  return palette[Math.floor(Math.random() * palette.length)]
}

const pickRandomKanbanColumnColors = (count: number): string[] => {
  const shuffled = [...KANBAN_COLUMN_COLORS]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return Array.from({ length: count }, (_, index) => shuffled[index % shuffled.length])
}

export const createKanbanColumn = (title: string, color?: string): KanbanColumn => ({
  id: makeId('col'),
  title,
  cards: [],
  color: color ?? pickNewKanbanColumnColor(),
})

export const createKanbanCard = (text: string): KanbanCard => ({
  id: makeId('card'),
  text,
  completed: false,
})

export const createDefaultKanbanColumns = (options?: { randomizeColors?: boolean }): KanbanColumn[] => {
  const [todoColor, inProgressColor, doneColor] = options?.randomizeColors
    ? pickRandomKanbanColumnColors(3)
    : [
        stableKanbanColumnColor('col-todo'),
        stableKanbanColumnColor('col-in-progress'),
        stableKanbanColumnColor('col-done'),
      ]

  return [
    {
      id: 'col-todo',
      title: 'To-do',
      cards: [],
      color: todoColor,
    },
    {
      id: 'col-in-progress',
      title: 'In-progress',
      cards: [],
      color: inProgressColor,
    },
    {
      id: 'col-done',
      title: 'Done',
      cards: [],
      color: doneColor,
    },
  ]
}

export const createKanbanWorkspace = (name: string): KanbanWorkspace => ({
  id: makeId('workspace'),
  name,
  columns: createDefaultKanbanColumns({ randomizeColors: true }),
})

const defaultWorkspace = createKanbanWorkspace('My Tasks')

const DEFAULT_KANBAN_STATE: KanbanState = {
  activeWorkspaceId: defaultWorkspace.id,
  workspaces: [defaultWorkspace],
}

const normalizeColumn = (column: KanbanColumn): KanbanColumn => {
  const title =
    column.id === 'col-todo' && (column.title === 'To do' || column.title === 'Todo')
      ? 'To-do'
      : column.id === 'col-doing' && column.title === 'Doing'
        ? 'In-progress'
        : column.title

  return {
    ...column,
    title,
    color: column.color ?? stableKanbanColumnColor(column.id),
    cards: Array.isArray(column.cards) ? column.cards : [],
  }
}

export const normalizeKanbanState = (value: unknown): KanbanState => {
  const raw = value as Partial<KanbanState & { columns?: KanbanColumn[] }> | null | undefined

  if (raw && Array.isArray(raw.workspaces) && raw.workspaces.length > 0) {
    const workspaces = raw.workspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name || 'Workspace',
      columns:
        Array.isArray(workspace.columns) && workspace.columns.length > 0
          ? workspace.columns.map(normalizeColumn)
          : createDefaultKanbanColumns(),
    }))
    const activeWorkspaceId =
      typeof raw.activeWorkspaceId === 'string' &&
      workspaces.some((workspace) => workspace.id === raw.activeWorkspaceId)
        ? raw.activeWorkspaceId
        : workspaces[0].id

    return { activeWorkspaceId, workspaces }
  }

  if (raw && Array.isArray(raw.columns) && raw.columns.length > 0) {
    const workspace = createKanbanWorkspace('My Tasks')
    return {
      activeWorkspaceId: workspace.id,
      workspaces: [{ ...workspace, columns: raw.columns.map(normalizeColumn) }],
    }
  }

  return DEFAULT_KANBAN_STATE
}

export const kanbanStateAtom = atomWithStorage<KanbanState>('writr-kanban-state', DEFAULT_KANBAN_STATE)
