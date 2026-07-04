'use client'
import { Children, memo, useState, useMemo, useEffect, useRef, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { vs, vs2015 } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import remarkGfm from 'remark-gfm'
import { twMerge } from 'tailwind-merge'
import { MermaidDiagram } from './MermaidDiagram'
import { toLocalFileUrl } from './localFileUrl'

interface MarkdownPreviewProps {
  previewMarkdown: string
  selectedNotePath: string
  rootDir?: string
  isDarkMode: boolean
  previewReadableWidthClass: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getReactNodeText: (node: any) => string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getCalloutMeta: (type: string) => any
  isFullPreview?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function groupSections(nodes: any[]) {
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

const slugify = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

// Walk the hast tree and collect text content from a node.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hastNodeText(node: any): string {
  if (!node) return ''
  if (node.type === 'text') return node.value ?? ''
  if (Array.isArray(node.children)) return node.children.map(hastNodeText).join('')
  return ''
}

// Rehype plugin: stamp deduplicated `id` attributes onto every heading node
// (h1-h6) BEFORE the AST is handed to React. This is the only safe place to
// assign IDs — doing it in render() is wrong because React 18 may invoke
// render functions speculatively more than once per commit.
const rehypeSlugIds = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tree: any) => {
    if (!tree?.children) return
    const slugCounts: Record<string, number> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const walk = (node: any) => {
      if (node.type === 'element' && /^h[1-6]$/i.test(node.tagName)) {
        const text = hastNodeText(node)
        const base = slugify(text)
        slugCounts[base] = (slugCounts[base] ?? 0) + 1
        const count = slugCounts[base]
        node.properties = node.properties ?? {}
        node.properties.id = count === 1 ? base : `${base}-${count}`
      }
      if (Array.isArray(node.children)) node.children.forEach(walk)
    }
    tree.children.forEach(walk)
  }
}

const rehypeHeaderSections = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tree: any) => {
    if (tree && tree.children) {
      tree.children = groupSections(tree.children)
    }
  }
}

// Lifted outside MarkdownPreview so React sees a stable component identity
// across renders and doesn't remount (and reset collapse state) on every
// debounced preview update.
interface SectionWrapperProps {
  children?: ReactNode
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  node?: any
  previewReadableWidthClass: string
}

const SectionWrapper = ({ children, node, previewReadableWidthClass }: SectionWrapperProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const childrenArray = Children.toArray(children)
  const header = childrenArray[0]
  const rest = childrenArray.slice(1)

  const levelVal = node?.properties?.dataLevel ?? node?.properties?.['data-level'] ?? 1
  const level = parseInt(String(levelVal), 10) || 1

  let containerClass = ''
  switch (level) {
    case 1:
      containerClass = 'mt-8 mb-4 border-b border-[var(--obsidian-border)] pb-2'
      break
    case 2:
      containerClass = 'mt-6 mb-3'
      break
    case 3:
    case 4:
    case 5:
    case 6:
      containerClass = 'mt-5 mb-2'
      break
    default:
      break
  }

  return (
    <section className={twMerge(previewReadableWidthClass, 'group/section w-full')}>
      {/* Header container */}
      <div
        className={twMerge(
          'flex items-center gap-1 group/hdr cursor-pointer select-none rounded hover:bg-[var(--obsidian-hover-soft)] transition-colors py-0.5 px-1 ml-1',
          containerClass
        )}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {/* Collapse Indicator Chevron */}
        <span
          className={twMerge(
            'self-center flex-shrink-0 flex items-center justify-center w-5 h-5 rounded text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] transition-all duration-200 opacity-30 group-hover/hdr:opacity-100',
            isCollapsed ? '-rotate-90' : 'rotate-0'
          )}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </span>

        {/* Header itself */}
        <div className="flex-1 min-w-0 flex items-center [&>*]:!my-0 [&>*]:!leading-tight">{header}</div>
      </div>

      {/* Collapsible content area */}
      <div
        className={twMerge(
          'pl-5 transition-all duration-200 origin-top',
          isCollapsed ? 'hidden' : 'block'
        )}
      >
        {rest}
      </div>
    </section>
  )
}

