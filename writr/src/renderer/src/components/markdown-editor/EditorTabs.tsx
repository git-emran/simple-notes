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
    <div className="flex bg-zinc-50 dark:bg-[#181818] overflow-x-auto no-scrollbar border-b border-zinc-200 dark:border-zinc-800/50">
      {tabs.map((tab) => {
        const isActive = activeTabPath === tab.path
        return (
          <div
            key={tab.path}
            onClick={() => setActiveTab(tab.path)}
            className={twMerge(
              'group relative flex items-center min-w-[140px] max-w-[220px] h-10 px-4 cursor-pointer select-none transition-all duration-75',
              isActive
                ? 'bg-white dark:bg-[#1e1e1e] text-zinc-900 dark:text-zinc-100 z-10'
                : 'bg-zinc-100/50 dark:bg-[#181818] text-zinc-500 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            )}
          >
            {/* Active Tab Indicator Top */}
            {isActive && (
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-500 shadow-[0_1px_3px_rgba(59,130,246,0.5)]" />
            )}

            {/* Vertical Separator for Inactive Tabs */}
            {!isActive && (
                <div className="absolute right-0 top-2 bottom-2 w-[1px] bg-zinc-200 dark:bg-zinc-800" />
            )}

            <VscFile className={twMerge(
                "w-3.5 h-3.5 mr-2.5 flex-shrink-0 transition-colors",
                isActive ? "text-blue-500" : "text-zinc-400 dark:text-zinc-600"
            )} />
            
            <span className={twMerge(
                "text-[11px] font-medium truncate flex-1 tracking-tight pt-[1px]",
                isActive ? "opacity-100" : "opacity-80 group-hover:opacity-100"
            )}>
              {tab.name.replace(/\.md$/, '')}
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation()
                closeTab(tab.path)
              }}
              className={twMerge(
                'ml-2 p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all invisible group-hover:visible',
                isActive && 'visible text-zinc-400 dark:text-zinc-500'
              )}
            >
              <VscClose className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
      {/* Fill remaining space */}
      <div className="flex-1 border-b border-transparent dark:border-transparent dark:bg-[#181818]" />
    </div>
  )
}
