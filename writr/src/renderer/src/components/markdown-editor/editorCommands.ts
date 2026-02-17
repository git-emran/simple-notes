import { EditorView } from "@codemirror/view"

export const applyFormat = (view: EditorView | null, before: string, after: string = "") => {
  if (!view) return

  const { from, to, empty } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)

  if (empty) {
    const insert = before + after
    view.dispatch({
      changes: { from, to, insert },
      selection: { anchor: from + before.length }
    })
  } else {
    const insert = before + selected + after
    view.dispatch({
      changes: { from, to, insert },
      selection: {
        anchor: from,
        head: from + insert.length
      }
    })
  }

  view.focus()
}

export const applyLineFormat = (view: EditorView | null, prefix: string) => {
  if (!view) return

  const { from } = view.state.selection.main
  const line = view.state.doc.lineAt(from)
  const lineText = line.text

  if (lineText.startsWith(prefix)) {
    view.dispatch({
      changes: {
        from: line.from,
        to: line.from + prefix.length,
        insert: ""
      },
      selection: { anchor: from - prefix.length }
    })
  } else {
    view.dispatch({
      changes: {
        from: line.from,
        to: line.from,
        insert: prefix
      },
      selection: { anchor: from + prefix.length }
    })
  }

  view.focus()
}

export const applyHeaderFormat = (view: EditorView | null, level: number) => {
  const prefix = "#".repeat(level) + " "
  applyLineFormat(view, prefix)
}

export const applyLinkFormat = (view: EditorView | null) => {
  if (!view) return

  const { from, to, empty } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)

  if (empty) {
    const insert = "[link text](url)"
    view.dispatch({
      changes: { from, to, insert },
      selection: { anchor: from + 1, head: from + 10 }
    })
  } else {
    const insert = `[${selected}](url)`
    view.dispatch({
      changes: { from, to, insert },
      selection: {
        anchor: from + selected.length + 3,
        head: from + selected.length + 6
      }
    })
  }

  view.focus()
}

export const applyImageFormat = (view: EditorView | null) => {
  if (!view) return

  const { from, to, empty } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)

  if (empty) {
    const insert = "![alt text](url)"
    view.dispatch({
      changes: { from, to, insert },
      selection: { anchor: from + 2, head: from + 10 }
    })
  } else {
    const insert = `![${selected}](url)`
    view.dispatch({
      changes: { from, to, insert },
      selection: {
        anchor: from + selected.length + 4,
        head: from + selected.length + 7
      }
    })
  }

  view.focus()
}

export const insertTable = (view: EditorView | null) => {
  if (!view) return

  const { from, to } = view.state.selection.main
  const tableTemplate = `| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |

`

  view.dispatch({
    changes: { from, to, insert: tableTemplate },
    selection: { anchor: from + 2, head: from + 10 }
  })

  view.focus()
}

export const insertCheckbox = (view: EditorView | null) => {
  if (!view) return

  const { from } = view.state.selection.main
  const line = view.state.doc.lineAt(from)

  const checkboxText = "- [ ] "
  view.dispatch({
    changes: {
      from: line.from,
      to: line.from,
      insert: checkboxText
    },
    selection: { anchor: from + checkboxText.length }
  })

  view.focus()
}

export const insertHorizontalRule = (view: EditorView | null) => {
  if (!view) return

  const { from } = view.state.selection.main
  const line = view.state.doc.lineAt(from)

  const hrText = "\n---\n"
  view.dispatch({
    changes: { from: line.to, to: line.to, insert: hrText },
    selection: { anchor: line.to + hrText.length }
  })

  view.focus()
}

export const insertCodeBlock = (view: EditorView | null) => {
  if (!view) return

  const { from, to, empty } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)

  if (empty) {
    const codeBlock = "```\ncode here\n```"
    view.dispatch({
      changes: { from, to, insert: codeBlock },
      selection: { anchor: from + 4, head: from + 13 }
    })
  } else {
    const codeBlock = "```\n" + selected + "\n```"
    view.dispatch({
      changes: { from, to, insert: codeBlock },
      selection: { anchor: from + 4 + selected.length + 1 }
    })
  }

  view.focus()
}
