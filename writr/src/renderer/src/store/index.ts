import { NoteContent, NoteInfo, FileNode } from '@shared/models'
import { atom } from 'jotai'
import { unwrap } from 'jotai/utils'

// File Tree Atoms
const loadFileTree = async () => {
  return await window.context.getFileTree()
}

const fileTreeAtomAsync = atom<FileNode[] | Promise<FileNode[]>>(loadFileTree())
export const fileTreeAtom = unwrap(fileTreeAtomAsync, (prev) => prev)

export const selectedNodeAtom = atom<FileNode | null>(null)

export const isDarkModeAtom = atom(false)

// Notes Atoms (derived from selectedNode)
export const selectedNoteAtomAsync = atom(async (get) => {
  const selectedNode = get(selectedNodeAtom)

  if (!selectedNode || selectedNode.type !== 'file') return null

  const content = await window.context.readFileNew(selectedNode.path)

  return {
    title: selectedNode.name.replace(/\.md$/, ''),
    lastEditTime: Date.now(),
    content: content,
    path: selectedNode.path
  }
})

export const selectedNoteAtom = unwrap(
  selectedNoteAtomAsync,
  (prev) =>
    prev ?? {
      title: '',
      content: '',
      lastEditTime: Date.now(),
      path: ''
    }
)

export const saveNoteAtom = atom(null, async (get, _set, newContent: NoteContent) => {
  const selectedNote = get(selectedNoteAtom)

  if (!selectedNote || !selectedNote.path) return

  await window.context.writeFileNew(selectedNote.path, newContent)

})

export const createNoteAtom = atom(null, async (_, set, parentDir: string) => {
  const filePath = await window.context.createNoteNew(parentDir)
  if (!filePath) return

  // Refresh tree
  set(fileTreeAtom, await loadFileTree())
})

export const createDirectoryAtom = atom(null, async (_, set, parentDir: string) => {
  const dirPath = await window.context.createDirectory(parentDir)
  if (!dirPath) return

  // Refresh tree
  set(fileTreeAtom, await loadFileTree())
})

export const deleteNodeAtom = atom(null, async (_, set, path: string) => {
  const isDeleted = await window.context.deletePath(path)
  if (!isDeleted) return

  set(selectedNodeAtom, null)
  set(fileTreeAtom, await loadFileTree())
})

export const movePathAtom = atom(null, async (get, set, { src, dest }: { src: string; dest: string }) => {
  const success = await window.context.movePath(src, dest)
  if (success) {
    set(fileTreeAtom, await loadFileTree())

    // Update selected node if it was the one moved/renamed
    const selectedNode = get(selectedNodeAtom)
    if (selectedNode?.path === src) {
        const name = dest.substring(Math.max(dest.lastIndexOf('/'), dest.lastIndexOf('\\')) + 1)
        set(selectedNodeAtom, { ...selectedNode, path: dest, name })
    }
  }
})
