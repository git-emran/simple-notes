'use client'
import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { twMerge } from 'tailwind-merge'
import { Children } from 'react'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { vs, vs2015 } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import { MermaidDiagram } from './MermaidDiagram'
import { toLocalFileUrl } from './localFileUrl'

interface MarkdownPreviewProps {
  previewMarkdown: string;
  selectedNotePath: string;
  rootDir?: string;
  isDarkMode: boolean;
  previewReadableWidthClass: string;
  getReactNodeText: (node: any) => string;
  getCalloutMeta: (type: string) => any;
}

export const MarkdownPreview = memo(({ 
  previewMarkdown, 
  selectedNotePath, 
  rootDir, 
  isDarkMode, 
  previewReadableWidthClass,
  getReactNodeText,
  getCalloutMeta
}: MarkdownPreviewProps) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1
            className={twMerge(
              previewReadableWidthClass,
              'font-sans text-2xl font-semibold mt-8 mb-4 pb-2 border-b border-[var(--obsidian-border)] text-[var(--obsidian-text)]'
            )}
          >
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2
            className={twMerge(
              previewReadableWidthClass,
              'text-xl font-sans text-[var(--obsidian-text)] font-semibold mt-6 mb-3'
            )}
          >
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3
            className={twMerge(
              previewReadableWidthClass,
              'text-lg font-sans font-medium mt-5 mb-2 text-[var(--obsidian-text)]'
            )}
          >
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4
            className={twMerge(
              previewReadableWidthClass,
              'text-md font-sans font-medium mt-5 mb-2 text-[var(--obsidian-text)]'
            )}
          >
            {children}
          </h4>
        ),
        h5: ({ children }) => (
          <h5
            className={twMerge(
              previewReadableWidthClass,
              'text-md font-sans font-medium mt-5 mb-2 text-[var(--obsidian-text)]'
            )}
          >
            {children}
          </h5>
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
          <li className="font-sans text-sm text-[var(--obsidian-text)]">
            {children}
          </li>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-black dark:text-[var(--obsidian-text)]">
            {children}
          </strong>
        ),
        em: ({ children }) => <em className="italic font-medium text-[var(--obsidian-text)]">{children}</em>,
        blockquote: ({ children }) => (
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
                      borderLeft: `4px solid ${meta.border}`,
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
          })()
        ),
        a: ({ href, children }) => {
          const isImage = href && (
            href.toLowerCase().endsWith('.png') || 
            href.toLowerCase().endsWith('.jpg') || 
            href.toLowerCase().endsWith('.jpeg') || 
            href.toLowerCase().endsWith('.gif') || 
            href.toLowerCase().endsWith('.svg') || 
            href.toLowerCase().endsWith('.webp')
          )

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
          <hr className={twMerge(previewReadableWidthClass, 'my-8 border-t border-[var(--obsidian-border)]')} />
        ),
        table: ({ children }) => (
          <div className="w-full overflow-x-auto my-6 border border-[var(--obsidian-border)] rounded-lg">
            <table className="w-full table-auto border-collapse">
              {children}
            </table>
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
                ...(isDarkMode ? {} : { background: 'rgba(0, 0, 0, 0.0175)' }),
              }}
              codeTagProps={{
                style: {
                  fontFamily: 'JetBrains Mono, Monaco, "Courier New", monospace',
                },
              }}
            />
          )
        },
        pre: ({ children }) => (
          <pre className="w-full mb-4 bg-transparent overflow-hidden rounded">
            {children}
          </pre>
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
        },
      }}
    >
      {previewMarkdown}
    </ReactMarkdown>
  )
})
