export const NOTE_STATUS_VALUES = ['active', 'on hold', 'completed', 'dropped'] as const

export type NoteStatus = (typeof NOTE_STATUS_VALUES)[number]

export const NOTE_STATUS_META: Record<
  NoteStatus,
  {
    label: string
    className: string
  }
> = {
  active: {
    label: 'Active',
    className: 'border-emerald-500/35 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  },
  'on hold': {
    label: 'On Hold',
    className: 'border-amber-500/35 bg-amber-500/15 text-amber-700 dark:text-amber-300',
  },
  completed: {
    label: 'Completed',
    className: 'border-sky-500/35 bg-sky-500/15 text-sky-700 dark:text-sky-300',
  },
  dropped: {
    label: 'Dropped',
    className: 'border-rose-500/35 bg-rose-500/15 text-rose-700 dark:text-rose-300',
  },
}
