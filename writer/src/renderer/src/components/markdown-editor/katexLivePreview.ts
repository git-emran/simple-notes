/**
 * katexLivePreview.ts
 *
 * Production-ready CodeMirror 6 extension for KaTeX live-preview math in the editor:
 *   - Inline math: $...$
 *   - Block  math: $$...$$
 *
 * Design & Stability guarantees:
 *   1. When cursor/selection is near or inside a math region (from - 1 to to + 1),
 *      the raw LaTeX is displayed as normal editable text with syntax highlighting (.cm-katex-source).
 *   2. When cursor is away, the formula is replaced with a rendered KaTeX widget.
 *   3. Decorations NEVER use `inclusive: true` or `block: true` on replaces to prevent
 *      CodeMirror cursor jumping, character swallowing, or document corruption.
 *   4. Clicking a rendered math widget focuses the editor and positions the cursor inside
 *      the formula so it seamlessly unfolds for editing.
 */

import {
  Extension,
  StateEffect,
  StateField
} from '@codemirror/state'
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType
} from '@codemirror/view'
import katex from 'katex'

// ── Theme Effect ─────────────────────────────────────────────────────────────
export const katexThemeEffect = StateEffect.define<boolean>()

const katexThemeField = StateField.define<boolean>({
  create: () => false,
  update(v, tr) {
    for (const e of tr.effects) {
      if (e.is(katexThemeEffect)) return e.value
    }
    return v
  }
})

// ── KaTeX Widget ─────────────────────────────────────────────────────────────

class KatexWidget extends WidgetType {
  constructor(
    readonly latex: string,
    readonly displayMode: boolean,
    readonly fromPos: number
  ) {
    super()
  }

  eq(other: KatexWidget): boolean {
    return (
      other.latex === this.latex &&
      other.displayMode === this.displayMode &&
      other.fromPos === this.fromPos
    )
  }

  toDOM(view: EditorView): HTMLElement {
    const el = document.createElement(this.displayMode ? 'div' : 'span')
    el.className = this.displayMode ? 'cm-katex-block' : 'cm-katex-inline'
    el.title = 'Click to edit formula'

    try {
      katex.render(this.latex, el, {
        displayMode: this.displayMode,
        throwOnError: false,
        output: 'htmlAndMathml',
        strict: false
      })
    } catch {
      el.textContent = this.latex
      el.classList.add('katex-error')
    }

    // Clicking the widget places the cursor inside the LaTeX formula
    el.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const targetPos = Math.min(this.fromPos + (this.displayMode ? 2 : 1), view.state.doc.length)
      view.dispatch({
        selection: { anchor: targetPos }
      })
      view.focus()
    })

    return el
  }

  ignoreEvent(): boolean {
    return true
  }
}

// ── Math Region Scanner ───────────────────────────────────────────────────────

export interface MathRegion {
  from: number
  to: number
  latex: string
  block: boolean
}

/**
 * Scans a slice of document text for inline $...$ and block $$...$$ math regions.
 * Adheres to standard CommonMark / remark-math syntax rules to avoid false positives.
 */
export function scanMathRegions(text: string, offset = 0): MathRegion[] {
  const regions: MathRegion[] = []
  const len = text.length
  let i = 0

  while (i < len) {
    // Skip escaped backslash
    if (text[i] === '\\') {
      i += 2
      continue
    }

    // 1. Block math: $$...$$
    if (text[i] === '$' && i + 1 < len && text[i + 1] === '$') {
      const start = i
      let end = -1
      let j = i + 2

      while (j < len) {
        if (text[j] === '\\') {
          j += 2
          continue
        }
        if (text[j] === '$' && j + 1 < len && text[j + 1] === '$') {
          end = j
          break
        }
        j++
      }

      if (end !== -1) {
        const latex = text.slice(start + 2, end).trim()
        if (latex.length > 0) {
          regions.push({
            from: offset + start,
            to: offset + end + 2,
            latex,
            block: true
          })
        }
        i = end + 2
        continue
      } else {
        i += 2
        continue
      }
    }

    // 2. Inline math: $...$ (strictly on the same line, non-whitespace boundaries)
    if (text[i] === '$') {
      const start = i
      const nextChar = text[i + 1]

      // Opening $ must not be followed by whitespace, newline, or $
      if (!nextChar || nextChar === ' ' || nextChar === '\t' || nextChar === '\n' || nextChar === '$') {
        i++
        continue
      }

      const prevChar = i > 0 ? text[i - 1] : ''
      let end = -1
      let j = i + 1

      // Search for closing $ on the same line
      while (j < len && text[j] !== '\n') {
        if (text[j] === '\\') {
          j += 2
          continue
        }
        if (text[j] === '$') {
          // Closing $ must not be preceded by whitespace or tab
          const prevClosingChar = text[j - 1]
          if (prevClosingChar === ' ' || prevClosingChar === '\t') {
            j++
            continue
          }
          // Closing $ must not be $$
          if (j + 1 < len && text[j + 1] === '$') {
            break
          }
          // Currency guard: if preceded and followed by digits (e.g. $10 to $20)
          const afterClosingChar = j + 1 < len ? text[j + 1] : ''
          if (/\d/.test(prevChar) && /\d/.test(afterClosingChar)) {
            j++
            continue
          }
          end = j
          break
        }
        j++
      }

      if (end !== -1) {
        const latex = text.slice(start + 1, end).trim()
        if (latex.length > 0) {
          regions.push({
            from: offset + start,
            to: offset + end + 1,
            latex,
            block: false
          })
        }
        i = end + 1
        continue
      } else {
        i++
        continue
      }
    }

    i++
  }

  return regions
}

