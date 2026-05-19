import { keymap } from '@codemirror/view'
import { Extension } from '@codemirror/state'
import { completionStatus, moveCompletionSelection } from '@codemirror/autocomplete'

export const tabAsSpaces = (indentUnit = 2): Extension => {
  const unit = Math.max(1, Math.min(8, Math.floor(indentUnit)))
  const spaces = ' '.repeat(unit)

  return keymap.of([
    {
      key: 'Tab',
      preventDefault: true,
      run: (view) => {
        const status = completionStatus(view.state)

        if (status === 'active') {
          return moveCompletionSelection(true)(view)
        }

        const { state } = view
        const { from, to } = state.selection.main
        view.dispatch({
          changes: { from, to, insert: spaces },
          selection: { anchor: from + spaces.length },
        })
        return true
      },
    },
    {
      key: 'Shift-Tab',
      preventDefault: true,
      run: (view) => {
        const status = completionStatus(view.state)

        if (status === 'active') {
          return moveCompletionSelection(false)(view)
        }

        return false
      },
    },
  ])
}
