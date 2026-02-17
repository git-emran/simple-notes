import { Extension } from "@codemirror/state"
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view"

class ImageWidget extends WidgetType {
  constructor(readonly url: string, readonly alt: string) {
    super()
  }

  eq(other: ImageWidget) {
    return other.url === this.url && other.alt === this.alt
  }

  toDOM() {
    const isRelative = this.url && !this.url.startsWith('http') && !this.url.startsWith('data:') && !this.url.startsWith('local-file://')
    const finalSrc = isRelative ? `local-file://${encodeURI(this.url)}` : this.url

    const wrapper = document.createElement("div")
    wrapper.className = "cm-image-widget-wrapper my-2 flex justify-center"
    
    const img = document.createElement("img")
    img.src = finalSrc
    img.alt = this.alt
    img.className = "max-w-full h-auto rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800"
    img.style.maxHeight = "400px" // Mimic Obsidian's default constraint

    wrapper.appendChild(img)
    return wrapper
  }
}

const imageRegex = /(!?)\[(.*?)\]\((.*?)\)/g
const wikilinkImageRegex = /(!?)\[\[(.*?)\]\]/g

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico']

function isImageUrl(url: string) {
  try {
    const lowerUrl = url.toLowerCase().split('?')[0]
    return IMAGE_EXTENSIONS.some(ext => lowerUrl.endsWith(ext))
  } catch {
    return false
  }
}

function getDecorations(view: EditorView) {
  const decorations: any[] = []
  const selection = view.state.selection.main

  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to)
    
    // Markdown Images / Links
    let match
    while ((match = imageRegex.exec(text)) !== null) {
      const [fullMatch, hasExclamation, alt, url] = match
      const start = from + match.index
      const line = view.state.doc.lineAt(start)
      
      // Render as image if it has '!' OR if it ends in an image extension
      if (hasExclamation === '!' || isImageUrl(url)) {
        // Hide if cursor is not on the line
        if (selection.from < line.from || selection.from > line.to) {
          decorations.push(Decoration.widget({
            widget: new ImageWidget(url, alt),
            side: 1
          }).range(line.to))
        }
      }
    }

    // Wikilink Images / Links
    while ((match = wikilinkImageRegex.exec(text)) !== null) {
      const [fullMatch, hasExclamation, url] = match
      const start = from + match.index
      const line = view.state.doc.lineAt(start)
      
      if (hasExclamation === '!' || isImageUrl(url)) {
        // Hide if cursor is not on the line
        if (selection.from < line.from || selection.from > line.to) {
          decorations.push(Decoration.widget({
            widget: new ImageWidget(url, ""),
            side: 1
          }).range(line.to))
        }
      }
    }
  }

  return Decoration.set(decorations, true)
}

export const livePreviewImages: Extension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = getDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = getDecorations(update.view)
      }
    }
  },
  {
    decorations: v => v.decorations
  }
)
