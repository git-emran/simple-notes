import { appDirectoryName, fileEncoding, welcomeNoteFileName } from '@shared/constants'
import { NoteInfo, FileNode } from '@shared/models'
import { CreateNote, DeleteNote, GetNotes, ReadNote, WriteNote, GetFileTree, CreateNoteNew, CreateDirectory, DeletePath, ReadFile, WriteFile, MovePath } from '@shared/types'
import { dialog } from 'electron'
import { readFile, writeFile, move, pathExists } from 'fs-extra'
import { ensureDir, readdir, stat } from 'fs-extra'
import { remove } from 'fs-extra'
import { isEmpty } from 'lodash'
import { homedir } from 'os'
import path from 'path'
import welcomeNoteFile from '../../../resources/welcomeNote.md?asset'

export const getRootDir = () => {
  return `${homedir()}/${appDirectoryName}`
}

export const getNotes: GetNotes = async () => {
  const rootDir = getRootDir()

  await ensureDir(rootDir)

  const notesFileNames = await readdir(rootDir, {
    encoding: fileEncoding,
    withFileTypes: false
  })

  const notes = notesFileNames.filter((fileName) => fileName.endsWith('.md'))

  if (isEmpty(notes)) {
    const content = await readFile(welcomeNoteFile, { encoding: fileEncoding })
    await writeFile(`${rootDir}/${welcomeNoteFileName}`, content, { encoding: fileEncoding })

    notes.push('Welcome.md')
  }

  return Promise.all(notes.map(getNoteInfoFromFilename))
}

export const getNoteInfoFromFilename = async (fileName: string): Promise<NoteInfo> => {
  const fileStats = await stat(`${getRootDir()}/${fileName}`)
  return {
    title: fileName.replace(/\.md$/, ''),
    lastEditTime: fileStats.mtimeMs
  }
}

export const readNote: ReadNote = async (filename: string) => {
  const rootDir = getRootDir()

  return readFile(`${rootDir}/${filename}.md`, { encoding: fileEncoding })
}

export const writeNote: WriteNote = async (filename, content) => {
  const rootDir = getRootDir()

  return writeFile(`${rootDir}/${filename}.md`, content, { encoding: fileEncoding })
}

export const createNote: CreateNote = async () => {
  const rootDir = getRootDir()

  await ensureDir(rootDir)

  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'New Note',
    defaultPath: `${rootDir}/Untitled.md`,
    buttonLabel: 'Create',
    properties: ['showOverwriteConfirmation'],
    showsTagField: false,
    filters: [{ name: 'Markdown', extensions: ['md'] }]
  })

  if (canceled || !filePath) {
    return false
  }

  const { name: filename, dir: parentDir } = path.parse(filePath)

  if (parentDir !== rootDir) {
    await dialog.showMessageBox({
      type: 'error',
      title: 'Creation failed',
      message: `All notes must be saved under ${rootDir}. Avoid using other directories`
    })

    return false
  }

  console.info(`Creating Note: ${filePath}`)
  await writeFile(filePath, '')

  return filename
}

export const deleteNote: DeleteNote = async (filename) => {
  const rootDir = getRootDir()

  const { response } = await dialog.showMessageBox({
    type: 'warning',
    title: 'Delete Note',
    message: `Are you sure you want to delete ${filename}`,
    buttons: ['Delete', 'Cancel'],
    defaultId: 1,
    cancelId: 1
  })

  if (response === 1) {
    return false
  }

  console.info(`Deleting note: ${filename}`)
  await remove(`${rootDir}/${filename}.md`)

  return true
}

export const getFileTree: GetFileTree = async () => {
  const rootDir = getRootDir()
  await ensureDir(rootDir)

  const buildTree = async (currentDir: string): Promise<FileNode[]> => {
    const dirents = await readdir(currentDir, { withFileTypes: true })

    const nodes = await Promise.all(
      dirents.map(async (dirent) => {
        const res = path.resolve(currentDir, dirent.name)
        const isDirectory = dirent.isDirectory()

        if (isDirectory) {
          return {
            id: res,
            name: dirent.name,
            path: res,
            type: 'folder',
            children: await buildTree(res),
            isExpanded: false
          } as FileNode
        } else {
          if (!dirent.name.endsWith('.md')) return null

          return {
            id: res,
            name: dirent.name,
            path: res,
            type: 'file',
            isExpanded: false
          } as FileNode
        }
      })
    )

    return nodes.filter(Boolean).sort((a, b) => {
      if (a!.type === b!.type) return a!.name.localeCompare(b!.name)
      return a!.type === 'folder' ? -1 : 1
    }) as FileNode[]
  }

  return buildTree(rootDir)
}

export const readFileNew: ReadFile = async (filePath) => {
  return readFile(filePath, { encoding: fileEncoding })
}

export const writeFileNew: WriteFile = async (filePath, content) => {
  return writeFile(filePath, content, { encoding: fileEncoding })
}

export const createNoteNew: CreateNoteNew = async (parentDir) => {
  const dir = parentDir || getRootDir()
  await ensureDir(dir)

  let name = 'Untitled'
  let counter = 0
  let filePath = ''

  while (true) {
    const fileName = counter === 0 ? `${name}.md` : `${name} (${counter}).md`
    filePath = path.join(dir, fileName)

    try {
      await stat(filePath)
      counter++
    } catch {
      break
    }
  }

  await writeFile(filePath, '')
  return filePath
}

export const createDirectory: CreateDirectory = async (parentDir) => {
  const dir = parentDir || getRootDir()
  await ensureDir(dir)

  let name = 'New Folder'
  let counter = 0
  let dirPath = ''

  while (true) {
    const dirName = counter === 0 ? name : `${name} (${counter})`
    dirPath = path.join(dir, dirName)

    try {
      await stat(dirPath)
      counter++
    } catch {
      break
    }
  }

  await ensureDir(dirPath)
  return dirPath
}

export const deletePath: DeletePath = async (filePath) => {
  try {
    const { response } = await dialog.showMessageBox({
      type: 'warning',
      title: 'Delete',
      message: `Are you sure you want to delete ${path.basename(filePath)}?`,
      buttons: ['Delete', 'Cancel'],
      defaultId: 1,
      cancelId: 1
    })

    if (response === 1) return false

    await remove(filePath)
    return true
  } catch (error) {
    console.error(error)
    return false
  }
}

export const movePath: MovePath = async (src, dest) => {
  try {
     const exists = await pathExists(dest)
     if (exists) {
         // Should we support overwrite? For now, no.
         // Or strictly speaking, if it's DnD, we might be moving into a folder, 
         // but the caller sends the full destination path.
         console.warn(`Destination ${dest} already exists`)
         return false
     }
     
     await move(src, dest)
     return true
  } catch (e) {
      console.error(e)
      return false
  }
}
