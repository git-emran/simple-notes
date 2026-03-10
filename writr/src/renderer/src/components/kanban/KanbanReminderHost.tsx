import { useEffect, useMemo, useRef, useState } from 'react'
import { useAtom, useSetAtom } from 'jotai'
import { twMerge } from 'tailwind-merge'
import { VscBell, VscClose, VscArrowRight } from 'react-icons/vsc'
import { createKanbanTabAtom, kanbanStateAtom, normalizeKanbanState } from '@renderer/store'

type ReminderItem = {
  workspaceId: string
  workspaceName: string
  columnId: string
  columnTitle: string
  cardId: string
  cardText: string
  cardDescription: string
  remindAtIso: string
}

const formatIsoForHumans = (iso: string) => {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return iso
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export const KanbanReminderHost = () => {
  const [storedKanban, setStoredKanban] = useAtom(kanbanStateAtom)
  const createKanbanTab = useSetAtom(createKanbanTabAtom)

  const [clockTick, setClockTick] = useState(0)
  const [queue, setQueue] = useState<ReminderItem[]>([])
  const timerRef = useRef<number | null>(null)

  const state = useMemo(() => normalizeKanbanState(storedKanban), [storedKanban])

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = null

    const now = Date.now()
    const dueNow: ReminderItem[] = []
    let nextDueMs: number | null = null

    for (const workspace of state.workspaces) {
      for (const column of workspace.columns) {
        for (const card of column.cards) {
          if (card.completed) continue
          if (!card.remindAt) continue

          const remindMs = Date.parse(card.remindAt)
          if (!Number.isFinite(remindMs)) continue

          const firedMs = card.reminderFiredAt ? Date.parse(card.reminderFiredAt) : Number.NEGATIVE_INFINITY
          const alreadyFiredForThisTime = firedMs >= remindMs
          if (alreadyFiredForThisTime) continue

          if (remindMs <= now) {
            dueNow.push({
              workspaceId: workspace.id,
              workspaceName: workspace.name,
              columnId: column.id,
              columnTitle: column.title,
              cardId: card.id,
              cardText: card.text,
              cardDescription: card.description ?? '',
              remindAtIso: card.remindAt,
            })
          } else {
            nextDueMs = nextDueMs == null ? remindMs : Math.min(nextDueMs, remindMs)
          }
        }
      }
    }

    if (dueNow.length > 0) {
      const firedAtIso = new Date().toISOString()

      setQueue((prev) => {
        const next = [...prev]
        for (const item of dueNow) {
          const alreadyQueued = next.some(
            (q) => q.cardId === item.cardId && q.remindAtIso === item.remindAtIso
          )
          if (!alreadyQueued) next.push(item)
        }
        return next
      })

      setStoredKanban((prevStored) => {
        const prev = normalizeKanbanState(prevStored)
        let changed = false
        const workspaces = prev.workspaces.map((ws) => {
          const columns = ws.columns.map((col) => {
            const cards = col.cards.map((c) => {
              const match = dueNow.some((d) => d.cardId === c.id && d.remindAtIso === c.remindAt)
              if (!match) return c
              changed = true
              return { ...c, reminderFiredAt: firedAtIso }
            })
            return col.cards === cards ? col : { ...col, cards }
          })
          return ws.columns === columns ? ws : { ...ws, columns }
        })
        return changed ? { ...prev, workspaces } : prevStored
      })

      // Trigger another pass soon in case multiple reminders are close together.
      timerRef.current = window.setTimeout(() => setClockTick((t) => t + 1), 500)
      return
    }

    if (nextDueMs != null) {
      const delay = Math.max(250, nextDueMs - now)
      timerRef.current = window.setTimeout(() => setClockTick((t) => t + 1), delay)
    }
  }, [state, setStoredKanban, clockTick])

  const active = queue[0] ?? null

  if (!active) return null

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-lg rounded-xl border border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--obsidian-border-soft)] px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-[var(--obsidian-text-muted)]">
              <VscBell className="h-4 w-4" />
              REMINDER
            </div>
            <div className="mt-1 truncate text-sm font-semibold text-[var(--obsidian-text)]">
              {active.cardText}
            </div>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded hover:bg-[var(--obsidian-hover-soft)] text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)]"
            title="Dismiss"
            onClick={() => setQueue((prev) => prev.slice(1))}
          >
            <VscClose className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div className="text-xs text-[var(--obsidian-text-muted)]">
            {active.workspaceName} · {active.columnTitle} · {formatIsoForHumans(active.remindAtIso)}
          </div>

          {active.cardDescription.trim() ? (
            <div className="whitespace-pre-wrap break-words rounded-lg border border-[var(--obsidian-border-soft)] bg-[var(--obsidian-workspace)] px-4 py-3 text-sm leading-6 text-[var(--obsidian-text)]">
              {active.cardDescription}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className={twMerge(
                'inline-flex items-center gap-2 rounded border border-[var(--obsidian-border)] bg-[var(--obsidian-workspace)] px-3 py-2 text-sm text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover-soft)]'
              )}
              onClick={() => setQueue((prev) => prev.slice(1))}
            >
              Dismiss
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded bg-[var(--obsidian-accent)] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
              onClick={() => {
                createKanbanTab()
                setStoredKanban((prevStored) => {
                  const prev = normalizeKanbanState(prevStored)
                  if (prev.activeWorkspaceId === active.workspaceId) return prevStored
                  return { ...prev, activeWorkspaceId: active.workspaceId }
                })
                setQueue((prev) => prev.slice(1))
              }}
            >
              Go to Kanban
              <VscArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
