'use client'

import { memo, useEffect, useMemo, useRef, useState, type MouseEvent, type RefObject } from 'react'
import {
  FiX,
  FiCopy,
  FiCheck,
  FiList
} from 'react-icons/fi'
import { twMerge } from 'tailwind-merge'
import {
  MarkdownTocItem,
  getScopedHeadingElementsByIds
} from './MarkdownPreview.helpers'

export interface TableOfContentsProps {
  items: MarkdownTocItem[]
  onSelectTocItem: (id: string) => void
  containerRef: RefObject<HTMLDivElement>
  isMobilePopover?: boolean
  onClosePopover?: () => void
}

export const TableOfContents = memo(
  ({
    items,
    onSelectTocItem,
    containerRef,
    isMobilePopover = false,
    onClosePopover
  }: TableOfContentsProps) => {
    const [activeId, setActiveId] = useState<string | null>(null)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const isManualScrollingRef = useRef(false)
    const manualScrollTimerRef = useRef<number | null>(null)
    const listContainerRef = useRef<HTMLUListElement>(null)

    // Calculate minimum TOC level for proper indentation depth
    const minLevel = useMemo(
      () => (items.length > 0 ? Math.min(...items.map((i) => i.level)) : 1),
      [items]
    )

    // ── Active Scrollspy tracking ──────────────────────────────────
    useEffect(() => {
      const previewRoot = containerRef.current
      if (!previewRoot) return

      const scrollContainer = previewRoot.closest<HTMLElement>('.writr-markdown-preview')
      if (!scrollContainer) return

      const handleScroll = () => {
        if (isManualScrollingRef.current) return

        const headingIds = items.map((i) => i.id)
        const headingElements = getScopedHeadingElementsByIds(previewRoot, headingIds)

        if (headingElements.length === 0) return

        const containerRect = scrollContainer.getBoundingClientRect()
        const topThreshold = containerRect.top + 100

        let currentActive: string | null = null

        for (let i = 0; i < headingElements.length; i++) {
          const el = headingElements[i]
          const rect = el.getBoundingClientRect()
          if (rect.top <= topThreshold) {
            currentActive = el.id
          } else {
            break
          }
        }

        if (!currentActive && headingElements.length > 0) {
          currentActive = headingElements[0].id
        }

        if (currentActive) {
          setActiveId(currentActive)
        }
      }

      handleScroll()
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
      return () => scrollContainer.removeEventListener('scroll', handleScroll)
    }, [containerRef, items])

    // ── Auto-scroll TOC sidebar to keep active item in view ─────────────────
    useEffect(() => {
      if (!activeId || !listContainerRef.current) return

      const activeEl = listContainerRef.current.querySelector<HTMLElement>(
        `[data-toc-id="${activeId}"]`
      )
      if (activeEl) {
        const container = listContainerRef.current
        const containerRect = container.getBoundingClientRect()
        const elRect = activeEl.getBoundingClientRect()

        if (elRect.top < containerRect.top || elRect.bottom > containerRect.bottom) {
          activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        }
      }
    }, [activeId])

    // Handle clicking a TOC item
    const handleItemClick = (id: string) => {
      setActiveId(id)
      isManualScrollingRef.current = true

      if (manualScrollTimerRef.current !== null) {
        window.clearTimeout(manualScrollTimerRef.current)
      }
      manualScrollTimerRef.current = window.setTimeout(() => {
        isManualScrollingRef.current = false
      }, 800)

      onSelectTocItem(id)

      if (isMobilePopover && onClosePopover) {
        onClosePopover()
      }
    }

    // Copy heading text or link
    const copyHeading = (e: MouseEvent, item: MarkdownTocItem) => {
      e.stopPropagation()
      navigator.clipboard.writeText(item.text).catch(() => {})
      setCopiedId(item.id)
      setTimeout(() => setCopiedId(null), 1800)
    }

    // Active item index calculation
    const activeIndex = useMemo(() => {
      if (!activeId) return -1
      return items.findIndex((i) => i.id === activeId)
    }, [activeId, items])

    return (
      <nav
        className={twMerge(
          'flex flex-col bg-[var(--obsidian-pane)] rounded-xl border border-[var(--obsidian-border)] shadow-lg overflow-hidden select-none transition-all duration-200',
          isMobilePopover
            ? 'w-80 max-h-[80vh] backdrop-blur-md bg-opacity-95'
            : 'w-72 max-w-xs shrink-0 h-fit max-h-[calc(100vh-11rem)] sticky top-2 self-start'
        )}
        aria-label="Table of contents"
      >
        {/* Header Bar */}
        <div className="flex flex-col p-3 border-b border-[var(--obsidian-border)] bg-[var(--obsidian-base)] bg-opacity-50 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[var(--obsidian-text-muted)] text-[11px] font-semibold uppercase tracking-wider">
              <FiList className="w-3.5 h-3.5 text-[var(--obsidian-accent)]" />
              <span>On This Page</span>
              {items.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[var(--obsidian-accent-dim)] text-[var(--obsidian-text)] text-[10px] font-mono">
                  {items.length}
                </span>
              )}
            </div>

            {/* Popover Close Button */}
            {isMobilePopover && onClosePopover && (
              <button
                onClick={onClosePopover}
                className="p-1 rounded text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover-soft)] transition-colors"
              >
                <FiX className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Section Indicator */}
          {activeIndex >= 0 && (
            <div className="mt-1 text-[10px] text-[var(--obsidian-text-muted)] flex justify-between">
              <span>Section {activeIndex + 1} of {items.length}</span>
            </div>
          )}
        </div>

        {/* TOC List Container */}
        <div className="flex-1 overflow-y-auto p-2.5 preview-scrollbar">
          {items.length === 0 ? (
            <div className="p-4 text-center text-[11px] text-[var(--obsidian-text-muted)]">
              No headings in document
            </div>
          ) : (
            <ul ref={listContainerRef} className="space-y-1">
              {items.map((item) => {
                const depth = item.level - minLevel
                const isActive = activeId === item.id

                return (
                  <li
                    key={item.id}
                    data-toc-id={item.id}
                    className="group relative flex items-start"
                    style={{ paddingLeft: `${depth * 10}px` }}
                  >
                    {/* Active highlight side pill indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-1 bottom-1 w-1 rounded-r bg-[var(--obsidian-accent)] shadow-[0_0_8px_var(--obsidian-accent)]" />
                    )}

                    <div
                      onClick={() => handleItemClick(item.id)}
                      className={twMerge(
                        'flex-1 flex items-start gap-2 py-1.5 px-2.5 rounded-md text-[11.5px] cursor-pointer transition-all duration-150',
                        isActive
                          ? 'bg-[var(--obsidian-accent-dim)] text-[var(--obsidian-text)] font-semibold'
                          : 'text-[var(--obsidian-text-muted)] hover:bg-[var(--obsidian-hover-soft)] hover:text-[var(--obsidian-text)]'
                      )}
                    >
                      {/* Heading Text - Wrap text cleanly without clipping or H1/H2 tags */}
                      <span className="flex-1 min-w-0 break-words whitespace-normal leading-snug text-left" title={item.text}>
                        {item.text}
                      </span>

                      {/* Quick copy heading text button on hover */}
                      <button
                        onClick={(e) => copyHeading(e, item)}
                        className="mt-0.5 opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-accent)] hover:bg-[var(--obsidian-border)] transition-opacity duration-150 shrink-0"
                        title="Copy heading text"
                      >
                        {copiedId === item.id ? (
                          <FiCheck className="w-3 h-3 text-[var(--obsidian-accent)]" />
                        ) : (
                          <FiCopy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </nav>
    )
  }
)
