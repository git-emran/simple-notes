export type NoteInfo = {
  title: string
  lastEditTime: number
}

export type FileNode = {
  id: string
  name: string
  path: string
  type: 'file' | 'folder'
  children?: FileNode[]

  isExpanded: boolean
}

export type NoteContent = string
