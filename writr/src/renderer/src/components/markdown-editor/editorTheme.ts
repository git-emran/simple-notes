import { EditorView } from '@codemirror/view'
import { HighlightStyle } from '@codemirror/language'
import { tags } from '@lezer/highlight'

export const gutterTheme = EditorView.theme({
  '.cm-gutters': {
    backgroundColor: 'transparent',
    paddingRight: '4px',
    textAlign: 'right',
    borderRight: '1px solid rgba(128, 128, 128, 0.5)'
  }
})

export const markdownEditorTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '14px',
    lineHeight: '1.5'
  },
  '.cm-scroller': {
    fontFamily: 'JetBrains Mono',
    padding: '16px'
  },
  '.cm-focused': {
    outline: 'none'
  },
  '.cm-editor': {
    fontSize: '14px'
  },
  '.cm-content': {
    minHeight: '100%',
    padding: '2px'
  },
  '.cm-line': {
    paddingLeft: '0',
    paddingRight: '16px'
  },
  '.cm-foldGutter .cm-gutterElement': {
    fontSize: '14px'
  },

  '.cm-selectionBackground': {
    backgroundColor: 'rgba(20, 130, 246, 0.15)' // lighter
  },

  '.cm-line:has(.ͼ1)': {
    marginTop: '1.5em',
    marginBottom: '0.5em'
  },
  '.cm-line:has(.ͼ2)': {
    marginTop: '1.2em',
    marginBottom: '0.4em'
  },
  '.cm-line:has(.ͼ3)': {
    marginTop: '1em',
    marginBottom: '0.3em'
  }
})

export const markdownHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, color: '#2563eb', fontWeight: 'bold', fontSize: '1.5em' },
  { tag: tags.heading2, color: '#1d4ed8', fontWeight: 'bold', fontSize: '1.3em' },
  { tag: tags.heading3, color: '#1e40af', fontWeight: 'bold', fontSize: '1.2em' },
  { tag: tags.heading4, color: '#1e3a8a', fontWeight: 'bold', fontSize: '1.1em' },
  { tag: tags.heading5, color: '#1e3a8a', fontWeight: 'bold' },
  { tag: tags.heading6, color: '#1e3a8a', fontWeight: 'bold' },
  { tag: tags.strong, fontWeight: 'bold', color: '#374151' },
  { tag: tags.emphasis, fontStyle: 'italic', color: '#4b5563' },
  { tag: tags.strikethrough, textDecoration: 'line-through', color: '#6b7280' },
  {
    tag: tags.monospace,
    backgroundColor: '#9AC1DC',
    color: '#0C5A91',
    fontFamily: 'JetBrains Mono',
    padding: '2px 4px',
    borderRadius: '3px'
  },
  { tag: tags.keyword, color: '#B7211F', fontWeight: 'bold' },
  { tag: tags.string, color: '#059669', fontStyle: 'normal' },
  { tag: tags.comment, color: '#6b7280', fontStyle: 'italic' },
  { tag: tags.number, color: '#D33682' },
  { tag: tags.operator, color: '#6b7280' },
  { tag: tags.punctuation, color: '#374151' },
  { tag: tags.bracket, color: '#DC322F' },
  { tag: tags.variableName, color: '#596600' },
  { tag: tags.function(tags.variableName), color: '#2563eb', fontWeight: 'bold' },
  { tag: tags.definition(tags.variableName), color: '#CB4B16' },
  { tag: tags.typeName, color: '#0891b2', fontStyle: 'italic' },
  { tag: tags.className, color: '#1B6497', fontStyle: 'italic', fontWeight: 'bold' },
  { tag: tags.propertyName, color: '#D33682' },
  { tag: tags.literal, color: '#059669' },
  { tag: tags.bool, color: '#D33682' },
  { tag: tags.null, color: '#7c3aed' },
  { tag: tags.atom, color: '#dc2626' },
  { tag: tags.unit, color: '#dc2626' },
  { tag: tags.modifier, color: '#7c3aed' },
  { tag: tags.namespace, color: '#0891b2' },
  { tag: tags.escape, color: '#dc2626' },
  { tag: tags.special(tags.string), color: '#059669' },
  { tag: tags.regexp, color: '#dc2626' },
  { tag: tags.link, color: '#2563eb', textDecoration: 'underline' },
  { tag: tags.url, color: '#2563eb', textDecoration: 'underline' },
  { tag: tags.list, color: '#374151' },
  {
    tag: tags.quote,
    color: '#374151',
    fontStyle: 'italic',
    borderLeft: '4px solid #d1d5db',
    paddingLeft: '12px',
    padding: '4px',
    backgroundColor: 'rgba(288, 255, 0, 0.19)'
  },
  { tag: tags.meta, color: '#9ca3af', opacity: '0.7' },
  { tag: tags.contentSeparator, color: '#d1d5db' },
  { tag: tags.processingInstruction, color: '#7c3aed', fontStyle: 'italic' }
])

