import { useAtom } from 'jotai'
import { useEffect, useMemo, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { VscAdd, VscCheck, VscClose } from 'react-icons/vsc'
import { MdDragIndicator } from 'react-icons/md'
import {
  kanbanStateAtom,
  createKanbanCard,
  createKanbanColumn,
  pickNewKanbanColumnColor,
  stableKanbanColumnColor,
  type KanbanCard,
} from '@renderer/store/kanbanStore'

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

type ColumnOverHint = { overColumnId: string | null }

export const KanbanBoard = () => {
  const [state, setState] = useAtom(kanbanStateAtom)

  const [newBoardTitle, setNewBoardTitle] = useState('')
  const [cardDragOver, setCardDragOver] = useState<{
    columnId: string
    targetCardId: string | null
  } | null>(null)
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null)
  const [columnDropHint, setColumnDropHint] = useState<ColumnOverHint | null>(null)

  const [renamingColumnId, setRenamingColumnId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)
  const draggingRef = useRef<DragPayload | null>(null)
  const cardDragOverRef = useRef<{ columnId: string; targetCardId: string | null } | null>(null)
  const columnDropHintRef = useRef<ColumnOverHint | null>(null)
  const columnElByIdRef = useRef<Record<string, HTMLDivElement | null>>({})

  const columns = state.columns ?? []

  const moveColumnToEnd = (columnId: string) => {
    setState((prev) => {
      const fromIndex = prev.columns.findIndex((c) => c.id === columnId)
      if (fromIndex < 0) return prev
      if (fromIndex === prev.columns.length - 1) return prev
      const moving = prev.columns[fromIndex]
      const without = prev.columns.filter((c) => c.id !== columnId)
      return { ...prev, columns: [...without, moving] }
    })
  }

  const swapColumns = (aId: string, bId: string) => {
    if (aId === bId) return
    setState((prev) => {
      const aIndex = prev.columns.findIndex((c) => c.id === aId)
      const bIndex = prev.columns.findIndex((c) => c.id === bId)
      if (aIndex < 0 || bIndex < 0) return prev
      if (aIndex === bIndex) return prev

      const next = prev.columns.slice()
      ;[next[aIndex], next[bIndex]] = [next[bIndex], next[aIndex]]
      return { ...prev, columns: next }
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
      setState((prev) => ({
        ...prev,
        columns: prev.columns.map((c) => (c.id === renamingColumnId ? { ...c, title: nextTitle } : c)),
      }))
    }
    setRenamingColumnId(null)
    setRenameDraft('')
  }

  const cancelRename = () => {
    setRenamingColumnId(null)
    setRenameDraft('')
  }

  const addBoard = () => {
    const title = newBoardTitle.trim()
    if (!title) {
      alert('You need to add a name to the board')
      return
    }
    setState((prev) => ({
      ...prev,
      columns: [
        ...prev.columns,
        createKanbanColumn(
          title,
          pickNewKanbanColumnColor(prev.columns.map((c) => c.color).filter(Boolean) as string[])
        ),
      ],
    }))
    setNewBoardTitle('')
  }

  useEffect(() => {
    if (columns.length === 0) return
    if (columns.every((c) => Boolean(c.color))) return

    setState((prev) => ({
      ...prev,
      columns: prev.columns.map((c) => (c.color ? c : { ...c, color: stableKanbanColumnColor(c.id) })),
    }))
  }, [columns, setState])

  const removeBoard = (columnId: string) => {
    setState((prev) => ({
      ...prev,
      columns: prev.columns.filter((c) => c.id !== columnId),
    }))
  }

  const addCard = (columnId: string, text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setState((prev) => ({
      ...prev,
      columns: prev.columns.map((col) =>
        col.id === columnId ? { ...col, cards: [...col.cards, createKanbanCard(trimmed)] } : col
      ),
    }))
  }

  const removeCard = (columnId: string, cardId: string) => {
    setState((prev) => ({
      ...prev,
      columns: prev.columns.map((col) =>
        col.id === columnId ? { ...col, cards: col.cards.filter((c) => c.id !== cardId) } : col
      ),
    }))
  }

  const toggleCardCompleted = (columnId: string, cardId: string) => {
    setState((prev) => ({
      ...prev,
      columns: prev.columns.map((col) => {
        if (col.id !== columnId) return col
        return {
          ...col,
          cards: col.cards.map((c) =>
            c.id === cardId ? { ...c, completed: !Boolean(c.completed) } : c
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
    setState((prev) => {
      const fromCol = prev.columns.find((c) => c.id === fromColumnId)
      const toCol = prev.columns.find((c) => c.id === toColumnId)
      if (!fromCol || !toCol) return prev

      const card = fromCol.cards.find((c) => c.id === cardId)
      if (!card) return prev

      if (fromColumnId === toColumnId) {
        if (beforeCardId === cardId) return prev

        const without = fromCol.cards.filter((c) => c.id !== cardId)
        const rawIndex = beforeCardId == null ? without.length : without.findIndex((c) => c.id === beforeCardId)
        const insertIndex = rawIndex < 0 ? without.length : rawIndex
        const nextCards = [...without.slice(0, insertIndex), card, ...without.slice(insertIndex)]

        const sameOrder =
          nextCards.length === fromCol.cards.length &&
          nextCards.every((c, idx) => c.id === fromCol.cards[idx]!.id)
        if (sameOrder) return prev

        return {
          ...prev,
          columns: prev.columns.map((c) => (c.id === fromColumnId ? { ...c, cards: nextCards } : c)),
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
        ...prev,
        columns: prev.columns.map((c) => {
          if (c.id === fromColumnId) return { ...c, cards: fromWithout }
          if (c.id === toColumnId) return { ...c, cards: nextDestCards }
          return c
        }),
      }
    })
  }

  const swapCards = (fromColumnId: string, cardId: string, toColumnId: string, targetCardId: string) => {
    setState((prev) => {
      const fromCol = prev.columns.find((c) => c.id === fromColumnId)
      const toCol = prev.columns.find((c) => c.id === toColumnId)
      if (!fromCol || !toCol) return prev

      const fromIndex = fromCol.cards.findIndex((c) => c.id === cardId)
      const toIndex = toCol.cards.findIndex((c) => c.id === targetCardId)
      if (fromIndex < 0 || toIndex < 0) return prev
      if (fromColumnId === toColumnId && fromIndex === toIndex) return prev

      if (fromColumnId === toColumnId) {
        const nextCards = fromCol.cards.slice()
        ;[nextCards[fromIndex], nextCards[toIndex]] = [nextCards[toIndex], nextCards[fromIndex]]
        return {
          ...prev,
          columns: prev.columns.map((c) => (c.id === fromColumnId ? { ...c, cards: nextCards } : c)),
        }
      }

      const nextFromCards = fromCol.cards.slice()
      const nextToCards = toCol.cards.slice()
      const draggedCard = nextFromCards[fromIndex]
      const targetCard = nextToCards[toIndex]
      nextFromCards[fromIndex] = targetCard
      nextToCards[toIndex] = draggedCard

      return {
        ...prev,
        columns: prev.columns.map((c) => {
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
      >
        <div className="flex items-start gap-2">
          <button
            type="button"
            title={card.completed ? 'Mark as not done' : 'Mark as done'}
            onClick={() => toggleCardCompleted(columnId, card.id)}
            className={twMerge(
              'mt-0.5 h-5 w-5 shrink-0 rounded-full border flex items-center justify-center',
              card.completed
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-[var(--obsidian-border)] bg-transparent'
            )}
          >
            {card.completed ? <VscCheck className="h-4 w-4 text-emerald-500" /> : null}
          </button>

          <div
            className={twMerge(
              'flex-1 text-sm text-[var(--obsidian-text)] whitespace-pre-wrap break-words',
              Boolean(card.completed) && 'line-through text-[var(--obsidian-text-muted)]'
            )}
          >
            {card.text}
          </div>
          <button
            className="p-1 rounded hover:bg-[var(--obsidian-hover)] text-[var(--obsidian-text-muted)]"
            title="Remove task"
            onClick={() => removeCard(columnId, card.id)}
          >
            <VscClose className="w-4 h-4" />
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
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--obsidian-border-soft)] bg-[var(--obsidian-pane)]">
        <div>
          <div className="text-[10px] font-semibold tracking-[0.12em] text-[var(--obsidian-text-muted)]">
            KANBAN
          </div>
          <div className="text-xl font-semibold text-[var(--obsidian-text)]">Board</div>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={newBoardTitle}
            onChange={(e) => setNewBoardTitle(e.target.value)}
            placeholder="Add board..."
            className="w-52 rounded bg-[var(--obsidian-workspace)] px-3 py-2 text-sm text-[var(--obsidian-text)] outline-none shadow-sm focus:shadow-[0_0_0_2px_var(--obsidian-accent)]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') addBoard()
            }}
          />
          <button
            onClick={addBoard}
            className="inline-flex items-center gap-2 rounded bg-[var(--obsidian-accent)] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <VscAdd className="w-4 h-4" />
            Add board
          </button>
        </div>
      </div>

      <div className="h-[calc(100%-72px)] overflow-x-auto overflow-y-hidden px-6 py-5">
        <div
          className={twMerge('grid gap-4 min-h-full', gridClass)}
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
                'min-w-[280px] rounded-lg border border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] relative',
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
                  title="Drag board to reorder"
                >
                  <MdDragIndicator className="w-4 h-4" />
                </div>
                {renamingColumnId === column.id ? (
                  <input
                    ref={renameInputRef}
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm font-semibold text-[var(--obsidian-text)]"
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename()
                      if (e.key === 'Escape') cancelRename()
                    }}
                  />
                ) : (
                  <div
                    className="flex-1 min-w-0 truncate text-sm font-semibold text-[var(--obsidian-text)] select-none"
                    title="Double click to rename"
                    onDoubleClick={() => beginRenameColumn(column.id)}
                  >
                    {column.title}
                  </div>
                )}

                <div className="text-xs text-[var(--obsidian-text-muted)]">
                  {(column.cards ?? []).length}
                </div>
                <button
                  className="p-1 rounded hover:bg-[var(--obsidian-hover)] text-[var(--obsidian-text-muted)]"
                  title="Remove board"
                  onClick={() => removeBoard(column.id)}
                >
                  <VscClose className="w-4 h-4" />
                </button>
              </div>

              <div className="px-3 py-3 space-y-2 max-h-[calc(100vh-220px)] overflow-auto preview-scrollbar">
                {(column.cards ?? []).map((card) => (
                  <Card key={card.id} columnId={column.id} card={card} />
                ))}
              </div>

              <div className="px-3 py-3 border-t border-[var(--obsidian-border-soft)]">
                <AddCardForm onAdd={(text) => addCard(column.id, text)} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const AddCardForm = ({ onAdd }: { onAdd: (text: string) => void }) => {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add task..."
        className="flex-1 min-w-0 rounded bg-[var(--obsidian-workspace)] px-3 py-2 text-sm text-[var(--obsidian-text)] outline-none shadow-sm focus:shadow-[0_0_0_2px_var(--obsidian-accent)]"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onAdd(value)
            setValue('')
            requestAnimationFrame(() => inputRef.current?.focus())
          }
        }}
      />
      <button
        onClick={() => {
          onAdd(value)
          setValue('')
          requestAnimationFrame(() => inputRef.current?.focus())
        }}
        className="inline-flex items-center gap-1 rounded border border-[var(--obsidian-border)] bg-[var(--obsidian-workspace)] px-2.5 py-2 text-sm text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover-soft)]"
        title="Add task"
      >
        <VscAdd className="w-4 h-4" />
      </button>
    </div>
  )
}
