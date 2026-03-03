import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { twMerge } from 'tailwind-merge'

export type CommandPaletteItem = {
  id: string
  label: string
  icon?: ReactNode
  shortcut?: string
  keywords?: string[]
  run: () => void
}

export const CommandPaletteModal = ({
  isOpen,
  items,
  onClose,
}: {
  isOpen: boolean
  items: CommandPaletteItem[]
  onClose: () => void
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    if (!isOpen) return
    setQuery('')
    setSelectedIndex(0)
    const t = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [isOpen])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) => {
      const haystack = [item.label, ...(item.keywords ?? [])].join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [items, query])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    if (!isOpen) return
    const el = listRef.current?.querySelector<HTMLButtonElement>(`[data-cp-index="${selectedIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [isOpen, selectedIndex])

  const execute = (item: CommandPaletteItem | undefined) => {
    if (!item) return
    onClose()
    item.run()
  }

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center bg-black/45 px-4 pt-20"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-lg border border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] shadow-2xl">
        <div className="border-b border-[var(--obsidian-border-soft)] px-4 py-3">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                onClose()
                return
              }

              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelectedIndex((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)))
                return
              }

              if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelectedIndex((i) => Math.max(0, i - 1))
                return
              }

              if (e.key === 'Enter') {
                e.preventDefault()
                execute(filtered[selectedIndex] ?? filtered[0])
              }
            }}
            placeholder="Search commands…"
            className="w-full rounded border border-[var(--obsidian-border)] bg-[var(--obsidian-workspace)] px-3 py-2 text-sm text-[var(--obsidian-text)] outline-none focus:border-[var(--obsidian-accent)]"
          />
          <div className="mt-2 text-[11px] text-[var(--obsidian-text-muted)]">
            Enter to run • ↑/↓ to navigate • Esc to close
          </div>
        </div>

        <div ref={listRef} className="max-h-[360px] overflow-y-auto preview-scrollbar">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-[var(--obsidian-text-muted)]">No matches.</div>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                data-cp-index={idx}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => execute(item)}
                className={twMerge(
                  'flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[var(--obsidian-text)]',
                  idx === selectedIndex ? 'bg-[var(--obsidian-hover)]' : 'hover:bg-[var(--obsidian-hover)]'
                )}
              >
                {item.icon ? <span className="opacity-70">{item.icon}</span> : <span className="w-4" />}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.shortcut ? (
                  <span className="ml-2 text-[10px] opacity-40">{item.shortcut}</span>
                ) : null}
              </button>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
