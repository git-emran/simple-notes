import { ReactNode } from 'react'

interface TooltipProps {
  children: ReactNode
  content: string
  icon?: ReactNode
  position?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
}

export const Tooltip = ({ children, content, icon, position = 'right', className = '' }: TooltipProps) => {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  }

  return (
    <div className={`group relative inline-flex justify-center items-center ${className}`}>
      {children}
      <div 
        className={`absolute z-[999] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap bg-[var(--obsidian-pane)] text-[var(--obsidian-text)] border border-[var(--obsidian-border)] px-2.5 py-1.5 rounded-md shadow-lg flex items-center gap-1.5 ${positionClasses[position]}`}
      >
        {icon && <span className="text-[var(--obsidian-text-muted)] flex items-center justify-center">{icon}</span>}
        <span className="text-[12px] font-medium leading-none">{content}</span>
      </div>
    </div>
  )
}