export const markdownHighlightStyleDark = HighlightStyle.define([
  { tag: tags.heading1, color: '#60a5fa', fontWeight: 'bold', fontSize: '1.5em' },
  { tag: tags.heading2, color: '#3b82f6', fontWeight: 'bold', fontSize: '1.3em' },
  { tag: tags.heading3, color: '#60a5fa', fontWeight: 'bold', fontSize: '1.2em' },
  { tag: tags.heading4, color: '#60a5fa', fontWeight: 'bold', fontSize: '1.1em' },
  { tag: tags.heading5, color: '#60a5fa', fontWeight: 'bold' },
  { tag: tags.heading6, color: '#60a5fa', fontWeight: 'bold' },
  { tag: tags.strong, fontWeight: 'bold', color: '#f9fafb' },
  { tag: tags.emphasis, fontStyle: 'italic', color: '#e5e7eb' },
  { tag: tags.strikethrough, textDecoration: 'line-through', color: '#9ca3af' },
  {
    tag: tags.monospace,
    backgroundColor: '#374151',
    color: '#fbbf24',
    fontFamily: 'JetBrains Mono',
    padding: '2px 4px',
    borderRadius: '3px'
  },
  { tag: tags.keyword, color: '#F6524F', fontWeight: 'bold' },
  { tag: tags.string, color: '#6ee7b7', fontStyle: 'normal' },
  { tag: tags.comment, color: '#ADB8B8', fontStyle: 'italic' },
  { tag: tags.number, color: '#fbbf24' },
  { tag: tags.operator, color: '#9EACAD' },
  { tag: tags.punctuation, color: '#d1d5db' },
  { tag: tags.bracket, color: '#d1d5db' },
  { tag: tags.variableName, color: '#9AB200' },
  { tag: tags.function(tags.variableName), color: '#60a5fa', fontWeight: 'bold' },
  { tag: tags.definition(tags.variableName), color: '#fbbf24' },
  { tag: tags.typeName, color: '#67e8f9' },
  { tag: tags.className, color: '#67e8f9' },
  { tag: tags.propertyName, color: '#FF9D9B' },
  { tag: tags.literal, color: '#6ee7b7' },
  { tag: tags.bool, color: '#c084fc' },
  { tag: tags.null, color: '#c084fc' },
  { tag: tags.atom, color: '#fbbf24' },
  { tag: tags.unit, color: '#fbbf24' },
  { tag: tags.modifier, color: '#c084fc' },
  { tag: tags.namespace, color: '#67e8f9' },
  { tag: tags.escape, color: '#f87171' },
  { tag: tags.special(tags.string), color: '#6ee7b7' },
  { tag: tags.regexp, color: '#f87171' },
  { tag: tags.link, color: '#60a5fa', textDecoration: 'underline' },
  { tag: tags.url, color: '#60a5fa', textDecoration: 'underline' },
  { tag: tags.list, color: '#60a5fa' },
  {
    tag: tags.quote,
    color: '#9ca3af',
    fontStyle: 'italic',
    borderLeft: '4px solid #4b5563',
    paddingLeft: '12px',
    padding: '4px',
    borderRadius: '3px',
    backgroundColor: 'rgba(288, 255, 0, 0.19)'
  },
  { tag: tags.meta, color: '#6b7280', opacity: '0.7' },
  { tag: tags.contentSeparator, color: '#000000' },
  { tag: tags.content, color: '#D6D6D6' },
  { tag: tags.processingInstruction, color: '#a78bfa', fontStyle: 'italic' }
])
