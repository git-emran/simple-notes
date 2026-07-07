import {
  EditorView,
  Decoration,
  DecorationSet,
  keymap,
  ViewPlugin,
  ViewUpdate
} from '@codemirror/view'
import { Prec, RangeSetBuilder, EditorState } from '@codemirror/state'

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** Returns true if the line looks like part of a GFM table row */
function isTableLine(text: string): boolean {
  return text.includes('|') && text.trim().startsWith('|')
}

/** Returns true for a GFM separator row (e.g. `| --- | :---: |`) */
function isSeparatorLine(text: string): boolean {
  return /^\|[\s\-:|]+\|[\s\-:|]*$/.test(text.trim()) && text.includes('-')
}

/** Split a raw table row into trimmed cell strings. Handles escaped pipes `\|`. */
function splitCells(line: string): string[] {
  // Strip outermost pipes then split on unescaped pipes
  const stripped = line.trim().replace(/^\||\|$/g, '')
  return stripped.split(/(?<!\\)\|/).map((c) => c.trim())
}

type CellRange = { from: number; to: number }

/**
 * Return document-absolute ranges for each cell in `lineText`, trimming the
 * surrounding space on each side of the pipe character.
 * Escaped pipes (`\|`) are not treated as column delimiters.
 */
function getCellRanges(lineText: string, lineFrom: number): CellRange[] {
  const pipes: number[] = []
  for (let i = 0; i < lineText.length; i++) {
    if (lineText[i] === '|' && (i === 0 || lineText[i - 1] !== '\\')) {
      pipes.push(i)
    }
  }
  if (pipes.length < 2) return []

  const ranges: CellRange[] = []
  for (let i = 0; i < pipes.length - 1; i++) {
    let s = pipes[i] + 1
    let e = pipes[i + 1]
    if (s < e && lineText[s] === ' ') s++
    if (e > s && lineText[e - 1] === ' ') e--
    ranges.push({ from: lineFrom + s, to: lineFrom + e })
  }
  return ranges
}

/**
 * Find the 0-based index of the cell that contains `pos`, or the nearest
 * cell when `pos` sits on a pipe / whitespace boundary.
 */
function findCellIndex(ranges: CellRange[], pos: number): number {
  for (let i = 0; i < ranges.length; i++) {
    if (pos >= ranges[i].from && pos <= ranges[i].to) return i
  }
  for (let i = 0; i < ranges.length; i++) {
    if (pos < ranges[i].from) return Math.max(0, i - 1)
  }
  return ranges.length - 1
}

/**
 * Return the 1-indexed line numbers that span the contiguous table block
 * that contains `lineNum`.
 */
