import { GetNotes, ReadNote } from '@shared/types'

export {}

declare global {
  interface Window {
    // electron: ElectronAPI
    context: {
      locale: string
      getNotes: GetNotes
      readNotes: ReadNote
    }
  }
}
