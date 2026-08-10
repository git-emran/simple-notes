import { useAtomValue, useSetAtom } from 'jotai'
import { activeTabIdAtom, closeTabAtom, createNewTabAtom, reorderTabsAtom, setActiveTabAtom, tabsAtom } from '@renderer/store'
import { VscAdd, VscClose, VscProject, VscTable, VscTerminal } from 'react-icons/vsc'
import { twMerge } from 'tailwind-merge'
import { type CSSProperties, useRef, useState } from 'react'

export const EditorTabs = () => {
  const tabs = useAtomValue(tabsAtom)
  const activeTabId = useAtomValue(activeTabIdAtom)
  const setActiveTab = useSetAtom(setActiveTabAtom)
  const closeTab = useSetAtom(closeTabAtom)
  const createNewTab = useSetAtom(createNewTabAtom)
  const reorderTabs = useSetAtom(reorderTabsAtom)
  const draggedTabIdRef = useRef<string | null>(null)
  const [dropIndicator, setDropIndicator] = useState<{ tabId: string; position: 'before' | 'after' } | null>(null)

  return (
    <div 
      className="flex h-full min-w-0 items-center gap-1 overflow-x-auto no-scrollbar bg-transparent px-1.5"
      style={{ 
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      } as CSSProperties}
      onWheel={(e) => {
        // Prevent default vertical scrolling and scroll horizontally instead
        if (e.deltaY !== 0) {
          e.currentTarget.scrollLeft += e.deltaY;
        }
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTabId === tab.id
        return (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            draggable
            onDragStart={(e) => {
              draggedTabIdRef.current = tab.id
              e.dataTransfer.setData('application/x-writr-tab-id', tab.id)
              e.dataTransfer.effectAllowed = 'move'
            }}
            onDragEnd={() => {
              draggedTabIdRef.current = null
              setDropIndicator(null)
            }}
            onDragOver={(e) => {
              const dragged = draggedTabIdRef.current
              if (!dragged || dragged === tab.id) return
              e.preventDefault()

              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
              const position: 'before' | 'after' = e.clientX < rect.left + rect.width / 2 ? 'before' : 'after'
              setDropIndicator({ tabId: tab.id, position })
            }}
            onDragLeave={(e) => {
              if (!dropIndicator) return
              const related = e.relatedTarget
              if (related && e.currentTarget.contains(related as Node)) return
              setDropIndicator(null)
            }}
            onDrop={(e) => {
              e.preventDefault()
              const source =
                draggedTabIdRef.current ?? e.dataTransfer.getData('application/x-writr-tab-id') ?? e.dataTransfer.getData('text/plain')
              if (!source || source === tab.id || !dropIndicator) return
              reorderTabs({ sourceTabId: source, targetTabId: tab.id, position: dropIndicator.position })
              setDropIndicator(null)
            }}
            style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}
            className={twMerge(
              'group relative flex h-8 min-w-[128px] max-w-[220px] items-center rounded-md border border-transparent px-2.5 cursor-pointer select-none transition-[background-color,border-color,color,box-shadow]',
              isActive
                ? 'bg-[var(--obsidian-workspace)] border-[var(--obsidian-border-soft)] text-[var(--obsidian-text)] shadow-[0_1px_2px_rgba(0,0,0,0.05)] z-10'
                : 'text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover-soft)]'
            )}
          >
            {dropIndicator?.tabId === tab.id && dropIndicator.position === 'before' && (
              <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-[var(--obsidian-accent)] rounded" />
            )}
            {dropIndicator?.tabId === tab.id && dropIndicator.position === 'after' && (
              <div className="absolute right-0 top-1 bottom-1 w-[2px] bg-[var(--obsidian-accent)] rounded" />
            )}

            {tab.kind === 'terminal' ? (
              <VscTerminal className="mr-2 h-3.5 w-3.5 shrink-0 opacity-80" />
            ) : tab.kind === 'kanban' ? (
              <VscProject className="mr-2 h-3.5 w-3.5 shrink-0 opacity-80" />
            ) : tab.kind === 'spreadsheet' ? (
              <VscTable className="mr-2 h-3.5 w-3.5 shrink-0 opacity-80" />
            ) : null}

            <span className={twMerge(
                "text-[11px] font-medium truncate flex-1 tracking-tight",
                isActive ? "opacity-100" : "opacity-80 group-hover:opacity-100"
            )}>
              {(tab.kind === 'file' && tab.path ? tab.name.replace(/\.(md|canvas)$/, '') : tab.name)}
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation()
                closeTab(tab.id)
              }}
              style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}
              className={twMerge(
                'ml-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--obsidian-text-muted)] pointer-events-none opacity-0 hover:bg-[var(--obsidian-hover)] hover:text-[var(--obsidian-text)] transition-[background-color,color,opacity]',
                isActive && 'text-[var(--obsidian-text-muted)]',
                isActive ? 'pointer-events-auto opacity-100' : 'group-hover:pointer-events-auto group-hover:opacity-100'
              )}
            >
              <VscClose className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
      <button
        onClick={() => createNewTab()}
        style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover-soft)] transition-colors"
        title="New tab"
      >
        <VscAdd className="w-4 h-4" />
      </button>
      {/* Fill remaining space */}
      <div className="h-full flex-1" />
    </div>
  )
}
