'use client'

import { ComponentProps, forwardRef } from 'react'
import { twMerge } from 'tailwind-merge'

export const RootLayout = ({ children, className, ...props }: ComponentProps<'main'>) => {
  return (
    <main className={twMerge('flex h-screen w-full overflow-hidden', className)} {...props}>
      {children}
    </main>
  )
}

export const Sidebar = ({
  className,
  children,
  /* onClose, */
  width,
  minWidth,
  collapsed = false,
  isResizing = false,
  style,
  ...props
}: ComponentProps<'aside'> & {
  onClose?: () => void
  width?: number
  minWidth?: number
  collapsed?: boolean
  isResizing?: boolean
}) => {
  return (
    <aside
      className={twMerge(
        'h-full flex flex-col relative border-r border-obsidian-border bg-transparent shrink-0 overflow-hidden',
        !isResizing && 'transition-[width] duration-200 ease-out',
        collapsed && 'border-r-0 pointer-events-none',
        className
      )}
      style={{
        width: collapsed ? 0 : width,
        minWidth: collapsed ? 0 : minWidth,
        ...style
      }}
      {...props}
    >
      <div className="flex-1 overflow-auto" style={{ width, minWidth: width }}>
        {children}
      </div>

      {!collapsed && (
        <div
          className="absolute top-0 -right-1 h-full w-2 cursor-col-resize bg-transparent hover:bg-[var(--obsidian-accent-dim)] z-50"
          id="resize-handle"
          data-sidebar-resize-handle="true"
        />
      )}
    </aside>
  )
}

export const Content = forwardRef<HTMLDivElement, ComponentProps<'div'>>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={twMerge('flex-1 overflow-auto bg-[var(--obsidian-workspace)]', className)}
      {...props}
    >
      {children}
    </div>
  )
)

Content.displayName = 'Content'
