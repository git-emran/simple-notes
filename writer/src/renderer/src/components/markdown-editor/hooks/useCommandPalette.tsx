import {
  createCanvasAtom,
  createKanbanTabAtom,
  createSpreadsheetTabAtom,
  createTerminalTabAtom,
  showToolbarAtom,
  fileTreeAtom,
  openTabAtom
} from '@renderer/store'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { VscProject, VscSymbolRuler, VscTable, VscTerminal, VscFile } from 'react-icons/vsc'
import { type CommandPaletteItem } from '../CommandPaletteModal'
import { EditorMenuEntry, getEditorMenuEntries } from '../editorMenuLogic'
import type { SelectedNote, ViewRef } from './types'
import { FileNode } from '@shared/models'

const flattenFiles = (nodes: FileNode[]): FileNode[] => {
  const output: FileNode[] = []
  for (const node of nodes) {
    if (node.type === 'file') {
      output.push(node)
      continue
    }
    if (node.children?.length) {
      output.push(...flattenFiles(node.children))
    }
  }
  return output
}

interface UseCommandPaletteParams {
  viewRef: ViewRef
  selectedNote: SelectedNote | null
  isFullPreview: boolean
  isAiModalOpen: boolean
  openAiModal: () => void
  isActive: boolean
}

export function useCommandPalette({
  viewRef,
  selectedNote,
  isFullPreview,
  isAiModalOpen,
  openAiModal,
  isActive
}: UseCommandPaletteParams) {
  const [showToolbar, setShowToolbar] = useAtom(showToolbarAtom)
  const createKanbanTab = useSetAtom(createKanbanTabAtom)
  const createTerminalTab = useSetAtom(createTerminalTabAtom)
  const createSpreadsheetTab = useSetAtom(createSpreadsheetTabAtom)
  const createCanvas = useSetAtom(createCanvasAtom)
  const fileTree = useAtomValue(fileTreeAtom)
  const openTab = useSetAtom(openTabAtom)

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

  // Close palette when note is deselected
  useEffect(() => {
    if (!selectedNote?.path) setIsCommandPaletteOpen(false)
  }, [selectedNote?.path])

  // Keyboard shortcuts: Mod+P (command palette) and Ctrl+Alt+T (toolbar toggle)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return
      const key = e.key.toLowerCase()

      const isToggleToolbar = key === 't' && e.ctrlKey && e.altKey
      if (isToggleToolbar) {
        e.preventDefault()
        e.stopPropagation()
        setShowToolbar((prev) => !prev)
        return
      }

      const isModP = key === 'p' && (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey
      if (!isModP) return

      if (isFullPreview) return
      if (isAiModalOpen) return
      if (!selectedNote?.path) return

      e.preventDefault()
      e.stopPropagation()
      setIsCommandPaletteOpen(true)
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [isAiModalOpen, isFullPreview, selectedNote?.path, setShowToolbar, isActive])

  const editorMenuEntries: EditorMenuEntry[] = useMemo(
    () => getEditorMenuEntries(openAiModal),
    [openAiModal]
  )

  const getSelectedNoteDir = useCallback(() => {
    const path = selectedNote?.path ?? ''
    if (!path) return ''
    const lastSlash = path.lastIndexOf('/')
    const lastBackslash = path.lastIndexOf('\\')
    const maxIndex = Math.max(lastSlash, lastBackslash)
    return maxIndex === -1 ? '' : path.substring(0, maxIndex)
  }, [selectedNote?.path])

  const panelCommandItems: CommandPaletteItem[] = useMemo(
    () => [
      {
        id: 'panel-kanban',
        label: 'Kanban',
        icon: <VscProject />,
        keywords: ['panel', 'left', 'board', 'project'],
        run: () => createKanbanTab()
      },
      {
        id: 'panel-terminal',
        label: 'Terminal',
        icon: <VscTerminal />,
        keywords: ['panel', 'left', 'shell', 'cli'],
        run: () => createTerminalTab()
      },
      {
        id: 'panel-spreadsheet',
        label: 'Spreadsheet',
        icon: <VscTable />,
        keywords: ['panel', 'table', 'sheet', 'grid', 'database'],
        run: () => createSpreadsheetTab()
      },
      {
        id: 'panel-canvas',
        label: 'Canvas',
        icon: <VscSymbolRuler />,
        keywords: ['panel', 'left', 'diagram', 'whiteboard'],
        run: () => void createCanvas(getSelectedNoteDir())
      }
    ],
    [createCanvas, createKanbanTab, createSpreadsheetTab, createTerminalTab, getSelectedNoteDir]
  )

  const editorCommandItems: CommandPaletteItem[] = useMemo(
    () =>
      editorMenuEntries
        .filter((e): e is Extract<EditorMenuEntry, { type: 'item' }> => e.type === 'item')
        .map(({ id, label, icon, shortcut, keywords, run }) => ({
          id,
          label,
          icon,
          shortcut,
          keywords,
          run: () => run(viewRef.current)
        })),
    [editorMenuEntries, viewRef]
  )

  const searchNoteItems: CommandPaletteItem[] = useMemo(() => {
    const files = flattenFiles(fileTree ?? [])
    return files.map((file) => ({
      id: `open-${file.path}`,
      label: file.name,
      icon: <VscFile />,
      keywords: ['file', 'note', 'open', file.path],
      run: () => openTab(file)
    }))
  }, [fileTree, openTab])

  const commandPaletteItems: CommandPaletteItem[] = useMemo(
    () => [...panelCommandItems, ...searchNoteItems],
    [panelCommandItems, searchNoteItems]
  )

  return {
    showToolbar,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    commandPaletteItems,
    editorMenuEntries,
    editorCommandItems,
  }
}
