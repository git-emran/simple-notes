import { gutter, GutterMarker } from '@codemirror/view'
import { StateField, Transaction } from '@codemirror/state'

// Bounded cache for DOM elements with LRU-style cleanup
const MAX_CACHE_SIZE = 200 // Reasonable limit for most use cases
const markerCache = new Map<string, GutterMarker>()

// Get cached or create new marker with bounded cache
function getMarker(text: string, isCurrentLine: boolean): GutterMarker {
  const key = `${text}-${isCurrentLine}`

  if (markerCache.has(key)) {
    // Move to end for LRU behavior
    const marker = markerCache.get(key)!
    markerCache.delete(key)
    markerCache.set(key, marker)
    return marker
  }

  // Clean up if cache is too large
  if (markerCache.size >= MAX_CACHE_SIZE) {
    // Remove oldest 50 entries
    const toDelete = Array.from(markerCache.keys()).slice(0, 50)
    toDelete.forEach((k) => markerCache.delete(k))
  }

  const marker = new (class extends GutterMarker {
    toDOM() {
      const span = document.createElement('span')
      span.textContent = text
      span.className = isCurrentLine ? 'cm-lineNumber cm-current-line' : 'cm-lineNumber'
      return span
    }
  })()

  markerCache.set(key, marker)
  return marker
}

// State field that increments on any selection change to force gutter updates
export const selectionVersionField = StateField.define<number>({
  create() {
    return 0
  },
  update(value: number, tr: Transaction) {
    // Increment on any transaction that might change selection
    if (tr.docChanged || tr.selection || tr.effects.length > 0) {
      return value + 1
    }
    return value
  }
})

// Vim-style relative line numbers gutter
export function relativeLineNumbers() {
  return [
    selectionVersionField,
    gutter({
      lineMarker(view, line) {
        const currentLine = view.state.doc.lineAt(view.state.selection.main.head).number
        const lineNum = view.state.doc.lineAt(line.from).number

        if (lineNum === currentLine) {
          return getMarker(String(lineNum), true)
        } else {
          const relativeNum = Math.abs(currentLine - lineNum)
          return getMarker(String(relativeNum), false)
        }
      },
      lineMarkerChange(update) {
        // Tell gutter to update when selection version changes
        return (
          update.state.field(selectionVersionField) !==
          update.startState.field(selectionVersionField)
        )
      },
      initialSpacer() {
        return getMarker('999', false)
      }
    })
  ]
}
