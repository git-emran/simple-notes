import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

// Gruvbox palette (neovim gruvbox-material inspired)
const gruvbox = {
  dark: {
    bg:          '#282828',
    bg1:         '#3c3836',
    bg2:         '#504945',
    fg:          '#ebdbb2',
    fgDim:       '#a89984',
    red:         '#fb4934',
    green:       '#b8bb26',
    yellow:      '#fabd2f',
    blue:        '#83a598',
    purple:      '#d3869b',
    aqua:        '#8ec07c',
    orange:      '#fe8019',
    gray:        '#928374',
    selection:   'rgba(80, 73, 69, 0.6)',
  },
  light: {
    bg:          '#fbf1c7',
    bg1:         '#ebdbb2',
    bg2:         '#d5c4a1',
    fg:          '#3c3836',
    fgDim:       '#7c6f64',
    red:         '#cc241d',
    green:       '#98971a',
    yellow:      '#d79921',
    blue:        '#458588',
    purple:      '#b16286',
    aqua:        '#689d6a',
    orange:      '#d65d0e',
    gray:        '#928374',
    selection:   'rgba(213, 196, 161, 0.7)',
  }
}

// Shared syntax highlighting (tags mapped to palette keys)
const gruvboxDarkSyntax = HighlightStyle.define([
  { tag: tags.heading1, color: gruvbox.dark.yellow, fontWeight: '800', fontSize: '1.62em' },
  { tag: tags.heading2, color: gruvbox.dark.yellow, fontWeight: '760', fontSize: '1.38em' },
  { tag: tags.heading3, color: gruvbox.dark.yellow, fontWeight: '720', fontSize: '1.22em' },
  { tag: tags.heading4, color: gruvbox.dark.yellow, fontWeight: '700', fontSize: '1.1em' },
  { tag: tags.heading5, color: gruvbox.dark.yellow, fontWeight: '680' },
  { tag: tags.heading6, color: gruvbox.dark.fgDim,  fontWeight: '680' },
  { tag: tags.strong,      fontWeight: '700', color: gruvbox.dark.orange },
  { tag: tags.emphasis,    fontStyle: 'italic', color: gruvbox.dark.aqua },
  { tag: tags.strikethrough, textDecoration: 'line-through', color: gruvbox.dark.gray },
  { tag: tags.link,        color: gruvbox.dark.blue, textDecoration: 'underline' },
  { tag: tags.url,         color: gruvbox.dark.blue, textDecoration: 'underline' },
  { tag: tags.quote,       color: gruvbox.dark.aqua, fontStyle: 'italic' },
  { tag: tags.keyword,     color: gruvbox.dark.red,    fontWeight: 'bold' },
  { tag: tags.string,      color: gruvbox.dark.green },
  { tag: tags.number,      color: gruvbox.dark.purple },
  { tag: tags.bool,        color: gruvbox.dark.purple },
  { tag: tags.null,        color: gruvbox.dark.purple },
  { tag: tags.comment,     color: gruvbox.dark.gray, fontStyle: 'italic' },
  { tag: tags.operator,    color: gruvbox.dark.fgDim },
  { tag: tags.punctuation, color: gruvbox.dark.fgDim },
  { tag: tags.bracket,     color: gruvbox.dark.fg },
  { tag: tags.variableName,color: gruvbox.dark.fg },
  { tag: tags.function(tags.variableName), color: gruvbox.dark.green, fontWeight: 'bold' },
  { tag: tags.definition(tags.variableName), color: gruvbox.dark.yellow },
  { tag: tags.typeName,    color: gruvbox.dark.yellow, fontStyle: 'italic' },
  { tag: tags.className,   color: gruvbox.dark.yellow, fontStyle: 'italic' },
  { tag: tags.propertyName,color: gruvbox.dark.aqua },
  { tag: tags.atom,        color: gruvbox.dark.purple },
  { tag: tags.meta,        color: gruvbox.dark.gray },
  { tag: tags.regexp,      color: gruvbox.dark.aqua },
  { tag: tags.escape,      color: gruvbox.dark.orange },
])

