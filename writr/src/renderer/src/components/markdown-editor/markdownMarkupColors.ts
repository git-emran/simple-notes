import { Extension } from '@codemirror/state'
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view'

const strongMark = Decoration.mark({ class: 'cm-md-strong-mark' })
const emphasisMark = Decoration.mark({ class: 'cm-md-em-mark' })
const headingMark = Decoration.mark({ class: 'cm-md-heading-mark' })

function isEscaped(text: string, index: number) {
  return index > 0 && text[index - 1] === '\\'
}

function buildDecorations(view: EditorView): DecorationSet {
  const decorations: any[] = []
  const doc = view.state.doc

  for (const { from, to } of view.visibleRanges) {
    let pos = from
    while (pos <= to) {
      const line = doc.lineAt(pos)
      const lineText = line.text

      // Headings: color only the leading # marks
      const headingMatch = /^(#{1,6})\s/.exec(lineText)
      if (headingMatch) {
        const len = headingMatch[1].length
        decorations.push(headingMark.range(line.from, line.from + len))
      }

      // Bold/italic marks: color only the * / ** markers
      let inInlineCode = false
      for (let i = 0; i < lineText.length; i++) {
        const ch = lineText[i]
        if (ch === '`' && !isEscaped(lineText, i)) {
          inInlineCode = !inInlineCode
          continue
        }
        if (inInlineCode) continue

        if (ch !== '*' || isEscaped(lineText, i)) continue

        const next = lineText[i + 1]
        const prev = lineText[i - 1]

        // Bold: **...**
        if (next === '*') {
          const close = lineText.indexOf('**', i + 2)
          if (close !== -1 && !isEscaped(lineText, close)) {
            decorations.push(strongMark.range(line.from + i, line.from + i + 2))
            decorations.push(strongMark.range(line.from + close, line.from + close + 2))
            i = close + 1
          }
          continue
        }

        // Italic: *...* (avoid matching **)
        if (prev !== '*' && next !== '*') {
          let close = lineText.indexOf('*', i + 1)
          while (close !== -1) {
            if (!isEscaped(lineText, close) && lineText[close - 1] !== '*' && lineText[close + 1] !== '*') {
              decorations.push(emphasisMark.range(line.from + i, line.from + i + 1))
              decorations.push(emphasisMark.range(line.from + close, line.from + close + 1))
              i = close
              break
            }
            close = lineText.indexOf('*', close + 1)
          }
        }
      }

      pos = line.to + 1
    }
  }

  return Decoration.set(decorations, true)
}

export const markdownMarkupColors: Extension = [
  EditorView.baseTheme({
    '.cm-content .cm-md-heading-mark': { color: '#9abce6 !important' },
    '.cm-content .cm-md-strong-mark': { color: '#D44957 !important' },
    '.cm-content .cm-md-em-mark': { color: '#DA8267 !important' },
    '.cm-content .cm-md-heading-mark *': { color: '#9abce6 !important' },
    '.cm-content .cm-md-strong-mark *': { color: '#D44957 !important' },
    '.cm-content .cm-md-em-mark *': { color: '#DA8267 !important' },
  }),
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view)
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildDecorations(update.view)
        }
      }
    },
    { decorations: (v) => v.decorations }
  ),
]
