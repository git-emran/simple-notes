import { CompletionContext, CompletionResult, Completion, CompletionSection } from '@codemirror/autocomplete'
import { languages as cmLanguages } from '@codemirror/language-data'

/**
 * Human-readable display names for languages we have explicit support for.
 * Keys are lowercase identifiers / aliases; values are the display name shown
 * on the right-hand side of the completion item (the "detail" column).
 */
const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  javascript: 'JavaScript',
  js: 'JavaScript',
  jsx: 'JavaScript',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  tsx: 'TypeScript',
  python: 'Python',
  py: 'Python',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  sass: 'SCSS',
  json: 'JSON',
  xml: 'XML',
  sql: 'SQL',
  php: 'PHP',
  java: 'Java',
  cpp: 'C++',
  'c++': 'C++',
  c: 'C',
  rust: 'Rust',
  rs: 'Rust',
  go: 'Go',
  golang: 'Go',
  bash: 'Shell',
  sh: 'Shell',
  shell: 'Shell',
  zsh: 'Shell',
  ruby: 'Ruby',
  rb: 'Ruby',
  swift: 'Swift',
  kotlin: 'Kotlin',
  scala: 'Scala',
  dart: 'Dart',
  r: 'R',
  matlab: 'MATLAB',
  perl: 'Perl',
  lua: 'Lua',
  haskell: 'Haskell',
  hs: 'Haskell',
  elixir: 'Elixir',
  erlang: 'Erlang',
  clojure: 'Clojure',
  ocaml: 'OCaml',
  fsharp: 'F#',
  vue: 'Vue',
  svelte: 'Svelte',
  yaml: 'YAML',
  yml: 'YAML',
  toml: 'TOML',
  dockerfile: 'Dockerfile',
  makefile: 'Makefile',
  markdown: 'Markdown',
  md: 'Markdown',
  graphql: 'GraphQL',
  diff: 'Diff',
  tex: 'LaTeX',
  latex: 'LaTeX',
  nginx: 'Nginx',
  apache: 'Apache',
  powershell: 'PowerShell',
  ps1: 'PowerShell',
  groovy: 'Groovy',
  mermaid: 'Mermaid',
}

/** Section header shown in the autocomplete dropdown */
const sectionCodeLanguage: CompletionSection = {
  name: 'Code Language',
  header: () => {
    const el = document.createElement('div')
    el.className = 'cm-slash-section-header'
    el.textContent = 'Code Language'
    return el
  }
}

/**
 * Build the list of language completion items once, sorted so popular
 * languages appear first.
 */
function buildLanguageOptions(): Completion[] {
  const seen = new Set<string>()
  const items: Completion[] = []

  // Priority languages first (top of the list when no query is typed)
  const priority = [
    'javascript', 'typescript', 'python', 'bash', 'json', 'html', 'css',
    'cpp', 'rust', 'go', 'java', 'php', 'sql', 'yaml', 'markdown', 'mermaid',
  ]

  for (const id of priority) {
    if (seen.has(id)) continue
    seen.add(id)
    const display = LANGUAGE_DISPLAY_NAMES[id] ?? id
    items.push({
      label: id,
      detail: display,
      section: sectionCodeLanguage,
      boost: 50 // show at the top
    })
  }

  // Remaining known languages from our explicit map
  for (const [id, display] of Object.entries(LANGUAGE_DISPLAY_NAMES)) {
    if (seen.has(id)) continue
    seen.add(id)
    items.push({
      label: id,
      detail: display,
      section: sectionCodeLanguage
    })
  }

  // Add any extra languages from @codemirror/language-data we haven't covered yet
  for (const lang of cmLanguages) {
    const id = lang.name.toLowerCase()
    if (seen.has(id)) continue
    seen.add(id)
    items.push({
      label: id,
      detail: lang.name,
      section: sectionCodeLanguage
    })
    // Also register aliases
    for (const alias of lang.alias ?? []) {
      const aliasId = alias.toLowerCase()
      if (seen.has(aliasId)) continue
      seen.add(aliasId)
      items.push({
        label: aliasId,
        detail: lang.name,
        section: sectionCodeLanguage
      })
    }
  }

  return items
}

const languageOptions = buildLanguageOptions()

function hasClosingFenceBelow(context: CompletionContext, lineNumber: number): boolean {
  const doc = context.state.doc

  for (let i = lineNumber + 1; i <= doc.lines; i++) {
    if (doc.line(i).text.trimStart().startsWith('```')) return true
  }

  return false
}

/**
 * CodeMirror completion source for code block language suggestions.
 *
 * Triggers when the user types ``` (optionally followed by characters) at the
 * very start of a line (or after only whitespace). Shows a filterable list of
 * language identifiers styled like the slash command menu.
 */
export function codeBlockLanguageSource(context: CompletionContext): CompletionResult | null {
  // Match ``` optionally followed by language identifier characters.
  const match = context.matchBefore(/```[a-zA-Z0-9_+\-.]*/)
  if (!match) return null

  // Only trigger when ``` is at the start of the line (optionally preceded by spaces)
  const line = context.state.doc.lineAt(match.from)
  const lineStart = line.from
  const beforeBackticks = context.state.sliceDoc(lineStart, match.from).trim()
  if (beforeBackticks !== '') return null

  const typed = context.state.sliceDoc(match.from, match.to) // e.g. "```py"
  const query = typed.slice(3).toLowerCase() // text after the three backticks
  const existingBlock = hasClosingFenceBelow(context, line.number)
  const infoMatch = line.text.match(/^(\s*`{3,})(\s*)([^\s`]*)?(.*)$/)
  const languageFrom = lineStart + (infoMatch?.[1].length ?? 3) + (infoMatch?.[2].length ?? 0)
  const currentLanguage = infoMatch?.[3] ?? ''
  const languageTo = languageFrom + currentLanguage.length

  const filtered = query
    ? languageOptions.filter(
        (opt) =>
          opt.label.toLowerCase().startsWith(query) ||
          opt.label.toLowerCase().includes(query) ||
          (opt.detail ?? '').toLowerCase().includes(query)
      )
    : languageOptions

  if (filtered.length === 0) return null

  return {
    // The replaceable span starts right after ``` so CM inserts only the language id
    from: match.from + 3,
    filter: false, // we already filter ourselves
    options: filtered.map((opt) => ({
      ...opt,
      apply: (view, _completion, _from, _to) => {
        if (existingBlock) {
          const cursorPos = languageFrom + opt.label.length

          view.dispatch({
            changes: { from: languageFrom, to: languageTo, insert: opt.label },
            selection: { anchor: cursorPos }
          })
          view.focus()
          return
        }

        const currentLine = view.state.doc.lineAt(match.from)
        const currentLineStart = currentLine.from
        const currentLineEnd = currentLine.to
        const insert = `\`\`\`${opt.label}\n\n\`\`\``
        const cursorPos = currentLineStart + 3 + opt.label.length + 1 // after "```lang\n"

        view.dispatch({
          changes: { from: currentLineStart, to: currentLineEnd, insert },
          selection: { anchor: cursorPos }
        })
        view.focus()
      }
    }))
  }
}
