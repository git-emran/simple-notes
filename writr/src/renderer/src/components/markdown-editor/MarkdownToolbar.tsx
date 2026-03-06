import {
  FaBold,
  FaItalic,
  FaQuoteRight,
  FaCode,
  FaListUl,
  FaListOl,
  FaLink,
  FaHeading,
  FaTable,
  FaCheckSquare,
  FaStrikethrough,
  FaChevronDown,
  FaImage,
  FaKeyboard
} from "react-icons/fa"
import { MdHorizontalRule } from "react-icons/md"
import { VscSparkle } from "react-icons/vsc"
import { EditorView } from "@codemirror/view"
import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import * as commands from "./editorCommands"

export const MarkdownToolbar = ({
  view,
  onWriteWithAi
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
          commands.applyFormat(view, "**", "**")
          break
        case 'i':
          e.preventDefault()
          commands.applyFormat(view, "*", "*")
          break
        case 'k':
          e.preventDefault()
          commands.applyLinkFormat(view)
          break
        case '`':
          e.preventDefault()
          if (e.shiftKey) {
            commands.insertCodeBlock(view)
          } else {
            commands.applyFormat(view, "`", "`")
          }
          break
        case 'q':
          e.preventDefault()
          commands.applyLineFormat(view, "> ")
          break
        case 'l':
          e.preventDefault()
          if (e.shiftKey) {
            commands.applyLineFormat(view, "1. ")
          } else {
            commands.applyLineFormat(view, "- ")
          }
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
          commands.applyFormat(view, "~~", "~~")
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

  /* Position dropdown dynamically */
  useEffect(() => {
    if (showHeaderDropdown && dropdownRef.current && headerButtonRef.current) {
      const buttonRect = headerButtonRef.current.getBoundingClientRect()
      const dropdown = dropdownRef.current

      /* Position dropdown below the button */
      dropdown.style.top = `${buttonRect.bottom + window.scrollY}px`
      dropdown.style.left = `${buttonRect.left + window.scrollX}px`

      /* Prevent overflow by adjusting if near right edge */
      const dropdownRect = dropdown.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      if (buttonRect.left + dropdownRect.width > viewportWidth) {
        dropdown.style.left = 'auto'
        dropdown.style.right = `${window.innerWidth - buttonRect.right + window.scrollX}px`
      }
    }
  }, [showHeaderDropdown])

  const applyHeaderFormat = (level: number) => {
    commands.applyHeaderFormat(view, level)
    setShowHeaderDropdown(false)
  }

  const btnClass =
    'p-1.5 rounded-md transition-colors text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)] flex-shrink-0'

  const renderDropdown = () => {
    if (!showHeaderDropdown) return null

    return createPortal(
      <div
        ref={dropdownRef}
        className="fixed bg-[var(--obsidian-pane)] border border-[var(--obsidian-border)] rounded shadow-lg z-[1000] max-w-md py-2 min-w-[150px]"
      >
        {[1, 2, 3, 4, 5, 6].map((level) => (
          <button
            key={level}
            onClick={() => applyHeaderFormat(level)}
            className="w-full px-4 py-2 text-left hover:bg-[var(--obsidian-accent-dim)] text-[var(--obsidian-text)] transition-colors"
            role="menuitem"
          >
            <span className="font-bold">H{level}</span>
            <span className="ml-2 text-sm opacity-75">
              {"#".repeat(level)} Heading {level}
            </span>
          </button>
        ))}
      </div>,
      document.body // Render dropdown at the root of the DOM
    )
  }

  return (
    <div className="flex items-center flex-wrap gap-1.5 px-6 py-2 max-w-full shrink-0 border-b border-[var(--obsidian-border-soft)] bg-[var(--obsidian-pane)]">
      {/* Text Formatting */}
      <button
        onClick={() => commands.applyFormat(view, "**", "**")}
        disabled={!view}
        className={btnClass}
        title="Bold (Ctrl+B)"
      >
        <FaBold />
      </button>

      <button
        onClick={() => commands.applyFormat(view, "*", "*")}
        disabled={!view}
        className={btnClass}
        title="Italic (Ctrl+I)"
      >
        <FaItalic />
      </button>

      <button
        onClick={() => commands.applyFormat(view, "~~", "~~")}
        disabled={!view}
        className={btnClass}
        title="Strikethrough (Ctrl+D)"
      >
        <FaStrikethrough />
      </button>

      <button
        onClick={() => commands.insertKbd(view)}
        disabled={!view}
        className={btnClass}
        title="Keyboard key (<kbd>)"
      >
        <FaKeyboard />
      </button>

      <div className="w-px h-4 bg-[var(--obsidian-border)] mx-2" />

      {/* Headers Dropdown */}
      <div className="relative">
        <button
          ref={headerButtonRef}
          onClick={() => setShowHeaderDropdown(!showHeaderDropdown)}
          disabled={!view}
          className={`${btnClass} flex items-center gap-1`}
          title="Headers"
          aria-expanded={showHeaderDropdown}
          aria-haspopup="true"
        >
          <FaHeading />
          <FaChevronDown className="text-xs" />
        </button>
      </div>

      <button
        onClick={() => commands.applyLineFormat(view, "> ")}
        disabled={!view}
        className={btnClass}
        title="Quote (Ctrl+Q)"
      >
        <FaQuoteRight />
      </button>

      <div className="w-px h-4 bg-[var(--obsidian-border)] mx-2" />

      {/* Lists */}
      <button
        onClick={() => commands.applyLineFormat(view, "- ")}
        disabled={!view}
        className={btnClass}
        title="Bullet List (Ctrl+L)"
      >
        <FaListUl />
      </button>

      <button
        onClick={() => commands.applyLineFormat(view, "1. ")}
        disabled={!view}
        className={btnClass}
        title="Numbered List (Ctrl+Shift+L)"
      >
        <FaListOl />
      </button>

      <button
        onClick={() => commands.insertCheckbox(view)}
        disabled={!view}
        className={btnClass}
        title="Task List (Ctrl+T)"
      >
        <FaCheckSquare />
      </button>

      <div className="w-px h-4 bg-[var(--obsidian-border)] mx-2" />

      {/* Code */}
      <button
        onClick={() => commands.applyFormat(view, "`", "`")}
        disabled={!view}
        className={btnClass}
        title="Inline Code (Ctrl+`)"
      >
        <FaCode />
      </button>

      <button
        onClick={() => commands.insertCodeBlock(view)}
        disabled={!view}
        className={btnClass}
        title="Code Block (Ctrl+Shift+`)"
      >
        <div className="text-xs font-mono">{`{}`}</div>
      </button>

      <div className="w-px h-4 bg-[var(--obsidian-border)] mx-2" />

      {/* Insertions */}
      <button
        onClick={() => commands.applyLinkFormat(view)}
        disabled={!view}
        className={btnClass}
        title="Link (Ctrl+K)"
      >
        <FaLink />
      </button>

      <button
        onClick={() => commands.applyImageFormat(view)}
        disabled={!view}
        className={btnClass}
        title="Insert Image"
      >
        <FaImage />
      </button>

      <button
        onClick={() => commands.insertTable(view)}
        disabled={!view}
        className={btnClass}
        title="Table"
      >
        <FaTable />
      </button>

      <button
        onClick={() => commands.insertHorizontalRule(view)}
        disabled={!view}
        className={btnClass}
        title="Horizontal Rule (Ctrl+H)"
      >
        <MdHorizontalRule className="w-5 h-5" />
      </button>

      <div className="w-px h-4 bg-[var(--obsidian-border)] mx-2" />

      <button
        onClick={onWriteWithAi}
        disabled={!view}
        className={btnClass}
        title="Write with AI"
      >
        <VscSparkle />
      </button>

      {renderDropdown()}
    </div>
  )
}
