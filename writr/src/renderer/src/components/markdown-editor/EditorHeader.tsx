'use client'
import { VscChevronDown, VscChromeClose } from 'react-icons/vsc'
import { twMerge } from 'tailwind-merge'
import { NOTE_STATUS_META, NOTE_STATUS_VALUES } from '@renderer/constants/noteStatus'
import { CUSTOM_TAG_STYLE } from '@renderer/constants/noteTag'
import { MoreActionsMenu } from './MoreActionsMenu'

interface EditorHeaderProps {
  title: string;
  path: string;
  currentStatus?: string;
  currentTag?: string;
  tagInput: string;
  setTagInput: (val: string) => void;
  handleStatusChange: (status: string) => void;
  handleTagChange: (tag: string) => void;
  handleExportPdf: () => void;
  isExportingPdf: boolean;
}

export const EditorHeader = ({
  title,
  path,
  currentStatus,
  currentTag,
  tagInput,
  setTagInput,
  handleStatusChange,
  handleTagChange,
  handleExportPdf,
  isExportingPdf
}: EditorHeaderProps) => {
  return (
    <div className="flex flex-col px-6 py-4 bg-[var(--obsidian-workspace)] shrink-0 border-b border-[var(--obsidian-border-soft)]">
      <div className="flex items-start justify-between mb-2">
        <h1 className="text-2xl font-semibold text-[var(--obsidian-text)] truncate flex-1">
          {title}
        </h1>
        <div className="flex items-center gap-1">
          <MoreActionsMenu 
            notePath={path} 
            onExportPdf={handleExportPdf} 
            isExportingPdf={isExportingPdf}
          />
        </div>
      </div>

      <div className='flex items-center flex-wrap gap-3 text-[12px]'>
        <div className="flex items-center gap-1 text-[var(--obsidian-text-muted)] opacity-80">
          <span className="truncate max-w-[200px]">{path}</span>
        </div>

        <div className="w-px h-3 bg-[var(--obsidian-border)]" />

        <div className="relative group">
          <div className="flex items-center gap-1 cursor-pointer text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)]">
             {currentStatus ? (
               <span className={twMerge(
                 "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                 NOTE_STATUS_META[currentStatus as keyof typeof NOTE_STATUS_META]?.className
               )}>
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
