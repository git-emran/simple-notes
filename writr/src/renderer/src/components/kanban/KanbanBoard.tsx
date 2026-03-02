import { useAtom } from 'jotai'
import { useMemo, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { VscAdd, VscClose } from 'react-icons/vsc'
import {
  kanbanStateAtom,
  createKanbanCard,
  createKanbanColumn,
  type KanbanCard,
} from '@renderer/store/kanbanStore'

type DragPayload = { kind: 'card'; columnId: string; cardId: string }

const parseDragPayload = (value: string | null): DragPayload | null => {
  if (!value) return null
  try {
    return JSON.parse(value) as DragPayload
  } catch {
    return null
  }
}

export const KanbanBoard = () => {
  const [state, setState] = useAtom(kanbanStateAtom)

  const [newBoardTitle, setNewBoardTitle] = useState('')
  const [dragOver, setDragOver] = useState<{ columnId: string; beforeCardId: string | null } | null>(
    null
  )

  const [renamingColumnId, setRenamingColumnId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  const columns = state.columns ?? []

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
    if (!title) return
    setState((prev) => ({
      ...prev,
      columns: [...prev.columns, createKanbanColumn(title)],
    }))
    setNewBoardTitle('')
  }

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

  const moveCard = (
    fromColumnId: string,
    cardId: string,
    toColumnId: string,
    beforeCardId: string | null
  ) => {
    if (fromColumnId === toColumnId && beforeCardId == null) return

    setState((prev) => {
      const fromCol = prev.columns.find((c) => c.id === fromColumnId)
      const toCol = prev.columns.find((c) => c.id === toColumnId)
      if (!fromCol || !toCol) return prev

      const card = fromCol.cards.find((c) => c.id === cardId)
      if (!card) return prev

      const nextColumns = prev.columns.map((col) => {
        if (col.id === fromColumnId) {
          return { ...col, cards: col.cards.filter((c) => c.id !== cardId) }
        }
        return col
      })

      const destCol = nextColumns.find((c) => c.id === toColumnId)!
      const insertIndex =
        beforeCardId == null
          ? destCol.cards.length
          : Math.max(0, destCol.cards.findIndex((c) => c.id === beforeCardId))

      const nextCards = [
        ...destCol.cards.slice(0, insertIndex),
        card,
        ...destCol.cards.slice(insertIndex),
      ]

      return {
        ...prev,
        columns: nextColumns.map((c) => (c.id === toColumnId ? { ...c, cards: nextCards } : c)),
      }
    })
  }

  const Card = ({ columnId, card }: { columnId: string; card: KanbanCard }) => {
    return (
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(
            'application/json',
            JSON.stringify({ kind: 'card', columnId, cardId: card.id } satisfies DragPayload)
          )
          e.dataTransfer.effectAllowed = 'move'
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver({ columnId, beforeCardId: card.id })
        }}
        onDrop={(e) => {
          e.preventDefault()
          const payload = parseDragPayload(e.dataTransfer.getData('application/json'))
          if (!payload || payload.kind !== 'card') return
          moveCard(payload.columnId, payload.cardId, columnId, card.id)
          setDragOver(null)
        }}
        className={twMerge(
          'rounded-md border border-[var(--obsidian-border)] bg-[var(--obsidian-workspace)] px-3 py-2 shadow-sm',
          dragOver?.columnId === columnId &&
            dragOver.beforeCardId === card.id &&
            'ring-2 ring-[var(--obsidian-accent)]'
        )}
      >
        <div className="flex items-start gap-2">
          <div className="flex-1 text-sm text-[var(--obsidian-text)] whitespace-pre-wrap break-words">
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
    columns.length <= 3 ? 'grid-cols-3' : 'grid-flow-col auto-cols-[320px]'
  const gridStyle =
    columns.length <= 3
      ? { gridTemplateColumns: `repeat(${Math.max(1, columns.length)}, minmax(0, 1fr))` }
      : undefined

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
            className="w-52 rounded border border-[var(--obsidian-border)] bg-[var(--obsidian-workspace)] px-3 py-2 text-sm text-[var(--obsidian-text)] outline-none focus:border-[var(--obsidian-accent)]"
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
        <div className={twMerge('grid gap-4 min-h-full', gridClass)} style={gridStyle}>
          {columns.map((column) => (
            <div
              key={column.id}
              className="min-w-[280px] rounded-lg border border-[var(--obsidian-border)] bg-[var(--obsidian-pane)]"
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver({ columnId: column.id, beforeCardId: null })
              }}
              onDrop={(e) => {
                e.preventDefault()
                const payload = parseDragPayload(e.dataTransfer.getData('application/json'))
                if (!payload || payload.kind !== 'card') return
                moveCard(payload.columnId, payload.cardId, column.id, null)
                setDragOver(null)
              }}
            >
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--obsidian-border-soft)]">
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

                {dragOver?.columnId === column.id && dragOver.beforeCardId == null && (
                  <div className="h-10 rounded border-2 border-dashed border-[var(--obsidian-accent)]/60" />
                )}
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
        className="flex-1 min-w-0 rounded border border-[var(--obsidian-border)] bg-[var(--obsidian-workspace)] px-3 py-2 text-sm text-[var(--obsidian-text)] outline-none focus:border-[var(--obsidian-accent)]"
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
