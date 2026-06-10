/**
 * headingFold.ts
 *
 * Adds a clickable chevron widget to every markdown heading line in the
 * CodeMirror 6 editor so that users can collapse/expand sections – exactly
 * like the toggle behaviour already present in MarkdownPreview.
 *
 * Strategy
 * --------
 * We use a `ViewPlugin` with a `DecorationSet` that places a `WidgetDecoration`
 * *before* the first character of every heading line.  The widget is a small
 * `<span>` that dispatches `foldEffect` / `unfoldEffect` on click.
 *
 * Folding range: CodeMirror's markdown language already provides foldable
 * ranges for ATX headings.  We call `foldable(state, lineStart, lineEnd)` from
 * `@codemirror/language` which returns the range, then dispatch `foldEffect`.
 *
 * When the plugin updates we re-build the decorations so the chevron
 * rotation always reflects the current fold state.
 */

import { EditorView, Decoration, WidgetType, ViewPlugin, ViewUpdate } from '@codemirror/view'
import { RangeSetBuilder, StateEffect } from '@codemirror/state'
import { foldEffect, unfoldEffect, foldedRanges, foldable } from '@codemirror/language'

// ─── Widget ─────────────────────────────────────────────────────────────────

class HeadingFoldWidget extends WidgetType {
  constructor(
    readonly lineFrom: number,
    readonly lineTo: number,
    readonly isFolded: boolean
  ) {
    super()
  }

  eq(other: HeadingFoldWidget) {
    return (
      other.lineFrom === this.lineFrom &&
      other.lineTo === this.lineTo &&
      other.isFolded === this.isFolded
    )
  }

  toDOM(view: EditorView): HTMLElement {
    const span = document.createElement('span')
    span.className = 'cm-heading-fold-toggle'
    span.setAttribute('aria-label', this.isFolded ? 'Expand section' : 'Collapse section')
    span.setAttribute('title', this.isFolded ? 'Expand section' : 'Collapse section')

    // Chevron SVG
    span.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>`

    // Rotate when folded
    span.style.transform = this.isFolded ? 'rotate(-90deg)' : 'rotate(0deg)'

    span.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.toggle(view)
    })

    return span
  }

  private toggle(view: EditorView) {
    const { state } = view
    const line = state.doc.lineAt(this.lineFrom)
    const range = foldable(state, line.from, line.to)
    if (!range) return

    const effects: StateEffect<unknown>[] = []

    if (this.isFolded) {
      effects.push(unfoldEffect.of(range))
    } else {
      effects.push(foldEffect.of(range))
    }

    view.dispatch({ effects })
  }

  ignoreEvent() {
    return false
  }
}

// ─── Heading detection ───────────────────────────────────────────────────────

/**
 * Returns the ATX heading level (1–6) if the line starts with `#…`, else 0.
 * We deliberately do NOT rely on the syntax tree so the widget appears
 * immediately on every update without waiting for a tree parse.
 */
function headingLevel(text: string): number {
  const m = /^(#{1,6})\s/.exec(text)
  return m ? m[1].length : 0
}

// ─── Plugin ──────────────────────────────────────────────────────────────────

class HeadingFoldPlugin {
  decorations: ReturnType<typeof Decoration.set>

  constructor(view: EditorView) {
    this.decorations = this.buildDecorations(view)
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged || update.transactions.some((tr) => tr.effects.length > 0)) {
      this.decorations = this.buildDecorations(update.view)
    }
  }

  buildDecorations(view: EditorView) {
    const builder = new RangeSetBuilder<Decoration>()
    const { state } = view
    const folded = foldedRanges(state)

    for (let i = 1; i <= state.doc.lines; i++) {
      const line = state.doc.line(i)
      const level = headingLevel(line.text)
      if (level === 0) continue

      // Check if the fold range starting from this heading is currently folded.
      const range = foldable(state, line.from, line.to)
      if (!range) continue // heading with no content below – skip toggle

      // Walk the folded ranges to see if our range is in there.
      let isFolded = false
      folded.between(range.from, range.to, (from, to) => {
        if (from === range.from && to === range.to) {
          isFolded = true
          return false // stop iteration
        }
        return undefined
      })

      builder.add(
        line.from,
        line.from,
        Decoration.widget({
          widget: new HeadingFoldWidget(line.from, line.to, isFolded),
          side: -1 // place before the line content
        })
      )
    }

    return builder.finish()
  }
}

export const headingFoldExtension = [
  ViewPlugin.fromClass(HeadingFoldPlugin, {
    decorations: (v) => v.decorations
  }),
  EditorView.baseTheme({
    '.cm-heading-fold-toggle': {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '16px',
      height: '16px',
      marginRight: '4px',
      marginLeft: '-2px',
      cursor: 'pointer',
      opacity: '0.25',
      color: 'currentColor',
      verticalAlign: 'middle',
      transition: 'opacity 150ms, transform 200ms',
      userSelect: 'none',
      flexShrink: '0'
    },
    '.cm-line:hover .cm-heading-fold-toggle': {
      opacity: '1'
    },
    // Keep it visible when the section is already folded
    '.cm-heading-fold-toggle[aria-label="Expand section"]': {
      opacity: '0.6'
    }
  })
]
