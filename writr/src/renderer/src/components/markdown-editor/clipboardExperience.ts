import { syntaxTree } from '@codemirror/language'
import { EditorState, Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { SyntaxNode } from '@lezer/common'

const ZERO_WIDTH_CHARS = /[\u200B-\u200D\uFEFF]/g
const BLOCK_TAGS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'details',
  'dialog',
  'div',
  'dl',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'table',
  'ul',
])

type RenderContext = {
  inListItem?: boolean
  inTableCell?: boolean
  listDepth?: number
}

type ClipboardExperienceOptions = {
  importImages?: (clipboardData: DataTransfer) => Promise<string[]>
}

export const normalizeClipboardText = (text: string): string =>
  text
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(ZERO_WIDTH_CHARS, '')

const collapseWhitespace = (text: string): string =>
  normalizeClipboardText(text).replace(/[ \t\n\f\v]+/g, ' ')

const cleanupInlineText = (text: string): string =>
  normalizeClipboardText(text)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()

const finalizeMarkdown = (text: string): string =>
  normalizeClipboardText(text)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+\n/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

const maxRunLength = (text: string, character: string): number => {
  let max = 0
  let current = 0

  for (const char of text) {
    if (char === character) {
      current += 1
      max = Math.max(max, current)
    } else {
      current = 0
    }
  }

  return max
}

const wrapInline = (marker: string, content: string): string => {
  const trimmed = cleanupInlineText(content)
  return trimmed ? `${marker}${trimmed}${marker}` : ''
}

const renderInlineCode = (content: string): string => {
  const trimmed = cleanupInlineText(content)
  if (!trimmed) return ''

  const fenceLength = Math.max(1, maxRunLength(trimmed, '`') + 1)
  const fence = '`'.repeat(fenceLength)
  return `${fence}${trimmed}${fence}`
}

const escapeLinkLabel = (text: string): string => cleanupInlineText(text).replace(/\]/g, '\\]')

const escapeLinkDestination = (href: string): string =>
  href.replace(/\s/g, '%20').replace(/\)/g, '\\)')

const escapeTableCell = (text: string): string =>
  text.replace(/\|/g, '\\|').replace(/\n+/g, ' <br /> ')

const containerHasBlockChildren = (element: Element): boolean =>
  Array.from(element.children).some((child) => BLOCK_TAGS.has(child.tagName.toLowerCase()))

const renderChildren = (node: ParentNode, context: RenderContext): string =>
  Array.from(node.childNodes)
    .map((child) => renderNode(child, context))
    .join('')

const renderParagraph = (element: Element, context: RenderContext): string => {
  const content = cleanupInlineText(renderChildren(element, context))
  if (!content) return ''

  if (context.inTableCell) return content
  return `${content}\n\n`
}

const renderContainer = (element: Element, context: RenderContext): string => {
  if (!containerHasBlockChildren(element)) return renderParagraph(element, context)

  const content = finalizeMarkdown(renderChildren(element, context))
  if (!content) return ''

  if (context.inListItem || context.inTableCell) return `${content}\n`
  return `${content}\n\n`
}

const renderHeading = (element: Element, level: number, context: RenderContext): string => {
  const content = cleanupInlineText(renderChildren(element, context))
  if (!content) return ''
  return `${'#'.repeat(level)} ${content}\n\n`
}

const renderBlockquote = (element: Element, context: RenderContext): string => {
  const content = finalizeMarkdown(renderChildren(element, context))
  if (!content) return ''

  const quoted = content
    .split('\n')
    .map((line) => (line ? `> ${line}` : '>'))
    .join('\n')

  return `${quoted}\n\n`
}

const extractCodeLanguage = (element: Element | null): string => {
  if (!element) return ''

  const className = element.getAttribute('class') ?? ''
  const match = className.match(/language-([a-z0-9_+-]+)/i)
  return match?.[1]?.toLowerCase() ?? ''
}

const renderPreformatted = (element: Element): string => {
  const codeElement =
    Array.from(element.children).find((child) => child.tagName.toLowerCase() === 'code') ?? null
  const raw = normalizeClipboardText(codeElement?.textContent ?? element.textContent ?? '').replace(/\n+$/, '')
  if (!raw.trim()) return ''

  const fenceLength = Math.max(3, maxRunLength(raw, '`') + 1)
  const fence = '`'.repeat(fenceLength)
  const language = extractCodeLanguage(codeElement)

  return `${fence}${language}\n${raw}\n${fence}\n\n`
}

