import {
  createCanvasAtom,
  createKanbanTabAtom,
  createSpreadsheetTabAtom,
  createTerminalTabAtom,
  showToolbarAtom,
  fileTreeAtom,
  openTabAtom,
  selectVaultDirectoryAtom,
  resetVaultDirectoryAtom,
  vaultRootDirAtom,
  isCommandPaletteOpenAtom
} from '@renderer/store'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useEffect, useMemo } from 'react'
import { VscProject, VscSymbolRuler, VscTable, VscTerminal, VscFile, VscFolderOpened, VscRefresh } from 'react-icons/vsc'
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
  openAiModal: () => void
  isActive: boolean
  isFullPreview?: boolean
  isAiModalOpen?: boolean
  canOpenCommandPalette?: () => boolean
}

export function useCommandPalette({
  viewRef,
  selectedNote,
  openAiModal,
  isActive
}: UseCommandPaletteParams) {
  const [showToolbar, setShowToolbar] = useAtom(showToolbarAtom)
  const createKanbanTab = useSetAtom(createKanbanTabAtom)
  const createTerminalTab = useSetAtom(createTerminalTabAtom)
  const createSpreadsheetTab = useSetAtom(createSpreadsheetTabAtom)
  const createCanvas = useSetAtom(createCanvasAtom)
  const selectVaultDirectory = useSetAtom(selectVaultDirectoryAtom)
  const resetVaultDirectory = useSetAtom(resetVaultDirectoryAtom)
  const vaultRootDir = useAtomValue(vaultRootDirAtom)
  const fileTree = useAtomValue(fileTreeAtom)
  const openTab = useSetAtom(openTabAtom)

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useAtom(isCommandPaletteOpenAtom)

  // Close palette when note is deselected
  useEffect(() => {
    if (!selectedNote?.path) setIsCommandPaletteOpen(false)
  }, [selectedNote?.path, setIsCommandPaletteOpen])

  // Keyboard shortcuts: Ctrl+Alt+T (toolbar toggle)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return
      const key = e.key.toLowerCase()

      const isToggleToolbar = key === 't' && e.ctrlKey && e.altKey
      if (isToggleToolbar) {
        e.preventDefault()
        e.stopPropagation()
        setShowToolbar((prev) => !prev)
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [isActive, setShowToolbar])

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
        id: 'vault-open',
        label: 'Vault: Open / Switch Notes Directory...',
        icon: <VscFolderOpened />,
        keywords: ['vault', 'folder', 'directory', 'open', 'switch', 'notes'],
        run: () => void selectVaultDirectory()
      },
      {
        id: 'vault-reveal',
        label: 'Vault: Reveal Notes Directory in File Manager',
        icon: <VscFolderOpened />,
        keywords: ['vault', 'folder', 'directory', 'reveal', 'finder', 'explorer'],
        run: () => {
          if (vaultRootDir && window.context?.revealPath) {
            void window.context.revealPath(vaultRootDir)
          }
        }
      },
      {
        id: 'vault-reset',
        label: 'Vault: Reset to Default Notes Directory (~/Writr)',
        icon: <VscRefresh />,
        keywords: ['vault', 'folder', 'directory', 'reset', 'default'],
        run: () => void resetVaultDirectory()
      },
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
    [
      createCanvas,
      createKanbanTab,
      createSpreadsheetTab,
      createTerminalTab,
      getSelectedNoteDir,
      resetVaultDirectory,
      selectVaultDirectory,
      vaultRootDir
    ]
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

  const slashCommandItems: CommandPaletteItem[] = useMemo(
    () => [...editorCommandItems, ...panelCommandItems],
    [editorCommandItems, panelCommandItems]
  )

  return {
    showToolbar,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    commandPaletteItems,
    editorMenuEntries,
    editorCommandItems,
    slashCommandItems
  }
}
