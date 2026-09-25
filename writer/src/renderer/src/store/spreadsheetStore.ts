import { atomWithStorage } from 'jotai/utils'
import { LocaleType, type IWorkbookData } from '@univerjs/core'

export const DEFAULT_UNIVER_WORKBOOK_DATA: IWorkbookData = {
  id: 'univer-workbook-1',
  name: 'Writer Spreadsheet',
  appVersion: '0.25.1',
  locale: LocaleType.EN_US,
  styles: {},
  sheetOrder: ['sheet-roadmap', 'sheet-tasks', 'sheet-expenses'],
  sheets: {
    'sheet-roadmap': {
      id: 'sheet-roadmap',
      name: 'Roadmap',
      rowCount: 100,
      columnCount: 20,
      cellData: {
        0: {
          0: { v: 'Feature Name', s: { bl: 1 } },
          1: { v: 'Status', s: { bl: 1 } },
          2: { v: 'Owner', s: { bl: 1 } },
          3: { v: 'Priority', s: { bl: 1 } },
          4: { v: 'Due Date', s: { bl: 1 } },
          5: { v: 'Estimate (hrs)', s: { bl: 1 } }
        },
        1: {
          0: { v: 'Draft desktop table editor' },
          1: { v: 'In Progress' },
          2: { v: 'Design' },
          3: { v: 'High' },
          4: { v: '2026-07-15' },
          5: { v: 8 }
        },
        2: {
          0: { v: 'Polish markdown preview' },
          1: { v: 'Review' },
          2: { v: 'Product' },
          3: { v: 'Medium' },
          4: { v: '2026-07-18' },
          5: { v: 3 }
        },
        3: {
          0: { v: 'Univer Excel Spreadsheet Integration' },
          1: { v: 'In Progress' },
          2: { v: 'Emran' },
          3: { v: 'High' },
          4: { v: '2026-09-08' },
          5: { v: 5 }
        }
      }
    },
    'sheet-tasks': {
      id: 'sheet-tasks',
      name: 'Tasks',
      rowCount: 100,
      columnCount: 20,
      cellData: {
        0: {
          0: { v: 'Task Description', s: { bl: 1 } },
          1: { v: 'Assignee', s: { bl: 1 } },
          2: { v: 'Status', s: { bl: 1 } }
        },
        1: {
          0: { v: 'Write release notes' },
          1: { v: 'Emran' },
          2: { v: 'Todo' }
        },
        2: {
          0: { v: 'Check export flow' },
          1: { v: 'QA' },
          2: { v: 'Blocked' }
        }
      }
    },
    'sheet-expenses': {
      id: 'sheet-expenses',
      name: 'Expenses',
      rowCount: 100,
      columnCount: 20,
      cellData: {
        0: {
          0: { v: 'Item', s: { bl: 1 } },
          1: { v: 'Category', s: { bl: 1 } },
          2: { v: 'Amount ($)', s: { bl: 1 } }
        },
        1: {
          0: { v: 'Design assets' },
          1: { v: 'Ops' },
          2: { v: 120 }
        },
        2: {
          0: { v: 'Plugin hosting' },
          1: { v: 'Ops' },
          2: { v: 29 }
        },
        3: {
          0: { v: 'Cloud Server' },
          1: { v: 'Infrastructure' },
          2: { v: 45 }
        },
        4: {
          0: { v: 'Total Expenses', s: { bl: 1 } },
          1: { v: '' },
          2: { f: '=SUM(C2:C4)', v: 194, s: { bl: 1 } }
        }
      }
    }
  }
}

export const isValidWorkbookData = (data: unknown): data is IWorkbookData => {
  if (!data || typeof data !== 'object') return false
  const wb = data as Partial<IWorkbookData>
  return Boolean(
    wb.sheetOrder &&
      Array.isArray(wb.sheetOrder) &&
      wb.sheetOrder.length > 0 &&
      wb.sheets &&
      typeof wb.sheets === 'object' &&
      !Array.isArray(wb.sheets)
  )
}

export const univerWorkbookAtom = atomWithStorage<IWorkbookData>(
  'writr-univer-workbook-state-v2',
  DEFAULT_UNIVER_WORKBOOK_DATA
)