function getTableBounds(
  state: EditorState,
  lineNum: number
): { start: number; end: number } {
  let start = lineNum
  let end = lineNum
  while (start > 1 && isTableLine(state.doc.line(start - 1).text)) start--
  while (end < state.doc.lines && isTableLine(state.doc.line(end + 1).text)) end++
  return { start, end }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/**
 * Re-format a raw table text block so that every column is padded to the
 * maximum cell width. A separator row is always present after the header.
 * Returns the formatted string.
 */
function formatTableString(raw: string): string {
  const lines = raw.split('\n').filter((l) => isTableLine(l))
  if (!lines.length) return raw

  // Separate data rows from any existing separator rows
  const dataRows = lines.filter((l) => !isSeparatorLine(l)).map((l) => splitCells(l))
  if (!dataRows.length) return raw

  const colCount = Math.max(...dataRows.map((r) => r.length))

  // Pad every row to the same column count
  for (const row of dataRows) {
    while (row.length < colCount) row.push('')
  }

  // Compute the maximum content width for each column (min 3)
  const colWidths = new Array<number>(colCount).fill(3)
  for (const row of dataRows) {
    for (let i = 0; i < colCount; i++) {
      colWidths[i] = Math.max(colWidths[i], row[i].length)
    }
  }

  const fmtRow = (row: string[]) =>
    '| ' + row.map((c, i) => c.padEnd(colWidths[i])).join(' | ') + ' |'

  const sep = '| ' + colWidths.map((w) => '-'.repeat(w)).join(' | ') + ' |'

  const out: string[] = [fmtRow(dataRows[0]), sep]
  for (let i = 1; i < dataRows.length; i++) out.push(fmtRow(dataRows[i]))

  return out.join('\n')
}

/**
 * Apply `formatTableString` to the table block containing line `lineNum`.
 * Does NOT move the cursor.
 *
 * Returns:
 *   - `newStart` / `newEnd`: 1-indexed boundaries of the formatted block
 *   - `hadSeparator`: whether the original block already had a separator row
 *   - `colWidths`: the padded column widths in the formatted table
 */
function applyFormat(
  view: EditorView,
  lineNum: number
): {
  newStart: number
  newEnd: number
  hadSeparator: boolean
  colWidths: number[]
} | null {
  const { state } = view
  const lineTxt = state.doc.line(lineNum).text
  if (!isTableLine(lineTxt)) return null

  const { start, end } = getTableBounds(state, lineNum)
  const from = state.doc.line(start).from
  const to = state.doc.line(end).to
  const raw = state.doc.sliceString(from, to)
  const hadSeparator = raw.split('\n').some((l) => isSeparatorLine(l))
  const formatted = formatTableString(raw)

  view.dispatch({ changes: { from, to, insert: formatted } })

  // Recalculate bounds after the edit (line count may have changed)
  const { start: newStart, end: newEnd } = getTableBounds(view.state, start)

  // Derive column widths from the first formatted data row (always line newStart)
  const firstFmtLine = view.state.doc.line(newStart)
  const colWidths = getCellRanges(firstFmtLine.text, firstFmtLine.from).map(
    (r) => r.to - r.from
  )

  return { newStart, newEnd, hadSeparator, colWidths }
}

/**
 * Convert a `relativeLineIndex` (0-based index into the original table block)
 * to the correct 1-indexed line number in the newly formatted table.
 *
 * When a separator is added by formatting, every data row after the header
 * shifts down by one line.
 */
function adjustedLineNum(
  newStart: number,
  relIndex: number,
  hadSeparator: boolean
): number {
  // relIndex 0 = header → stays at newStart + 0
  // relIndex > 0 and separator was just inserted → shift by 1
  const shift = !hadSeparator && relIndex > 0 ? 1 : 0
  return newStart + relIndex + shift
}

// ---------------------------------------------------------------------------
// Keybindings
// ---------------------------------------------------------------------------

const tableKeymap = [
  // Tab → next cell (wraps to first cell of next row; appends new row at end)
  {
    key: 'Tab',
    preventDefault: true,
    run: (view: EditorView): boolean => {
      const { state } = view
      const head = state.selection.main.head
      const line = state.doc.lineAt(head)
      if (!isTableLine(line.text)) return false

      const { start: startBefore } = getTableBounds(state, line.number)
      const relIndex = line.number - startBefore
      const rangesBefore = getCellRanges(line.text, line.from)
      if (!rangesBefore.length) return false
      const cellIdx = findCellIndex(rangesBefore, head)

      const result = applyFormat(view, line.number)
      if (!result) return false

      const { newStart, newEnd, hadSeparator, colWidths } = result
      const curLineNum = adjustedLineNum(newStart, relIndex, hadSeparator)

      // Try: move to next cell in the same row
      const curLine = view.state.doc.line(curLineNum)
      const curRanges = getCellRanges(curLine.text, curLine.from)
      if (curRanges.length > 0 && cellIdx + 1 < curRanges.length) {
        const next = curRanges[cellIdx + 1]
        view.dispatch({
          selection: { anchor: next.from, head: next.to },
          scrollIntoView: true
        })
        return true
      }

      // Try: move to first cell of the next data row
      let nextNum = curLineNum + 1
      while (nextNum <= newEnd) {
        const nextLine = view.state.doc.line(nextNum)
        if (isSeparatorLine(nextLine.text)) { nextNum++; continue }
        if (!isTableLine(nextLine.text)) break
        const nextRanges = getCellRanges(nextLine.text, nextLine.from)
        if (nextRanges.length > 0) {
          view.dispatch({
            selection: { anchor: nextRanges[0].from, head: nextRanges[0].to },
            scrollIntoView: true
          })
          return true
        }
        nextNum++
      }

      // Append a new row at the end and select its first cell
      const lastLine = view.state.doc.line(newEnd)
      const insertPos = lastLine.to
      const blankCells = colWidths.map((w) => ' '.repeat(w))
      const newRow = '| ' + blankCells.join(' | ') + ' |'
      view.dispatch({
        changes: { from: insertPos, to: insertPos, insert: '\n' + newRow },
        selection: {
          anchor: insertPos + 3,
          head: insertPos + 3 + (colWidths[0] ?? 3)
        },
        scrollIntoView: true
      })
      return true
    }
  },

  // Shift-Tab → previous cell (wraps to last cell of previous row)
  {
    key: 'Shift-Tab',
    preventDefault: true,
    run: (view: EditorView): boolean => {
      const { state } = view
      const head = state.selection.main.head
      const line = state.doc.lineAt(head)
      if (!isTableLine(line.text)) return false

      const { start: startBefore } = getTableBounds(state, line.number)
      const relIndex = line.number - startBefore
      const rangesBefore = getCellRanges(line.text, line.from)
      if (!rangesBefore.length) return false
      const cellIdx = findCellIndex(rangesBefore, head)

      const result = applyFormat(view, line.number)
      if (!result) return false

      const { newStart, hadSeparator } = result
      const curLineNum = adjustedLineNum(newStart, relIndex, hadSeparator)

      // Try: move to previous cell in the same row
      const curLine = view.state.doc.line(curLineNum)
      const curRanges = getCellRanges(curLine.text, curLine.from)
      if (curRanges.length > 0 && cellIdx - 1 >= 0) {
        const prev = curRanges[cellIdx - 1]
        view.dispatch({
          selection: { anchor: prev.from, head: prev.to },
          scrollIntoView: true
        })
        return true
      }

      // Try: move to last cell of the previous data row
      let prevNum = curLineNum - 1
      while (prevNum >= newStart) {
        const prevLine = view.state.doc.line(prevNum)
        if (isSeparatorLine(prevLine.text)) { prevNum--; continue }
        if (!isTableLine(prevLine.text)) break
        const prevRanges = getCellRanges(prevLine.text, prevLine.from)
        if (prevRanges.length > 0) {
          const last = prevRanges[prevRanges.length - 1]
          view.dispatch({
            selection: { anchor: last.from, head: last.to },
            scrollIntoView: true
          })
          return true
        }
        prevNum--
      }

      return true
    }
  },

  // Enter → move to same column in next row (appends new row at end)
  {
    key: 'Enter',
    preventDefault: true,
    run: (view: EditorView): boolean => {
      const { state } = view
      const head = state.selection.main.head
      const line = state.doc.lineAt(head)
      if (!isTableLine(line.text)) return false

      const { start: startBefore } = getTableBounds(state, line.number)
      const relIndex = line.number - startBefore
      const rangesBefore = getCellRanges(line.text, line.from)
      if (!rangesBefore.length) return false
      const cellIdx = findCellIndex(rangesBefore, head)

      const result = applyFormat(view, line.number)
      if (!result) return false

      const { newStart, newEnd, hadSeparator, colWidths } = result
      const curLineNum = adjustedLineNum(newStart, relIndex, hadSeparator)

      // Skip separator rows when looking for the next row
      let nextNum = curLineNum + 1
      while (nextNum <= newEnd && isSeparatorLine(view.state.doc.line(nextNum).text)) {
        nextNum++
      }

      if (nextNum <= newEnd) {
        const nextLine = view.state.doc.line(nextNum)
        if (isTableLine(nextLine.text)) {
          const nextRanges = getCellRanges(nextLine.text, nextLine.from)
          if (nextRanges.length > 0) {
            const targetIdx = Math.min(cellIdx, nextRanges.length - 1)
            const target = nextRanges[targetIdx]
            view.dispatch({
              selection: { anchor: target.from, head: target.to },
              scrollIntoView: true
            })
            return true
          }
        }
      }

      // Append new row at the end, landing on the same column
      const lastLine = view.state.doc.line(newEnd)
      const insertPos = lastLine.to
      const blankCells = colWidths.map((w) => ' '.repeat(w))
      const newRow = '| ' + blankCells.join(' | ') + ' |'

      // Compute exact cursor offset for the target column
      const targetColIdx = Math.min(cellIdx, colWidths.length - 1)
      let colOffset = 2 // after '| '
      for (let i = 0; i < targetColIdx; i++) {
        colOffset += (colWidths[i] ?? 3) + 3 // cell + ' | '
      }
      const cellW = colWidths[targetColIdx] ?? 3

      view.dispatch({
        changes: { from: insertPos, to: insertPos, insert: '\n' + newRow },
        selection: {
          anchor: insertPos + 1 + colOffset,
          head: insertPos + 1 + colOffset + cellW
        },
        scrollIntoView: true
      })
      return true
    }
  },

  // Cmd/Ctrl+Shift+F → format table and restore cursor to the same cell
  {
    key: 'Mod-Shift-F',
    run: (view: EditorView): boolean => {
      const { state } = view
      const head = state.selection.main.head
      const line = state.doc.lineAt(head)
      if (!isTableLine(line.text)) return false

      // Snapshot cursor position before formatting
      const { start: startBefore } = getTableBounds(state, line.number)
      const relIndex = line.number - startBefore
      const rangesBefore = getCellRanges(line.text, line.from)
      let savedCellIdx = -1
      let savedCellOffset = 0
      if (rangesBefore.length > 0) {
        savedCellIdx = findCellIndex(rangesBefore, head)
        if (savedCellIdx !== -1) {
          savedCellOffset = head - rangesBefore[savedCellIdx].from
        }
      }

      const result = applyFormat(view, line.number)
      if (!result) return false

      // Restore cursor to the same relative cell
      const { newStart, newEnd, hadSeparator } = result
      const newLineNum = adjustedLineNum(newStart, relIndex, hadSeparator)
      if (newLineNum <= newEnd) {
        const newLine = view.state.doc.line(newLineNum)
        if (!isSeparatorLine(newLine.text)) {
          const newRanges = getCellRanges(newLine.text, newLine.from)
          if (newRanges.length > 0 && savedCellIdx !== -1) {
            const r = newRanges[Math.min(savedCellIdx, newRanges.length - 1)]
            const pos = Math.min(r.from + savedCellOffset, r.to)
            view.dispatch({ selection: { anchor: pos, head: pos }, scrollIntoView: true })
          }
        }
      }

      return true
    }
  }
]

// ---------------------------------------------------------------------------
// Fallback DOM-level Tab handler
// (some CodeMirror setups intercept Tab before the keymap runs)
// ---------------------------------------------------------------------------
const tableDomKeyHandler = EditorView.domEventHandlers({
  keydown: (event, view) => {
    if (event.key !== 'Tab') return false
    const line = view.state.doc.lineAt(view.state.selection.main.head)
    if (!isTableLine(line.text)) return false
    event.preventDefault()
    event.stopPropagation()
    const key = event.shiftKey ? 'Shift-Tab' : 'Tab'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = tableKeymap.find((k) => k.key === key) as any
    return handler?.run?.(view) ?? true
  }
})

// ---------------------------------------------------------------------------
// Decoration plugin – highlights table rows and hides pipes/separator
// when the cursor is not inside the table block
// ---------------------------------------------------------------------------
const tableHighlight = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = this.buildDecos(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = this.buildDecos(update.view)
      }
    }

    buildDecos(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>()
      const { state } = view
      const sel = state.selection.main

      // Determine which line numbers belong to the table block under the cursor
      const focusedLines = new Set<number>()
      const cursorLine = state.doc.lineAt(sel.head)
      if (isTableLine(cursorLine.text)) {
        let s = cursorLine.number
        let e = cursorLine.number
        while (s > 1 && isTableLine(state.doc.line(s - 1).text)) s--
        while (e < state.doc.lines && isTableLine(state.doc.line(e + 1).text)) e++
        for (let i = s; i <= e; i++) focusedLines.add(i)
      }

      for (const { from, to } of view.visibleRanges) {
        const firstNum = state.doc.lineAt(from).number
        const lastNum = state.doc.lineAt(to).number

        for (let i = firstNum; i <= lastNum; i++) {
          const line = state.doc.line(i)
          if (!isTableLine(line.text)) continue

          const isSep = isSeparatorLine(line.text)
          const isFocused = focusedLines.has(i)
          // Guard against accessing line 0 (CodeMirror lines are 1-indexed)
          const prevLineIsTable = i > 1 && isTableLine(state.doc.line(i - 1).text)
          const isHeaderRow = !isSep && !prevLineIsTable
          const nextLineIsTable = i < state.doc.lines && isTableLine(state.doc.line(i + 1).text)

          // Build class list for the line element
          let cls = isSep ? 'cm-table-sep-line' : 'cm-table-line'
          if (isHeaderRow) cls += ' cm-table-header'
          if (!nextLineIsTable) cls += ' cm-table-last-row'
          if (isFocused) cls += ' cm-focused-table-row'

          builder.add(line.from, line.from, Decoration.line({ attributes: { class: cls } }))

          if (isFocused) {
            // When the table block is focused: show everything as-is
            continue
          }

          if (isSep) {
            // Collapse the separator row visually (0-height replace)
            builder.add(line.from, line.to, Decoration.replace({}))
          } else {
            // Hide pipe characters so the row looks like plain text
            const text = line.text
            for (let j = 0; j < text.length; j++) {
              if (text[j] === '|' && (j === 0 || text[j - 1] !== '\\')) {
                builder.add(
                  line.from + j,
                  line.from + j + 1,
                  Decoration.mark({ attributes: { class: 'cm-table-hidden-pipe' } })
                )
              }
            }
          }
        }
      }

      return builder.finish()
    }
  },
  { decorations: (v) => v.decorations }
)

// ---------------------------------------------------------------------------
// Exported extension bundle
// ---------------------------------------------------------------------------
export const markdownTableEnhancement = [
  Prec.highest(tableDomKeyHandler),
  Prec.highest(keymap.of(tableKeymap)),
  tableHighlight
]
