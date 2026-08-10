/**
 * codeBlockEnhancements.ts
 *
 * KEY DESIGN DECISION — block: false
 * ===================================
 * The crash was caused by `block: true` widget decorations placed at the same
 * document position as `Decoration.line()` entries. CodeMirror crashes because
 * block widgets use startSide=-1e8 internally, which violates range ordering
 * when mixed with line decorations at the same `from` position.
 *
 * The fix: use a plain INLINE widget (block: false, side: 1) placed at the END
 * of the opening fence line. CSS makes it appear as a header bar above the code.
 * No ordering conflict whatsoever with line decorations.
 *
 * Two separate ViewPlugins so each owns exactly one decoration type:
 *  - codeBlockHeaderPlugin  → Decoration.widget({ block: false }) only
 *  - codeBlockLinePlugin    → Decoration.line()                    only
 */

import {
  EditorView,
  ViewPlugin,
  ViewUpdate,
  Decoration,
  DecorationSet,
  WidgetType,
} from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import { Range } from '@codemirror/state'

/* ─── Language Icons ─────────────────────────────────────────────────────── */

const ICONS: Record<string, string> = {
  javascript: '<svg viewBox="0 0 448 512" width="13" height="13" fill="#f7df1e" xmlns="http://www.w3.org/2000/svg"><path d="M0 32v448h448V32H0zm243.8 349.4c0 43.6-25.6 63.5-62.9 63.5-33.7 0-53.2-17.4-63.2-38.5l34.3-20.7c6.6 11.7 12.6 21.6 27.1 21.6 13.8 0 22.6-5.4 22.6-26.5V237.7h42.1v143.7zm99.6 63.5c-39.1 0-74.4-22.6-74.4-73.5 0-50 35.8-73.5 73.9-73.5 28.3 0 43.2 9.7 54.7 22.6l-28.9 22.3c-7.5-8.5-16.3-13.6-26.2-13.6-18.7 0-31.4 14.1-31.4 39.5 0 25 11.8 39.2 30.5 39.2 12.1 0 21.4-6.4 29.5-16l27.1 23.3c-11.4 15.3-29.4 29.7-54.8 29.7z"/></svg>',
  js: '<svg viewBox="0 0 448 512" width="13" height="13" fill="#f7df1e" xmlns="http://www.w3.org/2000/svg"><path d="M0 32v448h448V32H0zm243.8 349.4c0 43.6-25.6 63.5-62.9 63.5-33.7 0-53.2-17.4-63.2-38.5l34.3-20.7c6.6 11.7 12.6 21.6 27.1 21.6 13.8 0 22.6-5.4 22.6-26.5V237.7h42.1v143.7zm99.6 63.5c-39.1 0-74.4-22.6-74.4-73.5 0-50 35.8-73.5 73.9-73.5 28.3 0 43.2 9.7 54.7 22.6l-28.9 22.3c-7.5-8.5-16.3-13.6-26.2-13.6-18.7 0-31.4 14.1-31.4 39.5 0 25 11.8 39.2 30.5 39.2 12.1 0 21.4-6.4 29.5-16l27.1 23.3c-11.4 15.3-29.4 29.7-54.8 29.7z"/></svg>',
  typescript: '<svg viewBox="0 0 512 512" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" rx="50" fill="#3178c6"/><path fill="#fff" d="M317 407v52c8 4 18 7 29 9s22 3 34 3c11 0 22-1 32-4s19-7 27-13 14-14 19-23 7-21 7-34c0-10-1-19-4-27s-7-15-12-21-12-11-19-16-16-10-25-14c-7-3-13-6-18-9s-10-6-13-9-6-6-8-10-3-8-3-13c0-4 1-8 3-12s5-7 8-10 7-5 12-7 10-2 16-2c4 0 9 0 13 1s9 2 13 4 8 3 11 5 6 4 9 7v-49c-7-2-15-4-24-5s-19-2-30-2c-11 0-21 1-31 4s-19 7-27 13-14 14-19 24-7 22-7 36c0 17 5 32 14 43s23 21 41 29c8 3 15 6 21 10s11 7 15 10 7 7 9 11 3 9 3 14c0 5-1 9-3 13s-5 8-9 11-9 5-15 7-13 2-21 2c-14 0-27-3-40-8s-24-13-33-23zm-84-121h64v-41H152v41h63v178h38z"/></svg>',
  ts: '<svg viewBox="0 0 512 512" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" rx="50" fill="#3178c6"/><path fill="#fff" d="M317 407v52c8 4 18 7 29 9s22 3 34 3c11 0 22-1 32-4s19-7 27-13 14-14 19-23 7-21 7-34c0-10-1-19-4-27s-7-15-12-21-12-11-19-16-16-10-25-14c-7-3-13-6-18-9s-10-6-13-9-6-6-8-10-3-8-3-13c0-4 1-8 3-12s5-7 8-10 7-5 12-7 10-2 16-2c4 0 9 0 13 1s9 2 13 4 8 3 11 5 6 4 9 7v-49c-7-2-15-4-24-5s-19-2-30-2c-11 0-21 1-31 4s-19 7-27 13-14 14-19 24-7 22-7 36c0 17 5 32 14 43s23 21 41 29c8 3 15 6 21 10s11 7 15 10 7 7 9 11 3 9 3 14c0 5-1 9-3 13s-5 8-9 11-9 5-15 7-13 2-21 2c-14 0-27-3-40-8s-24-13-33-23zm-84-121h64v-41H152v41h63v178h38z"/></svg>',
  tsx: '<svg viewBox="0 0 512 512" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" rx="50" fill="#3178c6"/><path fill="#fff" d="M317 407v52c8 4 18 7 29 9s22 3 34 3c11 0 22-1 32-4s19-7 27-13 14-14 19-23 7-21 7-34c0-10-1-19-4-27s-7-15-12-21-12-11-19-16-16-10-25-14c-7-3-13-6-18-9s-10-6-13-9-6-6-8-10-3-8-3-13c0-4 1-8 3-12s5-7 8-10 7-5 12-7 10-2 16-2c4 0 9 0 13 1s9 2 13 4 8 3 11 5 6 4 9 7v-49c-7-2-15-4-24-5s-19-2-30-2c-11 0-21 1-31 4s-19 7-27 13-14 14-19 24-7 22-7 36c0 17 5 32 14 43s23 21 41 29c8 3 15 6 21 10s11 7 15 10 7 7 9 11 3 9 3 14c0 5-1 9-3 13s-5 8-9 11-9 5-15 7-13 2-21 2c-14 0-27-3-40-8s-24-13-33-23zm-84-121h64v-41H152v41h63v178h38z"/></svg>',
  jsx: '<svg viewBox="0 0 448 512" width="13" height="13" fill="#61dafb" xmlns="http://www.w3.org/2000/svg"><path d="M0 32v448h448V32H0zm243.8 349.4c0 43.6-25.6 63.5-62.9 63.5-33.7 0-53.2-17.4-63.2-38.5l34.3-20.7c6.6 11.7 12.6 21.6 27.1 21.6 13.8 0 22.6-5.4 22.6-26.5V237.7h42.1v143.7zm99.6 63.5c-39.1 0-74.4-22.6-74.4-73.5 0-50 35.8-73.5 73.9-73.5 28.3 0 43.2 9.7 54.7 22.6l-28.9 22.3c-7.5-8.5-16.3-13.6-26.2-13.6-18.7 0-31.4 14.1-31.4 39.5 0 25 11.8 39.2 30.5 39.2 12.1 0 21.4-6.4 29.5-16l27.1 23.3c-11.4 15.3-29.4 29.7-54.8 29.7z"/></svg>',
  python: '<svg viewBox="0 0 256 255" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><path fill="#3776AB" d="M126.9 0C60.6 0 64.4 28 64.4 28l.1 29h63.7v8.7H40.3S0 61 0 128.3c0 67.2 37.2 64.9 37.2 64.9H59v-31.2s-1.3-37.2 36.6-37.2h63.2s35.4.6 35.4-34.2V35.3S199.9 0 126.9 0zm-35.2 20.3a11.3 11.3 0 110 22.6 11.3 11.3 0 010-22.6z"/><path fill="#FFD43B" d="M129.1 255c66.4 0 62.6-28 62.6-28l-.1-29H128v-8.7h87.9s40.3 4.7 40.3-62.6c0-67.2-37.2-64.9-37.2-64.9H197v31.2s1.3 37.2-36.6 37.2H97.2s-35.4-.6-35.4 34.2v57.5S56.1 255 129.1 255zm35.2-20.3a11.3 11.3 0 110-22.6 11.3 11.3 0 010 22.6z"/></svg>',
  py: '<svg viewBox="0 0 256 255" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><path fill="#3776AB" d="M126.9 0C60.6 0 64.4 28 64.4 28l.1 29h63.7v8.7H40.3S0 61 0 128.3c0 67.2 37.2 64.9 37.2 64.9H59v-31.2s-1.3-37.2 36.6-37.2h63.2s35.4.6 35.4-34.2V35.3S199.9 0 126.9 0zm-35.2 20.3a11.3 11.3 0 110 22.6 11.3 11.3 0 010-22.6z"/><path fill="#FFD43B" d="M129.1 255c66.4 0 62.6-28 62.6-28l-.1-29H128v-8.7h87.9s40.3 4.7 40.3-62.6c0-67.2-37.2-64.9-37.2-64.9H197v31.2s1.3 37.2-36.6 37.2H97.2s-35.4-.6-35.4 34.2v57.5S56.1 255 129.1 255zm35.2-20.3a11.3 11.3 0 110-22.6 11.3 11.3 0 010 22.6z"/></svg>',
  html: '<svg viewBox="0 0 512 512" width="13" height="13" fill="#e44d26" xmlns="http://www.w3.org/2000/svg"><path d="M41 460h430l-45-412H86L41 460zm88-301h254l-11 127H178l-5-55h65l2 24h90l4-41H212l-9-55zm183 205l-56 16-56-16-4-45h55l1 14 26 7 26-7 2-26H210l-4-41h172l-10 98z"/></svg>',
  css: '<svg viewBox="0 0 512 512" width="13" height="13" fill="#264de4" xmlns="http://www.w3.org/2000/svg"><path d="M41 460h430l-45-412H86L41 460zm253-157H184l-4-41h172l-10 98-56 16-56-16-4-45h55l1 14 26 7 26-7 2-26zm11-127H184l-9-55h254l-33 375-110 32-110-32-8-91h55l4 55 59 17 59-17 4-45H305l-2-24h177l4-41z"/></svg>',
  json: '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M5 3h2v2H5v5a2 2 0 01-2 2 2 2 0 012 2v5h2v2H5c-1.07-.27-2-.9-2-2v-4a2 2 0 00-2-2H0v-2h1a2 2 0 002-2V5a2 2 0 012-2m14 0a2 2 0 012 2v4a2 2 0 002 2h1v2h-1a2 2 0 00-2 2v4a2 2 0 01-2 2h-2v-2h2v-5a2 2 0 012-2 2 2 0 01-2-2V5h-2V3h2z"/></svg>',
  rust: '<svg viewBox="0 0 106 106" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><circle cx="53" cy="53" r="53" fill="#DEA584"/></svg>',
  go: '<svg viewBox="0 0 100 40" width="18" height="10" fill="#00ACD7" xmlns="http://www.w3.org/2000/svg"><text y="32" font-size="40" font-family="sans-serif" font-weight="bold">Go</text></svg>',
  java: '<svg viewBox="0 0 48 48" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><path fill="#f89820" d="M21 34s-4.9 2.8 3.5 3.8c10.1 1.2 15.2.9 26.3-1.1 0 0 2.9 1.8 7 3.4C39.1 45.5 8.9 43.2 21 34zm-2.1-7.2s-5.5 4.1 2.9 5c10.8 1.1 19.3.8 27-1.1 0 0 2 2 5.1 3.1-23.9 6.9-50.7.6-35-7z"/></svg>',
  cpp: '<svg viewBox="0 0 24 24" width="13" height="13" fill="#00599c" xmlns="http://www.w3.org/2000/svg"><path d="M10.5 15.97l.41 2.44c-.26.14-.68.27-1.24.39-.57.13-1.24.2-2.01.2-2.21-.04-3.87-.7-4.98-1.96C1.58 15.77 1 14.16 1 12.21c.05-2.31.72-4.08 2-5.32C4.32 5.55 5.95 4.94 8 5c.75 0 1.4.07 1.94.19.54.13.94.25 1.2.36l-.39 2.5-.64-.27c-.26-.08-.59-.12-.99-.12-1.06.06-1.86.42-2.4 1.08-.56.66-.84 1.55-.84 2.67 0 1.02.25 1.86.76 2.54.51.68 1.31 1.03 2.4 1.05.45 0 .84-.06 1.17-.13l.79-.27.5-.24z"/></svg>',
  markdown: '<svg viewBox="0 0 640 512" width="13" height="13" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M593.8 59.1H46.2C20.7 59.1 0 79.8 0 105.2v301.5c0 25.5 20.7 46.2 46.2 46.2h547.7c25.5 0 46.2-20.7 46.2-46.2V105.2c0-25.4-20.7-46.1-46.3-46.1zM338.3 360.6H258V198.4l-42.5 85.1-42.5-85.1v162.2H92.7V151.4h80.3l42.5 85.1 42.5-85.1h80.3v209.2zm108.9 0l-71.5-98.1h45.8V151.4h51.5v111.1h45.8l-71.6 98.1z"/></svg>',
  md: '<svg viewBox="0 0 640 512" width="13" height="13" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M593.8 59.1H46.2C20.7 59.1 0 79.8 0 105.2v301.5c0 25.5 20.7 46.2 46.2 46.2h547.7c25.5 0 46.2-20.7 46.2-46.2V105.2c0-25.4-20.7-46.1-46.3-46.1zM338.3 360.6H258V198.4l-42.5 85.1-42.5-85.1v162.2H92.7V151.4h80.3l42.5 85.1 42.5-85.1h80.3v209.2zm108.9 0l-71.5-98.1h45.8V151.4h51.5v111.1h45.8l-71.6 98.1z"/></svg>',
  sql: '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 5v4c0 1.66-4 3-9 3S3 10.66 3 9V5M21 9v4c0 1.66-4 3-9 3s-9-1.34-9-3V9M21 13v4c0 1.66-4 3-9 3s-9-1.34-9-3v-4"/></svg>',
  yaml: '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M6 3L2 7l10 5 10-5-4-4M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
  bash: '<svg viewBox="0 0 24 24" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="3" fill="#1d1d1d"/><path stroke="#eee" stroke-width="1.5" fill="none" d="M5 8l4 4-4 4m5 0h6"/></svg>',
  shell: '<svg viewBox="0 0 24 24" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="3" fill="#1d1d1d"/><path stroke="#eee" stroke-width="1.5" fill="none" d="M5 8l4 4-4 4m5 0h6"/></svg>',
  sh: '<svg viewBox="0 0 24 24" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="3" fill="#1d1d1d"/><path stroke="#eee" stroke-width="1.5" fill="none" d="M5 8l4 4-4 4m5 0h6"/></svg>',
  zsh: '<svg viewBox="0 0 24 24" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="3" fill="#1d1d1d"/><path stroke="#eee" stroke-width="1.5" fill="none" d="M5 8l4 4-4 4m5 0h6"/></svg>',
}

