import { atomWithStorage } from 'jotai/utils'

export type SpreadsheetColumnType =
  | 'text'
  | 'number'
  | 'date'
  | 'status'
  | 'checkbox'
  | 'select'
  | 'multi-select'
  | 'url'
  | 'email'
  | 'currency'
  | 'tags'

export type SpreadsheetOption = {
  id: string
  label: string
  color: string
}

export type SpreadsheetColumn = {
  id: string
  name: string
  type: SpreadsheetColumnType
  width: number
  hidden?: boolean
  options?: SpreadsheetOption[]
}

export type SpreadsheetRow = {
  id: string
  cells: Record<string, string | boolean>
}

export type SpreadsheetTab = {
  id: string
  name: string
  columns: SpreadsheetColumn[]
  rows: SpreadsheetRow[]
  search: string
  sort: { columnId: string; direction: 'asc' | 'desc' } | null
  statusOptions: SpreadsheetOption[]
  defaultStatusId: string
}

export type SpreadsheetState = {
  activeSheetId: string
  sheets: SpreadsheetTab[]
}

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`

const statusOptions: SpreadsheetOption[] = [
  { id: 'todo', label: 'Todo', color: '#94a3b8' },
  { id: 'progress', label: 'In Progress', color: '#3b82f6' },
  { id: 'review', label: 'Review', color: '#eab308' },
  { id: 'blocked', label: 'Blocked', color: '#ef4444' },
  { id: 'done', label: 'Done', color: '#22c55e' }
]

const priorityOptions: SpreadsheetOption[] = [
  { id: 'low', label: 'Low', color: '#14b8a6' },
  { id: 'medium', label: 'Medium', color: '#eab308' },
  { id: 'high', label: 'High', color: '#f97316' }
]

const tagOptions: SpreadsheetOption[] = [
  { id: 'frontend', label: 'Frontend', color: '#8b5cf6' },
  { id: 'backend', label: 'Backend', color: '#06b6d4' },
  { id: 'bug', label: 'Bug', color: '#ef4444' },
  { id: 'feature', label: 'Feature', color: '#22c55e' }
]

const createColumns = (): SpreadsheetColumn[] => [
  { id: 'title', name: 'Name', type: 'text', width: 240 },
  { id: 'status', name: 'Status', type: 'status', width: 150, options: statusOptions },
  { id: 'owner', name: 'Owner', type: 'text', width: 150 },
  { id: 'priority', name: 'Priority', type: 'select', width: 135, options: priorityOptions },
  { id: 'due', name: 'Due', type: 'date', width: 140 },
  { id: 'estimate', name: 'Estimate', type: 'number', width: 120 },
  { id: 'tags', name: 'Tags', type: 'multi-select', width: 190, options: tagOptions },
  { id: 'done', name: 'Done', type: 'checkbox', width: 90 }
]

const createRow = (cells: SpreadsheetRow['cells'] = {}): SpreadsheetRow => ({
  id: uid('row'),
  cells
})

const createSheet = (id: string, name: string, rows: SpreadsheetRow[]): SpreadsheetTab => ({
  id,
  name,
  columns: createColumns(),
  rows,
  search: '',
  sort: null,
  statusOptions,
  defaultStatusId: 'todo'
})

export const createBlankSpreadsheetSheet = (name = 'Untitled'): SpreadsheetTab =>
  createSheet(uid('sheet'), name, [
    createRow({ title: 'New item', status: 'todo', priority: 'medium', done: false })
  ])

export const DEFAULT_SPREADSHEET_STATE: SpreadsheetState = {
  activeSheetId: 'roadmap',
  sheets: [
    createSheet('roadmap', 'Roadmap', [
      createRow({
        title: 'Draft desktop table editor',
        status: 'progress',
        owner: 'Design',
        priority: 'high',
        due: '2026-07-15',
        estimate: '8',
        tags: 'frontend,feature',
        done: false
      }),
      createRow({
        title: 'Polish markdown preview',
        status: 'review',
        owner: 'Product',
        priority: 'medium',
        due: '2026-07-18',
        estimate: '3',
        tags: 'frontend',
        done: false
      })
    ]),
    createSheet('tasks', 'Tasks', [
      createRow({ title: 'Write release notes', status: 'todo', owner: 'Emran', priority: 'medium', done: false }),
      createRow({ title: 'Check export flow', status: 'blocked', owner: 'QA', priority: 'high', done: false })
    ]),
    createSheet('expenses', 'Expenses', [
      createRow({ title: 'Design assets', status: 'done', owner: 'Ops', priority: 'low', estimate: '120', done: true }),
      createRow({ title: 'Plugin hosting', status: 'todo', owner: 'Ops', priority: 'medium', estimate: '29', done: false })
    ])
  ]
}

export const spreadsheetStateAtom = atomWithStorage<SpreadsheetState>(
  'writr-spreadsheet-state',
  DEFAULT_SPREADSHEET_STATE
)

export const createSpreadsheetId = uid
