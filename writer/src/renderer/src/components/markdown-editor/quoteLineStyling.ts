import { RangeSetBuilder } from '@codemirror/state'
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view'

const isQuoteLine = (lineText: string) => /^\s*>/.test(lineText)

const buildQuoteLineDecorations = (view: EditorView): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>()

  for (const { from, to } of view.visibleRanges) {
    const startLine = view.state.doc.lineAt(from).number
    const endLine = view.state.doc.lineAt(to).number

    for (let lineNumber = startLine; lineNumber <= endLine; lineNumber += 1) {
      const line = view.state.doc.line(lineNumber)
      if (!isQuoteLine(line.text)) continue

      builder.add(
        line.from,
        line.from,
        Decoration.line({ attributes: { class: 'cm-quote-line' } })
      )
    }
  }

  return builder.finish()
}

export const quoteLineStyling = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildQuoteLineDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildQuoteLineDecorations(update.view)
      }
    }
  },
  {
    decorations: (instance) => instance.decorations
  }
)
