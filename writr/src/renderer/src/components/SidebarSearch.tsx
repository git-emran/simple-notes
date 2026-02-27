import { useMemo, useState, type ComponentProps } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { fileTreeAtom, noteStatusByPathAtom, openTabAtom } from '@renderer/store'
import { FileNode } from '@shared/models'
import { VscFile, VscSearch } from 'react-icons/vsc'
import { twMerge } from 'tailwind-merge'
import { NOTE_STATUS_META } from '@renderer/constants/noteStatus'

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

export const SidebarSearch = ({ className, ...props }: ComponentProps<'aside'>) => {
  const fileTree = useAtomValue(fileTreeAtom)
  const noteStatuses = useAtomValue(noteStatusByPathAtom)
  const openTab = useSetAtom(openTabAtom)
  const [query, setQuery] = useState('')

  const files = useMemo(() => flattenFiles(fileTree ?? []), [fileTree])

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return files

    return files.filter((node) => {
      const status = noteStatuses[node.path]
      const normalizedStatus = status ? NOTE_STATUS_META[status].label.toLowerCase() : ''
      return (
        node.name.toLowerCase().includes(normalizedQuery) ||
        node.path.toLowerCase().includes(normalizedQuery) ||
        normalizedStatus.includes(normalizedQuery)
      )
    })
  }, [files, noteStatuses, query])

  return (
    <aside
      className={twMerge(
        'flex flex-col h-full border-r border-[var(--obsidian-border)] bg-[var(--obsidian-sidebar)]',
        className
      )}
      {...props}
    >
      <div className="px-3 py-2 border-b border-[var(--obsidian-border-soft)]">
        <div className="text-[10px] font-semibold tracking-[0.12em] text-[var(--obsidian-text-muted)] mb-2">
          SEARCH
        </div>
        <div className="relative">
          <VscSearch className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[var(--obsidian-text-muted)]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files or status..."
            className="w-full pl-8 pr-2 py-1.5 text-xs rounded bg-[var(--obsidian-workspace)] border border-[var(--obsidian-border)] text-[var(--obsidian-text)] placeholder:text-[var(--obsidian-text-muted)] outline-none focus:border-[var(--obsidian-accent)]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto py-1">
        {results.length === 0 ? (
          <div className="px-4 mt-3 text-xs text-[var(--obsidian-text-muted)]">
            No matching files.
          </div>
        ) : (
          <ul>
            {results.map((node) => {
              const status = noteStatuses[node.path]
              return (
                <li
                  key={node.path}
                  onClick={() => openTab(node)}
                  className="mx-1 px-2 py-[5px] rounded-sm text-[12px] text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover-soft)] cursor-pointer flex items-center gap-2"
                >
                  <VscFile className="w-3.5 h-3.5 text-[var(--obsidian-text-muted)]" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-[var(--obsidian-text)]">{node.name}</div>
                      {status && (
                        <span
                          className={`shrink-0 rounded-full border px-1.5 py-[1px] text-[9px] font-semibold ${NOTE_STATUS_META[status].className}`}
                        >
                          {NOTE_STATUS_META[status].label}
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[10px] text-[var(--obsidian-text-muted)]">
                      {node.path}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}
