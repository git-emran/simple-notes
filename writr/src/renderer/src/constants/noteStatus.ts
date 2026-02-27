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
    className:
      'border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-100',
  },
  'on hold': {
    label: 'On Hold',
    className:
      'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-900/35 dark:text-amber-100',
  },
  completed: {
    label: 'Completed',
    className:
      'border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-700 dark:bg-sky-900/35 dark:text-sky-100',
  },
  dropped: {
    label: 'Dropped',
    className:
      'border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-700 dark:bg-rose-900/35 dark:text-rose-100',
  },
}
