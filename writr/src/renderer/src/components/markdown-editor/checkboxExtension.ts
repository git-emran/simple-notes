import { EditorView, Decoration, WidgetType, ViewPlugin, ViewUpdate } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'

class CheckboxWidget extends WidgetType {
  constructor(
    readonly checked: boolean,
    readonly from: number,
    readonly to: number
  ) {
    super()
  }

  toDOM(view: EditorView) {
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.checked = this.checked
    input.style.marginRight = '4px'
    input.style.verticalAlign = 'middle'

    input.addEventListener('change', () => {
      const replacement = input.checked ? '- [x]' : '- [ ]'

      // Preserve cursor and selection
      const selection = view.state.selection
      view.dispatch({
        changes: { from: this.from, to: this.to, insert: replacement },
        selection
      })
    })

    return input
  }

  ignoreEvent() {
    return false // Allow interaction
  }
}

export const checkboxExtension = ViewPlugin.fromClass(
  class {
    decorations: any

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged) {
        this.decorations = this.buildDecorations(update.view)
      }
    }

    buildDecorations(view: EditorView) {
      const builder = new RangeSetBuilder<Decoration>()
      const regex = /- \[( |x)\]/g

      for (let lineNum = 1; lineNum <= view.state.doc.lines; lineNum++) {
        const line = view.state.doc.line(lineNum)
        let match
        while ((match = regex.exec(line.text)) !== null) {
          const from = line.from + match.index
          const to = from + match[0].length
          const checked = match[1] === 'x'
          builder.add(
            from,
            to,
            Decoration.widget({ widget: new CheckboxWidget(checked, from, to), side: 1 })
          )
        }
      }

      return builder.finish()
    }
  },
  {
    decorations: (v) => v.decorations
  }
)
