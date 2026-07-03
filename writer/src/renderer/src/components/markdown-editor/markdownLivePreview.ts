import { Extension, RangeSetBuilder } from '@codemirror/state'
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'

const hideDecoration = Decoration.replace({})
const linkTextDecoration = Decoration.mark({ class: 'cm-link-text' })

interface MarkRange {
  from: number
  to: number
}

export const markdownLivePreview: Extension = [
  EditorView.baseTheme({
    '.cm-link-text': {
      color: '#3b82f6',
      textDecoration: 'underline',
      cursor: 'pointer'
    },
    '.dark .cm-link-text': {
      color: '#60a5fa'
    }
  }),
  ViewPlugin.fromClass(
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

      buildDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>()
        const { state } = view
        const selection = state.selection
        const selRanges = selection.ranges

        function isCursorNear(from: number, to: number): boolean {
          for (const range of selRanges) {
            if (!(range.to < from - 1 || range.from > to + 1)) {
              return true
            }
          }
          return false
        }

        function getChildren(node: any) {
          const children: any[] = []
          let child = node.firstChild
          while (child) {
            children.push(child)
            child = child.nextSibling
          }
          return children
        }

        for (const { from, to } of view.visibleRanges) {
          syntaxTree(state).iterate({
            from,
            to,
            enter(node) {
              const name = node.name

              // 1. Bold, Italic, Strikethrough, InlineCode
              if (
                name === 'Emphasis' ||
                name === 'StrongEmphasis' ||
                name === 'Strikethrough' ||
                name === 'InlineCode'
              ) {
                if (!isCursorNear(node.from, node.to)) {
                  const children = getChildren(node.node)
                  for (const child of children) {
                    if (
                      child.name === 'EmphasisMark' ||
                      child.name === 'StrikethroughMark' ||
                      child.name === 'CodeMark'
                    ) {
                      try {
                        builder.add(child.from, child.to, hideDecoration)
                      } catch (e) {
                        // ignore range errors
                      }
                    }
                  }
                }
              }

              // 2. Link
              if (name === 'Link') {
                if (!isCursorNear(node.from, node.to)) {
                  let firstMark: MarkRange | null = null
                  let secondMark: MarkRange | null = null

                  const children = getChildren(node.node)
                  for (const child of children) {
                    if (child.name === 'LinkMark') {
                      const char = state.doc.sliceString(child.from, child.to)
                      if (char === '[') {
                        firstMark = { from: child.from, to: child.to }
                      } else if (char === ']') {
                        secondMark = { from: child.from, to: child.to }
                      }
                    }
                  }

                  if (firstMark !== null) {
                    try {
                      builder.add(firstMark.from, firstMark.to, hideDecoration)
                    } catch (e) {}
                  }
                  if (secondMark !== null) {
                    try {
                      builder.add(secondMark.from, node.to, hideDecoration)
                    } catch (e) {}
                  }
                  if (firstMark !== null && secondMark !== null && secondMark.from > firstMark.to) {
                    try {
                      builder.add(firstMark.to, secondMark.from, linkTextDecoration)
                    } catch (e) {}
                  }
                }
              }

              // 3. Image
              if (name === 'Image') {
                if (!isCursorNear(node.from, node.to)) {
                  try {
                    builder.add(node.from, node.to, hideDecoration)
                  } catch (e) {}
                }
              }

              // 4. HeaderMark
              if (name === 'HeaderMark') {
                const line = state.doc.lineAt(node.from)
                const cursorOnLine = selRanges.some((range) => {
                  const cursorLine = state.doc.lineAt(range.from)
                  return cursorLine.number === line.number
                })
                if (!cursorOnLine) {
                  const nextChar = state.doc.sliceString(node.to, node.to + 1)
                  const endPos = nextChar === ' ' ? node.to + 1 : node.to
                  try {
                    builder.add(node.from, endPos, hideDecoration)
                  } catch (e) {}
                }
              }

              // 5. FencedCode (Code Blocks)
              if (name === 'FencedCode') {
                if (!isCursorNear(node.from, node.to)) {
                  const children = getChildren(node.node)
                  for (const child of children) {
                    if (child.name === 'CodeMark') {
                      try {
                        const line = state.doc.lineAt(child.from)
                        builder.add(line.from, line.to, hideDecoration)
                      } catch (e) {}
                    }
                  }
                }
              }
            }
          })
        }

        return builder.finish()
      }
    },
    {
      decorations: (v) => v.decorations
    }
  )
]
