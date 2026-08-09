import { keymap } from '@codemirror/view'

/**
 * When the cursor is at the END of a line that starts with ``` (optionally
 * preceded by spaces) and the user presses Enter, expand the fence to:
 *
 *   ```lang
 *   <blank line>  ← cursor placed here
 *   ```
 *
 * This is the fallback for when the user dismissed the language picker or
 * typed ``` and pressed Enter without choosing a language.
 *
 * Guard conditions (all O(1) / O(small constant)):
 *  - Cursor must be at the end of the line.
 *  - The NEXT line must NOT already start with ``` (already expanded).
 *  - We do a small backwards scan (max 200 lines) to make sure we're
 *    opening a NEW fence, not closing one already open.
 */
const tripleBacktickEnterHandler = keymap.of([
  {
    key: 'Enter',
    run: (view) => {
      const { state } = view
      const pos = state.selection.main.head
      const line = state.doc.lineAt(pos)
      const lineText = line.text.trimStart()

      // Must start with ``` on this line
      if (!lineText.startsWith('```')) return false

      // Cursor must be at the very end of the line
      if (pos !== line.to) return false

      // Next line must not already start with ``` (fence already expanded)
      if (line.number < state.doc.lines) {
        const nextLine = state.doc.line(line.number + 1)
        if (nextLine.text.trimStart().startsWith('```')) return false
      }

      // Fast backwards scan: count unmatched ``` lines above (max 200 lines)
      // to detect if we're INSIDE an existing open fence.
      // If the count of preceding fence-openers (without a matching closer) is odd,
      // we are inside a fence and should NOT expand.
      let openFenceCount = 0
      const scanFrom = Math.max(1, line.number - 200)
      for (let i = line.number - 1; i >= scanFrom; i--) {
        const l = state.doc.line(i)
        if (l.text.trimStart().startsWith('```')) {
          openFenceCount++
        }
      }
      // Odd count means we're inside an open fence — don't expand
      if (openFenceCount % 2 === 1) return false

      // Insert newline + blank inner line + closing fence
      view.dispatch({
        changes: { from: pos, to: pos, insert: '\n\n```' },
        selection: { anchor: pos + 1 } // cursor on the blank inner line
      })
      return true
    }
  }
])

export const tripleBacktickExtension = [tripleBacktickEnterHandler]
