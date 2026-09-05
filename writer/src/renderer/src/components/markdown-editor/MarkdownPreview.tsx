'use client'
import { Children, memo, useCallback, useEffect, useState, useMemo, useRef, lazy, Suspense, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { vs, vs2015 } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import remarkGfm from 'remark-gfm'
import { twMerge } from 'tailwind-merge'
import {
  buildMarkdownToc,
  findScopedHeadingById,
  getHastNodeText,
  groupMarkdownSections,
  slugifyMarkdownHeading
} from './MarkdownPreview.helpers'
import { TableOfContents } from './TableOfContents'
import { FiList } from 'react-icons/fi'
import { toLocalFileUrl } from './localFileUrl'

const MermaidDiagram = lazy(() =>
  import('./MermaidDiagram').then((m) => ({ default: m.MermaidDiagram }))
)

/* ─── Language icon map (SVG strings) ───────────────────────────────────── */
const LANG_ICONS: Record<string, string> = {
  javascript: '<svg viewBox="0 0 448 512" width="13" height="13" fill="#f7df1e" xmlns="http://www.w3.org/2000/svg"><path d="M0 32v448h448V32H0zm243.8 349.4c0 43.6-25.6 63.5-62.9 63.5-33.7 0-53.2-17.4-63.2-38.5l34.3-20.7c6.6 11.7 12.6 21.6 27.1 21.6 13.8 0 22.6-5.4 22.6-26.5V237.7h42.1v143.7zm99.6 63.5c-39.1 0-74.4-22.6-74.4-73.5 0-50 35.8-73.5 73.9-73.5 28.3 0 43.2 9.7 54.7 22.6l-28.9 22.3c-7.5-8.5-16.3-13.6-26.2-13.6-18.7 0-31.4 14.1-31.4 39.5 0 25 11.8 39.2 30.5 39.2 12.1 0 21.4-6.4 29.5-16l27.1 23.3c-11.4 15.3-29.4 29.7-54.8 29.7z"/></svg>',
  js: '<svg viewBox="0 0 448 512" width="13" height="13" fill="#f7df1e" xmlns="http://www.w3.org/2000/svg"><path d="M0 32v448h448V32H0zm243.8 349.4c0 43.6-25.6 63.5-62.9 63.5-33.7 0-53.2-17.4-63.2-38.5l34.3-20.7c6.6 11.7 12.6 21.6 27.1 21.6 13.8 0 22.6-5.4 22.6-26.5V237.7h42.1v143.7zm99.6 63.5c-39.1 0-74.4-22.6-74.4-73.5 0-50 35.8-73.5 73.9-73.5 28.3 0 43.2 9.7 54.7 22.6l-28.9 22.3c-7.5-8.5-16.3-13.6-26.2-13.6-18.7 0-31.4 14.1-31.4 39.5 0 25 11.8 39.2 30.5 39.2 12.1 0 21.4-6.4 29.5-16l27.1 23.3c-11.4 15.3-29.4 29.7-54.8 29.7z"/></svg>',
  typescript: '<svg viewBox="0 0 512 512" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" rx="50" fill="#3178c6"/><path fill="#fff" d="M317 407v52c8 4 18 7 29 9s22 3 34 3c11 0 22-1 32-4s19-7 27-13 14-14 19-23 7-21 7-34c0-10-1-19-4-27s-7-15-12-21-12-11-19-16-16-10-25-14c-7-3-13-6-18-9s-10-6-13-9-6-6-8-10-3-8-3-13c0-4 1-8 3-12s5-7 8-10 7-5 12-7 10-2 16-2c4 0 9 0 13 1s9 2 13 4 8 3 11 5 6 4 9 7v-49c-7-2-15-4-24-5s-19-2-30-2c-11 0-21 1-31 4s-19 7-27 13-14 14-19 24-7 22-7 36c0 17 5 32 14 43s23 21 41 29c8 3 15 6 21 10s11 7 15 10 7 7 9 11 3 9 3 14c0 5-1 9-3 13s-5 8-9 11-9 5-15 7-13 2-21 2c-14 0-27-3-40-8s-24-13-33-23zm-84-121h64v-41H152v41h63v178h38z"/></svg>',
  ts: '<svg viewBox="0 0 512 512" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" rx="50" fill="#3178c6"/><path fill="#fff" d="M317 407v52c8 4 18 7 29 9s22 3 34 3c11 0 22-1 32-4s19-7 27-13 14-14 19-23 7-21 7-34c0-10-1-19-4-27s-7-15-12-21-12-11-19-16-16-10-25-14c-7-3-13-6-18-9s-10-6-13-9-6-6-8-10-3-8-3-13c0-4 1-8 3-12s5-7 8-10 7-5 12-7 10-2 16-2c4 0 9 0 13 1s9 2 13 4 8 3 11 5 6 4 9 7v-49c-7-2-15-4-24-5s-19-2-30-2c-11 0-21 1-31 4s-19 7-27 13-14 14-19 24-7 22-7 36c0 17 5 32 14 43s23 21 41 29c8 3 15 6 21 10s11 7 15 10 7 7 9 11 3 9 3 14c0 5-1 9-3 13s-5 8-9 11-9 5-15 7-13 2-21 2c-14 0-27-3-40-8s-24-13-33-23zm-84-121h64v-41H152v41h63v178h38z"/></svg>',
  tsx: '<svg viewBox="0 0 512 512" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" rx="50" fill="#3178c6"/><path fill="#fff" d="M317 407v52c8 4 18 7 29 9s22 3 34 3c11 0 22-1 32-4s19-7 27-13 14-14 19-23 7-21 7-34c0-10-1-19-4-27s-7-15-12-21-12-11-19-16-16-10-25-14c-7-3-13-6-18-9s-10-6-13-9-6-6-8-10-3-8-3-13c0-4 1-8 3-12s5-7 8-10 7-5 12-7 10-2 16-2c4 0 9 0 13 1s9 2 13 4 8 3 11 5 6 4 9 7v-49c-7-2-15-4-24-5s-19-2-30-2c-11 0-21 1-31 4s-19 7-27 13-14 14-19 24-7 22-7 36c0 17 5 32 14 43s23 21 41 29c8 3 15 6 21 10s11 7 15 10 7 7 9 11 3 9 3 14c0 5-1 9-3 13s-5 8-9 11-9 5-15 7-13 2-21 2c-14 0-27-3-40-8s-24-13-33-23zm-84-121h64v-41H152v41h63v178h38z"/></svg>',
  jsx: '<svg viewBox="0 0 448 512" width="13" height="13" fill="#61dafb" xmlns="http://www.w3.org/2000/svg"><path d="M0 32v448h448V32H0zm243.8 349.4c0 43.6-25.6 63.5-62.9 63.5-33.7 0-53.2-17.4-63.2-38.5l34.3-20.7c6.6 11.7 12.6 21.6 27.1 21.6 13.8 0 22.6-5.4 22.6-26.5V237.7h42.1v143.7zm99.6 63.5c-39.1 0-74.4-22.6-74.4-73.5 0-50 35.8-73.5 73.9-73.5 28.3 0 43.2 9.7 54.7 22.6l-28.9 22.3c-7.5-8.5-16.3-13.6-26.2-13.6-18.7 0-31.4 14.1-31.4 39.5 0 25 11.8 39.2 30.5 39.2 12.1 0 21.4-6.4 29.5-16l27.1 23.3c-11.4 15.3-29.4 29.7-54.8 29.7z"/></svg>',
  python: '<svg viewBox="0 0 256 255" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><path fill="#3776AB" d="M126.9 0C60.6 0 64.4 28 64.4 28l.1 29h63.7v8.7H40.3S0 61 0 128.3c0 67.2 37.2 64.9 37.2 64.9H59v-31.2s-1.3-37.2 36.6-37.2h63.2s35.4.6 35.4-34.2V35.3S199.9 0 126.9 0zm-35.2 20.3a11.3 11.3 0 110 22.6 11.3 11.3 0 010-22.6z"/><path fill="#FFD43B" d="M129.1 255c66.4 0 62.6-28 62.6-28l-.1-29H128v-8.7h87.9s40.3 4.7 40.3-62.6c0-67.2-37.2-64.9-37.2-64.9H197v31.2s1.3 37.2-36.6 37.2H97.2s-35.4-.6-35.4 34.2v57.5S56.1 255 129.1 255zm35.2-20.3a11.3 11.3 0 110-22.6 11.3 11.3 0 010 22.6z"/></svg>',
  py: '<svg viewBox="0 0 256 255" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><path fill="#3776AB" d="M126.9 0C60.6 0 64.4 28 64.4 28l.1 29h63.7v8.7H40.3S0 61 0 128.3c0 67.2 37.2 64.9 37.2 64.9H59v-31.2s-1.3-37.2 36.6-37.2h63.2s35.4.6 35.4-34.2V35.3S199.9 0 126.9 0zm-35.2 20.3a11.3 11.3 0 110 22.6 11.3 11.3 0 010-22.6z"/><path fill="#FFD43B" d="M129.1 255c66.4 0 62.6-28 62.6-28l-.1-29H128v-8.7h87.9s40.3 4.7 40.3-62.6c0-67.2-37.2-64.9-37.2-64.9H197v31.2s1.3 37.2-36.6 37.2H97.2s-35.4-.6-35.4 34.2v57.5S56.1 255 129.1 255zm35.2-20.3a11.3 11.3 0 110-22.6 11.3 11.3 0 010 22.6z"/></svg>',
  html: '<svg viewBox="0 0 512 512" width="13" height="13" fill="#e44d26" xmlns="http://www.w3.org/2000/svg"><path d="M41 460h430l-45-412H86L41 460zm88-301h254l-11 127H178l-5-55h65l2 24h90l4-41H212l-9-55zm183 205l-56 16-56-16-4-45h55l1 14 26 7 26-7 2-26H210l-4-41h172l-10 98z"/></svg>',
  css: '<svg viewBox="0 0 512 512" width="13" height="13" fill="#264de4" xmlns="http://www.w3.org/2000/svg"><path d="M41 460h430l-45-412H86L41 460zm253-157H184l-4-41h172l-10 98-56 16-56-16-4-45h55l1 14 26 7 26-7 2-26zm11-127H184l-9-55h254l-33 375-110 32-110-32-8-91h55l4 55 59 17 59-17 4-45H305l-2-24h177l4-41z"/></svg>',
  json: '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M5 3h2v2H5v5a2 2 0 01-2 2 2 2 0 012 2v5h2v2H5c-1.07-.27-2-.9-2-2v-4a2 2 0 00-2-2H0v-2h1a2 2 0 002-2V5a2 2 0 012-2m14 0a2 2 0 012 2v4a2 2 0 002 2h1v2h-1a2 2 0 00-2 2v4a2 2 0 01-2 2h-2v-2h2v-5a2 2 0 012-2 2 2 0 01-2-2V5h-2V3h2z"/></svg>',
  rust: '<svg viewBox="0 0 106 106" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><circle cx="53" cy="53" r="53" fill="#DEA584"/></svg>',
  go: '<svg viewBox="0 0 100 40" width="18" height="10" fill="#00ACD7" xmlns="http://www.w3.org/2000/svg"><text y="32" font-size="40" font-family="sans-serif" font-weight="bold">Go</text></svg>',
  java: '<svg viewBox="0 0 48 48" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><path fill="#f89820" d="M21 34s-4.9 2.8 3.5 3.8c10.1 1.2 15.2.9 26.3-1.1 0 0 2.9 1.8 7 3.4C39.1 45.5 8.9 43.2 21 34zm-2.1-7.2s-5.5 4.1 2.9 5c10.8 1.1 19.3.8 27-1.1 0 0 2 2 5.1 3.1-23.9 6.9-50.7.6-35-7z"/></svg>',
  cpp: '<svg viewBox="0 0 24 24" width="13" height="13" fill="#00599c" xmlns="http://www.w3.org/2000/svg"><path d="M10.5 15.97l.41 2.44c-.26.14-.68.27-1.24.39-.57.13-1.24.2-2.01.2-2.21-.04-3.87-.7-4.98-1.96C1.58 15.77 1 14.16 1 12.21c.05-2.31.72-4.08 2-5.32C4.32 5.55 5.95 4.94 8 5c.75 0 1.4.07 1.94.19.54.13.94.25 1.2.36l-.39 2.5-.64-.27c-.26-.08-.59-.12-.99-.12-1.06.06-1.86.42-2.4 1.08-.56.66-.84 1.55-.84 2.67 0 1.02.25 1.86.76 2.54.51.68 1.31 1.03 2.4 1.05.45 0 .84-.06 1.17-.13l.79-.27.5-.24z"/></svg>',
  markdown: '<svg viewBox="0 0 640 512" width="13" height="13" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M593.8 59.1H46.2C20.7 59.1 0 79.8 0 105.2v301.5c0 25.5 20.7 46.2 46.2 46.2h547.7c25.5 0 46.2-20.7 46.2-46.2V105.2c0-25.4-20.7-46.1-46.3-46.1zM338.3 360.6H258V198.4l-42.5 85.1-42.5-85.1v162.2H92.7V151.4h80.3l42.5 85.1 42.5-85.1h80.3v209.2zm108.9 0l-71.5-98.1h45.8V151.4h51.5v111.1h45.8l-71.6 98.1z"/></svg>',
  md: '<svg viewBox="0 0 640 512" width="13" height="13" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M593.8 59.1H46.2C20.7 59.1 0 79.8 0 105.2v301.5c0 25.5 20.7 46.2 46.2 46.2h547.7c25.5 0 46.2-20.7 46.2-46.2V105.2c0-25.4-20.7-46.1-46.3-46.1zM338.3 360.6H258V198.4l-42.5 85.1-42.5-85.1v162.2H92.7V151.4h80.3l42.5 85.1 42.5-85.1h80.3v209.2zm108.9 0l-71.5-98.1h45.8V151.4h51.5v111.1h45.8l-71.6 98.1z"/></svg>',
  sql: '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 5v4c0 1.66-4 3-9 3S3 10.66 3 9V5M21 9v4c0 1.66-4 3-9 3s-9-1.34-9-3V9M21 13v4c0 1.66-4 3-9 3s-9-1.34-9-3v-4"/></svg>',
  yaml: '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M6 3L2 7l10 5 10-5-4-4M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
  bash: '<svg viewBox="0 0 24 24" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="3" fill="#1d1d1d"/><path stroke="#eee" stroke-width="1.5" fill="none" d="M5 8l4 4-4 4m5 0h6"/></svg>',
  shell: '<svg viewBox="0 0 24 24" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="3" fill="#1d1d1d"/><path stroke="#eee" stroke-width="1.5" fill="none" d="M5 8l4 4-4 4m5 0h6"/></svg>',
  sh: '<svg viewBox="0 0 24 24" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="3" fill="#1d1d1d"/><path stroke="#eee" stroke-width="1.5" fill="none" d="M5 8l4 4-4 4m5 0h6"/></svg>',
}
const LANG_FALLBACK_ICON = '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>'

/* ─── Preview code block with header + copy button ──────────────────────── */
interface PreviewCodeBlockProps {
  language: string
  codeContent: string
  isDarkMode: boolean
}

const PreviewCodeBlock = ({ language, codeContent, isDarkMode }: PreviewCodeBlockProps) => {
  const [copied, setCopied] = useState(false)
  const copyResetTimerRef = useRef<number | null>(null)
  const iconHtml = LANG_ICONS[language.toLowerCase()] ?? LANG_FALLBACK_ICON

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(codeContent).catch(() => {})
    setCopied(true)
    if (copyResetTimerRef.current !== null) {
      window.clearTimeout(copyResetTimerRef.current)
    }
    copyResetTimerRef.current = window.setTimeout(() => {
      copyResetTimerRef.current = null
      setCopied(false)
    }, 2000)
  }, [codeContent])

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current)
      }
    }
  }, [])

  return (
    <div className="preview-code-block group relative my-4 rounded-lg overflow-hidden border border-obsidian-border">
      <div
        className="flex items-center justify-between px-3 py-1.5 text-[11px] select-none bg-[var(--obsidian-pane)] border-b border-obsidian-border text-[var(--obsidian-text-muted)]"
      >
        {/* Left: icon + lang */}
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span
            className="inline-flex items-center shrink-0"
            dangerouslySetInnerHTML={{ __html: iconHtml }}
          />
          <span className="font-semibold tracking-wider uppercase text-[10px]">
            {language || 'text'}
          </span>
        </div>
        {/* Right: copy button — visible on hover */}
        <button
          onClick={handleCopy}
          className={twMerge(
            'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
            'px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide cursor-pointer border-none',
            copied
              ? 'opacity-100 text-[var(--obsidian-accent)]'
              : 'hover:bg-[var(--obsidian-hover-soft)] text-[var(--obsidian-text-muted)]'
          )}
          style={{ background: 'transparent' }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      {/* Syntax-highlighted code */}
      <SyntaxHighlighter
        language={language}
        style={isDarkMode ? vs2015 : vs}
        customStyle={{
          margin: 0,
          padding: '12px',
          border: 'none',
          borderRadius: 0,
          fontSize: '14px',
          lineHeight: '1.6',
          overflowWrap: 'break-word',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          ...(isDarkMode ? {} : { background: 'rgba(0,0,0,0.02)' }),
        }}
        codeTagProps={{
          className: 'before:content-none after:content-none',
          style: {
            fontFamily: 'JetBrains Mono, Monaco, "Courier New", monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          },
        }}
      >
        {codeContent}
      </SyntaxHighlighter>
    </div>
  )
}

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
        const text = getHastNodeText(node)
        const base = slugifyMarkdownHeading(text)
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
      tree.children = groupMarkdownSections(tree.children)
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
      containerClass = 'mt-8 mb-4 border-b border-obsidian-border pb-2'
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
        <div className="flex-1 min-w-0 flex items-center [&>*]:!my-0 [&>*]:!leading-tight">
          {header}
        </div>
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

const getPreviewScrollContainer = (previewRoot: HTMLElement | null) =>
  previewRoot?.closest<HTMLElement>('.writr-markdown-preview') ?? null

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
    const toc = useMemo(() => buildMarkdownToc(previewMarkdown), [previewMarkdown])
    const containerRef = useRef<HTMLDivElement>(null)
    const [showFloatingToc, setShowFloatingToc] = useState(false)

    const scrollToHeader = useCallback((id: string) => {
      const previewRoot = containerRef.current
      const scrollContainer = getPreviewScrollContainer(previewRoot)
      if (!previewRoot) return

      const el = findScopedHeadingById(previewRoot, id)
      if (!el) return

      if (scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        const offset = elRect.top - containerRect.top + scrollContainer.scrollTop - 20
        scrollContainer.scrollTo({ top: offset, behavior: 'smooth' })
      } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, [])

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
                <h1
                  id={id}
                  className="font-sans text-2xl font-semibold text-[var(--obsidian-text)]"
                >
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
                <strong className="font-bold text-[var(--obsidian-text)]">
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
                        className="max-w-full w-auto h-auto rounded-lg shadow-[0_10px_28px_rgba(0,0,0,0.18)] my-4 border border-obsidian-border"
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
                    'my-8 border-t border-obsidian-border'
                  )}
                />
              ),
              table: ({ children }) => (
                <div className="w-full overflow-x-auto my-6 border border-obsidian-border rounded-lg">
                  <table className="w-full table-auto border-collapse">{children}</table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-[var(--obsidian-table-head)] border-b border-obsidian-border-soft">
                  {children}
                </thead>
              ),
              tbody: ({ children }) => <tbody>{children}</tbody>,
              tr: ({ children }) => (
                <tr className="border-b border-obsidian-border-soft even:bg-[var(--obsidian-table-row)] transition-colors last:border-b-0">
                  {children}
                </tr>
              ),
              th: ({ children }) => (
                <th className="px-3 py-2 text-left text-[11px] font-bold text-[var(--obsidian-text-muted)] uppercase tracking-tight border-r border-obsidian-border last:border-r-0 align-top">
                  <div className="min-w-[140px] whitespace-normal break-words">{children}</div>
                </th>
              ),
              td: ({ children }) => (
                <td className="px-3 py-1.5 text-xs text-[var(--obsidian-text)] border-r border-obsidian-border-soft last:border-r-0 align-top">
                  <div className="min-w-[140px] whitespace-normal break-words">{children}</div>
                </td>
              ),
              code: ({ children, className, ...rest }) => {
                const match = /language-(\w+)/.exec(className || '')
                const language = match ? match[1] : ''
                const isInline = !match
                const codeContent = String(children).replace(/\n$/, '')

                if (language === 'mermaid') {
                  return (
                    <Suspense fallback={<div className="p-3 text-xs text-[var(--obsidian-text-muted)] animate-pulse border border-[var(--obsidian-border)] rounded-lg">Loading diagram...</div>}>
                      <MermaidDiagram chart={codeContent} />
                    </Suspense>
                  )
                }

                if (isInline && codeContent.toLowerCase().startsWith('kbd:')) {
                  const keyText = codeContent.slice(4)
                  return (
                    <kbd className="inline-flex items-center rounded-md border border-obsidian-border bg-[var(--obsidian-pane)] px-1.5 py-0.5 text-[11px] font-mono font-medium text-[var(--obsidian-text)] shadow-[inset_0_-1px_0_rgba(0,0,0,0.22),0_10px_28px_rgba(0,0,0,0.06)]">
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
                  <PreviewCodeBlock
                    language={language}
                    codeContent={codeContent}
                    isDarkMode={isDarkMode}
                  />
                )
              },
              pre: ({ children }) => (
                <div className="w-full">{children}</div>
              ),
              img: ({ src, alt }) => {
                const finalSrc = src ? toLocalFileUrl(src, selectedNotePath, rootDir) : src
                return (
                  <div className={previewReadableWidthClass}>
                    <img
                      src={finalSrc}
                      alt={alt}
                      className="max-w-full w-auto h-auto rounded-lg shadow-[0_10px_28px_rgba(0,0,0,0.18)] my-4 border border-obsidian-border"
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

        {toc.length > 0 && (
          <>
            {/* Inline TOC Sidebar for desktop view */}
            <div className={twMerge('hidden xl:block shrink-0 sticky top-2 self-start z-10', isFullPreview ? 'block' : '!hidden')}>
              <TableOfContents
                items={toc}
                onSelectTocItem={scrollToHeader}
                containerRef={containerRef}
              />
            </div>

            {/* Floating TOC Trigger Button & Popover (for smaller viewports or split view mode) */}
            <div className={twMerge('fixed bottom-6 right-6 z-30', isFullPreview ? 'xl:hidden' : 'block')}>
              {!showFloatingToc ? (
                <button
                  onClick={() => setShowFloatingToc(true)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[var(--obsidian-pane)] border border-[var(--obsidian-border)] shadow-xl text-[var(--obsidian-text)] text-xs font-medium hover:bg-[var(--obsidian-hover-soft)] transition-all hover:scale-105 active:scale-95 cursor-pointer select-none"
                >
                  <FiList className="w-4 h-4 text-[var(--obsidian-accent)]" />
                  <span>Contents</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-[var(--obsidian-accent-dim)] text-[var(--obsidian-text)] text-[10px] font-mono font-semibold">
                    {toc.length}
                  </span>
                </button>
              ) : (
                <div className="relative shadow-2xl rounded-xl">
                  <TableOfContents
                    items={toc}
                    onSelectTocItem={scrollToHeader}
                    containerRef={containerRef}
                    isMobilePopover
                    onClosePopover={() => setShowFloatingToc(false)}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    )
  }
)
