import {
  isCommandPaletteOpenAtom,
  createCanvasAtom,
  createKanbanTabAtom,
  createSpreadsheetTabAtom,
  createTerminalTabAtom,
  createDailyNoteAtom,
  createSettingsTabAtom,
  fileTreeAtom,
  openTabAtom,
  selectVaultDirectoryAtom,
  resetVaultDirectoryAtom,
  vaultRootDirAtom,
  selectedNodeAtom
} from '@renderer/store'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useMemo, useCallback } from 'react'
import {
  VscProject,
  VscSymbolRuler,
  VscTable,
  VscTerminal,
  VscFile,
  VscFolderOpened,
  VscRefresh,
  VscCalendar,
  VscSettingsGear
} from 'react-icons/vsc'
import { CommandPaletteModal, type CommandPaletteItem } from './markdown-editor/CommandPaletteModal'
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

export const GlobalCommandPalette = () => {
  const [isOpen, setIsOpen] = useAtom(isCommandPaletteOpenAtom)
  const createKanbanTab = useSetAtom(createKanbanTabAtom)
  const createTerminalTab = useSetAtom(createTerminalTabAtom)
  const createSpreadsheetTab = useSetAtom(createSpreadsheetTabAtom)
  const createCanvas = useSetAtom(createCanvasAtom)
  const createDailyNote = useSetAtom(createDailyNoteAtom)
  const createSettingsTab = useSetAtom(createSettingsTabAtom)
  const selectVaultDirectory = useSetAtom(selectVaultDirectoryAtom)
  const resetVaultDirectory = useSetAtom(resetVaultDirectoryAtom)
  const vaultRootDir = useAtomValue(vaultRootDirAtom)
  const fileTree = useAtomValue(fileTreeAtom)
  const selectedNode = useAtomValue(selectedNodeAtom)
  const openTab = useSetAtom(openTabAtom)

  const getSelectedNoteDir = useCallback(() => {
    const path = selectedNode?.path ?? ''
    if (!path) return ''
    const lastSlash = path.lastIndexOf('/')
    const lastBackslash = path.lastIndexOf('\\')
    const maxIndex = Math.max(lastSlash, lastBackslash)
    return maxIndex === -1 ? '' : path.substring(0, maxIndex)
  }, [selectedNode?.path])

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
        id: 'panel-daily',
        label: 'Daily note',
        icon: <VscCalendar />,
        keywords: ['daily', 'note', 'today', 'journal'],
        run: () => void createDailyNote()
      },
      {
        id: 'panel-kanban',
        label: 'Kanban',
        icon: <VscProject />,
        keywords: ['panel', 'board', 'kanban', 'project', 'tasks', 'todo'],
        run: () => createKanbanTab()
      },
      {
        id: 'panel-spreadsheet',
        label: 'Spreadsheet',
        icon: <VscTable />,
        keywords: ['panel', 'table', 'sheet', 'grid', 'database', 'spreadsheet'],
        run: () => createSpreadsheetTab()
      },
      {
        id: 'panel-terminal',
        label: 'Terminal',
        icon: <VscTerminal />,
        keywords: ['panel', 'shell', 'cli', 'bash', 'terminal'],
        run: () => createTerminalTab()
      },
      {
        id: 'panel-canvas',
        label: 'Canvas',
        icon: <VscSymbolRuler />,
        keywords: ['panel', 'diagram', 'whiteboard', 'canvas'],
        run: () => void createCanvas(getSelectedNoteDir())
      },
      {
        id: 'panel-settings',
        label: 'Settings',
        icon: <VscSettingsGear />,
        keywords: ['settings', 'preferences', 'config'],
        run: () => createSettingsTab()
      }
    ],
    [
      createCanvas,
      createDailyNote,
      createKanbanTab,
      createSettingsTab,
      createSpreadsheetTab,
      createTerminalTab,
      getSelectedNoteDir,
      resetVaultDirectory,
      selectVaultDirectory,
      vaultRootDir
    ]
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

  return (
    <CommandPaletteModal
      isOpen={isOpen}
      items={commandPaletteItems}
      onClose={() => setIsOpen(false)}
      title="Commands & Notes"
      placeholder="Type a command or note name..."
    />
  )
}
