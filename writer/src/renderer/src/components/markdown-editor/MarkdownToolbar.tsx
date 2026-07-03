import type React from 'react'
import {
  FiBold,
  FiItalic,
  FiLink,
  FiCode,
  FiList,
  FiCheckSquare,
  FiMinus,
  FiHash,
  FiChevronDown,
  FiImage,
  FiType,
} from 'react-icons/fi'
import {
  VscSparkle,
  VscQuote,
  VscListOrdered,
  VscTable,
} from 'react-icons/vsc'
import { EditorView } from '@codemirror/view'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import * as commands from './editorCommands'

/* A single toolbar button */
const ToolBtn = ({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  disabled: boolean
  title: string
  children: React.ReactNode
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className="
      relative flex items-center justify-center w-8 h-8 rounded-lg
      text-[var(--obsidian-text-muted)] transition-all duration-150
      hover:text-[var(--obsidian-text)] hover:bg-white/10 dark:hover:bg-white/10
      disabled:opacity-35 disabled:cursor-not-allowed
      focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--obsidian-accent)]
      active:scale-95
    "
  >
    {children}
  </button>
)

/* Thin separator */
const Sep = () => (
  <div className="w-px h-4 mx-0.5 rounded-full bg-[var(--obsidian-border)] opacity-60 self-center shrink-0" />
)

