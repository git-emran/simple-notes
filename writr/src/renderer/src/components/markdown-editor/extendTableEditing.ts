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
  // remove leading/trailing pipes and split
  return line
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim())
}

/**
 * Format a Markdown table string
 */
function formatTable(text: string): string {
  const lines = text.split('\n').filter(isTableLine)
  if (!lines.length) return text

  const rows = lines.map(splitCells)
  const colCount = Math.max(...rows.map((r) => r.length))

  // normalize column lengths
  rows.forEach((r) => {
    while (r.length < colCount) r.push('')
  })

  // calculate max width for each column
  const colWidths = new Array(colCount).fill(0)
  rows.forEach((r) => {
    r.forEach((c, i) => {
      colWidths[i] = Math.max(colWidths[i], c.length)
    })
  })

  // rebuild lines
  const formatted = rows.map((r) => {
    return '| ' + r.map((c, i) => c.padEnd(colWidths[i], ' ')).join(' | ') + ' |'
  })

  // insert separator after header (2nd line)
  if (formatted.length > 1) {
    const sep = '| ' + colWidths.map((w) => '-'.repeat(Math.max(3, w))).join(' | ') + ' |'
    formatted.splice(1, 0, sep)
  }

  return formatted.join('\n')
}

/**
 * Command: format the whole table under the cursor
 */
function formatTableCommand(view: EditorView): boolean {
  const { state } = view
  const line = state.doc.lineAt(state.selection.main.head)
  if (!isTableLine(line.text)) return false

  // Find full table block
  let start = line.number
  let end = line.number
  while (start > 1 && isTableLine(state.doc.line(start - 1).text)) start--
  while (end < state.doc.lines && isTableLine(state.doc.line(end + 1).text)) end++

  const from = state.doc.line(start).from
  const to = state.doc.line(end).to
  const text = state.doc.sliceString(from, to)
  const formatted = formatTable(text)

  view.dispatch({
    changes: { from, to, insert: formatted }
  })
  return true
}

/**
 * Navigation behavior: Tab/Enter inside tables
 */
const tableKeymap = [
  {
    key: 'Tab',
    run: (view: EditorView) => {
      const { state } = view
      const pos = state.selection.main.head
      const line = state.doc.lineAt(pos)
      if (!isTableLine(line.text)) return false

      // move to next pipe
      const after = state.doc.sliceString(pos, line.to)
      const pipeIndex = after.indexOf('|')
      if (pipeIndex !== -1) {
        view.dispatch({ selection: { anchor: pos + pipeIndex + 1 } })
        return true
      }
      // end of line → move to next row start
      const nextLine = state.doc.line(line.number + 1)
      if (nextLine && isTableLine(nextLine.text)) {
        view.dispatch({ selection: { anchor: nextLine.from + 2 } })
        return true
      }
      return false
    }
  },
  {
    key: 'Shift-Tab',
    run: (view: EditorView) => {
      const { state } = view
      const pos = state.selection.main.head
      const line = state.doc.lineAt(pos)
      if (!isTableLine(line.text)) return false

      // move backward to previous pipe
      const before = state.doc.sliceString(line.from, pos).split('').reverse()
      const pipeIndex = before.indexOf('|')
      if (pipeIndex !== -1) {
        view.dispatch({ selection: { anchor: pos - pipeIndex - 1 } })
        return true
      }
      return false
    }
  },
  {
    key: 'Enter',
    run: (view: EditorView) => {
      const { state } = view
      const pos = state.selection.main.head
      const line = state.doc.lineAt(pos)
      if (!isTableLine(line.text)) return false

      // add new row below
      const cells = splitCells(line.text)
      const newRow = '| ' + cells.map(() => '').join(' | ') + ' |'
      view.dispatch({
        changes: { from: line.to, to: line.to, insert: '\n' + newRow },
        selection: { anchor: line.to + 3 }
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
 * Decoration plugin: highlight table rows
 */
const tableHighlight = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = this.buildDecos(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecos(update.view)
      }
    }

    buildDecos(view: EditorView) {
      const widgets: any[] = [] // or let TS infer
      for (let { from, to } of view.visibleRanges) {
        let line = view.state.doc.lineAt(from)
        while (line.from <= to) {
          if (isTableLine(line.text)) {
            const deco = Decoration.line({
              attributes: { class: 'cm-table-line' }
            })
            widgets.push(deco.range(line.from))
          }
          if (line.to >= to) break
          line = view.state.doc.line(line.number + 1)
        }
      }
      return Decoration.set(widgets)
    }
  },
  { decorations: (v) => v.decorations }
)

/**
 * Exported extension
 */
export const markdownTableEnhancement = [Prec.high(keymap.of(tableKeymap)), tableHighlight]
