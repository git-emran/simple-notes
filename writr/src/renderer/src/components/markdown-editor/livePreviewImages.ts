import { Extension } from "@codemirror/state"
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view"
import { toLocalFileUrl } from "./localFileUrl"

class ImageWidget extends WidgetType {
  constructor(
    readonly url: string,
    readonly alt: string,
    readonly notePath?: string,
    readonly rootDir?: string
  ) {
    super()
  }

  eq(other: ImageWidget) {
    return (
      other.url === this.url &&
      other.alt === this.alt &&
      other.notePath === this.notePath &&
      other.rootDir === this.rootDir
    )
  }

  toDOM() {
    const finalSrc = toLocalFileUrl(this.url, this.notePath, this.rootDir)

    const wrapper = document.createElement("div")
    wrapper.className = "cm-image-widget-wrapper my-2 flex justify-start"
    
    const img = document.createElement("img")
    img.src = finalSrc
    img.alt = this.alt
    img.className = "max-w-full w-auto h-auto rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800"
    img.style.maxHeight = "400px" // Mimic Obsidian's default constraint
    img.style.maxWidth = "min(100%, 720px)"

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

function getDecorations(view: EditorView, notePath?: string, rootDir?: string) {
  const decorations: any[] = []
  const selection = view.state.selection.main

  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to)
    imageRegex.lastIndex = 0
    wikilinkImageRegex.lastIndex = 0
    
    // Markdown Images / Links
    let match
    while ((match = imageRegex.exec(text)) !== null) {
      const [, hasExclamation, alt, url] = match
      const start = from + match.index
      const line = view.state.doc.lineAt(start)
      
      // Render as image if it has '!' OR if it ends in an image extension
      if (hasExclamation === '!' || isImageUrl(url)) {
        // Hide if cursor is not on the line
        if (selection.from < line.from || selection.from > line.to) {
          decorations.push(Decoration.widget({
            widget: new ImageWidget(url, alt, notePath, rootDir),
            side: 1
          }).range(line.to))
        }
      }
    }

    // Wikilink Images / Links
    while ((match = wikilinkImageRegex.exec(text)) !== null) {
      const [, hasExclamation, url] = match
      const start = from + match.index
      const line = view.state.doc.lineAt(start)
      
      if (hasExclamation === '!' || isImageUrl(url)) {
        // Hide if cursor is not on the line
        if (selection.from < line.from || selection.from > line.to) {
          decorations.push(Decoration.widget({
            widget: new ImageWidget(url, "", notePath, rootDir),
            side: 1
          }).range(line.to))
        }
      }
    }
  }

  return Decoration.set(decorations, true)
}

export const createLivePreviewImages = (notePath?: string, rootDir?: string): Extension => ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = getDecorations(view, notePath, rootDir)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = getDecorations(update.view, notePath, rootDir)
      }
    }
  },
  {
    decorations: v => v.decorations
  }
)
