import { StateEffect, StateField } from '@codemirror/state'
import {
  CompletionContext,
  CompletionResult,
  Completion,
  CompletionSection
} from '@codemirror/autocomplete'
import type { CommandPaletteItem } from './CommandPaletteModal'

/**
 * StateEffect used to update the slash command items stored in the editor state.
 */
export const setSlashCommandItems = StateEffect.define<CommandPaletteItem[]>()

/**
 * StateField that holds the current list of slash command items.
 * Updated externally via setSlashCommandItems effect.
 */
export const slashCommandItemsField = StateField.define<CommandPaletteItem[]>({
  create: () => [],
  update(items, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setSlashCommandItems)) {
        return effect.value
      }
    }
    return items
  }
})

/** Section definitions with custom header renderers */
const sectionBasicFormatting: CompletionSection = {
  name: 'Basic Formatting',
  header: () => {
    const el = document.createElement('div')
    el.className = 'cm-slash-section-header'
    el.textContent = 'Basic Formatting'
    return el
  }
}

const sectionNewTab: CompletionSection = {
  name: 'New Tab',
  rank: 99, // render after Basic Formatting
  header: () => {
    const el = document.createElement('div')
    el.className = 'cm-slash-section-header'
    el.textContent = 'New Tab'
    return el
  }
}

const sectionGithubAlerts: CompletionSection = {
  name: 'GitHub Alerts',
  rank: 50,
  header: () => {
    const el = document.createElement('div')
    el.className = 'cm-slash-section-header'
    el.textContent = 'GitHub Alerts'
    return el
  }
}

/**
 * The completion source. Reads items from the StateField.
 */
export function slashCommandSource(context: CompletionContext): CompletionResult | null {
  // Match "/" optionally followed by non-newline characters
  const match = context.matchBefore(/\/[^\n]*/)
  if (!match) return null

  // Only trigger at the start of a line or after whitespace
  if (match.from > 0) {
    const charBefore = context.state.sliceDoc(match.from - 1, match.from)
    if (charBefore !== '\n' && !/\s/.test(charBefore)) return null
  }

  const query = context.state.sliceDoc(match.from + 1, match.to).toLowerCase()
  const slashPos = match.from

  const items = context.state.field(slashCommandItemsField, false) ?? []

  const options: Completion[] = items
    .filter(item => {
      if (!query) return true
      const label = item.label.toLowerCase()
      const keywords = (item.keywords ?? []).join(' ').toLowerCase()
      return label.includes(query) || keywords.includes(query)
    })
    .map(item => {
      const isNewTab = item.id.startsWith('panel-')
      const isAlert = item.id.startsWith('alert-')
      const section = isNewTab
        ? sectionNewTab
        : isAlert
          ? sectionGithubAlerts
          : sectionBasicFormatting
      return {
        label: item.label,
        detail: item.shortcut ?? undefined,
        section,
        apply: (view, _completion, _from, to) => {
          // Delete slash + any typed text
          view.dispatch({
            changes: { from: slashPos, to, insert: '' }
          })
          item.run()
          view.focus()
        }
      }
    })

  if (options.length === 0) return null

  return {
    from: match.from + 1, // so CodeMirror knows the filter starts after "/"
    filter: false,        // we do our own filtering above
    options,
    // Use a regex so CodeMirror can check validity without re-querying the source.
    // This matches any non-newline characters typed after the "/" trigger.
    validFor: /^[^\n]*$/
  }
}

/**
 * The state field needed for slash command completion.
 * The autocompletion extension itself is registered in useEditorLifecycle
 * together with the code-block language source so there is only one
 * autocompletion instance active at a time.
 */
export const slashCommandExtension = [
  slashCommandItemsField
]
