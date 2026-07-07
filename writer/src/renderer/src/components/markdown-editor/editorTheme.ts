import { EditorView } from '@codemirror/view'
import { HighlightStyle } from '@codemirror/language'
import { tags } from '@lezer/highlight'

const editorFontFamilyVar = 'var(--writr-editor-font-family, "JetBrains Mono", monospace)'
const editorFontSizeVar = 'var(--writr-editor-font-size, 13px)'
const editorReadingWidthVar = 'var(--writr-editor-reading-width, 880px)'

export const gutterTheme = EditorView.theme({
  '.cm-gutters': {
    paddingRight: '6px',
    textAlign: 'right',
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  }
})

export const getEditorTheme = (isDark: boolean) =>
  EditorView.theme({
    '&': {
      height: '100%',
      fontSize: editorFontSizeVar,
      lineHeight: '1.68',
      backgroundColor: isDark ? 'var(--obsidian-base)' : 'var(--obsidian-workspace)',
      color: 'var(--obsidian-text)',
      letterSpacing: '0'
    },
    '.cm-scroller': {
      fontFamily: editorFontFamilyVar,
      padding: '0',
      backgroundColor: isDark ? 'var(--obsidian-base)' : 'var(--obsidian-workspace)'
    },
    '.cm-focused': {
      outline: 'none'
    },
    '.cm-content': {
      boxSizing: 'border-box',
      width: '100%',
      maxWidth: editorReadingWidthVar,
      margin: '0 auto',
      minHeight: '100%',
      padding: '32px 32px 42vh'
    },
    '.cm-line': {
      paddingLeft: '0',
      paddingRight: '0',
      letterSpacing: '0',
      overflowWrap: 'break-word'
    },
    '.cm-gutters': {
      backgroundColor: isDark ? 'var(--obsidian-base)' : 'var(--obsidian-workspace)',
      paddingLeft: '0',
      borderRight: isDark ? '1px solid rgba(255, 255, 255, 0.18)' : '1px solid rgba(0, 0, 0, 0.16)'
    },
    '.cm-foldGutter .cm-gutterElement': {
      fontSize: editorFontSizeVar
    },

    '.cm-selectionBackground': {
      backgroundColor: isDark ? 'rgba(124, 158, 251, 0.24)' : 'rgba(37, 99, 235, 0.2)'
    },
    '.cm-searchMatch': {
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.34)' : 'rgba(250, 204, 21, 0.42)',
      outline: isDark ? '1px solid rgba(245, 158, 11, 0.38)' : '1px solid rgba(217, 119, 6, 0.22)',
      borderRadius: '2px'
    },
    '.cm-searchMatch-selected': {
      backgroundColor: isDark ? 'rgba(124, 158, 251, 0.52)' : 'rgba(37, 99, 235, 0.32)',
      outline: isDark ? '1px solid rgba(147, 197, 253, 0.7)' : '1px solid rgba(37, 99, 235, 0.55)'
    },
    '.cm-selectionMatch': {
      backgroundColor: isDark ? 'rgba(124, 158, 251, 0.18)' : 'rgba(37, 99, 235, 0.12)',
      borderRadius: '2px'
    },
    '.cm-panels': {
      zIndex: '20',
      backgroundColor: isDark ? 'var(--obsidian-pane)' : 'var(--obsidian-workspace)',
      color: 'var(--obsidian-text)',
      borderColor: 'var(--obsidian-border)'
    },
    '.cm-panels-top': {
      borderBottom: '1px solid var(--obsidian-border)'
    },
    '.cm-panel.cm-search': {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 12px',
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      fontSize: '12px',
      lineHeight: '1.4'
    },
    '.cm-panel.cm-search input': {
      minWidth: '120px',
      maxWidth: '220px',
      border: '1px solid var(--obsidian-border)',
      borderRadius: '4px',
      backgroundColor: 'var(--obsidian-base)',
      color: 'var(--obsidian-text)',
      padding: '4px 7px',
      outline: 'none'
    },
    '.cm-panel.cm-search input:focus': {
      borderColor: 'var(--obsidian-accent)',
      boxShadow: '0 0 0 2px var(--obsidian-accent-dim)'
    },
    '.cm-panel.cm-search button': {
      border: '1px solid var(--obsidian-border)',
      borderRadius: '4px',
      backgroundColor: 'var(--obsidian-pane)',
      color: 'var(--obsidian-text)',
      padding: '4px 8px',
      fontSize: '11px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'background-color 120ms ease, border-color 120ms ease, color 120ms ease'
    },
    '.cm-panel.cm-search button:hover': {
      backgroundColor: 'var(--obsidian-hover)',
      borderColor: 'var(--obsidian-accent)',
      color: 'var(--obsidian-text)'
    },
    '.cm-panel.cm-search button:focus-visible': {
      borderColor: 'var(--obsidian-accent)',
      boxShadow: '0 0 0 2px var(--obsidian-accent-dim)',
      outline: 'none'
    },
    '.cm-panel.cm-search button:active': {
      backgroundColor: 'var(--obsidian-accent-dim)',
      borderColor: 'var(--obsidian-accent)'
    },
    '.cm-panel.cm-search button:disabled': {
      backgroundColor: 'var(--obsidian-hover-soft)',
      borderColor: 'var(--obsidian-border-soft)',
      color: 'var(--obsidian-text-muted)',
      cursor: 'default',
      opacity: '0.72'
    },
    '.cm-panel.cm-search button:disabled:hover': {
      backgroundColor: 'var(--obsidian-hover-soft)',
      borderColor: 'var(--obsidian-border-soft)',
      color: 'var(--obsidian-text-muted)'
    },
    '.cm-panel.cm-search button[name="close"]': {
      marginLeft: 'auto',
      paddingInline: '7px'
    },
    '.cm-panel.cm-search label': {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      color: 'var(--obsidian-text-muted)',
      whiteSpace: 'nowrap'
    },
    '.cm-panel.cm-search input[type="checkbox"]': {
      minWidth: 'auto',
      width: '13px',
      height: '13px',
      accentColor: 'var(--obsidian-accent)',
      boxShadow: 'none'
    },
    '.cm-panel.cm-search .cm-textfield': {
      fontFamily: editorFontFamilyVar
    },
    '.cm-panel.cm-search .cm-button': {
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    },

    /* Autocomplete Tooltip Styles */
    '.cm-tooltip': {
      backgroundColor: isDark ? '#252833' : '#ffffff',
      border: isDark ? '1px solid #333744' : '1px solid #e5e7eb',
      borderRadius: '4px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    },
    '.cm-tooltip.cm-tooltip-autocomplete > ul': {
      fontFamily: editorFontFamilyVar,
      fontSize: '12px',
      backgroundColor: isDark ? '#252833' : '#ffffff',
      color: isDark ? '#d4d7df' : '#000000'
    },
    '.cm-tooltip-autocomplete ul li': {
      padding: '4px 8px',
      color: isDark ? '#d4d7df' : '#000000'
    },
    '.cm-tooltip-autocomplete ul li[aria-selected]': {
      backgroundColor: isDark ? 'rgba(124, 158, 251, 0.16)' : '#eff6ff',
      color: isDark ? '#ffffff' : '#1d4ed8'
    },

    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: isDark ? '#9fb7ff' : '#000000',
      borderLeftWidth: '2px'
    },
    '.cm-cursor-primary': {
      borderLeftColor: isDark ? '#9fb7ff' : '#000000'
    },
    '.cm-fat-cursor': {
      backgroundColor: isDark
        ? 'rgba(125, 211, 252, 0.6) !important'
        : 'rgba(14, 165, 233, 0.6) !important',
      mixBlendMode: 'difference'
    },
    '&:not(.cm-focused) .cm-fat-cursor': {
      background: 'none !important',
      outline: `solid 1px ${isDark ? 'rgba(125, 211, 252, 0.6)' : 'rgba(14, 165, 233, 0.6)'} !important`
    },

    '.cm-line:has(.ͼ1)': {
      marginTop: '1.9em',
      marginBottom: '0.72em',
      lineHeight: '1.18'
    },
    '.cm-line:has(.ͼ2)': {
      marginTop: '1.65em',
      marginBottom: '0.58em',
      lineHeight: '1.22'
    },
    '.cm-line:has(.ͼ3)': {
      marginTop: '1.42em',
      marginBottom: '0.48em',
      lineHeight: '1.26'
    },
    '.cm-line:has(.ͼ4)': {
      marginTop: '1.2em',
      marginBottom: '0.38em',
      lineHeight: '1.32'
    },
    '.cm-line:has(.ͼ5), .cm-line:has(.ͼ6)': {
      marginTop: '1em',
      marginBottom: '0.32em',
      lineHeight: '1.38'
    },
    '.cm-content > .cm-line:first-child': {
      marginTop: '0.2em'
    },
    '.cm-quote-line': {
      color: 'var(--obsidian-quote-text)',
      fontStyle: 'italic',
      borderLeft: '3px solid var(--obsidian-quote-border)',
      paddingLeft: '12px'
    },
    '.cm-quote-line, .cm-quote-line span': {
      color: 'var(--obsidian-quote-text) !important',
      fontStyle: 'italic'
    },
    /* Hide/dim backtick markers for inline code in the editor */
    '.cm-code-punctuation': {
      opacity: '0.3',
      fontSize: '0.9em'
    },
    '.cm-table-line': {
      fontFamily: editorFontFamilyVar,
      whiteSpace: 'pre',
      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.12)' : 'rgba(128, 128, 128, 0.03)',
      borderLeft: isDark ? '1px solid #333744' : '1px solid rgba(128, 128, 128, 0.2)',
      borderRight: isDark ? '1px solid #333744' : '1px solid rgba(128, 128, 128, 0.2)',
      paddingTop: '4px',
      paddingBottom: '4px',
      overflowX: 'auto'
    },
    '.cm-table-header': {
      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(128, 128, 128, 0.1)',
      fontWeight: 'bold',
      borderTop: isDark ? '1px solid #333744' : '1px solid rgba(128, 128, 128, 0.3)',
      borderBottom: isDark ? '1px solid #333744' : '1px solid rgba(128, 128, 128, 0.3)',
      overflowX: 'auto'
    },
    '.cm-table-hidden-pipe': {
      display: 'none'
    },
    '.cm-table-sep-line': {
      display: 'none'
    },
    '.cm-focused-table-row': {
      backgroundColor: 'rgba(124, 158, 251, 0.08)',
      outline: '1px solid rgba(124, 158, 251, 0.24)',
      overflow: 'visible'
    },
    '.cm-codeblock-line': {
      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.09)' : 'rgba(0, 0, 0, 0.0175)',
      borderLeft: '1px solid var(--obsidian-border)',
      borderRight: '1px solid var(--obsidian-border)',
      lineHeight: '1.62',
      paddingLeft: '2px',
      paddingRight: '2px'
    },
    '.cm-codeblock-line-first': {
      borderTop: '1px solid var(--obsidian-border)',
      borderTopLeftRadius: '4px',
      borderTopRightRadius: '4px',
      paddingTop: '2px'
    },
    '.cm-codeblock-line-last': {
      borderBottom: '1px solid var(--obsidian-border)',
      borderBottomLeftRadius: '4px',
      borderBottomRightRadius: '4px',
      paddingBottom: '2px'
    }
  })

