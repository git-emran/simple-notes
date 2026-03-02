import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view'

export const statusBarExtension = ViewPlugin.fromClass(
  class {
    dom: HTMLDivElement
    darkMode: boolean

    constructor(view: EditorView) {
      const getIsDarkMode = () => {
        if (document.documentElement.classList.contains('dark')) return true
        if (document.documentElement.classList.contains('light')) return false
        return window.matchMedia('(prefers-color-scheme: dark)').matches
      }

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
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      `

      const parent = view.dom.parentElement
      if (parent) {
        parent.style.position = 'relative'
        parent.appendChild(this.dom)
      } else {
        // Fallback or wait
        requestAnimationFrame(() => {
          const p = view.dom.parentElement
          if (p) {
            p.style.position = 'relative'
            p.appendChild(this.dom)
          }
        })
      }

      // initial dark mode check
      this.darkMode = getIsDarkMode()

      this.applyColors()
      this.updateStatus(view)

      // Observe changes to html class
      const observer = new MutationObserver(() => {
        const isDark = getIsDarkMode()
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
        this.dom.style.background = 'rgba(74, 74, 79, 0.6)' // dark gray @ 60%
        this.dom.style.color = '#d1d5db' // light gray text
        this.dom.style.borderTop = '1px solid #374151'
      } else {
        this.dom.style.background = 'rgba(222, 222, 222, 0.6)' // light gray @ 60%
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
