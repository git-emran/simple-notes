import { useAtom } from 'jotai'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { twMerge } from 'tailwind-merge'
import { VscAdd, VscBell, VscCheck, VscEllipsis, VscTrash } from 'react-icons/vsc'
import { MdDragIndicator } from 'react-icons/md'
import { ContextMenu, ContextMenuItem } from '@renderer/components/ContextMenu'
import {
  kanbanStateAtom,
  createKanbanCard,
  createKanbanColumn,
  createKanbanWorkspace,
  normalizeKanbanState,
  pickNewKanbanColumnColor,
  type KanbanCard,
  type KanbanCardPriority,
  type KanbanWorkspace,
} from '@renderer/store/kanbanStore'
import { TaskDetailsPanel } from './TaskDetailsPanel'
import { KANBAN_PRIORITY_OPTIONS, getPriorityChipTint, priorityToPrefix } from './kanbanPriority'
import { ReminderDateTimePicker } from './ReminderDateTimePicker'

type DragPayload =
  | { kind: 'card'; columnId: string; cardId: string }
  | { kind: 'column'; columnId: string }

const parseDragPayload = (value: string | null): DragPayload | null => {
  if (!value) return null
  try {
    return JSON.parse(value) as DragPayload
  } catch {
    return null
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

type ColumnOverHint = { overColumnId: string | null }

export const KanbanBoard = () => {
  const [storedState, setState] = useAtom(kanbanStateAtom)
  const state = useMemo(() => normalizeKanbanState(storedState), [storedState])

  const [newColumnTitle, setNewColumnTitle] = useState('')
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [workspaceContextMenu, setWorkspaceContextMenu] = useState<{
    x: number
    y: number
    workspaceId: string
  } | null>(null)
  const [cardDragOver, setCardDragOver] = useState<{
    columnId: string
    targetCardId: string | null
  } | null>(null)
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null)
  const [columnDropHint, setColumnDropHint] = useState<ColumnOverHint | null>(null)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [cardActionsMenu, setCardActionsMenu] = useState<{
    x: number
    y: number
    columnId: string
    cardId: string
  } | null>(null)
  const [columnActionsMenu, setColumnActionsMenu] = useState<{
    x: number
    y: number
    columnId: string
  } | null>(null)

  const [renamingColumnId, setRenamingColumnId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)
  const draggingRef = useRef<DragPayload | null>(null)
  const cardDragOverRef = useRef<{ columnId: string; targetCardId: string | null } | null>(null)
  const columnDropHintRef = useRef<ColumnOverHint | null>(null)
  const columnElByIdRef = useRef<Record<string, HTMLDivElement | null>>({})
  const newWorkspaceInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const normalized = normalizeKanbanState(storedState)
    if (JSON.stringify(normalized) !== JSON.stringify(storedState)) {
      setState(normalized)
    }
  }, [setState, storedState])

  const activeWorkspace = useMemo(
    () =>
      state.workspaces.find((workspace) => workspace.id === state.activeWorkspaceId) ?? state.workspaces[0],
    [state.activeWorkspaceId, state.workspaces]
  )

  const columns = activeWorkspace?.columns ?? []

  const selectedCardInfo = useMemo(() => {
    if (!selectedCardId) return null
    for (const column of columns) {
      const card = (column.cards ?? []).find((c) => c.id === selectedCardId)
      if (card) return { card, columnId: column.id }
    }
    return null
  }, [columns, selectedCardId])

  useEffect(() => {
    if (!selectedCardId) return
    if (selectedCardInfo) return
    setSelectedCardId(null)
  }, [selectedCardId, selectedCardInfo])

  const updateActiveWorkspace = (updater: (workspace: KanbanWorkspace) => KanbanWorkspace) => {
    setState((prevStored) => {
      const prev = normalizeKanbanState(prevStored)
      return {
        ...prev,
        workspaces: prev.workspaces.map((workspace) =>
          workspace.id === prev.activeWorkspaceId ? updater(workspace) : workspace
        ),
      }
    })
  }

  const updateCardById = (cardId: string, updater: (card: KanbanCard) => KanbanCard) => {
    updateActiveWorkspace((workspace) => ({
      ...workspace,
      columns: workspace.columns.map((col) => ({
        ...col,
        cards: (col.cards ?? []).map((card) => (card.id === cardId ? updater(card) : card)),
      })),
    }))
  }

  const moveColumnToEnd = (columnId: string) => {
    updateActiveWorkspace((workspace) => {
      const fromIndex = workspace.columns.findIndex((c) => c.id === columnId)
      if (fromIndex < 0) return workspace
      if (fromIndex === workspace.columns.length - 1) return workspace
      const moving = workspace.columns[fromIndex]
      const without = workspace.columns.filter((c) => c.id !== columnId)
      return { ...workspace, columns: [...without, moving] }
    })
  }

  const swapColumns = (aId: string, bId: string) => {
    if (aId === bId) return
    updateActiveWorkspace((workspace) => {
      const aIndex = workspace.columns.findIndex((c) => c.id === aId)
      const bIndex = workspace.columns.findIndex((c) => c.id === bId)
      if (aIndex < 0 || bIndex < 0) return workspace
      if (aIndex === bIndex) return workspace

      const next = workspace.columns.slice()
      ;[next[aIndex], next[bIndex]] = [next[bIndex], next[aIndex]]
      return { ...workspace, columns: next }
    })
  }

  const beginRenameColumn = (columnId: string) => {
    const col = columns.find((c) => c.id === columnId)
    if (!col) return
    setRenamingColumnId(columnId)
    setRenameDraft(col.title)
    requestAnimationFrame(() => {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    })
  }

  const commitRename = () => {
    if (!renamingColumnId) return
    const nextTitle = renameDraft.trim()
    if (nextTitle) {
      updateActiveWorkspace((workspace) => ({
        ...workspace,
        columns: workspace.columns.map((c) => (c.id === renamingColumnId ? { ...c, title: nextTitle } : c)),
      }))
    }
    setRenamingColumnId(null)
    setRenameDraft('')
  }

  const cancelRename = () => {
    setRenamingColumnId(null)
    setRenameDraft('')
  }

  const addColumn = () => {
    const title = newColumnTitle.trim()
    if (!title) {
      alert('You need to add a name to the Board')
      return
    }
    updateActiveWorkspace((workspace) => ({
      ...workspace,
      columns: [
        ...workspace.columns,
        createKanbanColumn(
          title,
          pickNewKanbanColumnColor(workspace.columns.map((c) => c.color).filter(Boolean) as string[])
        ),
      ],
    }))
    setNewColumnTitle('')
  }

  const addWorkspace = () => {
    const name = newWorkspaceName.trim()
    if (!name) {
      alert('You need to add a workspace name')
      return
    }

    const workspace = createKanbanWorkspace(name)
    setState((prevStored) => {
      const prev = normalizeKanbanState(prevStored)
      return {
        ...prev,
        activeWorkspaceId: workspace.id,
        workspaces: [...prev.workspaces, workspace],
      }
    })
    setNewWorkspaceName('')
    setIsWorkspaceModalOpen(false)
  }

  const removeWorkspace = (workspaceId: string) => {
    setState((prevStored) => {
      const prev = normalizeKanbanState(prevStored)
      if (prev.workspaces.length <= 1) {
        alert('At least one workspace is required.')
        return prev
      }

      const workspace = prev.workspaces.find((item) => item.id === workspaceId)
      if (!workspace) return prev

      const confirmed = window.confirm(`Delete workspace "${workspace.name}"? This cannot be undone.`)
      if (!confirmed) return prev

      const nextWorkspaces = prev.workspaces.filter((item) => item.id !== workspaceId)
      const nextActiveWorkspaceId =
        prev.activeWorkspaceId === workspaceId
          ? (nextWorkspaces[0]?.id ?? prev.activeWorkspaceId)
          : prev.activeWorkspaceId

      return {
        ...prev,
        activeWorkspaceId: nextActiveWorkspaceId,
        workspaces: nextWorkspaces,
      }
    })
  }

  useEffect(() => {
    if (!isWorkspaceModalOpen) return
    requestAnimationFrame(() => newWorkspaceInputRef.current?.focus())
  }, [isWorkspaceModalOpen])

  const removeColumn = (columnId: string) => {
    updateActiveWorkspace((workspace) => ({
      ...workspace,
      columns: workspace.columns.filter((c) => c.id !== columnId),
    }))
  }

  const addCard = (
    columnId: string,
    payload: {
      title: string
      description: string
      priority: Exclude<KanbanCardPriority, null>
      remindAt: string | null
    }
  ) => {
    const trimmed = payload.title.trim()
    if (!trimmed) return
    updateActiveWorkspace((workspace) => ({
      ...workspace,
      columns: workspace.columns.map((col) =>
        col.id === columnId
          ? {
              ...col,
              cards: [
                ...col.cards,
                createKanbanCard(trimmed, {
                  description: payload.description.trim(),
                  priority: payload.priority,
                  remindAt: payload.remindAt,
                }),
              ],
            }
          : col
      ),
    }))
  }

  const removeCard = (columnId: string, cardId: string) => {
    updateActiveWorkspace((workspace) => ({
      ...workspace,
      columns: workspace.columns.map((col) =>
        col.id === columnId ? { ...col, cards: col.cards.filter((c) => c.id !== cardId) } : col
      ),
    }))
  }

  const toggleCardCompleted = (columnId: string, cardId: string) => {
    updateActiveWorkspace((workspace) => ({
      ...workspace,
      columns: workspace.columns.map((col) => {
        if (col.id !== columnId) return col
        return {
          ...col,
          cards: col.cards.map((c) =>
            c.id === cardId ? { ...c, completed: !c.completed } : c
          ),
        }
      }),
    }))
  }

  const moveCard = (
    fromColumnId: string,
    cardId: string,
    toColumnId: string,
    beforeCardId: string | null
  ) => {
    updateActiveWorkspace((workspace) => {
      const fromCol = workspace.columns.find((c) => c.id === fromColumnId)
      const toCol = workspace.columns.find((c) => c.id === toColumnId)
      if (!fromCol || !toCol) return workspace

      const card = fromCol.cards.find((c) => c.id === cardId)
      if (!card) return workspace

      if (fromColumnId === toColumnId) {
        if (beforeCardId === cardId) return workspace

        const without = fromCol.cards.filter((c) => c.id !== cardId)
        const rawIndex = beforeCardId == null ? without.length : without.findIndex((c) => c.id === beforeCardId)
        const insertIndex = rawIndex < 0 ? without.length : rawIndex
        const nextCards = [...without.slice(0, insertIndex), card, ...without.slice(insertIndex)]

        const sameOrder =
          nextCards.length === fromCol.cards.length &&
          nextCards.every((c, idx) => c.id === fromCol.cards[idx]!.id)
        if (sameOrder) return workspace

        return {
          ...workspace,
          columns: workspace.columns.map((c) => (c.id === fromColumnId ? { ...c, cards: nextCards } : c)),
        }
      }

      const fromWithout = fromCol.cards.filter((c) => c.id !== cardId)
      const rawDestIndex =
        beforeCardId == null ? toCol.cards.length : toCol.cards.findIndex((c) => c.id === beforeCardId)
      const destIndex = rawDestIndex < 0 ? toCol.cards.length : rawDestIndex
      const nextDestCards = [
        ...toCol.cards.slice(0, destIndex),
        card,
        ...toCol.cards.slice(destIndex),
      ]

      return {
        ...workspace,
        columns: workspace.columns.map((c) => {
          if (c.id === fromColumnId) return { ...c, cards: fromWithout }
          if (c.id === toColumnId) return { ...c, cards: nextDestCards }
          return c
        }),
      }
    })
  }

  const swapCards = (fromColumnId: string, cardId: string, toColumnId: string, targetCardId: string) => {
    updateActiveWorkspace((workspace) => {
      const fromCol = workspace.columns.find((c) => c.id === fromColumnId)
      const toCol = workspace.columns.find((c) => c.id === toColumnId)
      if (!fromCol || !toCol) return workspace

      const fromIndex = fromCol.cards.findIndex((c) => c.id === cardId)
      const toIndex = toCol.cards.findIndex((c) => c.id === targetCardId)
      if (fromIndex < 0 || toIndex < 0) return workspace
      if (fromColumnId === toColumnId && fromIndex === toIndex) return workspace

      if (fromColumnId === toColumnId) {
        const nextCards = fromCol.cards.slice()
        ;[nextCards[fromIndex], nextCards[toIndex]] = [nextCards[toIndex], nextCards[fromIndex]]
        return {
          ...workspace,
          columns: workspace.columns.map((c) => (c.id === fromColumnId ? { ...c, cards: nextCards } : c)),
        }
      }

      const nextFromCards = fromCol.cards.slice()
      const nextToCards = toCol.cards.slice()
      const draggedCard = nextFromCards[fromIndex]
      const targetCard = nextToCards[toIndex]
      nextFromCards[fromIndex] = targetCard
      nextToCards[toIndex] = draggedCard

      return {
        ...workspace,
        columns: workspace.columns.map((c) => {
          if (c.id === fromColumnId) return { ...c, cards: nextFromCards }
          if (c.id === toColumnId) return { ...c, cards: nextToCards }
          return c
        }),
      }
    })
  }

  const clearDragUi = () => {
    draggingRef.current = null
    cardDragOverRef.current = null
    setDraggingColumnId(null)
    setColumnDropHint(null)
    columnDropHintRef.current = null
    setCardDragOver(null)
  }

  const setCardDragOverStable = (next: { columnId: string; targetCardId: string | null } | null) => {
    cardDragOverRef.current = next
    setCardDragOver((prev) => {
      if (prev?.columnId === next?.columnId && prev?.targetCardId === next?.targetCardId) {
        return prev
      }
      return next
    })
  }

  const getCurrentPayload = (dataTransfer: DataTransfer | null): DragPayload | null => {
    const fromTransfer = parseDragPayload(dataTransfer?.getData('application/json') ?? null)
    return fromTransfer ?? draggingRef.current
  }

  const shouldIgnoreColumnDragStart = (target: EventTarget | null) => {
    const el = target as HTMLElement | null
    if (!el) return false
    return Boolean(
      el.closest('input, textarea, select, button, [contenteditable="true"], [data-kanban-card="true"]')
    )
  }

  const Card = ({ columnId, card }: { columnId: string; card: KanbanCard }) => {
    const prefix = priorityToPrefix(card.priority)
    const hasDescription = Boolean(card.description && card.description.trim().length > 0)
    const prefixTint =
      card.priority && card.priority !== null ? getPriorityChipTint(card.priority).borderActive : undefined
    const remindAtLabel = (() => {
      if (!card.remindAt) return null
      const date = new Date(card.remindAt)
      if (!Number.isFinite(date.getTime())) return null
      return date.toLocaleString(undefined, {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    })()

    return (
      <div
        data-kanban-card="true"
        draggable
        onDragStart={(e) => {
          e.stopPropagation()
          const payload = { kind: 'card', columnId, cardId: card.id } satisfies DragPayload
          draggingRef.current = payload
          e.dataTransfer.setData('application/json', JSON.stringify(payload))
          e.dataTransfer.effectAllowed = 'move'
        }}
        onDragEnd={() => {
          clearDragUi()
        }}
        onDragOver={(e) => {
          if (draggingRef.current?.kind !== 'card') return
          e.preventDefault()
          e.stopPropagation()
          setCardDragOverStable({ columnId, targetCardId: card.id })
        }}
        onDrop={(e) => {
          if (draggingRef.current?.kind !== 'card') return
          e.preventDefault()
          e.stopPropagation()
          const payload = getCurrentPayload(e.dataTransfer)
          if (!payload || payload.kind !== 'card') return
          if (payload.columnId === columnId && payload.cardId === card.id) {
            clearDragUi()
            return
          }
          swapCards(payload.columnId, payload.cardId, columnId, card.id)
          clearDragUi()
        }}
        className={twMerge(
          'rounded-lg border border-[var(--obsidian-border-soft)] bg-[var(--obsidian-workspace)] px-3 py-2 shadow-md transition-shadow hover:shadow-lg',
          cardDragOver?.columnId === columnId &&
            cardDragOver.targetCardId === card.id &&
            'ring-2 ring-[var(--obsidian-accent)]',
          Boolean(card.completed) && 'opacity-90'
        )}
        onClick={() => setSelectedCardId(card.id)}
      >
        <div className="flex items-start gap-2">
          <button
            type="button"
            title={card.completed ? 'Mark as not done' : 'Mark as done'}
            onClick={(e) => {
              e.stopPropagation()
              toggleCardCompleted(columnId, card.id)
            }}
            className={twMerge(
              'mt-0.5 h-5 w-5 shrink-0 rounded-full border flex items-center justify-center',
              card.completed
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-[var(--obsidian-border)] bg-transparent'
            )}
          >
            {card.completed ? <VscCheck className="h-4 w-4 text-emerald-500" /> : null}
          </button>

          <div className="flex-1 min-w-0">
            <div
              className={twMerge(
                'text-sm text-[var(--obsidian-text)] whitespace-pre-wrap break-words',
                Boolean(card.completed) && 'line-through text-[var(--obsidian-text-muted)]'
              )}
            >
              {prefix ? (
                <span className="mr-px font-mono text-[12px] opacity-80" style={{ color: prefixTint }}>
                  {prefix}
                </span>
              ) : null}
              {card.text}
            </div>
            {hasDescription ? (
              <div
                className={twMerge(
                  'mt-1 text-xs leading-5 text-[var(--obsidian-text-muted)] whitespace-pre-wrap break-words clamp-2',
                  Boolean(card.completed) && 'line-through opacity-80'
                )}
              >
                {card.description}
              </div>
            ) : null}
            {remindAtLabel ? (
              <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-[var(--obsidian-text-muted)]">
                <VscBell className="h-3.5 w-3.5" />
                <span>{remindAtLabel}</span>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="p-1 rounded hover:bg-[var(--obsidian-hover)] text-[var(--obsidian-text-muted)]"
            title="More actions"
            onMouseDown={(e) => {
              e.stopPropagation()
            }}
            onClick={(e) => {
              e.stopPropagation()
              setColumnActionsMenu(null)
              const rect = e.currentTarget.getBoundingClientRect()
              setCardActionsMenu((prev) => {
                if (prev?.columnId === columnId && prev.cardId === card.id) return null
                return {
                  x: rect.left,
                  y: rect.bottom + 6,
                  columnId,
                  cardId: card.id,
                }
              })
            }}
          >
            <VscEllipsis className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  const gridClass =
    columns.length <= 3 ? 'grid-cols-3' : 'grid-flow-col auto-cols-[320px] grid-rows-1'
  const gridStyle =
    columns.length <= 3
      ? { gridTemplateColumns: `repeat(${Math.max(1, columns.length)}, minmax(0, 1fr))` }
      : { gridTemplateRows: '1fr' }

  return (
    <div className="h-full w-full bg-[var(--obsidian-workspace)] text-[var(--obsidian-text)]">
      <div className="px-6 py-4 border-b border-[var(--obsidian-border-soft)] bg-[var(--obsidian-pane)]">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {state.workspaces.map((workspace) => (
            <button
              key={workspace.id}
              type="button"
              onClick={() => {
                setState((prevStored) => ({
                  ...normalizeKanbanState(prevStored),
                  activeWorkspaceId: workspace.id,
                }))
              }}
              className={twMerge(
                'inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-sm transition-colors',
                workspace.id === state.activeWorkspaceId
                  ? 'bg-[var(--obsidian-hover)] font-semibold text-[var(--obsidian-text)]'
                  : 'text-[var(--obsidian-text-muted)] hover:bg-[var(--obsidian-hover-soft)]'
              )}
              onContextMenu={(e) => {
                e.preventDefault()
                setWorkspaceContextMenu({
                  x: e.clientX,
                  y: e.clientY,
                  workspaceId: workspace.id,
                })
              }}
            >
              {workspace.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIsWorkspaceModalOpen(true)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--obsidian-text-muted)] hover:bg-[var(--obsidian-hover-soft)] hover:text-[var(--obsidian-text)]"
            title="Create workspace"
          >
            <VscAdd className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <input
            value={newColumnTitle}
            onChange={(e) => setNewColumnTitle(e.target.value)}
            placeholder="Add board name"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            className="w-52 rounded bg-[var(--obsidian-workspace)] px-3 py-2 text-sm text-[var(--obsidian-text)] outline-none shadow-sm focus:shadow-[0_0_0_2px_var(--obsidian-accent)]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') addColumn()
            }}
          />
          <button
            onClick={addColumn}
            className="inline-flex items-center gap-2 rounded bg-[#098fe8] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <VscAdd className="w-4 h-4" />
            Add board
          </button>
        </div>
      </div>

      <div className="h-[calc(100%-72px)] kanban-scroll overflow-x-scroll overflow-y-hidden px-6 py-5">
        <div
          className={twMerge('grid gap-4 h-full min-h-full items-start', gridClass)}
          style={gridStyle}
          onDragOver={(e) => {
            const payload = draggingRef.current
            if (!payload || payload.kind !== 'column') return
            e.preventDefault()

            if (e.currentTarget !== e.target) return
            const hint = { overColumnId: null } satisfies ColumnOverHint
            columnDropHintRef.current = hint
            setColumnDropHint((prev) => (prev?.overColumnId === null ? prev : hint))
          }}
          onDrop={(e) => {
            if (draggingRef.current?.kind !== 'column') return
            e.preventDefault()
            const payload = parseDragPayload(e.dataTransfer.getData('application/json'))
            if (!payload || payload.kind !== 'column') return
            const hint = columnDropHintRef.current
            if (hint?.overColumnId === null) moveColumnToEnd(payload.columnId)
            clearDragUi()
          }}
        >
          {columns.map((column) => (
            <div
              key={column.id}
              ref={(el) => {
                columnElByIdRef.current[column.id] = el
              }}
              draggable
              style={{
                willChange: 'transform',
                backgroundColor: column.color
                  ? `color-mix(in srgb, var(--obsidian-pane) 88%, ${column.color} 12%)`
                  : undefined,
              }}
              onDragStart={(e) => {
                if (shouldIgnoreColumnDragStart(e.target)) {
                  return
                }
                const payload = { kind: 'column', columnId: column.id } satisfies DragPayload
                draggingRef.current = payload
                setDraggingColumnId(column.id)
                setColumnDropHint(null)
                columnDropHintRef.current = null
                e.dataTransfer.setData('application/json', JSON.stringify(payload))
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragEnd={() => {
                clearDragUi()
              }}
              className={twMerge(
                'min-w-[280px] self-start mb-[10px] min-h-[70%] max-h-[calc(100%-10px)] flex flex-col overflow-hidden rounded-lg border border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] relative',
                draggingColumnId === column.id && 'opacity-60',
                columnDropHint?.overColumnId === column.id && 'ring-2 ring-[var(--obsidian-accent)]'
              )}
              onDragOver={(e) => {
                const payload = draggingRef.current
                if (!payload) return

                if (payload.kind === 'card') {
                  e.preventDefault()
                  setCardDragOverStable({ columnId: column.id, targetCardId: null })
                  return
                }

                if (payload.kind === 'column') {
                  if (payload.columnId === column.id) return
                  e.preventDefault()

                  const hint: ColumnOverHint = { overColumnId: column.id }
                  columnDropHintRef.current = hint
                  setColumnDropHint((prev) =>
                    prev?.overColumnId === hint.overColumnId ? prev : hint
                  )
                }
              }}
              onDrop={(e) => {
                const payload = getCurrentPayload(e.dataTransfer)
                if (!payload) return

                if (payload.kind === 'card') {
                  e.preventDefault()
                  const beforeCardId =
                    cardDragOverRef.current?.columnId === column.id
                      ? cardDragOverRef.current.targetCardId
                      : null
                  moveCard(payload.columnId, payload.cardId, column.id, beforeCardId)
                  clearDragUi()
                } else if (payload.kind === 'column') {
                  e.preventDefault()
                  e.stopPropagation()
                  if (payload.columnId === column.id) {
                    clearDragUi()
                    return
                  }

                  swapColumns(payload.columnId, column.id)
                  clearDragUi()
                }
              }}
            >
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--obsidian-border-soft)]">
                <div
                  className="p-1 text-[var(--obsidian-text-muted)]"
                  title="Drag column to reorder"
                >
                  <MdDragIndicator className="w-4 h-4" />
                </div>
                {renamingColumnId === column.id ? (
                  <input
                    ref={renameInputRef}
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="off"
                    className="flex-1 bg-transparent outline-none text-sm font-semibold text-[var(--obsidian-text)]"
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename()
                      if (e.key === 'Escape') cancelRename()
                    }}
                  />
                ) : (
                  <div className="flex-1 min-w-0">
                    <div
                      className="inline-flex max-w-full items-center gap-2 rounded-full px-2.5 py-1 text-sm font-semibold text-[var(--obsidian-text)] select-none"
                      style={{
                        backgroundColor: column.color
                          ? `color-mix(in srgb, var(--obsidian-workspace) 78%, ${column.color} 22%)`
                          : 'var(--obsidian-workspace)',
                      }}
                      title="Double click to rename"
                      onDoubleClick={() => beginRenameColumn(column.id)}
                    >
                      <span className="truncate">{column.title}</span>
                      <span className="text-[var(--obsidian-text-muted)]">{(column.cards ?? []).length}</span>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  className="p-1 rounded hover:bg-[var(--obsidian-hover)] text-[var(--obsidian-text-muted)]"
                  title="More actions"
                  onMouseDown={(e) => {
                    e.stopPropagation()
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    const rect = e.currentTarget.getBoundingClientRect()
                    setCardActionsMenu(null)
                    setColumnActionsMenu((prev) => {
                      if (prev?.columnId === column.id) return null
                      return {
                        x: rect.left,
                        y: rect.bottom + 6,
                        columnId: column.id,
                      }
                    })
                  }}
                >
                  <VscEllipsis className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-auto min-h-0 px-3 py-3 space-y-2 overflow-y-auto overflow-x-hidden no-scrollbar">
                {(column.cards ?? []).map((card) => (
                  <Card key={card.id} columnId={column.id} card={card} />
                ))}
              </div>

              <div className="px-3 py-3 border-t border-[var(--obsidian-border-soft)]">
                <AddCardForm onAdd={(payload) => addCard(column.id, payload)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {isWorkspaceModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] p-5 shadow-2xl">
            <div className="text-lg font-semibold text-[var(--obsidian-text)]">Create workspace</div>
            <div className="mt-1 text-sm text-[var(--obsidian-text-muted)]">
              Add a name for your new Kanban tab.
            </div>
            <input
              ref={newWorkspaceInputRef}
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="Workspace name"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              className="mt-4 w-full rounded bg-[var(--obsidian-workspace)] px-3 py-2 text-sm text-[var(--obsidian-text)] outline-none shadow-sm focus:shadow-[0_0_0_2px_var(--obsidian-accent)]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') addWorkspace()
                if (e.key === 'Escape') {
                  setIsWorkspaceModalOpen(false)
                  setNewWorkspaceName('')
                }
              }}
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsWorkspaceModalOpen(false)
                  setNewWorkspaceName('')
                }}
                className="rounded border border-[var(--obsidian-border)] bg-[var(--obsidian-workspace)] px-3 py-2 text-sm text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover-soft)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addWorkspace}
                className="rounded bg-[var(--obsidian-accent)] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {workspaceContextMenu ? (
        <ContextMenu
          x={workspaceContextMenu.x}
          y={workspaceContextMenu.y}
          onClose={() => setWorkspaceContextMenu(null)}
          className="min-w-[120px]"
        >
          <ContextMenuItem
            onClick={() => {
              removeWorkspace(workspaceContextMenu.workspaceId)
              setWorkspaceContextMenu(null)
            }}
          >
            <VscTrash className="h-4 w-4 text-red-400" />
            <span className="text-red-400">Delete</span>
          </ContextMenuItem>
        </ContextMenu>
      ) : null}

      {cardActionsMenu ? (
        <ContextMenu
          x={cardActionsMenu.x}
          y={cardActionsMenu.y}
          onClose={() => setCardActionsMenu(null)}
          className="min-w-[120px]"
        >
          <ContextMenuItem
            onClick={() => {
              removeCard(cardActionsMenu.columnId, cardActionsMenu.cardId)
              setCardActionsMenu(null)
            }}
          >
            <VscTrash className="h-4 w-4 text-red-400" />
            <span className="text-red-400">Delete</span>
          </ContextMenuItem>
        </ContextMenu>
      ) : null}

      {columnActionsMenu ? (
        <ContextMenu
          x={columnActionsMenu.x}
          y={columnActionsMenu.y}
          onClose={() => setColumnActionsMenu(null)}
          className="min-w-[120px]"
        >
          <ContextMenuItem
            onClick={() => {
              removeColumn(columnActionsMenu.columnId)
              setColumnActionsMenu(null)
            }}
          >
            <VscTrash className="h-4 w-4 text-red-400" />
            <span className="text-red-400">Delete</span>
          </ContextMenuItem>
        </ContextMenu>
      ) : null}

      <TaskDetailsPanel
        isOpen={Boolean(selectedCardInfo)}
        card={selectedCardInfo?.card ?? null}
        onClose={() => setSelectedCardId(null)}
        onUpdate={(next) => {
          const cardId = selectedCardInfo?.card.id
          if (!cardId) return
          updateCardById(cardId, (card) => ({ ...card, ...next }))
        }}
      />
    </div>
  )
}

const AddCardForm = ({
  onAdd,
}: {
  onAdd: (payload: {
    title: string
    description: string
    priority: Exclude<KanbanCardPriority, null>
    remindAt: string | null
  }) => void
}) => {
  const rootRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Exclude<KanbanCardPriority, null>>('low')
  const [remindAt, setRemindAt] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [popover, setPopover] = useState<{
    left: number
    bottom: number
    width: number
    maxHeight: number
    ready: boolean
  } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  const closeExpanded = () => {
    setIsExpanded(false)
    setPopover(null)
  }

  const submit = () => {
    const trimmed = title.trim()
    if (!trimmed) return
    onAdd({ title: trimmed, description, priority, remindAt })
    setTitle('')
    setDescription('')
    setPriority('low')
    setRemindAt(null)
    closeExpanded()
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  useEffect(() => {
    if (!isExpanded) return
    const shouldCloseForTarget = (target: Node | null) => {
      if (!target) return true
      if (rootRef.current?.contains(target)) return false
      if (popoverRef.current?.contains(target)) return false
      return true
    }

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null
      if (shouldCloseForTarget(target)) closeExpanded()
    }
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as Node | null
      if (shouldCloseForTarget(target)) closeExpanded()
    }
    window.addEventListener('mousedown', onMouseDown, true)
    window.addEventListener('focusin', onFocusIn, true)
    return () => {
      window.removeEventListener('mousedown', onMouseDown, true)
      window.removeEventListener('focusin', onFocusIn, true)
    }
  }, [isExpanded])

  useLayoutEffect(() => {
    if (!isExpanded) return

    let raf = 0
    const margin = 12
    const gap = 10

    const schedule = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const anchorRect = inputRef.current?.getBoundingClientRect()
        if (!anchorRect) return

        const availableWidth = Math.max(0, window.innerWidth - margin * 2)
        const width = Math.min(420, Math.max(260, anchorRect.width), availableWidth)
        const left = clamp(
          anchorRect.left,
          margin,
          Math.max(margin, window.innerWidth - width - margin)
        )

        const spaceAbove = Math.max(0, anchorRect.top - margin)
        const maxHeight = Math.max(0, spaceAbove - gap)
        const bottom = window.innerHeight - anchorRect.top + gap

        setPopover((prev) => {
          const next = {
            left,
            bottom,
            width,
            maxHeight,
            ready: true,
          }
          if (
            prev &&
            prev.left === next.left &&
            prev.bottom === next.bottom &&
            prev.width === next.width &&
            prev.maxHeight === next.maxHeight
          ) {
            return prev
          }
          return next
        })
      })
    }

    const onResizeOrScroll = () => schedule()
    window.addEventListener('resize', onResizeOrScroll)
    window.addEventListener('scroll', onResizeOrScroll, true)
    schedule()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResizeOrScroll)
      window.removeEventListener('scroll', onResizeOrScroll, true)
    }
  }, [isExpanded])

  return (
    <div
      ref={rootRef}
      className="space-y-2"
      onFocusCapture={() => setIsExpanded(true)}
    >
      <div className="flex items-center gap-2 pb-2">
        <div className="relative flex-1 min-w-0">
          {isExpanded ? (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[12px] opacity-70">
              {priorityToPrefix(priority)}
            </div>
          ) : null}
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add task..."
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            className={twMerge(
              'w-full rounded bg-[var(--obsidian-workspace)] py-2 text-sm text-[var(--obsidian-text)] outline-none shadow-sm focus:shadow-[0_0_0_2px_var(--obsidian-accent)]',
              isExpanded ? 'pl-10 pr-3' : 'px-3'
            )}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submit()
              }
              if (e.key === 'Escape') {
                closeExpanded()
                inputRef.current?.blur()
              }
            }}
          />
        </div>
        <button
          type="button"
          onClick={submit}
          className="inline-flex items-center gap-1 rounded border border-[var(--obsidian-border)] bg-[var(--obsidian-workspace)] px-2.5 py-2 text-sm text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover-soft)]"
          title="Add task"
        >
          <VscAdd className="w-4 h-4" />
        </button>
      </div>

      {isExpanded
        ? createPortal(
            <div
              ref={popoverRef}
              className={twMerge(
                'fixed z-[1600] overflow-auto no-scrollbar',
                'rounded-lg border border-[var(--obsidian-border-soft)] bg-[var(--obsidian-workspace)] p-3 shadow-2xl'
              )}
              style={{
                left: popover?.left ?? -10_000,
                bottom: popover?.bottom ?? -10_000,
                width: popover?.width ?? 320,
                maxHeight: popover?.maxHeight ?? 320,
                visibility: popover?.ready ? 'visible' : 'hidden',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation()
                  closeExpanded()
                  requestAnimationFrame(() => inputRef.current?.focus())
                }
              }}
            >
              <div className="space-y-2">
                <div>
                  <div className="text-[11px] font-semibold text-[var(--obsidian-text-muted)]">Description</div>
                  <textarea
                    ref={descriptionRef}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description..."
                    rows={3}
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="off"
                    className="mt-1 w-full resize-none rounded bg-[var(--obsidian-pane)] px-3 py-2 text-sm leading-6 text-[var(--obsidian-text)] outline-none shadow-sm focus:shadow-[0_0_0_2px_var(--obsidian-accent)]"
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return
                      if (e.shiftKey) return
                      e.preventDefault()
                      submit()
                    }}
                  />
                  <div className="mt-1 text-[11px] text-[var(--obsidian-text-muted)]">
                    Enter to add, Shift+Enter for a new line
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[11px] font-semibold text-[var(--obsidian-text-muted)]">Reminder</div>
                  </div>
                  <div className="mt-1">
                    <ReminderDateTimePicker
                      valueIso={remindAt}
                      onChange={setRemindAt}
                      className="w-full"
                      placeholder="Set reminder (today)"
                    />
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-[var(--obsidian-text-muted)]">Priority</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {KANBAN_PRIORITY_OPTIONS.map((opt) => {
                      const tint = getPriorityChipTint(opt.value)
                      const isActive = priority === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setPriority(opt.value)}
                          className={twMerge(
                            'inline-flex items-center gap-0.5 rounded-full border px-2 py-1 text-[11px] leading-4 transition-colors',
                            isActive
                              ? 'text-[var(--obsidian-text)]'
                              : 'text-[var(--obsidian-text-muted)] hover:bg-[var(--obsidian-hover-soft)]'
                          )}
                          style={{
                            backgroundColor: isActive ? tint.bgActive : tint.bg,
                            borderColor: isActive ? tint.borderActive : tint.border,
                          }}
                          title={`Priority: ${opt.label}`}
                        >
                          <span className="font-mono text-[11px] opacity-70">{opt.prefix}</span>
                          <span>{opt.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  )
}
