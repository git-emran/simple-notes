import { useMemo, useState, type ComponentProps } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { fileTreeAtom, noteStatusByPathAtom, noteTagByPathAtom, openTabAtom } from '@renderer/store'
import { FileNode } from '@shared/models'
import { VscClose, VscFile, VscSearch } from 'react-icons/vsc'
import { twMerge } from 'tailwind-merge'
import { NOTE_STATUS_META } from '@renderer/constants/noteStatus'
import { CUSTOM_TAG_STYLE } from '@renderer/constants/noteTag'

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

type SidebarSearchProps = ComponentProps<'aside'> & {
  onCloseRequested?: () => void
}

export const SidebarSearch = ({ className, onCloseRequested, ...props }: SidebarSearchProps) => {
  const fileTree = useAtomValue(fileTreeAtom)
  const noteStatuses = useAtomValue(noteStatusByPathAtom)
  const noteTags = useAtomValue(noteTagByPathAtom)
  const openTab = useSetAtom(openTabAtom)
  const [query, setQuery] = useState('')

  const files = useMemo(() => flattenFiles(fileTree ?? []), [fileTree])

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return files

    return files.filter((node) => {
      const status = noteStatuses[node.path]
      const tag = noteTags[node.path]
      const normalizedStatus = status ? NOTE_STATUS_META[status].label.toLowerCase() : ''
      const normalizedTag = tag ? tag.toLowerCase() : ''
      
      return (
        node.name.toLowerCase().includes(normalizedQuery) ||
        node.path.toLowerCase().includes(normalizedQuery) ||
        normalizedStatus.includes(normalizedQuery) ||
        normalizedTag.includes(normalizedQuery)
      )
    })
  }, [files, noteStatuses, noteTags, query])

  return (
    <aside
      className={twMerge(
        'flex flex-col h-full',
        className
      )}
      {...props}
    >
      <div className="px-3 py-2 border-b border-[var(--obsidian-border-soft)]">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-semibold tracking-[0.12em] text-[var(--obsidian-text-muted)]">
            SEARCH
          </div>
          <button
            type="button"
            onClick={onCloseRequested}
            disabled={!onCloseRequested}
            className={twMerge(
              'p-1 rounded text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)] transition-colors',
              'disabled:opacity-60 disabled:hover:text-[var(--obsidian-text-muted)] disabled:hover:bg-transparent'
            )}
            title="Close search"
          >
            <VscClose className="w-4 h-4" />
          </button>
        </div>
        <div className="relative">
          <VscSearch className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[var(--obsidian-text-muted)]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            placeholder="Search files, status or tags..."
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
                      {noteTags[node.path] && (
                        <span
                          className={`shrink-0 rounded-full border px-1.5 py-[1px] text-[9px] font-semibold ${CUSTOM_TAG_STYLE}`}
                        >
                          {noteTags[node.path]}
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
