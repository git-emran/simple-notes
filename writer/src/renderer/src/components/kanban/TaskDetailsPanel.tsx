import { useEffect, useMemo, useState, useRef } from 'react'
import { twMerge } from 'tailwind-merge'
import { VscClose, VscEdit, VscSave, VscDiscard, VscChevronDown, VscAdd, VscTrash } from 'react-icons/vsc'
import type { KanbanCard, KanbanCardPriority, KanbanTodo } from '@renderer/store/kanbanStore'
import { KANBAN_PRIORITY_OPTIONS, getPriorityChipTint } from './kanbanPriority'


type TaskDetailsPanelProps = {
  isOpen: boolean
  card: KanbanCard | null
  onClose: () => void
  onUpdate: (next: {
    text: string
    description: string
    priority: KanbanCardPriority
    todos: KanbanTodo[]
    remindAt: string | null
    reminderFiredAt: string | null
  }) => void
}

export const TaskDetailsPanel = ({ isOpen, card, onClose, onUpdate }: TaskDetailsPanelProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [priorityDraft, setPriorityDraft] = useState<Exclude<KanbanCardPriority, null>>('low')
  const [todosDraft, setTodosDraft] = useState<KanbanTodo[]>([])
  const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false)
  const priorityDropdownRef = useRef<HTMLDivElement>(null)
  
  const [internalCard, setInternalCard] = useState<KanbanCard | null>(card)

  useEffect(() => {
    if (card) {
      setInternalCard(card)
    }
  }, [card])

  const cardId = internalCard?.id ?? null

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
      setIsPriorityDropdownOpen(false)
      return
    }

    const raf = window.requestAnimationFrame(() => setIsVisible(true))
    return () => window.cancelAnimationFrame(raf)
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(e.target as Node)) {
        setIsPriorityDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!internalCard) return
    const initialPriority = (internalCard.priority ?? 'low') as Exclude<KanbanCardPriority, null>
    setIsEditing(false)
    setTitleDraft(internalCard.text ?? '')
    setDescriptionDraft(internalCard.description ?? '')
    setPriorityDraft(initialPriority)
    setTodosDraft(internalCard.todos ?? [])
  }, [cardId, internalCard])

  const canSave = useMemo(() => Boolean(titleDraft.trim()), [titleDraft])

  if (!internalCard) return null


  const prefixTint =
    internalCard.priority && internalCard.priority !== null ? getPriorityChipTint(internalCard.priority).borderActive : undefined

  const save = () => {
    if (!canSave || !internalCard) return
    onUpdate({
      text: titleDraft.trim(),
      description: descriptionDraft.trim(),
      priority: priorityDraft,
      todos: todosDraft,
      remindAt: internalCard.remindAt ?? null,
      reminderFiredAt: internalCard.reminderFiredAt ?? null,
    })
    setIsEditing(false)
  }

  const cancel = () => {
    if (!internalCard) return
    const initialPriority = (internalCard.priority ?? 'low') as Exclude<KanbanCardPriority, null>
    setIsEditing(false)
    setTitleDraft(internalCard.text ?? '')
    setDescriptionDraft(internalCard.description ?? '')
    setPriorityDraft(initialPriority)
    setTodosDraft(internalCard.todos ?? [])
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
          'absolute right-0 top-0 h-full w-[520px] max-w-[92vw] border-l border-obsidian-border bg-[var(--obsidian-surface)] shadow-2xl transition-transform duration-200 ease-out',
          isVisible ? 'translate-x-0' : 'translate-x-full'
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-obsidian-border-soft px-4 py-4">
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
                  className="inline-flex items-center gap-2 rounded border border-obsidian-border bg-[var(--obsidian-workspace)] px-3 py-2 text-sm text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover-soft)]"
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
                className="inline-flex items-center gap-2 rounded border border-obsidian-border bg-[var(--obsidian-workspace)] px-3 py-2 text-sm text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover-soft)]"
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

        <div className="h-[calc(100%-65px)] overflow-auto preview-scrollbar px-4 py-5">
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.shiftKey) {
                      e.preventDefault()
                      save()
                    }
                  }}
                  className="mt-2 w-full resize-none rounded bg-[var(--obsidian-workspace)] px-3 py-2 text-sm leading-6 text-[var(--obsidian-text)] outline-none shadow-sm focus:shadow-[0_0_0_2px_var(--obsidian-accent)]"
                  rows={6}
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  placeholder="Add a description"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-[var(--obsidian-text-muted)]">To-do list</div>
                  <button
                    type="button"
                    onClick={() => setTodosDraft([...todosDraft, { id: Date.now().toString(), text: '', completed: false }])}
                    className="inline-flex items-center gap-1 text-[11px] text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] transition-colors"
                  >
                    <VscAdd className="h-3 w-3" /> Add item
                  </button>
                </div>
                {todosDraft.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {todosDraft.map((todo, idx) => (
                      <div key={todo.id} className="flex items-start gap-2 group">
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={(e) => {
                            const next = [...todosDraft]
                            next[idx].completed = e.target.checked
                            setTodosDraft(next)
                          }}
                          className="mt-1 shrink-0 accent-[var(--obsidian-accent)]"
                        />
                        <input
                          id={`todo-input-${todo.id}`}
                          value={todo.text}
                          onChange={(e) => {
                            const next = [...todosDraft]
                            next[idx].text = e.target.value
                            setTodosDraft(next)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              const newId = Date.now().toString()
                              const next = [...todosDraft]
                              next.splice(idx + 1, 0, { id: newId, text: '', completed: false })
                              setTodosDraft(next)
                              setTimeout(() => {
                                document.getElementById(`todo-input-${newId}`)?.focus()
                              }, 0)
                            } else if (e.key === 'Backspace' && todo.text === '') {
                              e.preventDefault()
                              setTodosDraft(todosDraft.filter((_, i) => i !== idx))
                              if (idx > 0) {
                                setTimeout(() => {
                                  document.getElementById(`todo-input-${todosDraft[idx - 1].id}`)?.focus()
                                }, 0)
                              }
                            }
                          }}
                          className={twMerge(
                            "flex-1 bg-transparent text-sm text-[var(--obsidian-text)] outline-none border-b border-transparent focus:border-obsidian-border transition-colors",
                            todo.completed ? "line-through opacity-50" : ""
                          )}
                          placeholder="Task..."
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setTodosDraft(todosDraft.filter((_, i) => i !== idx))
                          }}
                          className="text-[var(--obsidian-text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--obsidian-text)] transition-all shrink-0"
                        >
                          <VscTrash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold text-[var(--obsidian-text-muted)]">Priority</div>
                <div className="mt-2 relative inline-block" ref={priorityDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsPriorityDropdownOpen(!isPriorityDropdownOpen)}
                    className="inline-flex items-center gap-1.5 rounded border border-obsidian-border bg-[var(--obsidian-pane)] px-3 py-1.5 text-[13px] text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)] transition-all"
                  >
                    <span 
                      className="h-2 w-2 rounded-full" 
                      style={{ backgroundColor: getPriorityChipTint(priorityDraft).borderActive }} 
                    />
                    <span>{KANBAN_PRIORITY_OPTIONS.find(o => o.value === priorityDraft)?.label || 'Low'}</span>
                    <VscChevronDown className="h-3.5 w-3.5 opacity-60 ml-1" />
                  </button>
                  
                  {isPriorityDropdownOpen && (
                    <div className="absolute left-0 top-full z-10 mt-1 w-32 rounded-md border border-obsidian-border bg-[var(--obsidian-surface)] p-1 shadow-lg backdrop-blur-sm">
                      {KANBAN_PRIORITY_OPTIONS.map((opt) => {
                        const isActive = priorityDraft === opt.value
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setPriorityDraft(opt.value)
                              setIsPriorityDropdownOpen(false)
                            }}
                            className={twMerge(
                              "flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-[var(--obsidian-text)] transition-colors hover:bg-[var(--obsidian-hover)]",
                              isActive ? "bg-[var(--obsidian-hover)] font-semibold" : ""
                            )}
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: getPriorityChipTint(opt.value).borderActive }}
                            />
                            <span>{opt.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="text-xs font-semibold text-[var(--obsidian-text-muted)]">Title</div>
                <div className="mt-2 flex items-center gap-2 text-2xl font-semibold leading-tight text-[var(--obsidian-text)]">
                  {prefixTint ? (
                    <span 
                      className="h-4 w-4 rounded-full shrink-0" 
                      style={{ backgroundColor: prefixTint }} 
                    />
                  ) : null}
                  <span>{internalCard.text}</span>
                </div>
              </div>



              <div>
                <div className="text-xs font-semibold text-[var(--obsidian-text-muted)]">Description</div>
                <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--obsidian-text)]">
                  {internalCard.description ? internalCard.description : <span className="italic opacity-50">No description provided</span>}
                </div>
              </div>

              {internalCard.todos && internalCard.todos.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-[var(--obsidian-text-muted)]">To-do list</div>
                  <div className="mt-2 space-y-2">
                    {internalCard.todos.map((todo, idx) => (
                      <div key={todo.id} className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={(e) => {
                            const nextTodos = [...internalCard.todos!]
                            nextTodos[idx].completed = e.target.checked
                            onUpdate({
                              text: internalCard.text,
                              description: internalCard.description || '',
                              priority: internalCard.priority ?? null,
                              todos: nextTodos,
                              remindAt: internalCard.remindAt ?? null,
                              reminderFiredAt: internalCard.reminderFiredAt ?? null,
                            })
                          }}
                          className="mt-1 shrink-0 accent-[var(--obsidian-accent)]"
                        />
                        <div className={twMerge(
                          "text-sm text-[var(--obsidian-text)]",
                          todo.completed ? "line-through opacity-50" : ""
                        )}>
                          {todo.text || <span className="italic opacity-50">Empty task</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs font-semibold text-[var(--obsidian-text-muted)]">Priority</div>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-obsidian-border bg-[var(--obsidian-workspace)] px-3 py-1.5 text-sm text-[var(--obsidian-text)]">
                  <span 
                    className="h-2 w-2 rounded-full" 
                    style={{ backgroundColor: prefixTint }} 
                  />
                  <span className="capitalize">{internalCard.priority ?? 'low'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
