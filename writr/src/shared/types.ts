import { NoteContent, NoteInfo, FileNode } from './models'

export type GetNotes = () => Promise<NoteInfo[]>
export type ReadNote = (title: NoteInfo['title']) => Promise<NoteContent>
export type WriteNote = (title: NoteInfo['title'], content: NoteContent) => Promise<void>
export type CreateNote = () => Promise<NoteInfo['title'] | false>
export type DeleteNote = (title: NoteInfo['title']) => Promise<boolean>

export type GetFileTree = () => Promise<FileNode[]>
export type ReadFile = (path: string) => Promise<string>
export type WriteFile = (path: string, content: string) => Promise<void>
export type CreateNoteNew = (parentDir: string) => Promise<string | false>
export type DeletePath = (path: string) => Promise<boolean>
export type CreateDirectory = (parentDir: string) => Promise<string | false>
export type MovePath = (src: string, dest: string) => Promise<boolean>

