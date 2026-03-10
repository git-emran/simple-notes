import { useEffect, useMemo, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { VscClose, VscEdit, VscSave, VscDiscard } from 'react-icons/vsc'
import type { KanbanCard, KanbanCardPriority } from '@renderer/store/kanbanStore'
import { KANBAN_PRIORITY_OPTIONS, getPriorityChipTint, priorityToPrefix } from './kanbanPriority'

type TaskDetailsPanelProps = {
  isOpen: boolean
  card: KanbanCard | null
  onClose: () => void
  onUpdate: (next: { text: string; description: string; priority: KanbanCardPriority }) => void
}

export const TaskDetailsPanel = ({ isOpen, card, onClose, onUpdate }: TaskDetailsPanelProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [priorityDraft, setPriorityDraft] = useState<Exclude<KanbanCardPriority, null>>('low')

  const cardId = card?.id ?? null

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) {
      setIsVisible(false)
      return
    }

    const raf = window.requestAnimationFrame(() => setIsVisible(true))
    return () => window.cancelAnimationFrame(raf)
  }, [isOpen])

  useEffect(() => {
    if (!card) return
    const initialPriority = (card.priority ?? 'low') as Exclude<KanbanCardPriority, null>
    setIsEditing(false)
    setTitleDraft(card.text ?? '')
    setDescriptionDraft(card.description ?? '')
    setPriorityDraft(initialPriority)
  }, [cardId])

  const canSave = useMemo(() => Boolean(titleDraft.trim()), [titleDraft])

  if (!card) return null

  const prefix = priorityToPrefix(card.priority)
  const prefixTint =
    card.priority && card.priority !== null ? getPriorityChipTint(card.priority).borderActive : undefined

  const save = () => {
    if (!canSave) return
    onUpdate({
      text: titleDraft.trim(),
      description: descriptionDraft.trim(),
      priority: priorityDraft,
    })
    setIsEditing(false)
  }

  const cancel = () => {
    const initialPriority = (card.priority ?? 'low') as Exclude<KanbanCardPriority, null>
    setIsEditing(false)
    setTitleDraft(card.text ?? '')
    setDescriptionDraft(card.description ?? '')
    setPriorityDraft(initialPriority)
  }

  return (
    <div className={twMerge('fixed inset-0 z-50', isOpen || isVisible ? '' : 'pointer-events-none')}>
      <div
        className={twMerge(
          'absolute inset-0 bg-black/40 transition-opacity duration-200',
          isVisible ? 'opacity-100' : 'opacity-0'
        )}
        onMouseDown={onClose}
      />

      <aside
        className={twMerge(
          'absolute right-0 top-0 h-full w-[520px] max-w-[92vw] border-l border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] shadow-2xl transition-transform duration-200 ease-out',
          isVisible ? 'translate-x-0' : 'translate-x-full'
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--obsidian-border-soft)] px-5 py-4">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-[var(--obsidian-text-muted)]">Task</div>
            <div className="truncate text-base font-semibold text-[var(--obsidian-text)]">
              {isEditing ? 'Edit task' : 'Details'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={save}
                  disabled={!canSave}
                  className={twMerge(
                    'inline-flex items-center gap-2 rounded bg-[var(--obsidian-accent)] px-3 py-2 text-sm font-medium text-white hover:opacity-90',
                    !canSave && 'opacity-50 pointer-events-none'
                  )}
                  title="Save"
                >
                  <VscSave className="h-4 w-4" />
                  Save
                </button>
                <button
                  type="button"
                  onClick={cancel}
                  className="inline-flex items-center gap-2 rounded border border-[var(--obsidian-border)] bg-[var(--obsidian-workspace)] px-3 py-2 text-sm text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover-soft)]"
                  title="Cancel"
                >
                  <VscDiscard className="h-4 w-4" />
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 rounded border border-[var(--obsidian-border)] bg-[var(--obsidian-workspace)] px-3 py-2 text-sm text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover-soft)]"
                title="Edit"
              >
                <VscEdit className="h-4 w-4" />
                Edit
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded hover:bg-[var(--obsidian-hover-soft)] text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)]"
              title="Close"
            >
              <VscClose className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="h-[calc(100%-65px)] overflow-auto preview-scrollbar px-5 py-5">
          {isEditing ? (
            <div className="space-y-5">
              <div>
                <div className="text-xs font-semibold text-[var(--obsidian-text-muted)]">Task name</div>
                <input
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  className="mt-2 w-full rounded bg-[var(--obsidian-workspace)] px-3 py-2 text-base text-[var(--obsidian-text)] outline-none shadow-sm focus:shadow-[0_0_0_2px_var(--obsidian-accent)]"
                  placeholder="Task name"
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-[var(--obsidian-text-muted)]">Description</div>
                <textarea
                  value={descriptionDraft}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                  className="mt-2 w-full resize-none rounded bg-[var(--obsidian-workspace)] px-3 py-2 text-sm leading-6 text-[var(--obsidian-text)] outline-none shadow-sm focus:shadow-[0_0_0_2px_var(--obsidian-accent)]"
                  rows={6}
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  placeholder="Add a description"
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-[var(--obsidian-text-muted)]">Priority</div>
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  {KANBAN_PRIORITY_OPTIONS.map((opt) => {
                    const tint = getPriorityChipTint(opt.value)
                    const isActive = priorityDraft === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPriorityDraft(opt.value)}
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
          ) : (
            <div className="space-y-6">
              <div>
                <div className="text-xs font-semibold text-[var(--obsidian-text-muted)]">Title</div>
                <div className="mt-2 text-2xl font-semibold leading-tight text-[var(--obsidian-text)]">
                  {prefix ? (
                    <span className="mr-px font-mono opacity-80" style={{ color: prefixTint }}>
                      {prefix}
                    </span>
                  ) : null}
                  <span>{card.text}</span>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-[var(--obsidian-text-muted)]">Description</div>
                <div className="mt-2 whitespace-pre-wrap break-words rounded-lg border border-[var(--obsidian-border-soft)] bg-[var(--obsidian-workspace)] px-4 py-3 text-sm leading-6 text-[var(--obsidian-text)]">
                  {card.description?.trim() ? card.description : 'No description'}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-[var(--obsidian-text-muted)]">Priority</div>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-[var(--obsidian-border)] bg-[var(--obsidian-workspace)] px-3 py-1.5 text-sm text-[var(--obsidian-text)]">
                  <span className="font-mono text-xs opacity-70">{priorityToPrefix(card.priority) || '—'}</span>
                  <span className="capitalize">{card.priority ?? 'low'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
