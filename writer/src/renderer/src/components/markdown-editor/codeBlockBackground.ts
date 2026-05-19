import { syntaxTree } from "@codemirror/language"
import { RangeSetBuilder } from "@codemirror/state"
import { Decoration, ViewPlugin, ViewUpdate, EditorView } from "@codemirror/view"

const codeBlockDecoration = Decoration.line({
  attributes: { class: "cm-codeblock-line" }
})

export const codeBlockBackground = ViewPlugin.fromClass(class {
  decorations: any

  constructor(view: EditorView) {
    this.decorations = this.getDecorations(view)
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged)
      this.decorations = this.getDecorations(update.view)
  }

  getDecorations(view: EditorView) {
    let builder = new RangeSetBuilder<Decoration>()
    for (let {from, to} of view.visibleRanges) {
      syntaxTree(view.state).iterate({
        from, to,
        enter: (node) => {
          if (node.name === "FencedCode" || node.name === "CodeBlock") {
            try {
                let startLine = view.state.doc.lineAt(node.from).number
                let endLine = view.state.doc.lineAt(node.to).number
                for (let i = startLine; i <= endLine; i++) {
                    const line = view.state.doc.line(i)
                    /* Avoid adding multiple decorations to the same line if blocks overlap  */
                    /* (though they shouldn't in standard markdown) */
                    builder.add(line.from, line.from, codeBlockDecoration)
                }
            } catch (e) {
                /* Ignore range errors during fast typing */
            }
          }
        }
      })
    }
    return builder.finish()
  }
}, {
  decorations: v => v.decorations
})
