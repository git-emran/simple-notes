import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { VscEllipsis, VscPinned, VscFiles, VscMail, VscFilePdf } from 'react-icons/vsc'
import { useAtom, useSetAtom } from 'jotai'
import { pinnedNotePathsAtom, duplicateNoteAtom } from '@renderer/store'
import { twMerge } from 'tailwind-merge'

interface tionsMenuProps {
  notePath: string
  onExportPdf: () => void
  isExportingPdf: boolean
}

export const MoreActionsMenu = ({ notePath, onExportPdf, isExportingPdf }: tionsMenuProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [pinnedPaths, setPinnedPaths] = useAtom(pinnedNotePathsAtom)
  const duplicateNote = useSetAtom(duplicateNoteAtom)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const isPinned = pinnedPaths.includes(notePath)


  const handleDuplicate = () => {
    void duplicateNote(notePath)
    setIsOpen(false)
  }



  /* Close when clicking outside */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const btnClass = 'flex items-center gap-2 w-full px-4 py-2 text-sm text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)] transition-colors text-left'

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-md text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)] transition-all"
        title="More actions"
      >
        <VscEllipsis className="w-5 h-5" />
      </button>

      {isOpen && createPortal(
        <div
          ref={menuRef}
          className="fixed bg-[var(--obsidian-pane)] border border-[var(--obsidian-border)] rounded-md shadow-xl z-[9999] py-1 min-w-[180px]"
          style={{
            top: buttonRef.current ? buttonRef.current.getBoundingClientRect().bottom + 5 : 0,
            right: buttonRef.current ? window.innerWidth - buttonRef.current.getBoundingClientRect().right : 0
          }}
        >
          
          <button onClick={handleDuplicate} className={btnClass}>
            <VscFiles className="w-4 h-4" />
            Duplicate
          </button>

        

          <div className="h-px bg-[var(--obsidian-border-soft)] my-1" />

          <button 
            onClick={() => { onExportPdf(); setIsOpen(false); }} 
            disabled={isExportingPdf}
            className={twMerge(btnClass, isExportingPdf && "opacity-50 pointer-events-none")}
          >
            <VscFilePdf className="w-4 h-4" />
            Export to PDF
          </button>
        </div>,
        document.body
      )}
    </div>
  )
}