// ── Proximity Check ──────────────────────────────────────────────────────────

/**
 * Returns true if the user's cursor or selection touches or is within 1 character of the math region.
 */
function isCursorNear(
  selRanges: readonly { from: number; to: number }[],
  from: number,
  to: number
): boolean {
  for (const range of selRanges) {
    if (range.to >= from - 1 && range.from <= to + 1) {
      return true
    }
  }
  return false
}

// ── Decoration Builder ───────────────────────────────────────────────────────

const sourceMathMark = Decoration.mark({ class: 'cm-katex-source' })

function buildKatexDecorations(view: EditorView): DecorationSet {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const decorations: any[] = []
  const { state } = view
  const selRanges = state.selection.ranges

  for (const { from, to } of view.visibleRanges) {
    // Expand to full line bounds to avoid cutting multi-line math blocks
    const startLine = state.doc.lineAt(from)
    const endLine = state.doc.lineAt(to)
    const sliceFrom = startLine.from
    const sliceTo = endLine.to
    const text = state.doc.sliceString(sliceFrom, sliceTo)

    const regions = scanMathRegions(text, sliceFrom)

    for (const region of regions) {
      if (region.from >= region.to) continue

      if (isCursorNear(selRanges, region.from, region.to)) {
        // While user is editing, style the raw LaTeX source cleanly
        try {
          decorations.push(sourceMathMark.range(region.from, region.to))
        } catch {
          // ignore range error
        }
      } else {
        // When cursor is away, replace with rendered KaTeX widget
        try {
          const widget = new KatexWidget(region.latex, region.block, region.from)
          decorations.push(
            Decoration.replace({ widget }).range(region.from, region.to)
          )
        } catch {
          // ignore range error
        }
      }
    }
  }

  return Decoration.set(decorations, true)
}

// ── ViewPlugin ────────────────────────────────────────────────────────────────

const katexPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildKatexDecorations(view)
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.selectionSet ||
        update.viewportChanged ||
        update.transactions.some((tr) => tr.effects.some((e) => e.is(katexThemeEffect)))
      ) {
        this.decorations = buildKatexDecorations(update.view)
      }
    }
  },
  { decorations: (v) => v.decorations }
)

// ── Base Theme Styles ─────────────────────────────────────────────────────────

const katexBaseTheme = EditorView.baseTheme({
  '.cm-katex-inline': {
    display: 'inline-flex',
    alignItems: 'center',
    verticalAlign: 'middle',
    cursor: 'pointer',
    padding: '1px 5px',
    margin: '0 1px',
    borderRadius: '4px',
    backgroundColor: 'var(--obsidian-hover-soft, rgba(125, 125, 125, 0.08))',
    border: '1px solid transparent',
    userSelect: 'none',
    transition: 'background-color 0.15s ease, border-color 0.15s ease'
  },
  '.cm-katex-inline:hover': {
    backgroundColor: 'var(--obsidian-hover, rgba(125, 125, 125, 0.15))',
    borderColor: 'var(--obsidian-border, rgba(125, 125, 125, 0.2))'
  },
  '.cm-katex-block': {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '10px 16px',
    margin: '8px 0',
    borderRadius: '6px',
    backgroundColor: 'var(--obsidian-hover-soft, rgba(125, 125, 125, 0.06))',
    border: '1px solid var(--obsidian-border, rgba(125, 125, 125, 0.15))',
    cursor: 'pointer',
    overflowX: 'auto',
    userSelect: 'none',
    transition: 'background-color 0.15s ease, border-color 0.15s ease'
  },
  '.cm-katex-block:hover': {
    backgroundColor: 'var(--obsidian-hover, rgba(125, 125, 125, 0.12))',
    borderColor: 'var(--obsidian-accent, #6366f1)'
  },
  '.cm-katex-source': {
    fontFamily: 'JetBrains Mono, Fira Code, Menlo, Monaco, Consolas, monospace',
    color: '#0284c7',
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderRadius: '3px',
    padding: '0 2px'
  },
  '.dark .cm-katex-source': {
    color: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.12)'
  },
  '.cm-katex-inline .katex': {
    fontSize: '1em',
    color: 'inherit'
  },
  '.cm-katex-block .katex-display': {
    margin: '0',
    color: 'inherit'
  }
})

// ── Exported Extension ────────────────────────────────────────────────────────

export const katexLivePreview: Extension = [
  katexThemeField,
  katexPlugin,
  katexBaseTheme
]
