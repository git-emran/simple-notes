import { gutter, GutterMarker } from '@codemirror/view'
import { StateField, Transaction } from '@codemirror/state'

class RelativeNumberMarker extends GutterMarker {
  constructor(
    readonly text: string,
    readonly isCurrent: boolean
  ) {
    super()
  }

  eq(other: RelativeNumberMarker) {
    return this.text === other.text && this.isCurrent === other.isCurrent
  }

  toDOM() {
    const span = document.createElement('span')
    span.textContent = this.text
    // Modern UI: tabular-nums ensures digits align properly.
    // Right alignment with pr-2 looks much better for line numbers.
    span.className = this.isCurrent
      ? 'cm-lineNumber pr-2 tabular-nums font-semibold text-[var(--obsidian-accent)] transition-colors duration-200 block text-right w-full'
      : 'cm-lineNumber pr-2 tabular-nums text-[var(--obsidian-text-muted)] opacity-50 hover:opacity-100 transition-opacity duration-200 block text-right w-full'
    return span
  }
}

/* State field that increments on any selection change to force gutter updates */
export const selectionVersionField = StateField.define<number>({
  create() {
    return 0
  },
  update(value: number, tr: Transaction) {
    /* Increment on any transaction that might change selection */
    if (tr.docChanged || tr.selection || tr.effects.length > 0) {
      return value + 1
    }
    return value
  }
})

/* Vim-style relative line numbers gutter */
export function relativeLineNumbers() {
  return [
    selectionVersionField,
    gutter({
      lineMarker(view, line) {
        const currentLine = view.state.doc.lineAt(view.state.selection.main.head).number
        const lineNum = view.state.doc.lineAt(line.from).number

        if (lineNum === currentLine) {
          return new RelativeNumberMarker(String(lineNum), true)
        } else {
          const relativeNum = Math.abs(currentLine - lineNum)
          return new RelativeNumberMarker(String(relativeNum), false)
        }
      },
      lineMarkerChange(update) {
        /* Tell gutter to update when selection version changes */
        return (
          update.state.field(selectionVersionField) !==
          update.startState.field(selectionVersionField)
        )
      },
      initialSpacer() {
        return new RelativeNumberMarker('999', false)
      }
    })
  ]
}
