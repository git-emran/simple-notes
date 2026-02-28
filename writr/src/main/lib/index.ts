import { appDirectoryName, fileEncoding, welcomeNoteFileName } from '@shared/constants'
import { NoteInfo, FileNode } from '@shared/models'
import {
  CreateNote,
  DeleteNote,
  GetNotes,
  ReadNote,
  WriteNote,
  GetFileTree,
  CreateNoteNew,
  CreateDirectory,
  DeletePath,
  ReadFile,
  WriteFile,
  MovePath,
  ImportImageToNoteFolder,
  ListFreeAiModels,
  GenerateWithAi
} from '@shared/types'
import { BrowserWindow, dialog } from 'electron'
import { copy, readFile, writeFile, move, pathExists } from 'fs-extra'
import { ensureDir, readdir, stat } from 'fs-extra'
import { remove } from 'fs-extra'
import { isEmpty } from 'lodash'
import { homedir } from 'os'
import path from 'path'
import welcomeNoteFile from '../../../resources/welcomeNote.md?asset'

export const getRootDir = () => {
  return `${homedir()}/${appDirectoryName}`
}

const ensurePathWithinRoot = (candidatePath: string, options?: { allowRoot?: boolean }) => {
  const rootDir = path.resolve(getRootDir())
  const resolvedCandidate = path.resolve(candidatePath)
  const relativePath = path.relative(rootDir, resolvedCandidate)
  const isInsideRoot =
    relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))

  if (!isInsideRoot) {
    throw new Error(`Path is outside notes root: ${candidatePath}`)
  }

  if (options?.allowRoot === false && resolvedCandidate === rootDir) {
    throw new Error('Operation on root directory is not allowed')
  }

  return resolvedCandidate
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
  const filePath = path.join(rootDir, `${filename}.md`)
  const safePath = ensurePathWithinRoot(filePath)

  return readFile(safePath, { encoding: fileEncoding })
}

export const writeNote: WriteNote = async (filename, content) => {
  const rootDir = getRootDir()
  const filePath = path.join(rootDir, `${filename}.md`)
  const safePath = ensurePathWithinRoot(filePath)

  return writeFile(safePath, content, { encoding: fileEncoding })
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
  const filePath = path.join(rootDir, `${filename}.md`)
  const safePath = ensurePathWithinRoot(filePath, { allowRoot: false })

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
  await remove(safePath)

  return true
}

export const getFileTree: GetFileTree = async () => {
  const rootDir = getRootDir()
  await ensureDir(rootDir)

  const buildTree = async (currentDir: string): Promise<FileNode[]> => {
    const dirents = await readdir(currentDir, { withFileTypes: true })

    const nodesWithPotentialDuplicates = await Promise.all(
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
          if (!dirent.name.endsWith('.md') && !dirent.name.endsWith('.canvas')) return null
          
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

    const nodes = nodesWithPotentialDuplicates.filter((n): n is FileNode => n !== null)

    // Process file stats in chunks
    const fileNodes = nodes.filter(n => n.type === 'file')
    const CHUNK_SIZE = 10
    for (let i = 0; i < fileNodes.length; i += CHUNK_SIZE) {
      const chunk = fileNodes.slice(i, i + CHUNK_SIZE)
      await Promise.all(chunk.map(async (node) => {
        try {
          const fileStats = await stat(node.path)
          node.lastEditTime = fileStats.mtimeMs
          node.todoTotal = 0
          node.todoCompleted = 0
        } catch (e) {
          console.error(`Failed to read stats for ${node.path}:`, e)
        }
      }))
    }

    return nodes.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name)
      return a.type === 'folder' ? -1 : 1
    })
  }

  return buildTree(rootDir)
}

export const readFileNew: ReadFile = async (filePath) => {
  const safePath = ensurePathWithinRoot(filePath)
  return readFile(safePath, { encoding: fileEncoding })
}

export const writeFileNew: WriteFile = async (filePath, content) => {
  const safePath = ensurePathWithinRoot(filePath)
  return writeFile(safePath, content, { encoding: fileEncoding })
}

