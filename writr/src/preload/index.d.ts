import { GetNotes } from '@shared/types'

export {}

declare global {
  interface Window {
    // electron: ElectronAPI
    context: {
      locale: string
      getNotes: GetNotes
    }
  }
}
