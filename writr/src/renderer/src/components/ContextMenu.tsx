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
      className="fixed z-50 bg-white dark:bg-[#252526] border border-zinc-200 dark:border-[#454545] shadow-lg rounded py-1 min-w-[150px]"
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
        className="w-full text-left px-3 py-1.5 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 text-sm text-zinc-700 dark:text-zinc-300"
        {...props}
    >
        {children}
    </button>
)
