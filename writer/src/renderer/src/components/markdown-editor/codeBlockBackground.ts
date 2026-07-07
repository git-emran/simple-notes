import { syntaxTree } from '@codemirror/language'
import { RangeSetBuilder } from '@codemirror/state'
import { Decoration, ViewPlugin, ViewUpdate, EditorView } from '@codemirror/view'

const getCodeBlockLineDecoration = (className: string) =>
  Decoration.line({
    attributes: { class: className }
  })

const firstCodeBlockLineDecoration = getCodeBlockLineDecoration(
  'cm-codeblock-line cm-codeblock-line-first'
)
const middleCodeBlockLineDecoration = getCodeBlockLineDecoration('cm-codeblock-line')
const lastCodeBlockLineDecoration = getCodeBlockLineDecoration(
  'cm-codeblock-line cm-codeblock-line-last'
)
const singleCodeBlockLineDecoration = getCodeBlockLineDecoration(
  'cm-codeblock-line cm-codeblock-line-first cm-codeblock-line-last'
)

export const codeBlockBackground = ViewPlugin.fromClass(
  class {
    decorations: any

    constructor(view: EditorView) {
      this.decorations = this.getDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.getDecorations(update.view)
      }
    }

    getDecorations(view: EditorView) {
      const builder = new RangeSetBuilder<Decoration>()
      for (const { from, to } of view.visibleRanges) {
        syntaxTree(view.state).iterate({
          from,
          to,
          enter: (node) => {
            if (node.name === 'FencedCode' || node.name === 'CodeBlock') {
              try {
                const startLine = view.state.doc.lineAt(node.from).number
                const endLine = view.state.doc.lineAt(node.to).number

                for (let i = startLine; i <= endLine; i += 1) {
                  const line = view.state.doc.line(i)
                  const decoration =
                    startLine === endLine
                      ? singleCodeBlockLineDecoration
                      : i === startLine
                        ? firstCodeBlockLineDecoration
                        : i === endLine
                          ? lastCodeBlockLineDecoration
                          : middleCodeBlockLineDecoration

                  builder.add(line.from, line.from, decoration)
                }
              } catch {
                /* Ignore range errors during fast typing */
              }
            }
          }
        })
      }
      return builder.finish()
    }
  },
  {
    decorations: (v) => v.decorations
  }
)
