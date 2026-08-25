'use client'
import React from 'react'
import { VscChevronDown, VscChromeClose, VscAdd } from 'react-icons/vsc'
import { twMerge } from 'tailwind-merge'
import { NOTE_STATUS_META, NOTE_STATUS_VALUES } from '@renderer/constants/noteStatus'
import { CUSTOM_TAG_STYLE } from '@renderer/constants/noteTag'
import { MoreActionsMenu } from './MoreActionsMenu'

interface EditorHeaderProps {
  title: string
  path: string
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error'
  saveError?: string | null
  hasUnsavedChanges?: boolean
  onRetrySave?: () => void
  currentStatus?: string
  currentTag?: string
  tagInput: string
  setTagInput: (val: string) => void
  handleStatusChange: (status: string) => void
  handleTagChange: (tag: string) => void
  handleExportPdf: () => void
  onRename?: (newName: string) => void
  isExportingPdf: boolean
  isActive: boolean
}

const POPULAR_EMOJIS = [
  // Writing & Work
  '📝', '💡', '📌', '📅', '📋', '🗒️',
  // Status & Priority
  '✅', '❌', '⚠️', '🔥', '⭐', '🏆',
  // Tech & Dev
  '💻', '🚀', '🐛', '🛠️', '⚙️', '🔍',
  // Creative
  '🎨', '✨', '🎯', '🎉', '🌟', '💫',
  // Nature & Weather
  '🌍', '🌞', '🌙', '⚡', '❄️', '🌊',
  // Food & Drink
  '☕', '🍎', '🍕', '🎂', '🍵', '🥑',
  // People & Feelings
  '❤️', '🤔', '😊', '🙏', '💪', '🧠',
  // Objects
  '📖', '📚', '📁', '📊', '🔒', '🔑',
  // Music & Entertainment
  '🎵', '🎧', '🎬', '🎮', '🎲', '🃏',
  // Animals
  '🐛', '🦊', '🐼', '🦁', '🐙', '🦋',
  // Symbols
  '💎', '🧩', '⚗️', '🔭', '🧬', '🗺️',
  // Misc
  '🏠', '✈️', '🚗', '💰', '📷', '🎁',
]