export const MarkdownPreview = memo(
  ({
    previewMarkdown,
    selectedNotePath,
    rootDir,
    isDarkMode,
    previewReadableWidthClass,
    getReactNodeText,
    getCalloutMeta,
    isFullPreview
  }: MarkdownPreviewProps) => {
    const toc = useMemo(() => {
      const result: { level: number; text: string; id: string }[] = []
      // Track how many times each base slug appears so we can deduplicate.
      const slugCounts: Record<string, number> = {}
      let inCodeBlock = false
      const lines = previewMarkdown.split('\n')
      for (const line of lines) {
        if (line.startsWith('```')) {
          inCodeBlock = !inCodeBlock
          continue
        }
        if (!inCodeBlock) {
          const match = line.match(/^\s*(#{1,6})\s+(.*)$/)
          if (match) {
            const level = match[1].length
            const rawText = match[2].trim()
            const text = rawText.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_~`]/g, '')
            const baseSlug = slugify(text)
            slugCounts[baseSlug] = (slugCounts[baseSlug] ?? 0) + 1
            const count = slugCounts[baseSlug]
            const id = count === 1 ? baseSlug : `${baseSlug}-${count}`
            result.push({ level, text, id })
          }
        }
      }
      return result
    }, [previewMarkdown])

    const containerRef = useRef<HTMLDivElement>(null)
    const [activeId, setActiveId] = useState<string>('')
    const isProgrammaticScrollRef = useRef(false)
    const programmaticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Use IntersectionObserver to reliably detect which heading is in view.
    // We observe each heading element against the scroll container (root).
    useEffect(() => {
      if (toc.length === 0) {
        setActiveId('')
        return
      }

      // Wait a tick for the DOM to settle after markdown renders
      const setupTimer = setTimeout(() => {
        const scrollContainer =
          containerRef.current?.closest<HTMLElement>('.writr-markdown-preview') ??
          document.querySelector<HTMLElement>('.writr-markdown-preview')

        if (!scrollContainer) return

        // Collect all heading elements in document order
        const ids = toc.map((t) => t.id)
        const headingEls = ids
          .map((id) => document.getElementById(id))
          .filter((el): el is HTMLElement => el !== null)

        if (headingEls.length === 0) return

        // Track which headings are currently intersecting
        const intersectingSet = new Set<string>()

        const pickActive = () => {
          if (isProgrammaticScrollRef.current) return

          // Find the first heading (in document order) that is intersecting
          for (const id of ids) {
            if (intersectingSet.has(id)) {
              setActiveId(id)
              return
            }
          }

          // No heading intersecting — find which section we're inside:
          // The active heading is the last one whose top is above the midpoint
          // of the scroll container.
          const containerMid = scrollContainer.getBoundingClientRect().top +
            scrollContainer.clientHeight * 0.3

          let best = ''
          for (const el of headingEls) {
            const rect = el.getBoundingClientRect()
            if (rect.top <= containerMid) {
              best = el.id
            } else {
              break
            }
          }
          setActiveId(best)
        }

        const observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              const id = entry.target.id
              if (entry.isIntersecting) {
                intersectingSet.add(id)
              } else {
                intersectingSet.delete(id)
              }
            }
            pickActive()
          },
          {
            root: scrollContainer,
            // Fire when heading enters the top 30% of the container
            rootMargin: '0px 0px -70% 0px',
            threshold: 0,
          }
        )

        for (const el of headingEls) {
          observer.observe(el)
        }

        // Initial call to set active on mount
        pickActive()

        return () => {
          observer.disconnect()
        }
      }, 150)

      return () => {
        clearTimeout(setupTimer)
        if (programmaticTimerRef.current) clearTimeout(programmaticTimerRef.current)
      }
    }, [toc])

    const scrollToHeader = (id: string) => {
      const scrollContainer =
        containerRef.current?.closest<HTMLElement>('.writr-markdown-preview') ??
        document.querySelector<HTMLElement>('.writr-markdown-preview')
      const el = document.getElementById(id)
      if (!el) return

      isProgrammaticScrollRef.current = true
      setActiveId(id)

      if (scrollContainer) {
        // Scroll the container element directly for precision
        const containerRect = scrollContainer.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        const offset = elRect.top - containerRect.top + scrollContainer.scrollTop - 20
        scrollContainer.scrollTo({ top: offset, behavior: 'smooth' })
      } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }

      if (programmaticTimerRef.current) clearTimeout(programmaticTimerRef.current)
      programmaticTimerRef.current = setTimeout(() => {
        isProgrammaticScrollRef.current = false
      }, 1000)
    }

    return (
      <div ref={containerRef} className="flex flex-row w-full gap-8 relative items-start">
        <div className="flex-1 min-w-0">
          <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlugIds, rehypeHeaderSections]}
        components={{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          section: ({ children, node }: any) => (
            <SectionWrapper node={node} previewReadableWidthClass={previewReadableWidthClass}>
              {children}
            </SectionWrapper>
          ),
          h1: ({ children, id }) => (
            <h1 id={id} className="font-sans text-2xl font-semibold text-[var(--obsidian-text)]">
              {children}
            </h1>
          ),
          h2: ({ children, id }) => (
            <h2 id={id} className="text-xl font-sans text-[var(--obsidian-text)] font-semibold">
              {children}
            </h2>
          ),
          h3: ({ children, id }) => (
            <h3 id={id} className="text-lg font-sans font-medium text-[var(--obsidian-text)]">
              {children}
            </h3>
          ),
          h4: ({ children, id }) => (
            <h4 id={id} className="text-md font-sans font-medium text-[var(--obsidian-text)]">
              {children}
            </h4>
          ),
          h5: ({ children, id }) => (
            <h5 id={id} className="text-md font-sans font-medium text-[var(--obsidian-text)]">
              {children}
            </h5>
          ),
          h6: ({ children, id }) => (
            <h6 id={id} className="text-sm font-sans font-medium text-[var(--obsidian-text)]">
              {children}
            </h6>
          ),
          p: ({ children }) => (
            <p
              className={twMerge(
                previewReadableWidthClass,
                'mb-4 text-[14px] leading-7 font-sans text-[var(--obsidian-text)]'
              )}
            >
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul
              className={twMerge(
                previewReadableWidthClass,
                'font-sans mb-4 pl-6 space-y-1 text-[var(--obsidian-text)]'
              )}
            >
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol
              className={twMerge(
                previewReadableWidthClass,
                'text-[var(--obsidian-text)] text-sm font-sans mb-4 pl-6 space-y-1'
              )}
            >
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="font-sans text-sm text-[var(--obsidian-text)]">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-black dark:text-[var(--obsidian-text)]">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic font-medium text-[var(--obsidian-text)]">{children}</em>
          ),
          blockquote: ({ children }) =>
            (() => {
              const parts = Children.toArray(children).filter((child) => {
                if (typeof child === 'string') return child.trim().length > 0
                return child != null
              })
              const first = parts[0]

              const firstText = getReactNodeText(first).trim()
              const match = /^\[!([A-Za-z]+)\]\s*(.*)$/.exec(firstText)
              if (match) {
                const meta = getCalloutMeta(match[1])
                if (meta) {
                  const remainder = (match[2] || '').trim()
                  const rest = parts.slice(1)
                  const Icon = meta.Icon
                  return (
                    <div
                      className={twMerge(previewReadableWidthClass, 'my-4 pl-4')}
                      style={{
                        borderLeft: `4px solid ${meta.border}`
                      }}
                    >
                      <div className="flex items-center gap-2 mb-3" style={{ color: meta.fg }}>
                        <Icon className="w-5 h-5" />
                        <div className="text-lg font-semibold">{meta.label}</div>
                      </div>
                      <div className="text-[var(--obsidian-text)] [&_p]:mb-0">
                        {remainder ? <p>{remainder}</p> : null}
                        {rest}
                      </div>
                    </div>
                  )
                }
              }

              return (
                <blockquote
                  className={twMerge(
                    previewReadableWidthClass,
                    'pl-2 my-4 italic text-[var(--obsidian-quote-text)] [&_p]:!text-[var(--obsidian-quote-text)] [&_p]:italic [&_li]:!text-[var(--obsidian-quote-text)] [&_li]:italic'
                  )}
                >
                  {children}
                </blockquote>
              )
            })(),
          a: ({ href, children }) => {
            const isImage =
              href &&
              (href.toLowerCase().endsWith('.png') ||
                href.toLowerCase().endsWith('.jpg') ||
                href.toLowerCase().endsWith('.jpeg') ||
                href.toLowerCase().endsWith('.gif') ||
                href.toLowerCase().endsWith('.svg') ||
                href.toLowerCase().endsWith('.webp'))

            if (isImage) {
              const finalSrc = href ? toLocalFileUrl(href, selectedNotePath, rootDir) : href
              return (
                <div className={previewReadableWidthClass}>
                  <img
                    src={finalSrc}
                    alt={String(children)}
                    className="max-w-full w-auto h-auto rounded-lg shadow-[0_10px_28px_rgba(0,0,0,0.18)] my-4 border border-[var(--obsidian-border)]"
                    style={{ maxWidth: 'min(100%, 720px)' }}
                  />
                </div>
              )
            }

            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--obsidian-accent)] hover:opacity-80 underline underline-offset-4"
              >
                {children}
              </a>
            )
          },
          hr: () => (
            <hr
              className={twMerge(
                previewReadableWidthClass,
                'my-8 border-t border-[var(--obsidian-border)]'
              )}
            />
          ),
          table: ({ children }) => (
            <div className="w-full overflow-x-auto my-6 border border-[var(--obsidian-border)] rounded-lg">
              <table className="w-full table-auto border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[var(--obsidian-table-head)] border-b border-[var(--obsidian-border-soft)]">
              {children}
            </thead>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className="border-b border-[var(--obsidian-border-soft)] even:bg-[var(--obsidian-table-row)] transition-colors last:border-b-0">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left text-[11px] font-bold text-[var(--obsidian-text-muted)] uppercase tracking-tight border-r border-[var(--obsidian-border)] last:border-r-0 align-top">
              <div className="min-w-[140px] whitespace-normal break-words">{children}</div>
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-1.5 text-xs text-[var(--obsidian-text)] border-r border-[var(--obsidian-border-soft)] last:border-r-0 align-top">
              <div className="min-w-[140px] whitespace-normal break-words">{children}</div>
            </td>
          ),
          code: ({ children, className, ...rest }) => {
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : ''
            const isInline = !match
            const codeContent = String(children).replace(/\n$/, '')

            if (language === 'mermaid') {
              return <MermaidDiagram chart={codeContent} />
            }

            if (isInline && codeContent.toLowerCase().startsWith('kbd:')) {
              const keyText = codeContent.slice(4)
              return (
                <kbd className="inline-flex items-center rounded-md border border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] px-1.5 py-0.5 text-[11px] font-mono font-medium text-[var(--obsidian-text)] shadow-[inset_0_-1px_0_rgba(0,0,0,0.22),0_10px_28px_rgba(0,0,0,0.06)]">
                  {keyText}
                </kbd>
              )
            }

            return isInline ? (
              <code
                className="px-1.5 py-0.5 bg-[var(--obsidian-inline-code-bg)] text-[var(--obsidian-inline-code-text)] rounded text-sm font-mono font-medium before:content-none after:content-none"
                {...rest}
              >
                {children}
              </code>
            ) : (
              <SyntaxHighlighter
                PreTag="div"
                children={codeContent}
                language={language}
                style={isDarkMode ? vs2015 : vs}
                customStyle={{
                  margin: '1rem 0',
                  borderRadius: '0.2rem',
                  fontSize: '15px',
                  lineHeight: '1.5',
                  overflowWrap: 'break-word',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  ...(isDarkMode ? {} : { background: 'rgba(0, 0, 0, 0.0175)' })
                }}
                codeTagProps={{
                  style: {
                    fontFamily: 'JetBrains Mono, Monaco, "Courier New", monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }
                }}
              />
            )
          },
          pre: ({ children }) => (
            <pre className="w-full mb-4 bg-transparent overflow-hidden rounded">{children}</pre>
          ),
          img: ({ src, alt }) => {
            const finalSrc = src ? toLocalFileUrl(src, selectedNotePath, rootDir) : src
            return (
              <div className={previewReadableWidthClass}>
                <img
                  src={finalSrc}
                  alt={alt}
                  className="max-w-full w-auto h-auto rounded-lg shadow-[0_10px_28px_rgba(0,0,0,0.18)] my-4 border border-[var(--obsidian-border)]"
                  style={{ maxWidth: 'min(100%, 720px)' }}
                />
              </div>
            )
          }
        }}
      >
        {previewMarkdown}
      </ReactMarkdown>
      </div>

      {toc.length > 0 && isFullPreview && (
        <div className="w-48 flex-shrink-0 hidden xl:block sticky top-2 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="font-semibold mb-3 uppercase tracking-wider text-[10px] text-[var(--obsidian-text-muted)]">On this page</div>
          <ul className="space-y-0.5">
            {toc.map((item, i) => {
              const minLevel = Math.min(...toc.map(t => t.level))
              const depth = item.level - minLevel
              const isNested = depth > 0

              return (
                <li key={i} className="flex items-stretch">
                  {/* Indent guides: one vertical line segment per depth level */}
                  {Array.from({ length: depth }).map((_, d) => (
                    <div
                      key={d}
                      className="flex-shrink-0 w-2.5 flex justify-center"
                    >
                      <div className="w-px bg-[var(--obsidian-border)] opacity-40 h-full" />
                    </div>
                  ))}

                  {/* The link itself */}
                  <button
                    onClick={() => scrollToHeader(item.id)}
                    title={item.text}
                    className={twMerge(
                      'flex-1 text-left py-0.5 px-1.5 rounded text-[11px] leading-snug truncate transition-colors',
                      item.id === activeId
                        ? 'text-[var(--obsidian-accent)] font-semibold bg-[var(--obsidian-accent-dim)]'
                        : isNested
                          ? 'text-[var(--obsidian-text-muted)] opacity-70 hover:text-[var(--obsidian-text)]'
                          : 'font-medium text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)]'
                    )}
                  >
                    {item.text}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
    )
  }
)