export const markdownHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, color: 'var(--obsidian-accent)', fontWeight: '800', fontSize: '1.62em' },
  { tag: tags.heading2, color: 'var(--obsidian-accent)', fontWeight: '760', fontSize: '1.38em' },
  { tag: tags.heading3, color: 'var(--obsidian-accent)', fontWeight: '720', fontSize: '1.22em' },
  { tag: tags.heading4, color: 'var(--obsidian-accent)', fontWeight: '700', fontSize: '1.1em' },
  { tag: tags.heading5, color: 'var(--obsidian-accent)', fontWeight: '680' },
  { tag: tags.heading6, color: 'var(--obsidian-text-muted)', fontWeight: '680' },
  { tag: tags.strong, fontWeight: '700', color: 'var(--obsidian-text)' },
  { tag: tags.emphasis, fontStyle: 'italic', fontWeight: '500', color: '#DA8267' },
  { tag: tags.strikethrough, textDecoration: 'line-through', color: '#6b7280' },
  {
    tag: tags.monospace,
    backgroundColor: 'var(--obsidian-inline-code-bg)',
    color: 'var(--obsidian-inline-code-text)',
    fontFamily: editorFontFamilyVar,
    padding: '0.12em 0.34em',
    borderRadius: '4px'
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
  {
    tag: tags.quote,
    color: 'var(--obsidian-quote-text)',
    fontStyle: 'italic',
    paddingLeft: '6px'
  },
  { tag: tags.meta, color: '#9abce6', opacity: '0.85' },
  { tag: tags.contentSeparator, color: '#9ca3af' },
  { tag: tags.processingInstruction, color: '#9abce6', opacity: '0.85' }
])

