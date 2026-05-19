import {
  EditorView,
  Decoration,
  DecorationSet,
  keymap,
  ViewPlugin,
  ViewUpdate
} from '@codemirror/view'
import { Prec } from '@codemirror/state'

/**
 * Utility: check if a line is part of a Markdown table
 */
function isTableLine(text: string) {
  return /\|/.test(text) && text.trim().startsWith('|')
}

/**
 * Utility: split a Markdown table row into cells
 */
function splitCells(line: string) {
  /* remove leading/trailing pipes and split */
  return line
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim())
}

type TableCellRange = {
  from: number
  to: number
}

const isSeparatorLine = (text: string) => /^[|\s-:]+$/.test(text) && text.includes('---')

/**
 * Compute cell ranges within a single table line, in document coordinates.
 * Ranges exclude the surrounding pipe and a single adjacent space when present.
 */
function getTableCellRanges(lineText: string, lineFrom: number): TableCellRange[] {
  const pipePositions: number[] = []
  for (let i = 0; i < lineText.length; i++) {
    if (lineText[i] === '|') pipePositions.push(i)
  }

  if (pipePositions.length < 2) return []

  const ranges: TableCellRange[] = []
  for (let i = 0; i < pipePositions.length - 1; i++) {
    const leftPipe = pipePositions[i]
    const rightPipe = pipePositions[i + 1]
    let start = leftPipe + 1
    let end = rightPipe

    if (start < end && lineText[start] === ' ') start += 1
    if (end > start && lineText[end - 1] === ' ') end -= 1

    ranges.push({ from: lineFrom + start, to: lineFrom + end })
  }

  return ranges
}

function findCellIndex(ranges: TableCellRange[], pos: number): number {
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i]
    if (pos >= r.from && pos <= r.to) return i
  }
  /* If the cursor is on a pipe/whitespace, snap to the nearest cell */
  for (let i = 0; i < ranges.length; i++) {
    if (pos < ranges[i].from) return Math.max(0, i - 1)
  }
  return ranges.length - 1
}

/**
 * Format a Markdown table string and maintain cursor cell position
 */
function formatTableString(text: string): string {
  const allLines = text.split('\n')
  const tableLines = allLines.filter((l) => isTableLine(l))
  if (!tableLines.length) return text

  /* Identify separator line (contains ---) */
  const isSeparator = (l: string) => isSeparatorLine(l)
  
  const rows = tableLines.map((line) => {
    if (isSeparator(line)) return 'SEPARATOR'
    return splitCells(line)
  })

  /* Remove existing separator to recalibrate */
  const cleanRows = rows.filter(r => r !== 'SEPARATOR') as string[][]
  const colCount = Math.max(...cleanRows.map((r) => r.length))

  /* Normalize column lengths */
  cleanRows.forEach((r) => {
    while (r.length < colCount) r.push('')
  })

  /* Calculate max width for each column */
  const colWidths = new Array(colCount).fill(0)
  cleanRows.forEach((r) => {
    r.forEach((c, i) => {
      colWidths[i] = Math.max(colWidths[i], c.length, 3) // min width 3
    })
  })

  /* Rebuild lines */
  const formattedRows = cleanRows.map((r) => {
    return '| ' + r.map((c, i) => c.padEnd(colWidths[i], ' ')).join(' | ') + ' |'
  })

  /* Re-insert separator after first row */
  const sep = '| ' + colWidths.map((w) => '-'.repeat(w)).join(' | ') + ' |'
  formattedRows.splice(1, 0, sep)

  return formattedRows.join('\n')
}

/**
 * Command: format the whole table under the cursor
 */
function formatTableCommand(view: EditorView): boolean {
  const { state } = view
  const line = state.doc.lineAt(state.selection.main.head)
  if (!isTableLine(line.text)) return false

  /* Find full table block */
  let start = line.number
  let end = line.number
  while (start > 1 && isTableLine(state.doc.line(start - 1).text)) start--
  while (end < state.doc.lines && isTableLine(state.doc.line(end + 1).text)) end++

  const from = state.doc.line(start).from
  const to = state.doc.line(end).to
  const text = state.doc.sliceString(from, to)
  const formatted = formatTableString(text)

  view.dispatch({
    changes: { from, to, insert: formatted }
  })

  /* Restore cursor roughly to the same cell can be improved later if needed. */
  
  return true
}

/**
 * Navigation behavior: Tab/Enter inside tables
 */
/**
 * Navigation behavior: Tab/Shift-Tab/Enter inside tables
 * This aims to match Obsidian's smooth table editing.
 */
