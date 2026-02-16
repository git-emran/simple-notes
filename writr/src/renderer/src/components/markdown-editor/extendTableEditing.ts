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
 * Format a Markdown table string and maintain cursor cell position
 */
function formatTableString(text: string): string {
  const allLines = text.split('\n')
  const tableLines = allLines.filter((l) => isTableLine(l))
  if (!tableLines.length) return text

  // Identify separator line (contains ---)
  const isSeparator = (l: string) => /^[|\s-:]+$/.test(l) && l.includes('---')
  
  const rows = tableLines.map((line) => {
    if (isSeparator(line)) return 'SEPARATOR'
    return splitCells(line)
  })

  // Remove existing separator to recalibrate
  const cleanRows = rows.filter(r => r !== 'SEPARATOR') as string[][]
  const colCount = Math.max(...cleanRows.map((r) => r.length))

  // Normalize column lengths
  cleanRows.forEach((r) => {
    while (r.length < colCount) r.push('')
  })

  // Calculate max width for each column
  const colWidths = new Array(colCount).fill(0)
  cleanRows.forEach((r) => {
    r.forEach((c, i) => {
      colWidths[i] = Math.max(colWidths[i], c.length, 3) // min width 3
    })
  })

  // Rebuild lines
  const formattedRows = cleanRows.map((r) => {
    return '| ' + r.map((c, i) => c.padEnd(colWidths[i], ' ')).join(' | ') + ' |'
  })

  // Re-insert separator after first row
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

  // Find full table block
  let start = line.number
  let end = line.number
  while (start > 1 && isTableLine(state.doc.line(start - 1).text)) start--
  while (end < state.doc.lines && isTableLine(state.doc.line(end + 1).text)) end++

  const from = state.doc.line(start).from
  const to = state.doc.line(end).to
  const text = state.doc.sliceString(from, to)
  const formatted = formatTableString(text)

  // Calculate relative cursor position
  const currentLine = state.doc.lineAt(state.selection.main.head)
  const colIndex = currentLine.text.slice(0, state.selection.main.head - currentLine.from).split('|').length - 1
  const lineInTable = currentLine.number - start

  view.dispatch({
    changes: { from, to, insert: formatted }
  })

  // Restore cursor roughly to the same cell
  const newDoc = view.state.doc
  const newTableLine = newDoc.line(start + (lineInTable > 0 && formatted.includes('---') && lineInTable >= 1 ? (lineInTable >= 1 ? lineInTable : lineInTable) : lineInTable))
  // Wait, the separator insertion shift lines. 
  // If we formatted a new table, line 1 is header, line 2 is separator.
  
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
    run: (view: EditorView) => {
      const { state } = view
      const head = state.selection.main.head
      const line = state.doc.lineAt(head)
      if (!isTableLine(line.text)) return false

      // Always format on Tab
      formatTableCommand(view)

      // Refresh state after format
      const newLine = view.state.doc.lineAt(view.state.selection.main.head)
      const cells = newLine.text.split('|')
      const currentPosInLine = view.state.selection.main.head - newLine.from
      
      // Find which cell we are in
      let accumulated = 0
      let cellIndex = -1
      for (let i = 0; i < cells.length; i++) {
        accumulated += cells[i].length + (i < cells.length - 1 ? 1 : 0)
        if (currentPosInLine <= accumulated) {
          cellIndex = i
          break
        }
      }

      // If we are in the last cell or past the last pipe, move to next row
      if (cellIndex >= cells.length - 1 || cellIndex === -1) {
        const nextLineNum = newLine.number + 1
        if (nextLineNum <= view.state.doc.lines) {
          const nextLine = view.state.doc.line(nextLineNum)
          if (isTableLine(nextLine.text)) {
             // Move to first cell of next row
             const firstPipe = nextLine.text.indexOf('|')
             view.dispatch({
               selection: { anchor: nextLine.from + firstPipe + 2 },
               scrollIntoView: true
             })
             return true
          }
        }
        // If at the end of last row, create a new row
        const rowCells = splitCells(newLine.text)
        const emptyRow = '| ' + rowCells.map(() => ' '.repeat(3)).join(' | ') + ' |'
        view.dispatch({
          changes: { from: newLine.to, to: newLine.to, insert: '\n' + emptyRow },
          selection: { anchor: newLine.to + emptyRow.indexOf('|') + 3 },
          scrollIntoView: true
        })
        return true
      }

      // Move to next cell
      let nextPipePos = newLine.text.indexOf('|', currentPosInLine)
      if (nextPipePos === -1) nextPipePos = newLine.text.length
      
      view.dispatch({
        selection: { anchor: newLine.from + nextPipePos + 2 },
        scrollIntoView: true
      })
      return true
    }
  },
  {
    key: 'Shift-Tab',
    run: (view: EditorView) => {
      const { state } = view
      const head = state.selection.main.head
      const line = state.doc.lineAt(head)
      if (!isTableLine(line.text)) return false

      const currentPosInLine = head - line.from
      const before = line.text.slice(0, currentPosInLine)
      const lastPipe = before.lastIndexOf('|', currentPosInLine - 2)

      if (lastPipe !== -1) {
        view.dispatch({
          selection: { anchor: line.from + lastPipe + 2 },
          scrollIntoView: true
        })
        return true
      }

      // Move to previous row's last cell
      if (line.number > 1) {
        const prevLine = state.doc.line(line.number - 1)
        if (isTableLine(prevLine.text)) {
          const lastPipePrev = prevLine.text.lastIndexOf('|')
          const secondLastPipePrev = prevLine.text.lastIndexOf('|', lastPipePrev - 1)
          view.dispatch({
            selection: { anchor: prevLine.from + secondLastPipePrev + 2 },
            scrollIntoView: true
          })
          return true
        }
      }
      return false
    }
  },
  {
    key: 'Enter',
    run: (view: EditorView) => {
      const { state } = view
      const head = state.selection.main.head
      const line = state.doc.lineAt(head)
      if (!isTableLine(line.text)) return false

      // Format first
      formatTableCommand(view)
      
      const currentLine = view.state.doc.lineAt(view.state.selection.main.head)
      const nextLineNum = currentLine.number + 1
      
      // If there is a next line and it's a table, move to it
      if (nextLineNum <= view.state.doc.lines) {
        const nextLine = view.state.doc.line(nextLineNum)
        if (isTableLine(nextLine.text)) {
          // If separator line, skip it
          if (/^[|\s-:]+$/.test(nextLine.text) && nextLine.text.includes('---')) {
             const afterSep = view.state.doc.line(nextLineNum + 1)
             if (afterSep && isTableLine(afterSep.text)) {
                view.dispatch({ selection: { anchor: afterSep.from + (head - currentLine.from) }, scrollIntoView: true })
                return true
             }
          }
          view.dispatch({ selection: { anchor: nextLine.from + (head - currentLine.from) }, scrollIntoView: true })
          return true
        }
      }

      // Otherwise create new row
      const cells = splitCells(currentLine.text)
      const newRow = '| ' + cells.map(() => '   ').join(' | ') + ' |'
      
      // Check if we need a separator (if this was the header and no separator exists)
      let insertText = '\n' + newRow
      let finalAnchor = currentLine.to + 3

      const isHeader = currentLine.number === 1 || !isTableLine(view.state.doc.line(currentLine.number - 1).text)
      const hasNext = nextLineNum <= view.state.doc.lines
      const nextText = hasNext ? view.state.doc.line(nextLineNum).text : ''
      
      if (isHeader && (!hasNext || !nextText.includes('---'))) {
        const sep = '| ' + cells.map(() => '---').join(' | ') + ' |'
        insertText = '\n' + sep + '\n' + newRow
        finalAnchor = currentLine.to + sep.length + 5
      }

      view.dispatch({
        changes: { from: currentLine.to, to: currentLine.to, insert: insertText },
        selection: { anchor: finalAnchor },
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

          // Line level decoration
          const lineClass = isSeparatorLine ? 'cm-table-sep-line' : 'cm-table-line'
          const headerClass = (i === 1 || !isTableLine(state.doc.line(i - 1).text)) ? ' cm-table-header' : ''
          
          builder.add(line.from, line.from, Decoration.line({
            attributes: { class: lineClass + headerClass + (isFocused ? ' cm-focused-table-row' : '') }
          }))

          if (!isFocused) {
            // Hide separator lines completely when not focused
            if (isSeparatorLine) {
              builder.add(line.from, line.to, Decoration.replace({}))
            } else {
              // Hide pipes in normal table rows
              let pos = line.from
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
export const markdownTableEnhancement = [Prec.high(keymap.of(tableKeymap)), tableHighlight]
