import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from 'react'
import { createPortal } from 'react-dom'
import { twMerge } from 'tailwind-merge'
import { VscFile, VscSearch } from 'react-icons/vsc'
import type { TemplateItem } from './hooks/useTemplatePalette'
import { TEMPLATE_ITEMS } from './hooks/useTemplatePalette'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const CLOSE_ANIMATION_MS = 160

// ── Minimal markdown preview for template content ────────────────────────────
const TemplatePreview = memo(({ content, isDarkMode }: { content: string; isDarkMode: boolean }) => {
  // Strip frontmatter before rendering
  const stripped = content.replace(/^---[\s\S]*?---\n?/, '')
  return (
    <div
      className={twMerge(
        'prose prose-sm max-w-none font-sans text-[var(--obsidian-text)] text-[13px] leading-6',
        isDarkMode ? 'prose-invert' : ''
      )}
      style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-[var(--obsidian-text)] mt-5 mb-2 pb-1 border-b border-obsidian-border">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-semibold text-[var(--obsidian-text)] mt-5 mb-1.5 pb-1 border-b border-obsidian-border">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-[var(--obsidian-text)] mt-4 mb-1">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-[13px] text-[var(--obsidian-text)] leading-6 mb-3">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="text-[13px] list-disc pl-5 space-y-1 mb-3 text-[var(--obsidian-text)]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="text-[13px] list-decimal pl-5 space-y-1 mb-3 text-[var(--obsidian-text)]">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-[13px] text-[var(--obsidian-text-muted)]">{children}</li>
          ),
          code: ({ children, className }) => {
            const isBlock = !!className
            if (isBlock) {
              return (
                <pre className="bg-[var(--obsidian-pane)] border border-obsidian-border rounded-md px-3 py-2 text-[12px] font-mono overflow-x-auto my-2">
                  <code className="text-[var(--obsidian-text)]">{children}</code>
                </pre>
              )
            }
            return (
              <code className="px-1 py-0.5 rounded text-[12px] font-mono bg-[var(--obsidian-inline-code-bg)] text-[var(--obsidian-inline-code-text)]">
                {children}
              </code>
            )
          },
          pre: ({ children }) => <div>{children}</div>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-obsidian-border pl-3 my-2 italic text-[var(--obsidian-text-muted)] text-[12px]">
              {children}
            </blockquote>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-[var(--obsidian-text)]">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-[var(--obsidian-text)]">{children}</em>
          ),
          hr: () => (
            <hr className="border-t border-obsidian-border my-4" />
          ),
        }}
      >
        {stripped}
      </ReactMarkdown>
    </div>
  )
})

TemplatePreview.displayName = 'TemplatePreview'

// ── Main modal ───────────────────────────────────────────────────────────────
interface TemplatePaletteModalProps {
  isOpen: boolean
  isDarkMode: boolean
  onClose: () => void
  onSelect: (content: string) => void
}

