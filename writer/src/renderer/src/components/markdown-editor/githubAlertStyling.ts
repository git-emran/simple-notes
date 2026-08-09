import { RangeSetBuilder } from '@codemirror/state'
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view'

export type AlertType = 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION'

const ALERT_REGEX = /^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i

/**
 * Detect if a line is the alert header (> [!TYPE]) and return the type.
 */
const getAlertType = (lineText: string): AlertType | null => {
  const m = ALERT_REGEX.exec(lineText)
  return m ? (m[1].toUpperCase() as AlertType) : null
}

/**
 * Build decorations that mark each block of GitHub-alert lines.
 *
 * We walk every visible line. When we encounter `> [!TYPE]` we note the type,
 * then keep marking subsequent `>` lines as belonging to that alert block until
 * the block ends (blank line or non-quote line).
 */
const buildAlertDecorations = (view: EditorView): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>()
  const doc = view.state.doc

  for (const { from, to } of view.visibleRanges) {
    const startLine = doc.lineAt(from).number
    const endLine = doc.lineAt(to).number

    let currentAlertType: AlertType | null = null

    for (let lineNumber = startLine; lineNumber <= endLine; lineNumber++) {
      const line = doc.line(lineNumber)
      const text = line.text

      const alertType = getAlertType(text)

      if (alertType) {
        // This is the header line
        currentAlertType = alertType
        builder.add(
          line.from,
          line.from,
          Decoration.line({ attributes: { class: `cm-github-alert cm-github-alert-${alertType.toLowerCase()} cm-github-alert-header` } })
        )
      } else if (currentAlertType && /^>\s*/.test(text)) {
        // Continuation line of the alert block
        builder.add(
          line.from,
          line.from,
          Decoration.line({ attributes: { class: `cm-github-alert cm-github-alert-${currentAlertType.toLowerCase()}` } })
        )
      } else {
        // Block ended
        currentAlertType = null
      }
    }
  }

  return builder.finish()
}

export const githubAlertStyling = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildAlertDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildAlertDecorations(update.view)
      }
    }
  },
  {
    decorations: (instance) => instance.decorations
  }
)
