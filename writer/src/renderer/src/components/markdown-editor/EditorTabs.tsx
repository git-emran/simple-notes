import { useAtomValue, useSetAtom } from 'jotai'
import {
  activeTabIdAtom,
  closeTabAtom,
  createNewTabAtom,
  reorderTabsAtom,
  setActiveTabAtom,
  tabsAtom,
  detachTabAtom,
  joinTabAtom,
  navigationHistoryAtom,
  navigationIndexAtom,
  navigateBackAtom,
  navigateForwardAtom
} from '@renderer/store'
import { VscAdd, VscClose, VscProject, VscSettingsGear, VscTable, VscTerminal, VscChevronLeft, VscChevronRight } from 'react-icons/vsc'
import { twMerge } from 'tailwind-merge'
import { type CSSProperties, useEffect, useRef, useState } from 'react'

export const EditorTabs = () => {
  const tabs = useAtomValue(tabsAtom)
  const activeTabId = useAtomValue(activeTabIdAtom)
  const setActiveTab = useSetAtom(setActiveTabAtom)
  const closeTab = useSetAtom(closeTabAtom)
  const createNewTab = useSetAtom(createNewTabAtom)
  const reorderTabs = useSetAtom(reorderTabsAtom)
  const detachTab = useSetAtom(detachTabAtom)
  const joinTab = useSetAtom(joinTabAtom)
  
  const history = useAtomValue(navigationHistoryAtom)
  const index = useAtomValue(navigationIndexAtom)
  const navigateBack = useSetAtom(navigateBackAtom)
  const navigateForward = useSetAtom(navigateForwardAtom)
  
  const canGoBack = index > 0
  const canGoForward = index < history.length - 1

  const containerRef = useRef<HTMLDivElement>(null)
  const draggedTabIdRef = useRef<string | null>(null)
  const isDraggingOffRef = useRef(false)
  const lastDragPosRef = useRef<{ screenX: number; screenY: number; clientX: number; clientY: number } | null>(null)
  const [dropIndicator, setDropIndicator] = useState<{ tabId: string; position: 'before' | 'after' } | null>(null)
  const [rejoinedTabId, setRejoinedTabId] = useState<string | null>(null)

  // Listen for tab docked events from other windows to remove local copy
  useEffect(() => {
    if (window.context?.onTabDocked) {
      return window.context.onTabDocked(({ tabId }) => {
        detachTab(tabId)
      })
    }
    return undefined
  }, [detachTab])

  return (
    <div 
      ref={containerRef}
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
      {/* Navigation Buttons */}
      <div className="flex items-center gap-1 shrink-0 mr-1" style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}>
        <button
          onClick={() => canGoBack && navigateBack()}
          disabled={!canGoBack}
          className={twMerge(
            "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
            canGoBack 
              ? "text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover-soft)] cursor-pointer" 
              : "text-[var(--obsidian-text-muted)] opacity-50 cursor-not-allowed"
          )}
          title="Go Back"
        >
          <VscChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => canGoForward && navigateForward()}
          disabled={!canGoForward}
          className={twMerge(
            "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
            canGoForward 
              ? "text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover-soft)] cursor-pointer" 
              : "text-[var(--obsidian-text-muted)] opacity-50 cursor-not-allowed"
          )}
          title="Go Forward"
        >
          <VscChevronRight className="w-4 h-4" />
        </button>
      </div>

      {tabs.map((tab) => {
        const isActive = activeTabId === tab.id
        const isRejoined = rejoinedTabId === tab.id
        return (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            draggable
            onDragStart={(e) => {
              draggedTabIdRef.current = tab.id
              isDraggingOffRef.current = false
              lastDragPosRef.current = {
                screenX: e.screenX,
                screenY: e.screenY,
                clientX: e.clientX,
                clientY: e.clientY
              }
              e.dataTransfer.setData('application/x-writr-tab-id', tab.id)
              e.dataTransfer.setData('application/x-writr-tab', JSON.stringify(tab))
              e.dataTransfer.setData('text/plain', tab.id)
              e.dataTransfer.effectAllowed = 'move'
            }}
            onDrag={(e) => {
              if (e.screenX !== 0 || e.screenY !== 0) {
                lastDragPosRef.current = {
                  screenX: e.screenX,
                  screenY: e.screenY,
                  clientX: e.clientX,
                  clientY: e.clientY
                }
              }
            }}
            onDragEnd={(e) => {
              const draggedId = draggedTabIdRef.current
              draggedTabIdRef.current = null
              setDropIndicator(null)

              if (!draggedId) return

              const dropEffect = e.dataTransfer.dropEffect
              const lastPos = lastDragPosRef.current
              const screenX = e.screenX !== 0 ? e.screenX : (lastPos?.screenX ?? 0)
              const screenY = e.screenY !== 0 ? e.screenY : (lastPos?.screenY ?? 0)
              const clientX = e.clientX !== 0 ? e.clientX : (lastPos?.clientX ?? 0)
              const clientY = e.clientY !== 0 ? e.clientY : (lastPos?.clientY ?? 0)

              const winX = window.screenX
              const winY = window.screenY
              const winW = window.outerWidth
              const winH = window.outerHeight

              const isOutsideWindow =
                screenX < winX || screenX > winX + winW || screenY < winY || screenY > winY + winH

              const stripRect = containerRef.current?.getBoundingClientRect()
              const isOffStrip = stripRect
                ? clientY > stripRect.bottom + 30 ||
                  clientY < stripRect.top - 15 ||
                  clientX < stripRect.left - 30 ||
                  clientX > stripRect.right + 30
                : true

              const isTornOff =
                (dropEffect === 'none' && (isOutsideWindow || isOffStrip)) ||
                (e.clientX === 0 && e.clientY === 0 && isOutsideWindow)

              if (isTornOff && !isDraggingOffRef.current) {
                isDraggingOffRef.current = true
                const targetX = Math.round(screenX - 120)
                const targetY = Math.round(screenY - 20)

                window.context?.openSeparatedWindow?.({
                  tab,
                  sessionId: tab.terminalSessionId ?? undefined,
                  x: targetX,
                  y: targetY
                }).then(() => {
                  detachTab(draggedId)
                }).catch((err) => {
                  console.error('Failed to tear off tab into window:', err)
                })
              }
            }}
            onDragOver={(e) => {
              const dragged = draggedTabIdRef.current
              if (dragged === tab.id) return
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
              const position = dropIndicator?.position ?? 'after'
              setDropIndicator(null)

              const tabDataStr = e.dataTransfer.getData('application/x-writr-tab')
              const source =
                draggedTabIdRef.current ?? e.dataTransfer.getData('application/x-writr-tab-id') ?? e.dataTransfer.getData('text/plain')

              // Check if tab is from another window
              if (tabDataStr) {
                try {
                  const incomingTab = JSON.parse(tabDataStr)
                  if (incomingTab && incomingTab.id && !tabs.some((t) => t.id === incomingTab.id)) {
                    if (incomingTab.terminalSessionId && window.context?.transferTerminalSession) {
                      void window.context.transferTerminalSession(incomingTab.terminalSessionId)
                    }
                    joinTab({
                      tab: incomingTab,
                      targetTabId: tab.id,
                      position
                    })
                    window.context?.notifyTabDocked?.(incomingTab.id)
                    setRejoinedTabId(incomingTab.id)
                    setTimeout(() => setRejoinedTabId(null), 1000)
                    return
                  }
                } catch {}
              }

              if (!source || source === tab.id) return
              reorderTabs({ sourceTabId: source, targetTabId: tab.id, position })
            }}
            style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}
            className={twMerge(
              'group relative flex h-8 flex-1 shrink min-w-[60px] max-w-[220px] items-center rounded-md border border-transparent px-2.5 cursor-pointer select-none transition-[background-color,border-color,color,box-shadow]',
              isActive
                ? 'bg-[var(--obsidian-workspace)] border-obsidian-border-soft text-[var(--obsidian-text)] shadow-[0_1px_2px_rgba(0,0,0,0.05)] z-10'
                : 'text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover-soft)]',
              isRejoined && 'animate-tab-rejoin'
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
            ) : tab.kind === 'settings' ? (
              <VscSettingsGear className="mr-2 h-3.5 w-3.5 shrink-0 opacity-80" />
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
      {/* Fill remaining space & accept tab drops at the end of the bar */}
      <div 
        className="h-full flex-1 min-w-[30px]" 
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('application/x-writr-tab') || draggedTabIdRef.current) {
            e.preventDefault()
          }
        }}
        onDrop={(e) => {
          e.preventDefault()
          const tabDataStr = e.dataTransfer.getData('application/x-writr-tab')
          if (tabDataStr) {
            try {
              const incomingTab = JSON.parse(tabDataStr)
              if (incomingTab && incomingTab.id && !tabs.some((t) => t.id === incomingTab.id)) {
                if (incomingTab.terminalSessionId && window.context?.transferTerminalSession) {
                  void window.context.transferTerminalSession(incomingTab.terminalSessionId)
                }
                joinTab({ tab: incomingTab })
                window.context?.notifyTabDocked?.(incomingTab.id)
                setRejoinedTabId(incomingTab.id)
                setTimeout(() => setRejoinedTabId(null), 1000)
              }
            } catch {}
          }
        }}
      />
    </div>
  )
}
