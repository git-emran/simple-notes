import { ComponentProps, useEffect, useRef } from 'react'

export type ContextMenuProps = ComponentProps<'div'> & {
  x: number
  y: number
  onClose: () => void
}

export const ContextMenu = ({ x, y, onClose, children, ...props }: ContextMenuProps) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
        document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      className="fixed z-50 rounded-md py-1 min-w-[150px] max-h-[400px] overflow-y-auto preview-scrollbar bg-[var(--obsidian-pane)] border border-[var(--obsidian-border)] shadow-lg"
      style={{ top: y, left: x }}
      {...props}
    >
      {children}
    </div>
  )
}

export const ContextMenuItem = ({ children, onClick, ...props }: ComponentProps<'button'>) => (
    <button
        onClick={(e) => {
            e.stopPropagation()
            onClick?.(e)
        }}
        className="w-full text-left px-3 py-1.5 hover:bg-[var(--obsidian-accent-dim)] hover:text-white text-[13px] text-[var(--obsidian-text)] flex items-center gap-2"
        {...props}
    >
        {children}
    </button>
)