export const createNoteNew: CreateNoteNew = async (parentDir) => {
  const dir = parentDir ? ensurePathWithinRoot(parentDir) : path.resolve(getRootDir())
  await ensureDir(dir)

  let name = 'Untitled'
  let counter = 0
  let filePath = ''
  let availablePathFound = false

  while (!availablePathFound) {
    const fileName = counter === 0 ? `${name}.md` : `${name} (${counter}).md`
    filePath = path.join(dir, fileName)

    try {
      await stat(filePath)
      counter++
    } catch {
      availablePathFound = true
    }
  }

  await writeFile(filePath, '')
  return filePath
}

export const createCanvasNew = async (parentDir?: string) => {
  const dir = parentDir ? ensurePathWithinRoot(parentDir) : path.resolve(getRootDir())
  await ensureDir(dir)

  let name = 'Untitled'
  let counter = 0
  let filePath = ''
  let availablePathFound = false

  while (!availablePathFound) {
    const fileName = counter === 0 ? `${name}.canvas` : `${name} (${counter}).canvas`
    filePath = path.join(dir, fileName)

    try {
      await stat(filePath)
      counter++
    } catch {
      availablePathFound = true
    }
  }

  // Initialize with an empty canvas structure
  const emptyCanvas = { nodes: [], edges: [] }
  await writeFile(filePath, JSON.stringify(emptyCanvas, null, 2))
  return filePath
}

export const createDirectory: CreateDirectory = async (parentDir) => {
  const dir = parentDir ? ensurePathWithinRoot(parentDir) : path.resolve(getRootDir())
  await ensureDir(dir)

  let name = 'New Folder'
  let counter = 0
  let dirPath = ''
  let availableDirFound = false

  while (!availableDirFound) {
    const dirName = counter === 0 ? name : `${name} (${counter})`
    dirPath = path.join(dir, dirName)

    try {
      await stat(dirPath)
      counter++
    } catch {
      availableDirFound = true
    }
  }

  await ensureDir(dirPath)
  return dirPath
}

export const deletePath: DeletePath = async (filePath) => {
  try {
    const safePath = ensurePathWithinRoot(filePath, { allowRoot: false })
    const { response } = await dialog.showMessageBox({
      type: 'warning',
      title: 'Delete',
      message: `Are you sure you want to delete ${path.basename(safePath)}?`,
      buttons: ['Delete', 'Cancel'],
      defaultId: 1,
      cancelId: 1
    })

    if (response === 1) return false

    await remove(safePath)
    return true
  } catch (error) {
    console.error(error)
    return false
  }
}

export const movePath: MovePath = async (src, dest) => {
  try {
     const safeSrc = ensurePathWithinRoot(src, { allowRoot: false })
     const safeDest = ensurePathWithinRoot(dest, { allowRoot: false })
     const exists = await pathExists(safeDest)
     if (exists) {
         // Should we support overwrite? For now, no.
         // Or strictly speaking, if it's DnD, we might be moving into a folder, 
         // but the caller sends the full destination path.
         console.warn(`Destination ${safeDest} already exists`)
         return false
     }
     
     await move(safeSrc, safeDest)
     return true
  } catch (e) {
      console.error(e)
      return false
  }
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export const exportNoteToPdf = async (
  parentWindow: BrowserWindow,
  notePath: string,
  noteTitle: string,
  content: string
): Promise<boolean> => {
  let printWindow: BrowserWindow | null = null
  try {
    const safeNotePath = ensurePathWithinRoot(notePath)
    const noteDir = path.dirname(safeNotePath)
    const defaultSavePath = path.join(noteDir, `${noteTitle || 'Untitled'}.pdf`)

    const { canceled, filePath } = await dialog.showSaveDialog(parentWindow, {
      title: 'Export to PDF',
      defaultPath: defaultSavePath,
      buttonLabel: 'Export',
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })

    if (canceled || !filePath) return false

    printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        sandbox: true
      }
    })

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(noteTitle)}</title>
  <style>
    body {
      margin: 40px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #111827;
      background: #ffffff;
    }
    h1 {
      font-size: 20px;
      margin-bottom: 12px;
    }
    pre {
      white-space: pre-wrap;
      word-break: break-word;
      font-family: "JetBrains Mono", "SFMono-Regular", Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      line-height: 1.6;
      margin: 0;
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(noteTitle || 'Untitled')}</h1>
  <pre>${escapeHtml(content)}</pre>