const FALLBACK_ICON = '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>'

/* ─── Header Widget ──────────────────────────────────────────────────────── */

class CodeBlockHeaderWidget extends WidgetType {
  constructor(
    readonly lang: string,
    readonly meta: string,
    readonly codeContent: string
  ) {
    super()
  }

  eq(other: CodeBlockHeaderWidget) {
    return this.lang === other.lang && this.meta === other.meta && this.codeContent === other.codeContent
  }

  toDOM() {
    const wrap = document.createElement('span')
    wrap.className = 'cm-codeblock-header'

    const left = document.createElement('span')
    left.className = 'cm-codeblock-header-left'

    const icon = document.createElement('span')
    icon.className = 'cm-codeblock-icon'
    icon.innerHTML = ICONS[this.lang.toLowerCase()] ?? FALLBACK_ICON

    const langLabel = document.createElement('span')
    langLabel.className = 'cm-codeblock-lang'
    langLabel.textContent = this.lang || 'text'

    left.appendChild(icon)
    left.appendChild(langLabel)

    if (this.meta) {
      const metaLabel = document.createElement('span')
      metaLabel.className = 'cm-codeblock-meta'
      metaLabel.textContent = this.meta
      left.appendChild(metaLabel)
    }

    const copyBtn = document.createElement('button')
    copyBtn.className = 'cm-code-copy-btn'
    copyBtn.textContent = 'Copy'
    copyBtn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      navigator.clipboard.writeText(this.codeContent).catch(() => {})
      copyBtn.textContent = 'Copied!'
      copyBtn.classList.add('cm-code-copy-btn--ok')
      setTimeout(() => {
        copyBtn.textContent = 'Copy'
        copyBtn.classList.remove('cm-code-copy-btn--ok')
      }, 2000)
    })

    wrap.appendChild(left)
    wrap.appendChild(copyBtn)
    return wrap
  }

  ignoreEvent() { return false }
}

