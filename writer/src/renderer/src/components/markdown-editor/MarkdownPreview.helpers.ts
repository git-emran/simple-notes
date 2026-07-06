export type MarkdownTocItem = {
  level: number
  text: string
  id: string
}

export const slugifyMarkdownHeading = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export const buildMarkdownToc = (markdown: string): MarkdownTocItem[] => {
  const result: MarkdownTocItem[] = []
  const slugCounts: Record<string, number> = {}
  let inCodeBlock = false
  const lines = markdown.split('\n')

  for (const line of lines) {
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }

    if (inCodeBlock) continue

    const match = line.match(/^\s*(#{1,6})\s+(.*)$/)
    if (!match) continue

    const level = match[1].length
    const rawText = match[2].trim()
    const text = rawText.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_~`]/g, '')
    const baseSlug = slugifyMarkdownHeading(text)
    slugCounts[baseSlug] = (slugCounts[baseSlug] ?? 0) + 1
    const count = slugCounts[baseSlug]
    const id = count === 1 ? baseSlug : `${baseSlug}-${count}`

    result.push({ level, text, id })
  }

  return result
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getHastNodeText = (node: any): string => {
  if (!node) return ''
  if (node.type === 'text') return node.value ?? ''
  if (Array.isArray(node.children)) return node.children.map(getHastNodeText).join('')
  return ''
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const groupMarkdownSections = (nodes: any[]) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const root: { level: number; children: any[] } = { level: 0, children: [] }
  const stack = [root]

  for (const node of nodes) {
    const level =
      node.type === 'element' && /^h[1-6]$/i.test(node.tagName) ? parseInt(node.tagName[1], 10) : 0

    if (level > 0) {
      while (stack.length > 1 && stack[stack.length - 1].level >= level) {
        stack.pop()
      }

      const section = {
        type: 'element',
        tagName: 'section',
        properties: {
          dataLevel: level
        },
        children: [node]
      }

      stack[stack.length - 1].children.push(section)
      stack.push({ level, children: section.children })
    } else {
      stack[stack.length - 1].children.push(node)
    }
  }

  return root.children
}

export const getScopedHeadingElementsByIds = (root: HTMLElement, ids: string[]) => {
  const idSet = new Set(ids)
  return Array.from(root.querySelectorAll<HTMLElement>('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]')).filter(
    (el) => idSet.has(el.id)
  )
}

export const findScopedHeadingById = (root: HTMLElement, id: string) =>
  getScopedHeadingElementsByIds(root, [id]).find((el) => el.id === id) ?? null
