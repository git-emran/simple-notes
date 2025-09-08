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
  FaChevronDown
} from "react-icons/fa"
import { EditorView } from "@codemirror/view"
import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"

export const MarkdownToolbar = ({ view }: { view: EditorView | null }) => {
  const [showHeaderDropdown, setShowHeaderDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const headerButtonRef = useRef<HTMLButtonElement>(null)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!view || (!e.ctrlKey && !e.metaKey)) return

      const key = e.key.toLowerCase()
      let handled = false

      switch (key) {
        case 'b':
          e.preventDefault()
          applyFormat("**", "**")
          handled = true
          break
        case 'i':
          e.preventDefault()
          applyFormat("*", "*")
          handled = true
          break
        case 'k':
          e.preventDefault()
          applyLinkFormat()
          handled = true
          break
        case '`':
          e.preventDefault()
          if (e.shiftKey) {
            insertCodeBlock()
          } else {
            applyFormat("`", "`")
          }
          handled = true
          break
        case 'q':
          e.preventDefault()
          applyLineFormat("> ")
          handled = true
          break
        case 'l':
          e.preventDefault()
          if (e.shiftKey) {
            applyLineFormat("1. ")
          } else {
            applyLineFormat("- ")
          }
          handled = true
          break
        case 't':
          e.preventDefault()
          if (e.shiftKey) {
            insertTable()
          } else {
            insertCheckbox()
          }
          handled = true
          break
        case 'h':
          e.preventDefault()
          insertHorizontalRule()
          handled = true
          break
        case 'd':
          e.preventDefault()
          applyFormat("~~", "~~")
          handled = true
          break
      }

      // Handle header shortcuts (Ctrl/Cmd + 1-6)
      if (!handled && /^[1-6]$/.test(key)) {
        e.preventDefault()
        applyHeaderFormat(parseInt(key))
        handled = true
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [view])

  // Close dropdown when clicking outside
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

  // Position dropdown dynamically
  useEffect(() => {
    if (showHeaderDropdown && dropdownRef.current && headerButtonRef.current) {
      const buttonRect = headerButtonRef.current.getBoundingClientRect()
      const dropdown = dropdownRef.current

      // Position dropdown below the button
      dropdown.style.top = `${buttonRect.bottom + window.scrollY}px`
      dropdown.style.left = `${buttonRect.left + window.scrollX}px`

      // Prevent overflow by adjusting if near right edge
      const dropdownRect = dropdown.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      if (buttonRect.left + dropdownRect.width > viewportWidth) {
        dropdown.style.left = 'auto'
        dropdown.style.right = `${window.innerWidth - buttonRect.right + window.scrollX}px`
      }
    }
  }, [showHeaderDropdown])

  const applyFormat = (before: string, after: string = "") => {
    if (!view) return

    const { from, to, empty } = view.state.selection.main
    const selected = view.state.sliceDoc(from, to)

    if (empty) {
      const insert = before + after
      view.dispatch({
        changes: { from, to, insert },
        selection: { anchor: from + before.length }
      })
    } else {
      const insert = before + selected + after
      view.dispatch({
        changes: { from, to, insert },
        selection: {
          anchor: from,
          head: from + insert.length
        }
      })
    }

    view.focus()
  }

  const applyLineFormat = (prefix: string) => {
    if (!view) return

    const { from, to } = view.state.selection.main
    const line = view.state.doc.lineAt(from)
    const lineText = line.text

    if (lineText.startsWith(prefix)) {
      view.dispatch({
        changes: {
          from: line.from,
          to: line.from + prefix.length,
          insert: ""
        },
        selection: { anchor: from - prefix.length }
      })
    } else {
      view.dispatch({
        changes: {
          from: line.from,
          to: line.from,
          insert: prefix
        },
        selection: { anchor: from + prefix.length }
      })
    }

    view.focus()
  }

  const applyHeaderFormat = (level: number) => {
    const prefix = "#".repeat(level) + " "
    applyLineFormat(prefix)
    setShowHeaderDropdown(false)
  }

  const applyLinkFormat = () => {
    if (!view) return

    const { from, to, empty } = view.state.selection.main
    const selected = view.state.sliceDoc(from, to)

    if (empty) {
      const insert = "[link text](url)"
      view.dispatch({
        changes: { from, to, insert },
        selection: { anchor: from + 1, head: from + 10 }
      })
    } else {
      const insert = `[${selected}](url)`
      view.dispatch({
        changes: { from, to, insert },
        selection: {
          anchor: from + selected.length + 3,
          head: from + selected.length + 6
        }
      })
    }

    view.focus()
  }

  const insertTable = () => {
    if (!view) return

    const { from, to } = view.state.selection.main
    const tableTemplate = `| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |

`

    view.dispatch({
      changes: { from, to, insert: tableTemplate },
      selection: { anchor: from + 2, head: from + 10 }
    })

    view.focus()
  }

  const insertCheckbox = () => {
    if (!view) return

    const { from, to } = view.state.selection.main
    const line = view.state.doc.lineAt(from)

    const checkboxText = "- [ ] "
    view.dispatch({
      changes: {
        from: line.from,
        to: line.from,
        insert: checkboxText
      },
      selection: { anchor: from + checkboxText.length }
    })

    view.focus()
  }

  const insertHorizontalRule = () => {
    if (!view) return

    const { from, to } = view.state.selection.main
    const line = view.state.doc.lineAt(from)

    const hrText = "\n---\n"
    view.dispatch({
      changes: { from: line.to, to: line.to, insert: hrText },
      selection: { anchor: line.to + hrText.length }
    })

    view.focus()
  }

  const insertCodeBlock = () => {
    if (!view) return

    const { from, to, empty } = view.state.selection.main
    const selected = view.state.sliceDoc(from, to)

    if (empty) {
      const codeBlock = "```\ncode here\n```"
      view.dispatch({
        changes: { from, to, insert: codeBlock },
        selection: { anchor: from + 4, head: from + 13 }
      })
    } else {
      const codeBlock = "```\n" + selected + "\n```"
      view.dispatch({
        changes: { from, to, insert: codeBlock },
        selection: { anchor: from + 4 + selected.length + 1 }
      })
    }

    view.focus()
  }

  const btnClass = "p-[0.18rem] rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-600 dark:text-gray-300"
  const activeBtnClass = "p-4 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white"

  const renderDropdown = () => {
    if (!showHeaderDropdown) return null

    return createPortal(
      <div
        ref={dropdownRef}
        className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-[1000] max-w-md py-2 min-w-[150px]"
      >
        {[1, 2, 3, 4, 5, 6].map((level) => (
          <button
            key={level}
            onClick={() => applyHeaderFormat(level)}
            className="w-full px-4 py-2 text-left hover:bg-gray-300 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
            role="menuitem"
          >
            <span className="font-bold">H{level}</span>
            <span className="ml-2 text-sm opacity-75">
              {"#".repeat(level)} Heading {level}
            </span>
            {" "}
            <span className="text-[0.6rem] p-1 rounded-sm font-medium bg-gray-100 shadow-lg text-gray-700">
              Ctrl+{level}
            </span>
          </button>
        ))}
      </div>,
      document.body // Render dropdown at the root of the DOM
    )
  }

  return (
    <div className="flex items-center gap-3 px-3 py-1 border-b border-gray-400/30 dark:border-gray-500 bg-transparent dark:bg-transparent overflow-x-auto max-w-full">
      {/* Text Formatting */}
      <button
        onClick={() => applyFormat("**", "**")}
        disabled={!view}
        className={btnClass}
        title="Bold (Ctrl+B)"
      >
        <FaBold />
      </button>

      <button
        onClick={() => applyFormat("*", "*")}
        disabled={!view}
        className={btnClass}
        title="Italic (Ctrl+I)"
      >
        <FaItalic />
      </button>

      <button
        onClick={() => applyFormat("~~", "~~")}
        disabled={!view}
        className={btnClass}
        title="Strikethrough (Ctrl+D)"
      >
        <FaStrikethrough />
      </button>

      <div className="w-px h-6 bg-gray-400/70 dark:bg-gray-300 mx-1" />

      {/* Headers Dropdown */}
      <div className="relative">
        <button
          ref={headerButtonRef}
          onClick={() => setShowHeaderDropdown(!showHeaderDropdown)}
          disabled={!view}
          className={`${btnClass} flex items-center gap-1`}
          title="Headers (Ctrl+1-6)"
          aria-expanded={showHeaderDropdown}
          aria-haspopup="true"
        >
          <FaHeading />
          <FaChevronDown className="text-xs" />
        </button>
      </div>

      <button
        onClick={() => applyLineFormat("> ")}
        disabled={!view}
        className={btnClass}
        title="Quote (Ctrl+Q)"
      >
        <FaQuoteRight />
      </button>

      <div className="w-px h-6 bg-gray-400/70 dark:bg-gray-300 mx-1" />

      {/* Lists */}
      <button
        onClick={() => applyLineFormat("- ")}
        disabled={!view}
        className={btnClass}
        title="Bullet List (Ctrl+L)"
      >
        <FaListUl />
      </button>

      <button
        onClick={() => applyLineFormat("1. ")}
        disabled={!view}
        className={btnClass}
        title="Numbered List (Ctrl+Shift+L)"
      >
        <FaListOl />
      </button>

      <button
        onClick={insertCheckbox}
        disabled={!view}
        className={btnClass}
        title="Task List (Ctrl+T)"
      >
        <FaCheckSquare />
      </button>

      <div className="w-px h-6 bg-gray-400/70 dark:bg-gray-300 mx-1" />

      {/* Code */}
      <button
        onClick={() => applyFormat("`", "`")}
        disabled={!view}
        className={btnClass}
        title="Inline Code (Ctrl+`)"
      >
        <FaCode />
      </button>

      <button
        onClick={insertCodeBlock}
        disabled={!view}
        className={btnClass}
        title="Code Block (Ctrl+Shift+`)"
      >
        <div className="text-xs font-mono">{`{}`}</div>
      </button>

      <div className="w-px h-6 bg-gray-400/70 dark:bg-gray-300 mx-1" />

      {/* Insertions */}
      <button
        onClick={applyLinkFormat}
        disabled={!view}
        className={btnClass}
        title="Link (Ctrl+K)"
      >
        <FaLink />
      </button>

      <button
        onClick={insertTable}
        disabled={!view}
        className={btnClass}
        title="Table (Ctrl+Shift+T)"
      >
        <FaTable />
      </button>

      <button
        onClick={insertHorizontalRule}
        disabled={!view}
        className={btnClass}
        title="Horizontal Rule (Ctrl+H)"
      >
        <div className="text-xs font-bold text-slate-700 dark:text-slate-200">---</div>
      </button>

      {renderDropdown()}
    </div>
  )
}