export const markdownHighlightStyleDark = HighlightStyle.define([
  { tag: tags.heading1, color: 'var(--obsidian-accent)', fontWeight: '800', fontSize: '1.62em' },
  { tag: tags.heading2, color: 'var(--obsidian-accent)', fontWeight: '760', fontSize: '1.38em' },
  { tag: tags.heading3, color: 'var(--obsidian-accent)', fontWeight: '720', fontSize: '1.22em' },
  { tag: tags.heading4, color: 'var(--obsidian-accent)', fontWeight: '700', fontSize: '1.1em' },
  { tag: tags.heading5, color: 'var(--obsidian-accent)', fontWeight: '680' },
  { tag: tags.heading6, color: 'var(--obsidian-text-muted)', fontWeight: '680' },
  { tag: tags.strikethrough, textDecoration: 'line-through', color: '#9ca3af' },
  {
    tag: tags.monospace,
    backgroundColor: 'var(--obsidian-inline-code-bg)',
    color: 'var(--obsidian-inline-code-text)',
    fontFamily: editorFontFamilyVar,
    padding: '0.12em 0.34em',
    borderRadius: '4px'
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
  {
    tag: tags.quote,
    color: 'var(--obsidian-quote-text)',
    fontStyle: 'italic',
    paddingLeft: '6px'
  },
  { tag: tags.meta, color: '#9abce6', opacity: '0.85' },
  { tag: tags.contentSeparator, color: '#ffffff' },
  { tag: tags.content, color: '#D6D6D6' },
  { tag: tags.strong, fontWeight: '700', color: 'var(--obsidian-text)' },
  { tag: tags.emphasis, fontStyle: 'italic', fontWeight: '500', color: '#DA8267' },
  { tag: tags.processingInstruction, color: '#9abce6', opacity: '0.85' }
])
