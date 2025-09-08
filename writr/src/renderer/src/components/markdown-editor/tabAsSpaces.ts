import { keymap } from '@codemirror/view'
import { Extension } from '@codemirror/state'
import { completionStatus, moveCompletionSelection } from '@codemirror/autocomplete'

export const tabAsSpaces: Extension = keymap.of([
  {
    key: 'Tab',
    preventDefault: true,
    run: (view) => {
      // Check if autocomplete is active
      const status = completionStatus(view.state)

      if (status === 'active') {
        // If autocomplete is open, navigate to next completion
        return moveCompletionSelection(true)(view)
      }

      // Otherwise, insert spaces as normal
      const { state } = view
      const { from, to } = state.selection.main
      view.dispatch({
        changes: { from, to, insert: '  ' }, // 2 spaces
        selection: { anchor: from + 2 }
      })
      return true
    }
  },
  {
    key: 'Shift-Tab',
    preventDefault: true,
    run: (view) => {
      // Check if autocomplete is active
      const status = completionStatus(view.state)

      if (status === 'active') {
        // If autocomplete is open, navigate to previous completion
        return moveCompletionSelection(false)(view)
      }

      // Could add indent/dedent logic here if needed
      return false
    }
  }
])
