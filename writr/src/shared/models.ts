export type NoteInfo = {
  title: string
  lastEditTime: number
}

export type NoteContent = string

export type Folder = {
  id: string
  name: string
  notes: NoteInfo[]
}
