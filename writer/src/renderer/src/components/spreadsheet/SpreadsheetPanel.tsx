import { useEffect, useMemo, useRef, useState } from 'react'
import { useAtom } from 'jotai'
import {
  createBlankSpreadsheetSheet,
  createSpreadsheetId,
  spreadsheetStateAtom,
  type SpreadsheetColumn,
  type SpreadsheetColumnType,
  type SpreadsheetOption,
  type SpreadsheetRow,
  type SpreadsheetTab
} from '@renderer/store'
import {
  VscAdd,
  VscChromeClose,
  VscCopy,
  VscEdit,
  VscFilter,
  VscGrabber,
  VscSearch,
  VscSettingsGear,
  VscTrash
} from 'react-icons/vsc'
import { twMerge } from 'tailwind-merge'

const columnTypes: SpreadsheetColumnType[] = [
  'text',
  'number',
  'date',
  'status',
  'checkbox',
  'select',
  'multi-select',
  'url',
  'email',
  'currency',
  'tags'
]

const tint = (color: string, alpha = 0.16) => {
  const hex = color.replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  if ([r, g, b].some(Number.isNaN)) return color
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const getCellText = (row: SpreadsheetRow, column: SpreadsheetColumn) =>
  String(row.cells[column.id] ?? '')

const getOption = (options: SpreadsheetOption[] | undefined, value: string) =>
  options?.find((option) => option.id === value || option.label === value)

const normalizeOptionValue = (column: SpreadsheetColumn, raw: string) => {
  const trimmed = raw.trim()
  const option = getOption(column.options, trimmed)
  return option?.id ?? trimmed
}

const sortRows = (
  rows: SpreadsheetRow[],
  sheet: SpreadsheetTab,
  visibleColumns: SpreadsheetColumn[]
) => {
  const sort = sheet.sort
  if (!sort) return rows
  const column = visibleColumns.find((col) => col.id === sort.columnId)
  if (!column) return rows

  return [...rows].sort((a, b) => {
    const av = getCellText(a, column)
    const bv = getCellText(b, column)
    const result =
      column.type === 'number' || column.type === 'currency'
        ? Number(av || 0) - Number(bv || 0)
        : av.localeCompare(bv)
    return sort.direction === 'asc' ? result : -result
  })
}

export const SpreadsheetPanel = () => {
  const [state, setState] = useAtom(spreadsheetStateAtom)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null)
  const [settingsColumnId, setSettingsColumnId] = useState<string | null>(null)
  const [sheetToDeleteId, setSheetToDeleteId] = useState<string | null>(null)
  const draggedSheetIdRef = useRef<string | null>(null)
  const draggedColumnIdRef = useRef<string | null>(null)
  const draggedRowIdRef = useRef<string | null>(null)

  const settingsMenuRef = useRef<HTMLDivElement>(null)
  const deleteModalRef = useRef<HTMLDivElement>(null)

  // Click outside and ESC handlers for column settings menu
  useEffect(() => {
    if (!settingsColumnId) return

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (
        settingsMenuRef.current &&
        !settingsMenuRef.current.contains(target) &&
        !target.closest('[data-settings-gear-button]')
      ) {
        setSettingsColumnId(null)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSettingsColumnId(null)
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [settingsColumnId])

  // Click outside and ESC handlers for sheet deletion modal
  useEffect(() => {
    if (!sheetToDeleteId) return

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (deleteModalRef.current && !deleteModalRef.current.contains(target)) {
        setSheetToDeleteId(null)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSheetToDeleteId(null)
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [sheetToDeleteId])

  const sheet = useMemo(
    () => state.sheets.find((item) => item.id === state.activeSheetId) ?? state.sheets[0],
    [state.activeSheetId, state.sheets]
  )

  const visibleColumns = useMemo(
    () => sheet.columns.filter((column) => !column.hidden),
    [sheet.columns]
  )

  const displayedRows = useMemo(() => {
    const search = sheet.search.trim().toLowerCase()
    const rows = search
      ? sheet.rows.filter((row) =>
          visibleColumns.some((column) => getCellText(row, column).toLowerCase().includes(search))
        )
      : sheet.rows
    return sortRows(rows, sheet, visibleColumns)
  }, [sheet, visibleColumns])

  const updateSheet = (updater: (sheet: SpreadsheetTab) => SpreadsheetTab) => {
    setState((current) => ({
      ...current,
      sheets: current.sheets.map((item) => (item.id === sheet.id ? updater(item) : item))
    }))
  }

  const updateCell = (rowId: string, column: SpreadsheetColumn, value: string | boolean) => {
    updateSheet((current) => ({
      ...current,
      rows: current.rows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              cells: {
                ...row.cells,
                [column.id]:
                  typeof value === 'string' && ['status', 'select'].includes(column.type)
                    ? normalizeOptionValue(column, value)
                    : value
              }
            }
          : row
      )
    }))
  }

  const addSheet = () => {
    const next = createBlankSpreadsheetSheet(`Sheet ${state.sheets.length + 1}`)
    setState((current) => ({
      activeSheetId: next.id,
      sheets: [...current.sheets, next]
    }))
  }

  const duplicateSheet = (sheetId: string) => {
    const source = state.sheets.find((item) => item.id === sheetId)
    if (!source) return
    const copy: SpreadsheetTab = {
      ...source,
      id: createSpreadsheetId('sheet'),
      name: `${source.name} copy`,
      rows: source.rows.map((row) => ({ ...row, id: createSpreadsheetId('row'), cells: { ...row.cells } }))
    }
    setState((current) => ({
      activeSheetId: copy.id,
      sheets: [...current.sheets, copy]
    }))
  }

  const deleteSheet = (sheetId: string) => {
    if (state.sheets.length === 1) return
    const nextSheets = state.sheets.filter((item) => item.id !== sheetId)
    setState({
      activeSheetId: sheetId === state.activeSheetId ? nextSheets[0].id : state.activeSheetId,
      sheets: nextSheets
    })
  }

  const reorderSheet = (targetSheetId: string) => {
    const sourceSheetId = draggedSheetIdRef.current
    if (!sourceSheetId || sourceSheetId === targetSheetId) return
    const next = [...state.sheets]
    const sourceIndex = next.findIndex((item) => item.id === sourceSheetId)
    const targetIndex = next.findIndex((item) => item.id === targetSheetId)
    if (sourceIndex === -1 || targetIndex === -1) return
    const [moved] = next.splice(sourceIndex, 1)
    next.splice(targetIndex, 0, moved)
    setState((current) => ({ ...current, sheets: next }))
  }

  const addColumn = () => {
    const id = createSpreadsheetId('col')
    updateSheet((current) => ({
      ...current,
      columns: [...current.columns, { id, name: 'New field', type: 'text', width: 160 }],
      rows: current.rows.map((row) => ({ ...row, cells: { ...row.cells, [id]: '' } }))
    }))
  }

  const updateColumn = (columnId: string, patch: Partial<SpreadsheetColumn>) => {
    updateSheet((current) => ({
      ...current,
      columns: current.columns.map((column) =>
        column.id === columnId ? { ...column, ...patch } : column
      )
    }))
  }

  const deleteColumn = (columnId: string) => {
    updateSheet((current) => ({
      ...current,
      columns: current.columns.filter((column) => column.id !== columnId),
      rows: current.rows.map((row) => {
        const nextCells = { ...row.cells }
        delete nextCells[columnId]
        return { ...row, cells: nextCells }
      })
    }))
  }

  const reorderColumn = (targetColumnId: string) => {
    const sourceColumnId = draggedColumnIdRef.current
    if (!sourceColumnId || sourceColumnId === targetColumnId) return
    updateSheet((current) => {
      const columns = [...current.columns]
      const sourceIndex = columns.findIndex((column) => column.id === sourceColumnId)
      const targetIndex = columns.findIndex((column) => column.id === targetColumnId)
      if (sourceIndex === -1 || targetIndex === -1) return current
      const [moved] = columns.splice(sourceIndex, 1)
      columns.splice(targetIndex, 0, moved)
      return { ...current, columns }
    })
  }

  const addRow = () => {
    updateSheet((current) => ({
      ...current,
      rows: [
        ...current.rows,
        {
          id: createSpreadsheetId('row'),
          cells: Object.fromEntries(
            current.columns.map((column) => [
              column.id,
              column.type === 'checkbox'
                ? false
                : column.type === 'status'
                  ? current.defaultStatusId
                  : ''
            ])
          )
        }
      ]
    }))
  }

  const deleteRows = (rowIds: Set<string>) => {
    updateSheet((current) => ({
      ...current,
      rows: current.rows.filter((row) => !rowIds.has(row.id))
    }))
    setSelectedRows(new Set())
  }

  const duplicateRows = (rowIds: Set<string>) => {
    updateSheet((current) => ({
      ...current,
      rows: current.rows.flatMap((row) =>
        rowIds.has(row.id)
          ? [row, { ...row, id: createSpreadsheetId('row'), cells: { ...row.cells } }]
          : [row]
      )
    }))
  }

  const reorderRow = (targetRowId: string) => {
    const sourceRowId = draggedRowIdRef.current
    if (!sourceRowId || sourceRowId === targetRowId) return
    updateSheet((current) => {
      const rows = [...current.rows]
      const sourceIndex = rows.findIndex((row) => row.id === sourceRowId)
      const targetIndex = rows.findIndex((row) => row.id === targetRowId)
      if (sourceIndex === -1 || targetIndex === -1) return current
      const [moved] = rows.splice(sourceIndex, 1)
      rows.splice(targetIndex, 0, moved)
      return { ...current, rows }
    })
  }

  const toggleRow = (rowId: string) => {
    setSelectedRows((current) => {
      const next = new Set(current)
      if (next.has(rowId)) next.delete(rowId)
      else next.add(rowId)
      return next
    })
  }

  const exportToCsv = () => {
    const escapeCsvCell = (value: string) => {
      const clean = value.replace(/"/g, '""')
      if (clean.includes(',') || clean.includes('\n') || clean.includes('\r') || value.includes('"')) {
        return `"${clean}"`
      }
      return clean
    }

    const headers = sheet.columns.map((col) => escapeCsvCell(col.name)).join(',')

    const csvRows = sheet.rows.map((row) => {
      return sheet.columns
        .map((col) => {
          const val = row.cells[col.id]
          if (col.type === 'checkbox') {
            return val ? 'true' : 'false'
          }
          if (col.type === 'status' || col.type === 'select') {
            const option = getOption(col.options, String(val ?? ''))
            return escapeCsvCell(option ? option.label : String(val ?? ''))
          }
          if (col.type === 'multi-select' || col.type === 'tags') {
            const textValue = String(val ?? '')
            const values = textValue.split(',').map((item) => item.trim()).filter(Boolean)
            const resolved = values
              .map((item) => {
                const itemOption = getOption(col.options, item)
                return itemOption ? itemOption.label : item
              })
              .join(', ')
            return escapeCsvCell(resolved)
          }
          return escapeCsvCell(String(val ?? ''))
        })
        .join(',')
    })

    const csvContent = [headers, ...csvRows].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${sheet.name || 'sheet'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[var(--obsidian-base)] text-[var(--obsidian-text)]">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] px-4">
        <div className="text-sm font-semibold">Spreadsheet</div>
        <div className="relative ml-2 min-w-[240px] max-w-[420px] flex-1">
          <VscSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--obsidian-text-muted)]" />
          <input
            value={sheet.search}
            onChange={(event) => updateSheet((current) => ({ ...current, search: event.target.value }))}
            placeholder="Search active sheet"
            className="h-8 w-full rounded-md border border-[var(--obsidian-border)] bg-[var(--obsidian-base)] pl-8 pr-3 text-xs outline-none focus:border-[var(--obsidian-accent)] focus:ring-2 focus:ring-[var(--obsidian-accent-dim)]"
          />
        </div>
        {selectedRows.size > 0 && (
          <div className="flex items-center gap-1 rounded-md border border-[var(--obsidian-border)] bg-[var(--obsidian-base)] p-1">
            <span className="px-2 text-xs text-[var(--obsidian-text-muted)]">{selectedRows.size} selected</span>
            <button className="spreadsheet-toolbar-btn" onClick={() => duplicateRows(selectedRows)}>
              <VscCopy /> Duplicate
            </button>
            <button className="spreadsheet-toolbar-btn text-red-500" onClick={() => deleteRows(selectedRows)}>
              <VscTrash /> Delete
            </button>
          </div>
        )}
        <button
          className="ml-auto flex items-center gap-1.5 rounded-md bg-[var(--obsidian-accent)] px-3 py-1.5 text-xs font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.98] shadow-sm shrink-0"
          onClick={exportToCsv}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
            <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
          </svg>
          <span>Export to CSV</span>
        </button>
      </div>

      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] px-3">
        {state.sheets.map((item) => (
          <div
            key={item.id}
            draggable
            onDragStart={() => {
              draggedSheetIdRef.current = item.id
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => reorderSheet(item.id)}
            onDragEnd={() => {
              draggedSheetIdRef.current = null
            }}
            className={twMerge(
              'group flex h-8 items-center gap-1 rounded-md border px-2 text-xs transition-colors',
              item.id === sheet.id
                ? 'border-[var(--obsidian-border)] bg-[var(--obsidian-workspace)] text-[var(--obsidian-text)]'
                : 'border-transparent text-[var(--obsidian-text-muted)] hover:bg-[var(--obsidian-hover)]'
            )}
            onClick={() => setState((current) => ({ ...current, activeSheetId: item.id }))}
          >
            <VscGrabber className="h-3.5 w-3.5 opacity-50" />
            {editingSheetId === item.id ? (
              <input
                autoFocus
                value={item.name}
                onClick={(event) => event.stopPropagation()}
                onBlur={() => setEditingSheetId(null)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.currentTarget.blur()
                  }
                }}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    sheets: current.sheets.map((target) =>
                      target.id === item.id ? { ...target, name: event.target.value } : target
                    )
                  }))
                }
                className="w-28 bg-transparent outline-none"
              />
            ) : (
              <span className="max-w-32 truncate">{item.name}</span>
            )}
            <button className="spreadsheet-icon-btn" onClick={(event) => { event.stopPropagation(); setEditingSheetId(item.id) }}>
              <VscEdit />
            </button>
            <button className="spreadsheet-icon-btn" onClick={(event) => { event.stopPropagation(); duplicateSheet(item.id) }}>
              <VscCopy />
            </button>
            <button
              data-delete-tab-button={item.id}
              className="spreadsheet-icon-btn"
              onClick={(event) => {
                event.stopPropagation()
                if (state.sheets.length === 1) return
                setSheetToDeleteId(item.id)
              }}
            >
              <VscChromeClose />
            </button>
          </div>
        ))}
        <button className="spreadsheet-tab-add" onClick={addSheet} title="Add sheet">
          <VscAdd />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="min-w-fit rounded-lg border border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div
            className="grid border-b border-[var(--obsidian-border)] bg-[var(--obsidian-table-head)]"
            style={{ gridTemplateColumns: `44px ${visibleColumns.map((column) => `${column.width}px`).join(' ')} 120px` }}
          >
            <div className="h-10 border-r border-[var(--obsidian-border)]" />
            {visibleColumns.map((column) => (
              <div
                key={column.id}
                draggable
                onDragStart={() => {
                  draggedColumnIdRef.current = column.id
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => reorderColumn(column.id)}
                onDragEnd={() => {
                  draggedColumnIdRef.current = null
                }}
                className="group relative flex h-10 items-center gap-2 border-r border-[var(--obsidian-border)] px-2"
              >
                <VscGrabber className="h-3.5 w-3.5 cursor-grab text-[var(--obsidian-text-muted)]" />
                <input
                  value={column.name}
                  onChange={(event) => updateColumn(column.id, { name: event.target.value })}
                  className="min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none"
                />
                <button
                  data-settings-gear-button={column.id}
                  className="spreadsheet-icon-btn opacity-0 group-hover:opacity-100"
                  onClick={() => setSettingsColumnId((current) => (current === column.id ? null : column.id))}
                >
                  <VscSettingsGear />
                </button>
                <button
                  className="spreadsheet-icon-btn opacity-0 group-hover:opacity-100"
                  onClick={() =>
                    updateSheet((current) => ({
                      ...current,
                      sort:
                        current.sort?.columnId === column.id
                          ? { columnId: column.id, direction: current.sort.direction === 'asc' ? 'desc' : 'asc' }
                          : { columnId: column.id, direction: 'asc' }
                    }))
                  }
                >
                  <VscFilter />
                </button>
                <span
                  className="absolute bottom-0 -right-[2px] top-0 z-10 w-[5px] cursor-col-resize hover:bg-[var(--obsidian-accent)]/50 active:bg-[var(--obsidian-accent)] transition-colors"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    const startX = event.clientX
                    const startWidth = column.width
                    
                    document.body.style.userSelect = 'none'
                    document.body.style.cursor = 'col-resize'

                    const onMove = (moveEvent: MouseEvent) => {
                      updateColumn(column.id, { width: Math.max(90, startWidth + moveEvent.clientX - startX) })
                    }
                    const onUp = () => {
                      document.body.style.userSelect = ''
                      document.body.style.cursor = ''
                      window.removeEventListener('mousemove', onMove)
                      window.removeEventListener('mouseup', onUp)
                    }
                    window.addEventListener('mousemove', onMove)
                    window.addEventListener('mouseup', onUp)
                  }}
                />
                {settingsColumnId === column.id && (
                  <div
                    ref={settingsMenuRef}
                    className="absolute right-2 top-9 z-20 w-52 rounded-md border border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] p-2 shadow-xl"
                  >
                    <label className="text-[10px] font-semibold uppercase text-[var(--obsidian-text-muted)]">Type</label>
                    <select
                      value={column.type}
                      onChange={(event) =>
                        updateColumn(column.id, { type: event.target.value as SpreadsheetColumnType })
                      }
                      className="mt-1 h-8 w-full rounded border border-[var(--obsidian-border)] bg-[var(--obsidian-base)] px-2 text-xs outline-none"
                    >
                      {columnTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <div className="mt-2 flex gap-1">
                      <button className="spreadsheet-toolbar-btn flex-1" onClick={() => updateColumn(column.id, { hidden: true })}>
                        Hide
                      </button>
                      <button className="spreadsheet-toolbar-btn flex-1 text-red-500" onClick={() => deleteColumn(column.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div className="flex h-10 items-center px-3">
              <button
                className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-[var(--obsidian-text-muted)] hover:bg-[var(--obsidian-hover)] hover:text-[var(--obsidian-text)] transition-all duration-150 font-medium active:scale-[0.97]"
                onClick={addColumn}
              >
                <VscAdd className="w-3.5 h-3.5" />
                <span>Column</span>
              </button>
            </div>
          </div>

          {displayedRows.map((row) => (
            <div
              key={row.id}
              draggable
              onDragStart={() => {
                draggedRowIdRef.current = row.id
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => reorderRow(row.id)}
              onDragEnd={() => {
                draggedRowIdRef.current = null
              }}
              className="grid border-b border-[var(--obsidian-border-soft)] last:border-b-0 hover:bg-[var(--obsidian-hover-soft)]"
              style={{ gridTemplateColumns: `44px ${visibleColumns.map((column) => `${column.width}px`).join(' ')}` }}
            >
              <div className="flex h-11 items-center justify-center border-r border-[var(--obsidian-border-soft)]">
                <input
                  type="checkbox"
                  checked={selectedRows.has(row.id)}
                  onChange={() => toggleRow(row.id)}
                  className="accent-[var(--obsidian-accent)]"
                />
              </div>
              {visibleColumns.map((column) => (
                <Cell
                  key={column.id}
                  column={column}
                  row={row}
                  value={row.cells[column.id]}
                  onChange={(value) => updateCell(row.id, column, value)}
                />
              ))}
            </div>
          ))}

          <button
            onClick={addRow}
            className="flex h-11 w-full items-center gap-2 px-4 text-left text-xs font-medium text-[var(--obsidian-text-muted)] hover:bg-[var(--obsidian-hover)] hover:text-[var(--obsidian-text)]"
          >
            <VscAdd /> Add Row
          </button>
        </div>

        {sheet.columns.some((column) => column.hidden) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--obsidian-text-muted)]">
            Hidden:
            {sheet.columns.filter((column) => column.hidden).map((column) => (
              <button
                key={column.id}
                className="rounded border border-[var(--obsidian-border)] px-2 py-1 hover:bg-[var(--obsidian-hover)]"
                onClick={() => updateColumn(column.id, { hidden: false })}
              >
                Show {column.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {sheetToDeleteId && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-black/45 px-4 animate-in fade-in duration-150">
          <div
            ref={deleteModalRef}
            className="w-full max-w-sm rounded-lg border border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] shadow-xl overflow-hidden animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-[var(--obsidian-border-soft)] px-4 py-3">
              <h3 className="text-sm font-semibold text-[var(--obsidian-text)]">Delete Sheet</h3>
              <button
                type="button"
                className="rounded px-2 py-1 text-xs text-[var(--obsidian-text-muted)] hover:bg-[var(--obsidian-hover)] transition-colors"
                onClick={() => setSheetToDeleteId(null)}
              >
                Close
              </button>
            </div>
            <div className="px-4 py-4 text-sm text-[var(--obsidian-text)]">
              Are you sure you want to delete the sheet "<strong>{state.sheets.find(s => s.id === sheetToDeleteId)?.name}</strong>"? This action cannot be undone.
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--obsidian-border-soft)] bg-[var(--obsidian-workspace)]/30 px-4 py-3">
              <button
                type="button"
                onClick={() => setSheetToDeleteId(null)}
                className="rounded border border-[var(--obsidian-border)] px-4 py-1.5 text-xs text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (sheetToDeleteId) {
                    deleteSheet(sheetToDeleteId)
                    setSheetToDeleteId(null)
                  }
                }}
                className="rounded bg-red-600 px-4 py-1.5 text-xs font-medium text-white transition-all hover:bg-red-700 active:scale-[0.98] shadow-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const Cell = ({
  column,
  row,
  value,
  onChange
}: {
  column: SpreadsheetColumn
  row: SpreadsheetRow
  value: string | boolean | undefined
  onChange: (value: string | boolean) => void
}) => {
  const [editing, setEditing] = useState(false)
  const textValue = String(value ?? '')

  if (column.type === 'checkbox') {
    return (
      <div className="flex h-11 items-center border-r border-[var(--obsidian-border-soft)] px-3">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
          className="accent-[var(--obsidian-accent)]"
        />
      </div>
    )
  }

  const option = getOption(column.options, textValue)
  const options = column.type === 'status' ? column.options : column.options

  if (!editing && (column.type === 'status' || column.type === 'select') && option) {
    return (
      <button
        className="flex h-11 items-center border-r border-[var(--obsidian-border-soft)] px-2 text-left"
        onDoubleClick={() => setEditing(true)}
      >
        <span
          className="rounded-full px-2 py-1 text-[11px] font-semibold"
          style={{ backgroundColor: tint(option.color), color: option.color }}
        >
          {option.label}
        </span>
      </button>
    )
  }

  if (!editing && (column.type === 'multi-select' || column.type === 'tags')) {
    const values = textValue.split(',').map((item) => item.trim()).filter(Boolean)
    return (
      <button
        className="flex h-11 items-center gap-1 overflow-hidden border-r border-[var(--obsidian-border-soft)] px-2 text-left"
        onDoubleClick={() => setEditing(true)}
      >
        {values.length ? values.map((item) => {
          const itemOption = getOption(column.options, item)
          return (
            <span
              key={item}
              className="rounded-full px-2 py-1 text-[11px] font-semibold"
              style={{
                backgroundColor: tint(itemOption?.color ?? '#64748b'),
                color: itemOption?.color ?? '#64748b'
              }}
            >
              {itemOption?.label ?? item}
            </span>
          )
        }) : <span className="text-xs text-[var(--obsidian-text-muted)]">Empty</span>}
      </button>
    )
  }

  if (editing && options?.length && (column.type === 'status' || column.type === 'select')) {
    return (
      <div className="flex h-11 items-center border-r border-[var(--obsidian-border-soft)] px-2">
        <select
          autoFocus
          value={textValue}
          onBlur={() => setEditing(false)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' || event.key === 'Enter') {
              setEditing(false)
            }
          }}
          onChange={(event) => {
            onChange(event.target.value)
            setEditing(false)
          }}
          className="h-8 w-full rounded border border-[var(--obsidian-border)] bg-[var(--obsidian-base)] px-2 text-xs outline-none"
        >
          {options.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div className="flex h-11 items-center border-r border-[var(--obsidian-border-soft)] px-2">
      <input
        value={textValue}
        type={column.type === 'number' || column.type === 'currency' ? 'number' : column.type === 'date' ? 'date' : 'text'}
        placeholder={row.id ? 'Empty' : ''}
        onFocus={() => setEditing(true)}
        onBlur={() => setEditing(false)}
        onDoubleClick={() => setEditing(true)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' || event.key === 'Enter') {
            event.currentTarget.blur()
          }
        }}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full rounded bg-transparent px-1 text-xs outline-none focus:bg-[var(--obsidian-workspace)] focus:ring-2 focus:ring-[var(--obsidian-accent-dim)]"
      />
    </div>
  )
}
