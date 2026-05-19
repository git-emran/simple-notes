import { EditorView } from "@codemirror/view"

export const tripleBacktickExtension = EditorView.inputHandler.of((view, from, to, insert) => {
  if (insert !== "`") return false
  
  const state = view.state
  const line = state.doc.lineAt(from)
  const lineTextBefore = line.text.slice(0, from - line.from)
  
  if (lineTextBefore.trim() === "``" && (lineTextBefore.length === 2 || lineTextBefore.slice(0, -2).trim() === "")) {
    
    view.dispatch({
      changes: { 
        from: line.from + lineTextBefore.indexOf("``"), 
        to, 
        insert: "```\n\n```" 
      },
      selection: { anchor: line.from + lineTextBefore.indexOf("``") + 4 }
    })
    return true
  }
  
  return false
})
