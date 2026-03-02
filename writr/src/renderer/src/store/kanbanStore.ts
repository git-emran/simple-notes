import { atomWithStorage } from 'jotai/utils'

export type KanbanCard = {
  id: string
  text: string
}

export type KanbanColumn = {
  id: string
  title: string
  cards: KanbanCard[]
}

export type KanbanState = {
  columns: KanbanColumn[]
}

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`

export const createKanbanColumn = (title: string): KanbanColumn => ({
  id: makeId('col'),
  title,
  cards: [],
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
    },
    {
      id: 'col-doing',
      title: 'Doing',
      cards: [],
    },
    {
      id: 'col-done',
      title: 'Done',
      cards: [],
    },
  ],
})
