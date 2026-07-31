import { useAtomValue, useSetAtom } from 'jotai'
import { VscArrowLeft, VscArrowRight } from 'react-icons/vsc'
import { twMerge } from 'tailwind-merge'
import {
  navigateBackAtom,
  navigateForwardAtom,
  navigationHistoryAtom
} from '@renderer/store'

export const NavigationHeader = () => {

  const navigateBack = useSetAtom(navigateBackAtom)
  const navigateForward = useSetAtom(navigateForwardAtom)
  
  const history = useAtomValue(navigationHistoryAtom)
  
  const canGoBack = history.length > 1
  const canGoForward = history.length > 1

  return (
    <div className="flex items-center gap-3 mb-4 text-[var(--obsidian-text-muted)] w-full">
      {/* Navigation Buttons */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => navigateBack()}
          disabled={!canGoBack}
          className={twMerge(
            'flex items-center justify-center w-6 h-6 rounded hover:bg-[var(--obsidian-hover)] transition-colors',
            !canGoBack && 'opacity-30 cursor-not-allowed hover:bg-transparent'
          )}
          title="Go Back"
        >
          <VscArrowLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => navigateForward()}
          disabled={!canGoForward}
          className={twMerge(
            'flex items-center justify-center w-6 h-6 rounded hover:bg-[var(--obsidian-hover)] transition-colors',
            !canGoForward && 'opacity-30 cursor-not-allowed hover:bg-transparent'
          )}
          title="Go Forward"
        >
          <VscArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
