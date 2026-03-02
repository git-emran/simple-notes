import { useAtomValue, useSetAtom } from 'jotai'
import { activeTabIdAtom, closeTabAtom, createNewTabAtom, setActiveTabAtom, tabsAtom } from '@renderer/store'
import { VscAdd, VscClose } from 'react-icons/vsc'
import { twMerge } from 'tailwind-merge'
import { type CSSProperties } from 'react'

export const EditorTabs = () => {
  const tabs = useAtomValue(tabsAtom)
  const activeTabId = useAtomValue(activeTabIdAtom)
  const setActiveTab = useSetAtom(setActiveTabAtom)
  const closeTab = useSetAtom(closeTabAtom)
  const createNewTab = useSetAtom(createNewTabAtom)

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
            style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}
            className={twMerge(
              'group relative flex items-center min-w-[130px] max-w-[230px] h-9 px-3 cursor-pointer select-none transition-all',
              isActive
                ? 'bg-[var(--obsidian-workspace)] text-[var(--obsidian-text)] z-10'
                : 'bg-[var(--obsidian-pane)] text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)]'
            )}
          >
            {isActive && (
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--obsidian-accent)]" />
            )}

            {!isActive && (
                <div className="absolute right-0 top-2 bottom-2 w-[1px] bg-[var(--obsidian-border-soft)]" />
            )}

            <span className={twMerge(
                "text-[11px] font-medium truncate flex-1 tracking-tight",
                isActive ? "opacity-100" : "opacity-80 group-hover:opacity-100"
            )}>
              {(tab.path ? tab.name.replace(/\.(md|canvas)$/, '') : tab.name)}
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
