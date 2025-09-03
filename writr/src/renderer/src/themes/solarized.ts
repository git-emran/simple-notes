import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

// Solarized color palettes
const solarizedBase = {
  dark: {
    background: '#002b36', // base03
    foreground: '#839496', // base0
    cursor: '#dc322f', // red
    selection: 'rgba(101, 123, 131, 0.4)', // base1
    gutterBackground: '#073642', // base02
    gutterForeground: '#586e75' // base01
  },
  light: {
    background: '#fdf6e3', // base3
    foreground: '#657b83', // base00
    cursor: '#dc322f', // red
    selection: 'rgba(93, 107, 115, 0.4)', // base0
    gutterBackground: '#eee8d5', // base2
    gutterForeground: '#93a1a1' // base1
  }
}

// Define syntax highlighting for both themes
const solarizedSyntaxHighlighting = HighlightStyle.define([
  { tag: tags.heading1, color: '#b58900' },
  { tag: tags.heading2, color: '#cb4b16' },
  { tag: tags.emphasis, fontStyle: 'italic', color: '#b58900' },
  { tag: tags.strong, fontWeight: 'bold', color: '#dc322f' },
  { tag: tags.link, textDecoration: 'underline', color: '#268bd2' },
  { tag: tags.quote, color: '#859900', fontStyle: 'italic' },
  { tag: tags.url, color: '#2aa198' },
  { tag: tags.blockComment, color: '#6c71c4' }
])

// Solarized Light theme as an array of Extensions
export const solarizedLight = [
  EditorView.theme(
    {
      '&': {
        backgroundColor: solarizedBase.light.background,
        color: solarizedBase.light.foreground
      },
      '.cm-content': { caretColor: solarizedBase.light.cursor },
      '.cm-cursor, .cm-dropcursor': { borderLeftColor: solarizedBase.light.cursor },
      '.cm-gutters': {
        backgroundColor: solarizedBase.light.gutterBackground,
        color: solarizedBase.light.gutterForeground
      },
      '.cm-selectionBackground': { backgroundColor: solarizedBase.light.selection },
      '&.cm-focused .cm-selectionBackground': { backgroundColor: solarizedBase.light.selection }
    },
    { dark: false }
  ),
  syntaxHighlighting(solarizedSyntaxHighlighting)
]

// Solarized Dark theme as an array of Extensions
export const solarizedDark = [
  EditorView.theme(
    {
      '&': {
        backgroundColor: solarizedBase.dark.background,
        color: solarizedBase.dark.foreground
      },
      '.cm-content': { caretColor: solarizedBase.dark.cursor },
      '.cm-cursor, .cm-dropcursor': { borderLeftColor: solarizedBase.dark.cursor },
      '.cm-gutters': {
        backgroundColor: solarizedBase.dark.gutterBackground,
        color: solarizedBase.dark.gutterForeground
      },
      '.cm-selectionBackground': { backgroundColor: solarizedBase.dark.selection },
      '&.cm-focused .cm-selectionBackground': { backgroundColor: solarizedBase.dark.selection }
    },
    { dark: true }
  ),
  syntaxHighlighting(solarizedSyntaxHighlighting)
]
