import {
  createCanvasAtom,
  createKanbanTabAtom,
  createTerminalTabAtom,
  showToolbarAtom,
} from '@renderer/store'
import { useAtom, useSetAtom } from 'jotai'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { VscProject, VscSymbolRuler, VscTerminal } from 'react-icons/vsc'
import { type CommandPaletteItem } from '../CommandPaletteModal'
import { EditorMenuEntry, getEditorMenuEntries } from '../editorMenuLogic'
import type { SelectedNote, ViewRef } from './types'

interface UseCommandPaletteParams {
  viewRef: ViewRef
  selectedNote: SelectedNote | null
  isFullPreview: boolean
  isAiModalOpen: boolean
  openAiModal: () => void
}

export function useCommandPalette({
  viewRef,
  selectedNote,
  isFullPreview,
  isAiModalOpen,
  openAiModal,
}: UseCommandPaletteParams) {
  const [showToolbar, setShowToolbar] = useAtom(showToolbarAtom)
  const createKanbanTab = useSetAtom(createKanbanTabAtom)
  const createTerminalTab = useSetAtom(createTerminalTabAtom)
  const createCanvas = useSetAtom(createCanvasAtom)

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

  // Close palette when note is deselected
  useEffect(() => {
    if (!selectedNote?.path) setIsCommandPaletteOpen(false)
  }, [selectedNote?.path])

  // Keyboard shortcuts: Mod+P (command palette) and Ctrl+Alt+T (toolbar toggle)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
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
  }, [isAiModalOpen, isFullPreview, selectedNote?.path, setShowToolbar])

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
        id: 'panel-canvas',
        label: 'Canvas',
        icon: <VscSymbolRuler />,
        keywords: ['panel', 'left', 'diagram', 'whiteboard'],
        run: () => void createCanvas(getSelectedNoteDir())
      }
    ],
    [createCanvas, createKanbanTab, createTerminalTab, getSelectedNoteDir]
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

  const commandPaletteItems: CommandPaletteItem[] = useMemo(
    () => [...panelCommandItems, ...editorCommandItems],
    [editorCommandItems, panelCommandItems]
  )

  return {
    showToolbar,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    commandPaletteItems,
    editorMenuEntries,
  }
}