const gruvboxLightSyntax = HighlightStyle.define([
  { tag: tags.heading1, color: gruvbox.light.yellow, fontWeight: '800', fontSize: '1.62em' },
  { tag: tags.heading2, color: gruvbox.light.yellow, fontWeight: '760', fontSize: '1.38em' },
  { tag: tags.heading3, color: gruvbox.light.yellow, fontWeight: '720', fontSize: '1.22em' },
  { tag: tags.heading4, color: gruvbox.light.yellow, fontWeight: '700', fontSize: '1.1em' },
  { tag: tags.heading5, color: gruvbox.light.yellow, fontWeight: '680' },
  { tag: tags.heading6, color: gruvbox.light.fgDim,  fontWeight: '680' },
  { tag: tags.strong,      fontWeight: '700', color: gruvbox.light.orange },
  { tag: tags.emphasis,    fontStyle: 'italic', color: gruvbox.light.aqua },
  { tag: tags.strikethrough, textDecoration: 'line-through', color: gruvbox.light.gray },
  { tag: tags.link,        color: gruvbox.light.blue, textDecoration: 'underline' },
  { tag: tags.url,         color: gruvbox.light.blue, textDecoration: 'underline' },
  { tag: tags.quote,       color: gruvbox.light.aqua, fontStyle: 'italic' },
  { tag: tags.keyword,     color: gruvbox.light.red,    fontWeight: 'bold' },
  { tag: tags.string,      color: gruvbox.light.green },
  { tag: tags.number,      color: gruvbox.light.purple },
  { tag: tags.bool,        color: gruvbox.light.purple },
  { tag: tags.null,        color: gruvbox.light.purple },
  { tag: tags.comment,     color: gruvbox.light.gray, fontStyle: 'italic' },
  { tag: tags.operator,    color: gruvbox.light.fgDim },
  { tag: tags.punctuation, color: gruvbox.light.fgDim },
  { tag: tags.bracket,     color: gruvbox.light.fg },
  { tag: tags.variableName,color: gruvbox.light.fg },
  { tag: tags.function(tags.variableName), color: gruvbox.light.green, fontWeight: 'bold' },
  { tag: tags.definition(tags.variableName), color: gruvbox.light.yellow },
  { tag: tags.typeName,    color: gruvbox.light.yellow, fontStyle: 'italic' },
  { tag: tags.className,   color: gruvbox.light.yellow, fontStyle: 'italic' },
  { tag: tags.propertyName,color: gruvbox.light.aqua },
  { tag: tags.atom,        color: gruvbox.light.purple },
  { tag: tags.meta,        color: gruvbox.light.gray },
  { tag: tags.regexp,      color: gruvbox.light.aqua },
  { tag: tags.escape,      color: gruvbox.light.orange },
])

export const gruvboxDark = [
  EditorView.theme(
    {
      '&': {
        backgroundColor: gruvbox.dark.bg,
        color: gruvbox.dark.fg,
      },
      '.cm-content': { caretColor: gruvbox.dark.yellow },
      '.cm-cursor, .cm-dropcursor': { borderLeftColor: gruvbox.dark.yellow },
      '.cm-gutters': {
        backgroundColor: gruvbox.dark.bg1,
        color: gruvbox.dark.gray,
        borderRight: `1px solid ${gruvbox.dark.bg2}`,
      },
      '.cm-selectionBackground': { backgroundColor: gruvbox.dark.selection },
      '&.cm-focused .cm-selectionBackground': { backgroundColor: gruvbox.dark.selection },
    },
    { dark: true }
  ),
  syntaxHighlighting(gruvboxDarkSyntax),
]

export const gruvboxLight = [
  EditorView.theme(
    {
      '&': {
        backgroundColor: gruvbox.light.bg,
        color: gruvbox.light.fg,
      },
      '.cm-content': { caretColor: gruvbox.light.orange },
      '.cm-cursor, .cm-dropcursor': { borderLeftColor: gruvbox.light.orange },
      '.cm-gutters': {
        backgroundColor: gruvbox.light.bg1,
        color: gruvbox.light.gray,
        borderRight: `1px solid ${gruvbox.light.bg2}`,
      },
      '.cm-selectionBackground': { backgroundColor: gruvbox.light.selection },
      '&.cm-focused .cm-selectionBackground': { backgroundColor: gruvbox.light.selection },
    },
    { dark: false }
  ),
  syntaxHighlighting(gruvboxLightSyntax),
]