const tableKeymap = [
  {
    key: 'Tab',
    preventDefault: true,
    run: (view: EditorView) => {
      const { state } = view
      const head = state.selection.main.head
      const line = state.doc.lineAt(head)
      if (!isTableLine(line.text)) return false

      /* Find full table block to track absolute boundaries */
      let startLineNum = line.number
      let endLineNum = line.number
      while (startLineNum > 1 && isTableLine(state.doc.line(startLineNum - 1).text)) startLineNum--
      while (endLineNum < state.doc.lines && isTableLine(state.doc.line(endLineNum + 1).text)) endLineNum++

      /* Find cell index BEFORE formatting */
      const rangesBefore = getTableCellRanges(line.text, line.from)
      if (rangesBefore.length === 0) return false
      const cellIndex = findCellIndex(rangesBefore, head)

      /* Always format the table first */
      formatTableCommand(view)

      /* Get fresh state after formatting */
      const newLine = view.state.doc.line(line.number)
      const newRanges = getTableCellRanges(newLine.text, newLine.from)
      if (newRanges.length === 0) return false

      const nextIndex = cellIndex + 1

      if (nextIndex < newRanges.length) {
        /* Move to the next cell in the same row and select it */
        view.dispatch({
          selection: { anchor: newRanges[nextIndex].from, head: newRanges[nextIndex].to },
          scrollIntoView: true
        })
        return true
      }

      /* Move to next (non-separator) table row, first cell */
      let nextLineNum = line.number + 1
      while (nextLineNum <= endLineNum) {
        const nextLine = view.state.doc.line(nextLineNum)
        if (isSeparatorLine(nextLine.text)) {
          nextLineNum++
          continue
        }
        if (!isTableLine(nextLine.text)) break

        const nextRanges = getTableCellRanges(nextLine.text, nextLine.from)
        if (nextRanges.length > 0) {
          view.dispatch({
            selection: { anchor: nextRanges[0].from, head: nextRanges[0].to },
            scrollIntoView: true
          })
          return true
        }
        nextLineNum++
      }

      /* If at the end of last row, create a new row matching column count */
      const rowCells = splitCells(newLine.text)
      const emptyRow = '| ' + rowCells.map(() => '   ').join(' | ') + ' |'
      const insertPos = newLine.to
      view.dispatch({
        changes: { from: insertPos, to: insertPos, insert: '\n' + emptyRow },
        selection: { anchor: insertPos + 3, head: insertPos + 6 },
        scrollIntoView: true
      })
      return true
    }
  },
  {
    key: 'Shift-Tab',
    preventDefault: true,
    run: (view: EditorView) => {
      const { state } = view
      const head = state.selection.main.head
      const line = state.doc.lineAt(head)
      if (!isTableLine(line.text)) return false

      let startLineNum = line.number
      let endLineNum = line.number
      while (startLineNum > 1 && isTableLine(state.doc.line(startLineNum - 1).text)) startLineNum--
      while (endLineNum < state.doc.lines && isTableLine(state.doc.line(endLineNum + 1).text)) endLineNum++

      const rangesBefore = getTableCellRanges(line.text, line.from)
      if (rangesBefore.length === 0) return false
      const cellIndex = findCellIndex(rangesBefore, head)

      formatTableCommand(view)

      const newLine = view.state.doc.line(line.number)
      const newRanges = getTableCellRanges(newLine.text, newLine.from)
      if (newRanges.length === 0) return false

      const prevIndex = cellIndex - 1

      if (prevIndex >= 0) {
        /* Move to previous cell in the same row and select it */
        view.dispatch({
          selection: { anchor: newRanges[prevIndex].from, head: newRanges[prevIndex].to },
          scrollIntoView: true
        })
        return true
      }

      /* Move to previous (non-separator) table row, last cell */
      let prevLineNum = line.number - 1
      while (prevLineNum >= startLineNum) {
        const prevLine = view.state.doc.line(prevLineNum)
        if (isSeparatorLine(prevLine.text)) {
          prevLineNum--
          continue
        }
        if (!isTableLine(prevLine.text)) break

        const prevRanges = getTableCellRanges(prevLine.text, prevLine.from)
        if (prevRanges.length > 0) {
          const lastIdx = prevRanges.length - 1
          view.dispatch({
            selection: { anchor: prevRanges[lastIdx].from, head: prevRanges[lastIdx].to },
            scrollIntoView: true
          })
          return true
        }
        prevLineNum--
      }

      return true
    }
  },
  {
    key: 'Enter',
    preventDefault: true,
    run: (view: EditorView) => {
      const { state } = view
      const head = state.selection.main.head
      const line = state.doc.lineAt(head)
      if (!isTableLine(line.text)) return false

      let startLineNum = line.number
      let endLineNum = line.number
      while (startLineNum > 1 && isTableLine(state.doc.line(startLineNum - 1).text)) startLineNum--
      while (endLineNum < state.doc.lines && isTableLine(state.doc.line(endLineNum + 1).text)) endLineNum++

      const rangesBefore = getTableCellRanges(line.text, line.from)
      if (rangesBefore.length === 0) return false
      const cellIndex = findCellIndex(rangesBefore, head)

      formatTableCommand(view)

      const currentLine = view.state.doc.line(line.number)
      let nextLineNum = currentLine.number + 1

      /* Skip separator lines if present */
      if (nextLineNum <= endLineNum) {
        const nextLine = view.state.doc.line(nextLineNum)
        if (isSeparatorLine(nextLine.text)) {
          nextLineNum++
        }
      }

      if (nextLineNum <= endLineNum) {
        const nextLine = view.state.doc.line(nextLineNum)
        if (isTableLine(nextLine.text)) {
          const nextRanges = getTableCellRanges(nextLine.text, nextLine.from)
          if (nextRanges.length > 0) {
            const targetIdx = Math.min(cellIndex, nextRanges.length - 1)
            view.dispatch({
              selection: { anchor: nextRanges[targetIdx].from, head: nextRanges[targetIdx].to },
              scrollIntoView: true
            })
            return true
          }
        }
      }

      /* Otherwise create a new row and select the corresponding column cell */
      const cells = splitCells(currentLine.text)
      const newRow = '| ' + cells.map(() => '   ').join(' | ') + ' |'
      let insertText = '\n' + newRow
      
      const isHeader = currentLine.number === startLineNum
      const hasNext = nextLineNum <= view.state.doc.lines
      const nextText = hasNext ? view.state.doc.line(nextLineNum).text : ''
      
      let finalAnchor = currentLine.to + 3
      let finalHead = currentLine.to + 6

      if (isHeader && (!hasNext || !nextText.includes('---'))) {
        const sep = '| ' + cells.map(() => '---').join(' | ') + ' |'
        insertText = '\n' + sep + '\n' + newRow
        // Adjust selection position to account for the separator row length
        const offset = sep.length + 1
        finalAnchor = currentLine.to + offset + 3
        finalHead = currentLine.to + offset + 6
      } else {
        // Position relative to cellIndex
        let currentOffset = 2 // '| '
        for (let i = 0; i < cellIndex; i++) {
          currentOffset += 6 // '   | '
        }
        finalAnchor = currentLine.to + 1 + currentOffset
        finalHead = finalAnchor + 3
      }

      view.dispatch({
        changes: { from: currentLine.to, to: currentLine.to, insert: insertText },
        selection: { anchor: finalAnchor, head: finalHead },
        scrollIntoView: true
      })
      return true
    }
  },
  {
    key: 'Mod-Shift-F',
    run: formatTableCommand
  }
]

