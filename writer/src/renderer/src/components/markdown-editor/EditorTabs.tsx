import { useAtomValue, useSetAtom } from 'jotai'
import { activeTabIdAtom, closeTabAtom, createNewTabAtom, reorderTabsAtom, setActiveTabAtom, tabsAtom } from '@renderer/store'
import { VscAdd, VscClose, VscProject, VscTerminal } from 'react-icons/vsc'
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
      className="flex overflow-x-auto no-scrollbar bg-[var(--obsidian-pane)] h-full"
      style={{ 
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      } as CSSProperties}
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
              'group relative flex items-center min-w-[130px] max-w-[230px] h-9 px-3 cursor-pointer select-none transition-all',
              isActive
                ? 'bg-[var(--obsidian-workspace)] text-[var(--obsidian-text)] z-10'
                : 'bg-[var(--obsidian-pane)] text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)]'
            )}
          >
            {dropIndicator?.tabId === tab.id && dropIndicator.position === 'before' && (
              <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-[var(--obsidian-accent)] rounded" />
            )}
            {dropIndicator?.tabId === tab.id && dropIndicator.position === 'after' && (
              <div className="absolute right-0 top-1 bottom-1 w-[2px] bg-[var(--obsidian-accent)] rounded" />
            )}

            {isActive && (
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--obsidian-accent)]" />
            )}

            {!isActive && (
                <div className="absolute right-0 top-2 bottom-2 w-[1px] bg-[var(--obsidian-border-soft)]" />
            )}

            {tab.kind === 'terminal' ? (
              <VscTerminal className="mr-2 h-3.5 w-3.5 shrink-0 opacity-80" />
            ) : tab.kind === 'kanban' ? (
              <VscProject className="mr-2 h-3.5 w-3.5 shrink-0 opacity-80" />
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
                'ml-2 p-1 rounded-md hover:bg-[var(--obsidian-hover)] transition-all invisible group-hover:visible',
                isActive && 'visible text-[var(--obsidian-text-muted)]'
              )}
            >
              <VscClose className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
      <button
        onClick={() => createNewTab()}
        style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}
        className="h-9 w-10 flex items-center justify-center text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)] transition-colors"
        title="New tab"
      >
        <VscAdd className="w-4 h-4" />
      </button>
      {/* Fill remaining space */}
      <div className="flex-1 bg-[var(--obsidian-pane)]" />
    </div>
  )
}
