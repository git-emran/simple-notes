import { ComponentProps, useLayoutEffect, useEffect, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'

export type ContextMenuProps = ComponentProps<'div'> & {
  x: number
  y: number
  onClose: () => void
}

export const ContextMenu = ({ x, y, onClose, children, className, style, ...props }: ContextMenuProps) => {
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
      className={twMerge('context-menu-glass', className)}
      style={{
        ...style,
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

export const ContextMenuItem = ({ children, onClick, className, ...props }: ComponentProps<'button'>) => (
  <button
    onClick={(e) => {
      e.stopPropagation()
      onClick?.(e)
    }}
    className={twMerge('context-menu-item', className)}
    {...props}
  >
    {children}
  </button>
)
