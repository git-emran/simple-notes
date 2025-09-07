'use client'

import { ComponentProps, forwardRef } from 'react'
import { twMerge } from 'tailwind-merge'

export const RootLayout = ({ children, className, ...props }: ComponentProps<'main'>) => {
  return (
    <main className={twMerge('flex h-screen w-full', className)} {...props}>
      {children}
    </main>
  )
}

export const Sidebar = ({
  className,
  children,
  onClose,
  width,
  ...props
}: ComponentProps<'aside'> & { onClose?: () => void; width?: number }) => {
  return (
    <aside
      className={twMerge(
        'h-full flex flex-col border-r bg-background relative',
        className
      )}
      style={{ width }}
      {...props}
    >
      {/* Header */}
      <div className="flex-1 overflow-auto">{children}</div>

      {/* Resize Handle */}
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-muted"
        id="resize-handle"
      />
    </aside>
  )
}

export const Content = forwardRef<HTMLDivElement, ComponentProps<'div'>>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={twMerge('flex-1 overflow-auto', className)}
      {...props}
    >
      {children}
    </div>
  )
)

Content.displayName = 'Content'