</body>
</html>`

    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    const pdf = await printWindow.webContents.printToPDF({
      printBackground: true,
      margins: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      }
    })
    await writeFile(filePath, pdf)

    return true
  } catch (error) {
    console.error('Failed to export PDF:', error)
    return false
  } finally {
    if (printWindow && !printWindow.isDestroyed()) {
      printWindow.destroy()
    }
  }
}

const imageExtensions = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.bmp'
])

export const importImageToNoteFolder: ImportImageToNoteFolder = async (notePath, sourceImagePath) => {
  try {
    const extension = path.extname(sourceImagePath).toLowerCase()
    if (!imageExtensions.has(extension)) return null

    const safeNotePath = ensurePathWithinRoot(notePath)
    const noteDir = path.dirname(safeNotePath)
    ensurePathWithinRoot(noteDir)
    const sourceName = path.basename(sourceImagePath, extension).replace(/[^\w.-]+/g, '-')
    let targetName = `${sourceName || 'image'}${extension}`
    let counter = 1
    let targetPath = path.join(noteDir, targetName)

    while (await pathExists(targetPath)) {
      targetName = `${sourceName || 'image'}-${counter}${extension}`
      targetPath = path.join(noteDir, targetName)
      counter++
    }

    await ensureDir(noteDir)
    await copy(sourceImagePath, targetPath, { overwrite: false, errorOnExist: true })

    return {
      markdownPath: targetName,
      absolutePath: targetPath
    }
  } catch (error) {
    console.error('Failed to import image:', error)
    return null
  }
}

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

const fallbackFreeModels = [
  { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B Instruct (Free)' },
  { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B Instruct (Free)' },
  { id: 'google/gemma-2-9b-it:free', name: 'Gemma 2 9B IT (Free)' }
]

export const listFreeAiModels: ListFreeAiModels = async (apiKey) => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (apiKey?.trim()) {
      headers.Authorization = `Bearer ${apiKey.trim()}`
    }

    const response = await fetch(`${OPENROUTER_BASE_URL}/models`, { headers })
    if (!response.ok) {
      return fallbackFreeModels
    }

    const payload = (await response.json()) as {
      data?: Array<{
        id: string
        name?: string
        pricing?: { prompt?: string; completion?: string }
      }>
    }

    const freeModels = (payload.data ?? [])
      .filter((model) => model.id && model.id.endsWith(':free'))
      .map((model) => ({
        id: model.id,
        name: model.name || model.id
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return freeModels.length > 0 ? freeModels : fallbackFreeModels
  } catch (error) {
    console.error('Failed to list free AI models:', error)
    return fallbackFreeModels
  }
}

export const generateWithAi: GenerateWithAi = async ({ model, prompt, content, apiKey }) => {
  try {
    if (!apiKey?.trim()) {
      return { error: 'OpenRouter API key is required to generate text.' }
    }

    const finalPrompt = prompt.trim()
    if (!finalPrompt) {
      return { error: 'Prompt cannot be empty.' }
    }

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content:
              'You are a writing assistant. Return only polished markdown text based on the instruction.'
          },
          {
            role: 'user',
            content: `Instruction:\n${finalPrompt}\n\nCurrent content:\n${content || '(empty)'}`
          }
        ]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      return { error: `AI request failed: ${response.status} ${errorText}` }
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }

    const text = payload.choices?.[0]?.message?.content?.trim()
    if (!text) {
      return { error: 'AI returned an empty response.' }
    }

    return { text }
  } catch (error) {
    console.error('Failed to generate AI text:', error)
    return { error: 'AI generation failed. Please try again.' }
  }
}
