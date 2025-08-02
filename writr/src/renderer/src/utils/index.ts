import clsx, { ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { GetNotes, ReadNote, WriteNote, CreateNote, DeleteNote } from '@shared/types'

export {}

declare global {
  interface Window {
    context: {
      locale: string
      getNotes: GetNotes
      readNotes: ReadNote
      writeNote: WriteNote
      createNote: CreateNote
      deleteNote: DeleteNote
    }
  }
}
const dateFormatter = new Intl.DateTimeFormat(window.context?.locale, {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'UTC'
})

export const formatDateFromMs = (ms: number) => dateFormatter.format(ms)

export const cn = (...args: ClassValue[]) => {
  return twMerge(clsx(...args))
}
