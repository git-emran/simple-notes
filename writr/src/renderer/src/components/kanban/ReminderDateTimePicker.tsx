import { useEffect, useMemo, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { VscCalendar, VscChevronLeft, VscChevronRight, VscClose } from 'react-icons/vsc'

type DateParts = {
  year: number
  monthIndex: number // 0-11
  day: number // 1-31
}

type TimeParts = {
  hour: number // 1-12
  minute: number // 0-59
  ampm: 'AM' | 'PM'
}

const pad2 = (value: number) => String(value).padStart(2, '0')

const roundToNextMinutes = (date: Date, stepMinutes: number) => {
  const ms = date.getTime()
  const stepMs = stepMinutes * 60_000
  return new Date(Math.ceil(ms / stepMs) * stepMs)
}

const parseIsoToLocalParts = (iso: string): (DateParts & TimeParts) | null => {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return null
  const hour24 = date.getHours()
  const ampm: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return {
    year: date.getFullYear(),
    monthIndex: date.getMonth(),
    day: date.getDate(),
    hour: hour12,
    minute: date.getMinutes(),
    ampm,
  }
}

const localPartsToIso = (parts: DateParts & TimeParts): string | null => {
  const hour24 =
    parts.ampm === 'AM'
      ? parts.hour === 12
        ? 0
        : parts.hour
      : parts.hour === 12
        ? 12
        : parts.hour + 12
  const date = new Date(parts.year, parts.monthIndex, parts.day, hour24, parts.minute, 0, 0)
  if (!Number.isFinite(date.getTime())) return null
  return date.toISOString()
}

const formatIso = (iso: string) => {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return iso
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

const monthLabel = (year: number, monthIndex: number) =>
  new Date(year, monthIndex, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' })

const daysInMonth = (year: number, monthIndex: number) => new Date(year, monthIndex + 1, 0).getDate()

const isSameDay = (a: DateParts, b: DateParts) =>
  a.year === b.year && a.monthIndex === b.monthIndex && a.day === b.day

const menuItemBaseClass =
  'w-full rounded px-2.5 py-2 text-left text-sm text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover-soft)]'

export const ReminderDateTimePicker = ({
  valueIso,
  onChange,
  className,
  placeholder = 'Set reminder',
}: {
  valueIso: string | null
  onChange: (nextIso: string | null) => void
  className?: string
  placeholder?: string
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState<null | 'hour' | 'minute' | 'ampm'>(null)

  const today: DateParts = (() => {
    const d = new Date()
    return { year: d.getFullYear(), monthIndex: d.getMonth(), day: d.getDate() }
  })()

  const [visibleMonth, setVisibleMonth] = useState<{ year: number; monthIndex: number }>(() => ({
    year: new Date().getFullYear(),
    monthIndex: new Date().getMonth(),
  }))
  const [dateDraft, setDateDraft] = useState<DateParts>(today)
  const [timeDraft, setTimeDraft] = useState<TimeParts>(() => {
    const rounded = roundToNextMinutes(new Date(), 5)
    const hour24 = rounded.getHours()
    const ampm: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM'
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
    return { hour: hour12, minute: rounded.getMinutes(), ampm }
  })

  useEffect(() => {
    if (!isOpen) return
    const fromValue = valueIso ? parseIsoToLocalParts(valueIso) : null
    const base = fromValue ?? (() => {
      const rounded = roundToNextMinutes(new Date(), 5)
      const hour24 = rounded.getHours()
      const ampm: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM'
      const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
      return {
        year: rounded.getFullYear(),
        monthIndex: rounded.getMonth(),
        day: rounded.getDate(),
        hour: hour12,
        minute: rounded.getMinutes(),
        ampm,
      }
    })()

    setDateDraft({ year: base.year, monthIndex: base.monthIndex, day: base.day })
    setTimeDraft({ hour: base.hour, minute: base.minute, ampm: base.ampm })
    setVisibleMonth({ year: base.year, monthIndex: base.monthIndex })
  }, [isOpen, valueIso])

  useEffect(() => {
    if (!isOpen) setOpenMenu(null)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null
      if (!target) return
      if (rootRef.current && !rootRef.current.contains(target)) {
        setOpenMenu(null)
        setIsOpen(false)
      }
    }
    window.addEventListener('mousedown', onMouseDown, true)
    return () => window.removeEventListener('mousedown', onMouseDown, true)
  }, [isOpen])

  const hourOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), [])
  const minuteOptions = useMemo(() => Array.from({ length: 60 }, (_, i) => i), [])

  const firstDow = new Date(visibleMonth.year, visibleMonth.monthIndex, 1).getDay()
  const dim = daysInMonth(visibleMonth.year, visibleMonth.monthIndex)
  const cells: Array<{ day: number; inMonth: boolean }> = []
  for (let i = 0; i < firstDow; i++) cells.push({ day: 0, inMonth: false })
  for (let d = 1; d <= dim; d++) cells.push({ day: d, inMonth: true })
  while (cells.length % 7 !== 0) cells.push({ day: 0, inMonth: false })
  while (cells.length < 42) cells.push({ day: 0, inMonth: false })

  const displayText = valueIso ? formatIso(valueIso) : placeholder

  return (
    <div ref={rootRef} className={twMerge('relative', className)}>
      <button
        type="button"
        onClick={() => {
          setOpenMenu(null)
          setIsOpen((v) => !v)
        }}
        className={twMerge(
          'w-full rounded bg-[var(--obsidian-workspace)] px-3 py-2 text-left text-sm text-[var(--obsidian-text)] outline-none shadow-sm',
          'hover:bg-[var(--obsidian-hover-soft)] focus:shadow-[0_0_0_2px_var(--obsidian-accent)]'
        )}
      >
        <span className={twMerge('inline-flex items-center gap-2', !valueIso && 'text-[var(--obsidian-text-muted)]')}>
          <VscCalendar className="h-4 w-4" />
          {displayText}
        </span>
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[1200] rounded-xl border border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] shadow-2xl">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--obsidian-border-soft)] px-4 py-2.5">
            <div className="text-xs font-semibold tracking-[0.12em] text-[var(--obsidian-text-muted)]">
              REMINDER
            </div>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-[var(--obsidian-hover-soft)] text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)]"
              title="Close"
              onClick={() => {
                setOpenMenu(null)
                setIsOpen(false)
              }}
            >
              <VscClose className="h-4 w-4" />
            </button>
          </div>

          <div className="px-4 py-4">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-[var(--obsidian-hover-soft)] text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)]"
                title="Previous month"
                onClick={() =>
                  setVisibleMonth((prev) => {
                    const nextMonth = prev.monthIndex - 1
                    if (nextMonth >= 0) return { year: prev.year, monthIndex: nextMonth }
                    return { year: prev.year - 1, monthIndex: 11 }
                  })
                }
              >
                <VscChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-sm font-semibold text-[var(--obsidian-text)]">
                {monthLabel(visibleMonth.year, visibleMonth.monthIndex)}
              </div>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-[var(--obsidian-hover-soft)] text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)]"
                title="Next month"
                onClick={() =>
                  setVisibleMonth((prev) => {
                    const nextMonth = prev.monthIndex + 1
                    if (nextMonth <= 11) return { year: prev.year, monthIndex: nextMonth }
                    return { year: prev.year + 1, monthIndex: 0 }
                  })
                }
              >
                <VscChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-2 grid grid-cols-7 gap-1 text-[11px] text-[var(--obsidian-text-muted)]">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => (
                <div key={d} className="py-1 text-center font-semibold opacity-80">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((cell, idx) => {
                if (!cell.inMonth) {
                  return <div key={idx} className="h-9" />
                }

                const cellDate: DateParts = {
                  year: visibleMonth.year,
                  monthIndex: visibleMonth.monthIndex,
                  day: cell.day,
                }
                const isSelected = isSameDay(cellDate, dateDraft)
                const isToday = isSameDay(cellDate, today)

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setDateDraft(cellDate)}
                    className={twMerge(
                      'h-9 rounded text-sm transition-colors',
                      isSelected
                        ? 'bg-[var(--obsidian-accent)] text-white'
                        : 'hover:bg-[var(--obsidian-hover-soft)] text-[var(--obsidian-text)]',
                      isToday && !isSelected && 'ring-1 ring-[var(--obsidian-border)]'
                    )}
                    title={`${cellDate.year}-${pad2(cellDate.monthIndex + 1)}-${pad2(cellDate.day)}`}
                  >
                    {cell.day}
                  </button>
                )
              })}
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="text-xs font-semibold text-[var(--obsidian-text-muted)]">Time</div>
              <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenMenu((prev) => (prev === 'hour' ? null : 'hour'))}
                    className="rounded border border-[var(--obsidian-border)] bg-[var(--obsidian-workspace)] px-2 py-1.5 text-sm text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover-soft)]"
                    title="Hour"
                  >
                    {pad2(timeDraft.hour)}
                  </button>
                  {openMenu === 'hour' ? (
                    <div className="absolute right-0 top-[calc(100%+6px)] z-[1210] w-24 rounded-lg border border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] p-1 shadow-2xl max-h-56 overflow-auto">
                      {hourOptions.map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => {
                            setTimeDraft((prev) => ({ ...prev, hour: h }))
                            setOpenMenu(null)
                          }}
                          className={twMerge(
                            menuItemBaseClass,
                            h === timeDraft.hour && 'bg-[var(--obsidian-hover-soft)]'
                          )}
                        >
                          {pad2(h)}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <span className="text-sm text-[var(--obsidian-text-muted)]">:</span>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenMenu((prev) => (prev === 'minute' ? null : 'minute'))}
                    className="rounded border border-[var(--obsidian-border)] bg-[var(--obsidian-workspace)] px-2 py-1.5 text-sm text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover-soft)]"
                    title="Minute"
                  >
                    {pad2(timeDraft.minute)}
                  </button>
                  {openMenu === 'minute' ? (
                    <div className="absolute right-0 top-[calc(100%+6px)] z-[1210] w-24 rounded-lg border border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] p-1 shadow-2xl max-h-56 overflow-auto">
                      {minuteOptions.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setTimeDraft((prev) => ({ ...prev, minute: m }))
                            setOpenMenu(null)
                          }}
                          className={twMerge(
                            menuItemBaseClass,
                            m === timeDraft.minute && 'bg-[var(--obsidian-hover-soft)]'
                          )}
                        >
                          {pad2(m)}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenMenu((prev) => (prev === 'ampm' ? null : 'ampm'))}
                    className="rounded border border-[var(--obsidian-border)] bg-[var(--obsidian-workspace)] px-2 py-1.5 text-sm text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover-soft)]"
                    title="AM/PM"
                  >
                    {timeDraft.ampm}
                  </button>
                  {openMenu === 'ampm' ? (
                    <div className="absolute right-0 top-[calc(100%+6px)] z-[1210] w-24 rounded-lg border border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] p-1 shadow-2xl max-h-56 overflow-auto">
                      {(['AM', 'PM'] as const).map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            setTimeDraft((prev) => ({ ...prev, ampm: value }))
                            setOpenMenu(null)
                          }}
                          className={twMerge(
                            menuItemBaseClass,
                            value === timeDraft.ampm && 'bg-[var(--obsidian-hover-soft)]'
                          )}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                className="text-xs text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)]"
                onClick={() => {
                  const rounded = roundToNextMinutes(new Date(), 5)
                  const nextDate: DateParts = {
                    year: rounded.getFullYear(),
                    monthIndex: rounded.getMonth(),
                    day: rounded.getDate(),
                  }
                  const hour24 = rounded.getHours()
                  const ampm: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM'
                  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
                  setDateDraft(nextDate)
                  setTimeDraft({ hour: hour12, minute: rounded.getMinutes(), ampm })
                  setVisibleMonth({ year: nextDate.year, monthIndex: nextDate.monthIndex })
                }}
              >
                Today
              </button>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded border border-[var(--obsidian-border)] bg-[var(--obsidian-workspace)] px-3 py-2 text-sm text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover-soft)]"
                  onClick={() => {
                    onChange(null)
                    setOpenMenu(null)
                    setIsOpen(false)
                  }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded bg-[var(--obsidian-accent)] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
                  onClick={() => {
                    const nextIso = localPartsToIso({ ...dateDraft, ...timeDraft })
                    onChange(nextIso)
                    setOpenMenu(null)
                    setIsOpen(false)
                  }}
                >
                  Set
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
