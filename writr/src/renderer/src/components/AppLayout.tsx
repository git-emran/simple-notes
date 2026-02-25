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
  // onClose,
  width,
  minWidth,
  ...props
}: ComponentProps<'aside'> & { onClose?: () => void; width?: number; minWidth?: number }) => {
  return (
    <aside
      className={twMerge(
        'h-full flex flex-col relative border-r border-[var(--obsidian-border)] bg-[var(--obsidian-sidebar)]',
        className
      )}
      style={{ width, minWidth }}
      {...props}
    >
      <div className="flex-1 overflow-auto">{children}</div>

      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[var(--obsidian-accent-dim)]"
        id="resize-handle"
      />
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