export const EditorHeader = ({
  title,
  path,
  saveStatus = 'idle',
  saveError,
  hasUnsavedChanges = false,
  onRetrySave,
  currentStatus,
  currentTag,
  tagInput,
  setTagInput,
  handleStatusChange,
  handleTagChange,
  handleExportPdf,
  onRename,
  isExportingPdf,
  isActive
}: EditorHeaderProps) => {
  const titleEmojiMatch = title.match(/^([\p{Emoji_Presentation}\p{Extended_Pictographic}])/u)
  const currentEmoji = titleEmojiMatch ? titleEmojiMatch[1] : null
  const displayTitle = currentEmoji ? title.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u, '') : title

  const [isEditing, setIsEditing] = React.useState(false)
  const [editValue, setEditValue] = React.useState(displayTitle)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = React.useState(false)
  const emojiPickerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!isActive) return
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setIsEmojiPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isActive])

  React.useEffect(() => {
    setEditValue(displayTitle)
  }, [displayTitle, isEditing])

  React.useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  const handleRename = () => {
    setIsEditing(false)
    if (editValue.trim() && editValue !== displayTitle) {
      const finalName = currentEmoji ? `${currentEmoji} ${editValue.trim()}` : editValue.trim()
      onRename?.(finalName)
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    const currentBaseName = isEditing ? editValue.trim() : displayTitle
    const finalName = `${emoji} ${currentBaseName}`
    
    if (isEditing) {
      // Keep editValue as the base name, since emoji is shown in the button
      // But we need to trigger a rename to save the new emoji immediately.
      onRename?.(finalName)
      inputRef.current?.focus()
    } else {
      onRename?.(finalName)
    }
  }

  const saveLabel =
    saveStatus === 'error'
      ? 'Save failed'
      : hasUnsavedChanges || saveStatus === 'saving'
        ? 'Saving...'
        : saveStatus === 'saved'
          ? 'Saved'
          : ''

  return (
    <div className="flex flex-col px-6 py-4 bg-[var(--obsidian-workspace)] shrink-0 border-b border-obsidian-border-soft">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center flex-1 mr-4 min-w-0">
          <div className="relative group mr-2 shrink-0" ref={emojiPickerRef}>
            <button
              className="text-xl w-7 h-7 flex items-center justify-center hover:bg-[var(--obsidian-hover)] rounded transition-colors text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)]"
              onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
              title={currentEmoji ? "Change emoji" : "Add emoji"}
            >
              {currentEmoji ? currentEmoji : <VscAdd className="w-4 h-4" />}
            </button>
            {isEmojiPickerOpen && (
              <div className="absolute top-full left-0 mt-1 bg-[var(--obsidian-surface)] border border-obsidian-border rounded-md shadow-lg p-2 z-50 w-max">
                <div className="grid grid-cols-6 gap-1">
                  {POPULAR_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      className="text-xl w-8 h-8 flex items-center justify-center hover:bg-[var(--obsidian-hover)] rounded transition-colors"
                      onClick={() => {
                        handleEmojiSelect(emoji)
                        setIsEmojiPickerOpen(false)
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              className="text-2xl font-semibold bg-transparent border-b border-[var(--obsidian-accent)] outline-none text-[var(--obsidian-text)] flex-1 min-w-0"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') setIsEditing(false)
              }}
            />
          ) : (
            <h1
              className="text-2xl font-semibold text-[var(--obsidian-text)] truncate flex-1 min-w-0 cursor-text"
              onDoubleClick={() => setIsEditing(true)}
            >
              {displayTitle}
            </h1>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <MoreActionsMenu
            notePath={path}
            onExportPdf={handleExportPdf}
            isExportingPdf={isExportingPdf}
          />
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-3 ml-1 text-[12px]">
        {saveLabel ? (
          <>
            <div
              className={twMerge(
                'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                saveStatus === 'error'
                  ? 'border-red-500/40 bg-red-500/10 text-red-500'
                  : 'border-obsidian-border text-[var(--obsidian-text-muted)]'
              )}
              title={
                saveStatus === 'error' ? (saveError ?? 'Unable to save this note.') : saveLabel
              }
            >
              <span>{saveLabel}</span>
              {saveStatus === 'error' && onRetrySave ? (
                <button
                  type="button"
                  onClick={onRetrySave}
                  className="ml-2 underline underline-offset-2 hover:opacity-80"
                >
                  Retry
                </button>
              ) : null}
            </div>
            <div className="w-px h-3 bg-[var(--obsidian-border)]" />
          </>
        ) : null}

        <div className="relative group">
          <div className="flex items-center gap-1 cursor-pointer text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)]">
            {currentStatus ? (
              <span
                className={twMerge(
                  'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase',
                  NOTE_STATUS_META[currentStatus as keyof typeof NOTE_STATUS_META]?.className
                )}
              >
                {NOTE_STATUS_META[currentStatus as keyof typeof NOTE_STATUS_META]?.label}
              </span>
            ) : (
              <span>Status</span>
            )}
            <VscChevronDown className="w-3 h-3" />
          </div>
          <select
            value={currentStatus ?? ''}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
            title="Set note status"
          >
            <option value="">No Status</option>
            {NOTE_STATUS_VALUES.map((statusValue) => (
              <option key={statusValue} value={statusValue}>
                {NOTE_STATUS_META[statusValue].label}
              </option>
            ))}
          </select>
        </div>

        <div className="w-px h-3 bg-[var(--obsidian-border)]" />

        <div className="flex items-center gap-2">
          {currentTag ? (
            <div
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium transition-colors ${CUSTOM_TAG_STYLE}`}
            >
              <span>{currentTag}</span>
              <button
                onClick={() => handleTagChange('')}
                className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
              >
                <VscChromeClose className="w-2.5 h-2.5" />
              </button>
            </div>
          ) : (
            <div className="relative group">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tagInput.trim()) {
                    handleTagChange(tagInput.trim())
                    setTagInput('')
                  }
                }}
                placeholder="Add Tag"
                className="bg-transparent border-none outline-none text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] focus:text-[var(--obsidian-text)] placeholder:text-[var(--obsidian-text-muted)] w-16 focus:w-32 transition-all"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
