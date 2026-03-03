import { atomWithStorage } from 'jotai/utils'

export type KanbanCard = {
  id: string
  text: string
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

export const createKanbanColumn = (title: string, color?: string): KanbanColumn => ({
  id: makeId('col'),
  title,
  cards: [],
  color: color ?? pickNewKanbanColumnColor(),
})

export const createKanbanCard = (text: string): KanbanCard => ({
  id: makeId('card'),
  text,
})

export const kanbanStateAtom = atomWithStorage<KanbanState>('writr-kanban-state', {
  columns: [
    {
      id: 'col-todo',
      title: 'To do',
      cards: [],
      color: stableKanbanColumnColor('col-todo'),
    },
    {
      id: 'col-doing',
      title: 'Doing',
      cards: [],
      color: stableKanbanColumnColor('col-doing'),
    },
    {
      id: 'col-done',
      title: 'Done',
      cards: [],
      color: stableKanbanColumnColor('col-done'),
    },
  ],
})