export const MarkdownToolbar = ({
  view,
  onWriteWithAi,
}: {
  view: EditorView | null
  onWriteWithAi: () => void
}) => {
  const [showHeaderDropdown, setShowHeaderDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const headerButtonRef = useRef<HTMLButtonElement>(null)

  /* Keyboard shortcuts */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!view || (!e.ctrlKey && !e.metaKey)) return
      const key = e.key.toLowerCase()
      switch (key) {
        case 'b':
          e.preventDefault()
          commands.applyFormat(view, '**', '**')
          break
        case 'i':
          e.preventDefault()
          commands.applyFormat(view, '*', '*')
          break
        case 'k':
          e.preventDefault()
          commands.applyLinkFormat(view)
          break
        case '`':
          e.preventDefault()
          if (e.shiftKey) commands.insertCodeBlock(view)
          else commands.applyFormat(view, '`', '`')
          break
        case 'q':
          e.preventDefault()
          commands.applyLineFormat(view, '> ')
          break
        case 'l':
          e.preventDefault()
          if (e.shiftKey) commands.applyLineFormat(view, '1. ')
          else commands.applyLineFormat(view, '- ')
          break
        case 't':
          e.preventDefault()
          commands.insertCheckbox(view)
          break
        case 'h':
          e.preventDefault()
          commands.insertHorizontalRule(view)
          break
        case 'd':
          e.preventDefault()
          commands.applyFormat(view, '~~', '~~')
          break
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [view])

  /* Close dropdown when clicking outside */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        headerButtonRef.current &&
        !headerButtonRef.current.contains(event.target as Node)
      ) {
        setShowHeaderDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  /* Position dropdown */
  useEffect(() => {
    if (showHeaderDropdown && dropdownRef.current && headerButtonRef.current) {
      const buttonRect = headerButtonRef.current.getBoundingClientRect()
      const dropdown = dropdownRef.current
      
      const dropdownRect = dropdown.getBoundingClientRect()
      const dropdownWidth = dropdownRect.width || 160
      const dropdownHeight = dropdownRect.height || 220
      
      const gap = 6
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      
      // Determine vertical positioning: pop up if there isn't enough room below
      let top = buttonRect.bottom + gap
      if (buttonRect.bottom + gap + dropdownHeight > viewportHeight && buttonRect.top - gap - dropdownHeight > 0) {
        top = buttonRect.top - gap - dropdownHeight
      }
      
      // Determine horizontal positioning: center align or shift left/right to stay within viewport
      let left = buttonRect.left + (buttonRect.width / 2) - (dropdownWidth / 2)
      if (left + dropdownWidth > viewportWidth - 12) {
        left = viewportWidth - dropdownWidth - 12
      }
      if (left < 12) {
        left = 12
      }
      
      dropdown.style.top = `${top}px`
      dropdown.style.left = `${left}px`
    }
  }, [showHeaderDropdown])

  const applyHeaderFormat = (level: number) => {
    commands.applyHeaderFormat(view, level)
    setShowHeaderDropdown(false)
  }

  const renderDropdown = () => {
    if (!showHeaderDropdown) return null
    return createPortal(
      <div
        ref={dropdownRef}
        className="
          fixed z-[1000] min-w-[160px] py-1.5
          rounded-xl overflow-hidden
          bg-[var(--obsidian-pane)]/80 backdrop-blur-xl
          border border-[var(--obsidian-border)]
          shadow-[0_8px_32px_rgba(0,0,0,0.24)]
        "
      >
        {[1, 2, 3, 4, 5, 6].map((level) => (
          <button
            key={level}
            onClick={() => applyHeaderFormat(level)}
            className="
              w-full px-4 py-1.5 text-left flex items-center gap-3
              hover:bg-[var(--obsidian-accent-dim)]
              text-[var(--obsidian-text)] transition-colors
            "
            role="menuitem"
          >
            <span
              className="font-bold text-[var(--obsidian-accent)]"
              style={{ fontSize: `${Math.max(10, 16 - level * 1.5)}px` }}
            >
              H{level}
            </span>
            <span className="text-xs text-[var(--obsidian-text-muted)]">
              {'#'.repeat(level)} Heading {level}
            </span>
          </button>
        ))}
      </div>,
      document.body
    )
  }

  const disabled = !view

  return (
    /* Outer wrapper: transparent, no layout constraints, just wraps the pill */
    <div className="flex justify-center items-center bg-transparent shrink-0">
      {/* macOS Dock pill */}
      <div
        className="
          flex items-center gap-0.5 px-2 py-1
          rounded-2xl
          bg-white/5 dark:bg-white/[0.05]
          backdrop-blur-xl
          border border-[var(--obsidian-border)]
          shadow-[0_4px_24px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.07)]
        "
        role="toolbar"
        aria-label="Markdown formatting"
      >
        {/* Text style group */}
        <ToolBtn onClick={() => commands.applyFormat(view, '**', '**')} disabled={disabled} title="Bold (⌘B)">
          <FiBold className="w-[15px] h-[15px]" />
        </ToolBtn>
        <ToolBtn onClick={() => commands.applyFormat(view, '*', '*')} disabled={disabled} title="Italic (⌘I)">
          <FiItalic className="w-[15px] h-[15px]" />
        </ToolBtn>
        <ToolBtn onClick={() => commands.applyFormat(view, '~~', '~~')} disabled={disabled} title="Strikethrough (⌘D)">
          {/* S with horizontal line through it — custom SVG inline */}
          <svg viewBox="0 0 16 16" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="3" y1="8" x2="13" y2="8" />
            <path d="M5 5.5C5 4.12 6.34 3 8 3s3 1.12 3 2.5" />
            <path d="M5 10.5C5 11.88 6.34 13 8 13s3-1.12 3-2.5" />
          </svg>
        </ToolBtn>

        <Sep />

        {/* Heading dropdown */}
        <button
          ref={headerButtonRef}
          onClick={() => setShowHeaderDropdown((v) => !v)}
          disabled={disabled}
          title="Headings"
          aria-expanded={showHeaderDropdown}
          aria-haspopup="true"
          className="
            relative flex items-center gap-0.5 px-2 h-8 rounded-lg
            text-[var(--obsidian-text-muted)] transition-all duration-150
            hover:text-[var(--obsidian-text)] hover:bg-white/10 dark:hover:bg-white/10
            disabled:opacity-35 disabled:cursor-not-allowed
            focus:outline-none active:scale-95
          "
        >
          <FiHash className="w-[15px] h-[15px]" />
          <FiChevronDown
            className="w-3 h-3 transition-transform duration-150"
            style={{ transform: showHeaderDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </button>

        <ToolBtn onClick={() => commands.applyLineFormat(view, '> ')} disabled={disabled} title="Blockquote (⌘Q)">
          <VscQuote className="w-[15px] h-[15px]" />
        </ToolBtn>

        <Sep />

        {/* Lists */}
        <ToolBtn onClick={() => commands.applyLineFormat(view, '- ')} disabled={disabled} title="Bullet List (⌘L)">
          <FiList className="w-[15px] h-[15px]" />
        </ToolBtn>
        <ToolBtn onClick={() => commands.applyLineFormat(view, '1. ')} disabled={disabled} title="Numbered List (⌘⇧L)">
          <VscListOrdered className="w-[15px] h-[15px]" />
        </ToolBtn>
        <ToolBtn onClick={() => commands.insertCheckbox(view)} disabled={disabled} title="Task List (⌘T)">
          <FiCheckSquare className="w-[15px] h-[15px]" />
        </ToolBtn>

        <Sep />

        {/* Code */}
        <ToolBtn onClick={() => commands.applyFormat(view, '`', '`')} disabled={disabled} title="Inline Code (⌘`)">
          <FiCode className="w-[15px] h-[15px]" />
        </ToolBtn>
        <ToolBtn onClick={() => commands.insertCodeBlock(view)} disabled={disabled} title="Code Block (⌘⇧`)">
          <FiType className="w-[15px] h-[15px]" />
        </ToolBtn>

        <Sep />

        {/* Insertions */}
        <ToolBtn onClick={() => commands.applyLinkFormat(view)} disabled={disabled} title="Link (⌘K)">
          <FiLink className="w-[15px] h-[15px]" />
        </ToolBtn>
        <ToolBtn onClick={() => commands.applyImageFormat(view)} disabled={disabled} title="Insert Image">
          <FiImage className="w-[15px] h-[15px]" />
        </ToolBtn>
        <ToolBtn onClick={() => commands.insertTable(view)} disabled={disabled} title="Table">
          <VscTable className="w-[15px] h-[15px]" />
        </ToolBtn>
        <ToolBtn onClick={() => commands.insertHorizontalRule(view)} disabled={disabled} title="Horizontal Rule (⌘H)">
          <FiMinus className="w-[15px] h-[15px]" />
        </ToolBtn>

        <Sep />

        {/* AI */}
        <ToolBtn onClick={onWriteWithAi} disabled={disabled} title="Write with AI">
          <VscSparkle className="w-[15px] h-[15px] text-[var(--obsidian-accent)]" />
        </ToolBtn>
      </div>

      {renderDropdown()}
    </div>
  )
}