const renderListItem = (element: HTMLLIElement, ordered: boolean, index: number, context: RenderContext): string => {
  const contentParts: string[] = []
  const nestedLists: string[] = []

  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const tagName = (child as Element).tagName.toLowerCase()
      if (tagName === 'ul' || tagName === 'ol') {
        nestedLists.push(renderNode(child, { ...context, listDepth: (context.listDepth ?? 0) + 1 }))
        continue
      }
    }

    contentParts.push(renderNode(child, { ...context, inListItem: true }))
  }

  const marker = ordered ? `${index}. ` : '- '
  const indent = '  '.repeat(context.listDepth ?? 0)
  const continuationIndent = `${indent}${' '.repeat(marker.length)}`
  const content = finalizeMarkdown(contentParts.join(''))
  const contentLines = content ? content.split('\n') : ['']
  const itemLines = contentLines.map((line, lineIndex) => {
    if (lineIndex === 0) return `${indent}${marker}${line}`.trimEnd()
    if (!line) return ''
    return `${continuationIndent}${line}`
  })

  const nestedContent = nestedLists.map((value) => value.trimEnd()).filter(Boolean).join('\n')
  if (nestedContent) itemLines.push(nestedContent)

  return itemLines.join('\n')
}

const renderList = (element: HTMLOListElement | HTMLUListElement, context: RenderContext): string => {
  const ordered = element.tagName.toLowerCase() === 'ol'
  const start = ordered ? Number.parseInt(element.getAttribute('start') ?? '1', 10) || 1 : 1
  const items = Array.from(element.children).filter(
    (child): child is HTMLLIElement => child.tagName.toLowerCase() === 'li'
  )

  if (items.length === 0) return ''

  const output = items
    .map((item, index) => renderListItem(item, ordered, start + index, context))
    .join('\n')

  return `${output}\n\n`
}

const renderTable = (element: HTMLTableElement, context: RenderContext): string => {
  const rows = Array.from(element.querySelectorAll('tr')).map((row) =>
    Array.from(row.cells).map((cell) =>
      escapeTableCell(cleanupInlineText(renderChildren(cell, { ...context, inTableCell: true })))
    )
  )

  if (rows.length === 0) return ''

  const columnCount = Math.max(...rows.map((row) => row.length))
  const padRow = (row: string[]): string[] =>
    Array.from({ length: columnCount }, (_, index) => row[index] ?? '')
  const renderRow = (row: string[]): string => `| ${padRow(row).join(' | ')} |`
  const header = padRow(rows[0])
  const divider = Array.from({ length: columnCount }, () => '---')
  const bodyRows = rows.slice(1).map(renderRow)

  return `${[renderRow(header), renderRow(divider), ...bodyRows].join('\n')}\n\n`
}

const renderImage = (element: HTMLImageElement): string => {
  const src = element.getAttribute('src')?.trim() ?? ''
  if (!src || src.startsWith('data:')) return ''

  const alt = (element.getAttribute('alt') ?? '').replace(/\]/g, '\\]')
  return `![${alt}](${escapeLinkDestination(src)})`
}

const renderLink = (element: HTMLAnchorElement, context: RenderContext): string => {
  const href = element.getAttribute('href')?.trim() ?? ''
  const content = cleanupInlineText(renderChildren(element, context))
  if (!href) return content

  if (!content) return href
  if (href.startsWith('mailto:') && content === href.slice('mailto:'.length)) return content
  if (content === href) return href

  return `[${escapeLinkLabel(content)}](${escapeLinkDestination(href)})`
}

