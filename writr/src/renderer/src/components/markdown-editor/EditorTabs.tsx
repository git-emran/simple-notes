import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { tabsAtom, activeTabPathAtom, setActiveTabAtom, closeTabAtom } from '@renderer/store'
import { VscClose, VscFile } from 'react-icons/vsc'
import { twMerge } from 'tailwind-merge'

export const EditorTabs = () => {
  const tabs = useAtomValue(tabsAtom)
  const activeTabPath = useAtomValue(activeTabPathAtom)
  const setActiveTab = useSetAtom(setActiveTabAtom)
  const closeTab = useSetAtom(closeTabAtom)

  if (tabs.length === 0) return null

  return (
    <div 
      className="flex overflow-x-auto no-scrollbar border-b border-[var(--obsidian-border)] bg-[var(--obsidian-pane)]"
      style={{ 
          WebkitAppRegion: 'drag',
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      } as React.CSSProperties}
    >
      {tabs.map((tab) => {
        const isActive = activeTabPath === tab.path
        return (
          <div
            key={tab.path}
            onClick={() => setActiveTab(tab.path)}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
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

            <VscFile className={twMerge(
                "w-3.5 h-3.5 mr-2.5 flex-shrink-0 transition-colors",
                isActive ? "text-[var(--obsidian-accent)]" : "text-[var(--obsidian-text-muted)]"
            )} />
            
            <span className={twMerge(
                "text-[11px] font-medium truncate flex-1 tracking-tight",
                isActive ? "opacity-100" : "opacity-80 group-hover:opacity-100"
            )}>
              {tab.name.replace(/\.md$/, '')}
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation()
                closeTab(tab.path)
              }}
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
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
      {/* Fill remaining space */}
      <div className="flex-1 bg-[var(--obsidian-pane)]" />
    </div>
  )
}
