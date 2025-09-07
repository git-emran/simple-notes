import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view'

export const statusBarExtension = ViewPlugin.fromClass(
  class {
    dom: HTMLDivElement
    darkMode: boolean

    constructor(view: EditorView) {
      this.dom = document.createElement('div')
      this.dom.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        padding: 2px 8px;
        font-size: 0.65rem;
        font-family: sans-serif;
        pointer-events: none;
        z-index: 10;
      `

      view.dom.parentElement!.style.position = 'relative'
      view.dom.parentElement!.appendChild(this.dom)

      // initial dark mode check
      this.darkMode =
        document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches

      this.applyColors()
      this.updateStatus(view)

      // Observe changes to html class
      const observer = new MutationObserver(() => {
        const isDark =
          document.documentElement.classList.contains('dark') ||
          window.matchMedia('(prefers-color-scheme: dark)').matches
        if (isDark !== this.darkMode) {
          this.darkMode = isDark
          this.applyColors()
        }
      })
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
      this.observer = observer
    }

    observer: MutationObserver

    applyColors() {
      if (this.darkMode) {
        this.dom.style.background = '#4A4A4F' // dark gray
        this.dom.style.color = '#d1d5db' // light gray text
        this.dom.style.borderTop = '1px solid #374151'
      } else {
        this.dom.style.background = '#DEDEDE' // light gray
        this.dom.style.color = '#919191' // dark gray text
        this.dom.style.borderTop = '1px solid #d1d5db'
      }
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
      this.observer.disconnect()
    }
  }
)