const renderNode = (node: Node, context: RenderContext): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? ''
    if (!text) return ''
    return context.inTableCell ? cleanupInlineText(text) : collapseWhitespace(text)
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  const element = node as Element
  const tagName = element.tagName.toLowerCase()

  switch (tagName) {
    case 'style':
    case 'script':
    case 'noscript':
    case 'meta':
    case 'link':
      return ''
    case 'br':
      return '\n'
    case 'hr':
      return '---\n\n'
    case 'strong':
    case 'b':
      return wrapInline('**', renderChildren(element, context))
    case 'em':
    case 'i':
      return wrapInline('*', renderChildren(element, context))
    case 'del':
    case 's':
      return wrapInline('~~', renderChildren(element, context))
    case 'code':
      if (element.parentElement?.tagName.toLowerCase() === 'pre') return ''
      return renderInlineCode(element.textContent ?? '')
    case 'kbd':
      return cleanupInlineText(renderChildren(element, context))
        ? `<kbd>${cleanupInlineText(renderChildren(element, context))}</kbd>`
        : ''
    case 'a':
      return renderLink(element as HTMLAnchorElement, context)
    case 'img':
      return renderImage(element as HTMLImageElement)
    case 'h1':
      return renderHeading(element, 1, context)
    case 'h2':
      return renderHeading(element, 2, context)
    case 'h3':
      return renderHeading(element, 3, context)
    case 'h4':
      return renderHeading(element, 4, context)
    case 'h5':
      return renderHeading(element, 5, context)
    case 'h6':
      return renderHeading(element, 6, context)
    case 'blockquote':
      return renderBlockquote(element, context)
    case 'pre':
      return renderPreformatted(element)
    case 'ul':
    case 'ol':
      return renderList(element as HTMLOListElement | HTMLUListElement, context)
    case 'table':
      return renderTable(element as HTMLTableElement, context)
    case 'p':
      return renderParagraph(element, context)
    case 'div':
    case 'section':
    case 'article':
    case 'main':
    case 'aside':
    case 'header':
    case 'footer':
    case 'figure':
    case 'figcaption':
      return renderContainer(element, context)
    case 'span':
    case 'small':
    case 'sup':
    case 'sub':
    case 'mark':
      return renderChildren(element, context)
    default:
      return renderChildren(element, context)
  }
}

export const convertHtmlToMarkdown = (html: string): string => {
  const trimmed = html.trim()
  if (!trimmed) return ''

  const parser = new DOMParser()
  const document = parser.parseFromString(trimmed, 'text/html')
  const content = finalizeMarkdown(renderChildren(document.body, { listDepth: 0 }))
  return content
}

const selectionInsideCode = (state: EditorState): boolean => {
  const position = state.selection.main.head
  let node: SyntaxNode | null = syntaxTree(state).resolveInner(position, -1)

  while (node) {
    if (node.name === 'FencedCode' || node.name === 'CodeBlock' || node.name === 'InlineCode') {
      return true
    }
    node = node.parent
  }

  return false
}

const looksStructured = (text: string): boolean =>
  /(^|\n)(#{1,6} |>\s|- |\d+\. |\| .* \||```)/.test(text) ||
  /\[[^\]]+\]\([^)]+\)/.test(text) ||
  /!\[[^\]]*\]\([^)]+\)/.test(text) ||
  /\*\*[^*]+\*\*/.test(text) ||
  /`[^`]+`/.test(text)

const pickPreferredPasteText = (plainText: string, markdownText: string): string => {
  const normalizedPlain = finalizeMarkdown(plainText)
  const normalizedMarkdown = finalizeMarkdown(markdownText)

  if (!normalizedMarkdown) return normalizedPlain
  if (!normalizedPlain) return normalizedMarkdown
  if (normalizedMarkdown === normalizedPlain) return normalizedPlain
  if (looksStructured(normalizedMarkdown)) return normalizedMarkdown
  if (normalizedMarkdown.length >= normalizedPlain.length * 0.85) return normalizedMarkdown
  return normalizedPlain
}

const insertClipboardText = (view: EditorView, text: string) => {
  const selection = view.state.selection.main
  view.dispatch({
    changes: { from: selection.from, to: selection.to, insert: text },
    selection: { anchor: selection.from + text.length },
  })
  view.focus()
}

export const createClipboardExperience = (
  options: ClipboardExperienceOptions = {}
): Extension => [
  EditorView.clipboardInputFilter.of((text) => normalizeClipboardText(text)),
  EditorView.clipboardOutputFilter.of((text) => normalizeClipboardText(text)),
  EditorView.domEventHandlers({
    paste: (event, view) => {
      const clipboardData = event.clipboardData
      if (!clipboardData) return false

      const hasClipboardImage =
        Array.from(clipboardData.items ?? []).some(
          (item) => item.kind === 'file' && item.type.startsWith('image/')
        ) ||
        Array.from(clipboardData.files ?? []).some((file) => file.type.startsWith('image/'))
      if (hasClipboardImage && options.importImages) {
        event.preventDefault()
        void options.importImages(clipboardData).then((links) => {
          if (!links.length) return
          insertClipboardText(view, `${links.join('\n')}\n`)
        })
        return true
      }

      if (selectionInsideCode(view.state)) return false

      const html = clipboardData.getData('text/html')
      if (!html.trim()) return false

      const preferredText = pickPreferredPasteText(
        clipboardData.getData('text/plain'),
        convertHtmlToMarkdown(html)
      )
      if (!preferredText) return false

      event.preventDefault()
      insertClipboardText(view, preferredText)
      return true
    },
  }),
]