/* ─── Helper ─────────────────────────────────────────────────────────────── */

interface FenceInfo {
  openLineTo: number
  startLine: number
  endLine: number
  lang: string
  meta: string
  code: string
}

function parseFence(view: EditorView, nodeFrom: number, nodeTo: number): FenceInfo | null {
  try {
    const doc = view.state.doc
    const totalLines = doc.lines
    const startLine = doc.lineAt(Math.min(nodeFrom, doc.length)).number
    const endLine = doc.lineAt(Math.min(nodeTo, doc.length)).number
    if (startLine < 1 || startLine > totalLines || endLine < startLine) return null

    const openLine = doc.line(startLine)
    const m = openLine.text.match(/^(`{3,})\s*([\w.-]*)?\s*(.*)$/)
    const lang = m?.[2] ?? ''
    const meta = (m?.[3] ?? '').trim()

    let code = ''
    if (endLine > startLine + 1) {
      const cFrom = doc.line(Math.min(startLine + 1, totalLines)).from
      const cTo = doc.line(Math.min(endLine - 1, totalLines)).to
      if (cFrom <= cTo) code = view.state.sliceDoc(cFrom, cTo)
    }

    return { openLineTo: openLine.to, startLine, endLine, lang, meta, code }
  } catch {
    return null
  }
}

/* ─── Plugin 1: Inline header widget ────────────────────────────────────── */
// block: false — placed at END of opening fence line (line.to)
// This NEVER conflicts with Decoration.line() which is at line.from

const codeBlockHeaderPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = this.build(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.build(update.view)
      }
    }

    build(view: EditorView): DecorationSet {
      const ranges: Range<Decoration>[] = []
      const seen = new Set<number>()

      for (const { from, to } of view.visibleRanges) {
        syntaxTree(view.state).iterate({
          from, to,
          enter: (node) => {
            if (node.name !== 'FencedCode') return
            if (seen.has(node.from)) return
            seen.add(node.from)

            const info = parseFence(view, node.from, node.to)
            if (!info) return

            ranges.push(
              Decoration.widget({
                widget: new CodeBlockHeaderWidget(info.lang, info.meta, info.code),
                side: 1,
                block: false, // CRITICAL: must be false
              }).range(info.openLineTo)
            )
          }
        })
      }

      return Decoration.set(ranges, true)
    }
  },
  { decorations: (v) => v.decorations }
)

/* ─── Plugin 2: Line background decorations ─────────────────────────────── */

const lineDecoFirst = Decoration.line({ attributes: { class: 'cm-codeblock-line cm-codeblock-line-first' } })
const lineDecoMiddle = Decoration.line({ attributes: { class: 'cm-codeblock-line' } })
const lineDecoLast = Decoration.line({ attributes: { class: 'cm-codeblock-line cm-codeblock-line-last' } })
const lineDecoSingle = Decoration.line({ attributes: { class: 'cm-codeblock-line cm-codeblock-line-first cm-codeblock-line-last' } })

const codeBlockLinePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = this.build(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.build(update.view)
      }
    }

    build(view: EditorView): DecorationSet {
      const ranges: Range<Decoration>[] = []
      const seen = new Set<number>()

      for (const { from, to } of view.visibleRanges) {
        syntaxTree(view.state).iterate({
          from, to,
          enter: (node) => {
            if (node.name !== 'FencedCode' && node.name !== 'CodeBlock') return
            if (seen.has(node.from)) return
            seen.add(node.from)

            const info = parseFence(view, node.from, node.to)
            if (!info) return

            const { startLine, endLine } = info
            const doc = view.state.doc

            for (let i = startLine; i <= endLine; i++) {
              try {
                const line = doc.line(i)
                const deco =
                  startLine === endLine ? lineDecoSingle :
                  i === startLine ? lineDecoFirst :
                  i === endLine ? lineDecoLast :
                  lineDecoMiddle
                ranges.push(deco.range(line.from))
              } catch {
                // skip bad line numbers during fast editing
              }
            }
          }
        })
      }

      return Decoration.set(ranges, true)
    }
  },
  { decorations: (v) => v.decorations }
)

/* ─── Theme ──────────────────────────────────────────────────────────────── */

const codeBlockTheme = EditorView.baseTheme({
  '.cm-codeblock-line-first': {
    position: 'relative',
    paddingTop: '24px',
  },
  '.cm-codeblock-header': {
    position: 'absolute',
    top: '0',
    left: '0',
    right: '0',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '3px 10px',
    fontSize: '11px',
    fontFamily: 'inherit',
    borderRadius: '6px 6px 0 0',
    userSelect: 'none',
    pointerEvents: 'auto',
    backgroundColor: 'var(--obsidian-pane)',
    color: 'var(--obsidian-text-muted)',
    borderBottom: '1px solid var(--obsidian-border)',
    boxSizing: 'border-box',
    zIndex: '10',
    height: '24px',
    lineHeight: '1',
    width: '100%',
  },
  '.cm-codeblock-header-left': {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    overflow: 'hidden',
  },
  '.cm-codeblock-icon': {
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: '0',
  },
  '.cm-codeblock-lang': {
    fontWeight: '600',
    fontSize: '10px',
    letterSpacing: '.07em',
    textTransform: 'uppercase',
  },
  '.cm-codeblock-meta': {
    fontFamily: 'monospace',
    fontSize: '10px',
    opacity: '.6',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  '.cm-code-copy-btn': {
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    padding: '2px 8px',
    fontSize: '10px',
    fontWeight: '600',
    letterSpacing: '.05em',
    textTransform: 'uppercase',
    opacity: '0',
    borderRadius: '4px',
    transition: 'opacity .15s, background .15s',
    color: 'inherit',
    pointerEvents: 'auto',
    flexShrink: '0',
  },
  '.cm-code-copy-btn--ok': {
    color: '#22c55e',
    opacity: '1 !important',
  },
  '.cm-codeblock-header:hover .cm-code-copy-btn': {
    opacity: '1',
  },
  '.cm-code-copy-btn:hover': {
    backgroundColor: 'var(--obsidian-hover-soft)',
  },
  '.cm-codeblock-line': {
    backgroundColor: 'rgba(228,228,231,.30)',
  },
  '.cm-codeblock-line-last': {
    borderRadius: '0 0 6px 6px',
    paddingBottom: '4px',
  },
  '&dark .cm-codeblock-line': {
    backgroundColor: 'rgba(39,39,42,.45)',
  },
})

/* ─── Export ─────────────────────────────────────────────────────────────── */

export const codeBlockEnhancements = [
  codeBlockHeaderPlugin,
  codeBlockLinePlugin,
  codeBlockTheme,
]
