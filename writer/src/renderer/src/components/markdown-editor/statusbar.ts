import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view'

export const statusBarExtension = ViewPlugin.fromClass(
  class {
    dom: HTMLDivElement

    constructor(view: EditorView) {
      this.dom = document.createElement('div')
      this.dom.className = 'cm-status-bar'
      this.dom.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        padding: 3px 10px;
        font-size: 0.68rem;
        font-family: inherit;
        pointer-events: none;
        z-index: 10;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        text-align: right;
        box-sizing: border-box;
        background-color: var(--obsidian-pane);
        color: var(--obsidian-text-muted);
        border-top: 1px solid var(--obsidian-border);
        transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;
      `

      const parent = view.dom.parentElement
      if (parent) {
        parent.style.position = 'relative'
        parent.appendChild(this.dom)
      } else {
        /* Fallback or wait */
        requestAnimationFrame(() => {
          const p = view.dom.parentElement
          if (p) {
            p.style.position = 'relative'
            p.appendChild(this.dom)
          }
        })
      }

      this.updateStatus(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet) {
        this.updateStatus(update.view)
      }
    }

    updateStatus(view: EditorView) {
      const { head } = view.state.selection.main
      const line = view.state.doc.lineAt(head)
      const col = head - line.from + 1
      const totalLines = view.state.doc.lines

      this.dom.textContent = `Line: ${line.number} / ${totalLines}, Col: ${col}, Chars: ${view.state.doc.length}`
    }

    destroy() {
      if (this.dom.parentElement) {
        this.dom.parentElement.removeChild(this.dom)
      }
    }
  }
)

