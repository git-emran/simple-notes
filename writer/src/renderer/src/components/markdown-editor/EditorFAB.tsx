'use client'
import { HiOutlineEye } from 'react-icons/hi2'
import { VscSplitHorizontal } from 'react-icons/vsc'
import { twMerge } from 'tailwind-merge'

interface EditorFABProps {
  showFAB: boolean;
  isFullPreview: boolean;
  isPreview: boolean;
  handleFullPreviewToggle: () => void;
  handleSplitViewToggle: () => void;
}

export const EditorFAB = ({
  showFAB,
  isFullPreview,
  isPreview,
  handleFullPreviewToggle,
  handleSplitViewToggle
}: EditorFABProps) => {
  return (
    <div className={twMerge(
      "absolute bottom-10 right-4 flex flex-col items-center gap-0.5 bg-[var(--obsidian-workspace)] border border-[var(--obsidian-border)] rounded-xl shadow-xl z-[100] p-1 transition-all duration-300 transform",
      showFAB ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
    )}>
      <button
        onClick={handleFullPreviewToggle}
        className={twMerge(
          "p-1.5 rounded-lg transition-all",
          isFullPreview 
            ? "bg-[var(--obsidian-accent-dim)] text-[var(--obsidian-accent)]" 
            : "text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)]"
        )}
        title="Toggle Preview Mode"
      >
        <HiOutlineEye className="w-4 h-4" />
      </button>
      <div className="w-5 h-px bg-[var(--obsidian-border-soft)]" />
      <button
        onClick={handleSplitViewToggle}
        className={twMerge(
          "p-1.5 rounded-lg transition-all",
          isPreview && !isFullPreview
            ? "bg-[var(--obsidian-accent-dim)] text-[var(--obsidian-accent)]"
            : "text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)]"
        )}
        title="Toggle Split View"
      >
         <VscSplitHorizontal className="w-4 h-4" />
      </button>
    </div>
  )
}
