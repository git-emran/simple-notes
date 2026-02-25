import { ComponentProps, useLayoutEffect, useEffect, useRef, useState } from 'react'

export type ContextMenuProps = ComponentProps<'div'> & {
  x: number
  y: number
  onClose: () => void
}

export const ContextMenu = ({ x, y, onClose, children, ...props }: ContextMenuProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number; visible: boolean }>({
    top: y,
    left: x,
    visible: false
  })

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

  useLayoutEffect(() => {
    const menu = ref.current
    if (!menu) return

    const viewportPadding = 8
    const rect = menu.getBoundingClientRect()
    const maxLeft = window.innerWidth - rect.width - viewportPadding
    const maxTop = window.innerHeight - rect.height - viewportPadding

    const clampedLeft = Math.max(viewportPadding, Math.min(x, maxLeft))
    const clampedTop = Math.max(viewportPadding, Math.min(y, maxTop))

    setPosition({
      left: clampedLeft,
      top: clampedTop,
      visible: true
    })
  }, [x, y, children])

  return (
    <div
      ref={ref}
      className="fixed z-50 rounded-md py-1 min-w-[150px] max-h-[400px] overflow-y-auto preview-scrollbar bg-[var(--obsidian-pane)] border border-[var(--obsidian-border)] shadow-lg"
      style={{
        top: position.top,
        left: position.left,
        visibility: position.visible ? 'visible' : 'hidden'
      }}
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