/**
 * Fallback DOM key handler for Tab navigation.
 * In some setups, other keymaps/extensions may preempt Tab before our keymap runs.
 */
const tableDomKeyHandler = EditorView.domEventHandlers({
  keydown: (event, view) => {
    if (event.key !== 'Tab') return false

    const line = view.state.doc.lineAt(view.state.selection.main.head)
    if (!isTableLine(line.text)) return false

    event.preventDefault()
    event.stopPropagation()

    if (event.shiftKey) {
      const handler = tableKeymap.find((k) => k.key === 'Shift-Tab') as any
      return handler?.run?.(view) ?? true
    }

    const handler = tableKeymap.find((k) => k.key === 'Tab') as any
    return handler?.run?.(view) ?? true
  }
})

/**
 * Decoration plugin: highlight table rows and provide Live Preview
 */
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

    buildDecos(view: EditorView) {
      const builder = new RangeSetBuilder<Decoration>()
      const { state } = view
      const selection = state.selection.main

      for (let { from, to } of view.visibleRanges) {
        let lineIdx = state.doc.lineAt(from).number
        let endLineIdx = state.doc.lineAt(to).number

        for (let i = lineIdx; i <= endLineIdx; i++) {
          const line = state.doc.line(i)
          if (!isTableLine(line.text)) continue

          const isFocused = selection.from >= line.from && selection.to <= line.to
          const isSeparatorLine = /^[|\s-:]+$/.test(line.text) && line.text.includes('---')

          /* Line level decoration */
          const lineClass = isSeparatorLine ? 'cm-table-sep-line' : 'cm-table-line'
          const headerClass = (i === 1 || !isTableLine(state.doc.line(i - 1).text)) ? ' cm-table-header' : ''
          
          builder.add(line.from, line.from, Decoration.line({
            attributes: { class: lineClass + headerClass + (isFocused ? ' cm-focused-table-row' : '') }
          }))

          if (!isFocused) {
            /* Hide separator lines completely when not focused */
            if (isSeparatorLine) {
              builder.add(line.from, line.to, Decoration.replace({}))
            } else {
              /* Hide pipes in normal table rows */
              const text = line.text
              for (let j = 0; j < text.length; j++) {
                if (text[j] === '|') {
                  builder.add(line.from + j, line.from + j + 1, Decoration.mark({
                    attributes: { class: 'cm-table-hidden-pipe' }
                  }))
                }
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

/**
 * Exported extension
 */
import { RangeSetBuilder } from '@codemirror/state'
export const markdownTableEnhancement = [
  Prec.highest(tableDomKeyHandler),
  Prec.highest(keymap.of(tableKeymap)),
  tableHighlight
]