export const TemplatePaletteModal = ({
  isOpen,
  isDarkMode,
  onClose,
  onSelect,
}: TemplatePaletteModalProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<number | null>(null)

  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string>(TEMPLATE_ITEMS[0]?.id ?? '')
  const [shouldRender, setShouldRender] = useState(isOpen)
  const [isShown, setIsShown] = useState(false)

  // ── Animate open/close ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
      setShouldRender(true)
      const raf = window.requestAnimationFrame(() => setIsShown(true))
      return () => window.cancelAnimationFrame(raf)
    }
    setIsShown(false)
    if (!shouldRender) return undefined
    closeTimerRef.current = window.setTimeout(() => {
      setShouldRender(false)
    }, CLOSE_ANIMATION_MS)
    return undefined
  }, [isOpen, shouldRender])

  useEffect(() => {
    if (!isOpen) return
    setQuery('')
    setSelectedId(TEMPLATE_ITEMS[0]?.id ?? '')
    const t = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [isOpen])

  // ── Filtering + grouping ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return TEMPLATE_ITEMS
    return TEMPLATE_ITEMS.filter((item) => {
      const haystack = [item.label, item.category, ...(item.keywords ?? [])].join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [query])

  const grouped = useMemo(() => {
    const map = new Map<string, TemplateItem[]>()
    for (const item of filtered) {
      if (!map.has(item.category)) map.set(item.category, [])
      map.get(item.category)!.push(item)
    }
    return map
  }, [filtered])

  useEffect(() => {
    if (filtered.length > 0 && !filtered.find((i) => i.id === selectedId)) {
      setSelectedId(filtered[0].id)
    }
  }, [filtered, selectedId])

  const selectedTemplate = TEMPLATE_ITEMS.find((i) => i.id === selectedId) ?? null

  // ── Keyboard navigation ────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }

    const flatList = filtered
    const currentIdx = flatList.findIndex((i) => i.id === selectedId)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = flatList[Math.min(currentIdx + 1, flatList.length - 1)]
      if (next) {
        setSelectedId(next.id)
        // Scroll into view
        const el = listRef.current?.querySelector<HTMLButtonElement>(`[data-tpl-id="${next.id}"]`)
        el?.scrollIntoView({ block: 'nearest' })
      }
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = flatList[Math.max(currentIdx - 1, 0)]
      if (prev) {
        setSelectedId(prev.id)
        const el = listRef.current?.querySelector<HTMLButtonElement>(`[data-tpl-id="${prev.id}"]`)
        el?.scrollIntoView({ block: 'nearest' })
      }
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedTemplate) {
        onClose()
        onSelect(selectedTemplate.content)
      }
    }
  }

  if (!shouldRender) return null

  const easing = isShown ? 'ease-in' : 'ease-out'

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center px-4 pt-16"
      role="dialog"
      aria-modal="true"
      aria-label="Template palette"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className={twMerge(
          'absolute inset-0 bg-black/50 transition-opacity duration-[160ms]',
          easing,
          isShown ? 'opacity-100' : 'opacity-0'
        )}
        onMouseDown={onClose}
      />

      {/* Modal shell */}
      <div
        className={twMerge(
          'relative z-10 w-full max-w-4xl overflow-hidden rounded-xl border border-obsidian-border bg-[var(--obsidian-surface)] shadow-2xl flex flex-col transition-[opacity,transform] duration-[160ms] will-change-[opacity,transform]',
          'max-h-[78vh]',
          easing,
          isShown ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-[0.98] opacity-0'
        )}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-2 border-b border-obsidian-border px-4 py-3 bg-[var(--obsidian-workspace)] flex-shrink-0">
          {/* Pencil icon */}
          <svg
            className="w-4 h-4 text-[var(--obsidian-text-muted)] flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
          <h2 className="text-sm font-semibold text-[var(--obsidian-text)] flex-1">
            Choose a template
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded border border-obsidian-border text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)] transition-colors text-[10px] font-bold flex-shrink-0"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* ── Search bar ── */}
        <div className="border-b border-obsidian-border px-3 py-2 bg-[var(--obsidian-workspace)] flex-shrink-0 flex items-center gap-2">
          <VscSearch className="w-3.5 h-3.5 text-[var(--obsidian-text-muted)] flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates…"
            className="flex-1 bg-transparent text-sm text-[var(--obsidian-text)] outline-none placeholder-[var(--obsidian-text-muted)]"
          />
        </div>

        {/* ── Body: sidebar + preview ── */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div
            ref={listRef}
            className="w-56 flex-shrink-0 border-r border-obsidian-border overflow-y-auto preview-scrollbar py-2"
          >
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-xs text-[var(--obsidian-text-muted)]">
                No templates match.
              </div>
            ) : (
              Array.from(grouped.entries()).map(([category, items]) => (
                <div key={category}>
                  <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--obsidian-text-muted)]">
                    {category}
                  </div>
                  {items.map((item) => {
                    const isSelected = item.id === selectedId
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-tpl-id={item.id}
                        onMouseEnter={() => setSelectedId(item.id)}
                        onClick={() => {
                          onClose()
                          onSelect(item.content)
                        }}
                        className={twMerge(
                          'w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors',
                          isSelected
                            ? 'bg-[var(--obsidian-hover)] text-[var(--obsidian-text)] font-medium'
                            : 'text-[var(--obsidian-text-muted)] hover:bg-[var(--obsidian-hover-soft)] hover:text-[var(--obsidian-text)]'
                        )}
                      >
                        <VscFile className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {/* Preview panel */}
          <div className="flex-1 min-w-0 flex flex-col min-h-0">
            {selectedTemplate ? (
              <>
                {/* Preview header */}
                <div className="px-5 pt-4 pb-2 border-b border-obsidian-border flex-shrink-0">
                  <h3 className="text-base font-semibold text-[var(--obsidian-text)]">
                    {selectedTemplate.label}
                  </h3>
                  <p className="text-xs text-[var(--obsidian-text-muted)] mt-0.5">
                    {selectedTemplate.description}
                  </p>
                </div>

                {/* Scrollable preview content */}
                <div className="flex-1 overflow-y-auto preview-scrollbar px-5 py-4">
                  <TemplatePreview content={selectedTemplate.content} isDarkMode={isDarkMode} />
                </div>

                {/* Footer CTA */}
                <div className="flex-shrink-0 border-t border-obsidian-border px-5 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-[var(--obsidian-text-muted)]">
                    ↑/↓ navigate · Enter to use · Esc to close
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      onSelect(selectedTemplate.content)
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md bg-[var(--obsidian-accent)] text-white hover:opacity-90 transition-opacity"
                  >
                    Use template
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-[var(--obsidian-text-muted)]">
                Select a template to preview
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
