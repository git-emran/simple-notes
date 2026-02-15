import { Extension } from '@codemirror/state'
import { EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet, WidgetType } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'

class CopyButtonWidget extends WidgetType {
  constructor(readonly code: string) {
    super()
  }

  toDOM() {
    const button = document.createElement('button')
    // Changed: Removed opacity-0 and group-hover requirement. Made bg solid.
    // Positioned absolute. We need the parent to be relative.
    button.className = 'absolute top-0 right-0 m-1 p-1 text-[10px] font-mono text-zinc-500 hover:text-zinc-100 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-600 dark:hover:bg-zinc-700 rounded transition-all cursor-pointer select-none z-20'
    button.textContent = 'Copy'
    button.onclick = (e) => {
      e.preventDefault()
      navigator.clipboard.writeText(this.code)
      button.textContent = 'Copied!'
      button.classList.add('text-green-600', 'dark:text-green-400')
      setTimeout(() => {
        button.textContent = 'Copy'
        button.classList.remove('text-green-600', 'dark:text-green-400')
      }, 2000)
    }
    return button
  }

  ignoreEvent() {
    return true
  }
}

const codeBlockCopyPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = this.buildDecorations(update.view)
      }
    }

    buildDecorations(view: EditorView) {
      const widgets: any[] = []
      
      // We want to attach the button to the code block.
      // A simple way is to find code blocks and attach a widget to the start content.
      // However, CodeMirror's markdown parser parses ``` as FencedCode.
      
      // Let's iterate over the syntax tree
      for (const { from, to } of view.visibleRanges) {
        syntaxTree(view.state).iterate({
          from,
          to,
          enter: (node) => {
            if (node.name === 'FencedCode') {
              // Get the content of the code block
              const codeBlockText = view.state.sliceDoc(node.from, node.to)
              
              // We need to parse out the code content, excluding backticks and language identifier.
              // Typical format: ```lang\ncode\n```
              const lines = codeBlockText.split('\n')
              if (lines.length >= 2) {
                  // lines[0] is ```lang
                  // lines[lines.length-1] is ```
                  // Content is distinct.
                   
                  // Actually, it's easier to just copy the whole block text or try to extract.
                  // For "Copy Code", usually we want just the inner code.
                  // But finding the exact inner range safely can be tricky with just the node.
                  // Let's look at lines.
                  
                  const content = lines.slice(1, lines.length - 1).join('\n')
                  
                  // We place the widget at the *start* of the block (node.from).
                  // But a Widget decoration inserts an element *in the document flow* which might mess up layout if we aren't careful.
                  // A better approach for "overlay" buttons is to use `EditorView.domEventHandlers` or simply render a decoration that is `side: -1` or `side: 1` that positions itself absolutely.
                  // But we need a parent generic styling to position absolute against.
                  
                  // Let's try adding a decoration that wraps the code block or adds a clean overlay.
                  // Actually, replacing decorations isn't quite right.
                  // We can use a Widget decoration that renders a 0-size element with absolute positioning?
                  
                  // Wait, `syntaxTree` gives us `FencedCode`.
                  // We can add a Widget decoration at `node.from`. 
                  // If we make the code block relative positioned, the button can be absolute.
                  // But we can't easily style the *CodeMirror line* to be relative from here without a LineDecoration.
                  
                  const deco = Decoration.widget({
                    widget: new CopyButtonWidget(content),
                    side: 1,
                    block: false 
                  })
                  
                  // We want it visually inside the block.
                  // If we put it at node.from, it's at the start of the line ```lang.
                  // We can position it relative to the editor if we can calculate coordinates, but that's heavy.
                  
                  // Alternative: Use a LineDecoration to add a class to the line starting the block, 
                  // and that class makes it relative?
                  // `FencedCode` spans multiple lines. CodeMirror decorations are usually per line or range.
                  
                  // Simplification:
                  // Just put the button at the top line of the code block.
                  // CodeMirror markdown mode highlights the first line as `CodeMark` + `CodeInfo`.
                  
                  // Let's try adding a widget at `node.from` that is `side: 1`. 
                  // And ensure the CSS allows it to float right.
                  widgets.push(deco.range(node.from))
              }
            }
          }
        })
      }

      return Decoration.set(widgets)
    }
  },
  {
    decorations: (v) => v.decorations
  }
)

const codeBlockTheme = EditorView.theme({
  '.cm-line': {
    position: 'relative' 
  },
  '.cm-line:hover .cm-code-copy-btn': {
      // If we want hover effect later
  }
})

export const codeBlockCopy = [
    codeBlockCopyPlugin,
    codeBlockTheme
]
