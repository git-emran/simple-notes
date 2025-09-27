import { NoteInfo } from '@shared/models'
import { cn } from '@renderer/utils'
import { ComponentProps } from 'react'

export type NotePreviewProps = NoteInfo & {
  isActive?: boolean
} & ComponentProps<'div'>

export const NotePreview = ({
  title,
  isActive = false,
  className,
  ...props
}: NotePreviewProps) => {
  return (
    <div
      className={cn(
        'cursor-pointer px-2 m-1 py-1 rounded-sm transition-colors duration-75',
        {
          'bg-gray-400/20': isActive,
          'dark:bg-black/30': isActive,
          'hover:bg-gray-400/20': !isActive,
          'dark:hover:bg-black/30': !isActive,

        },
        className
      )}
      {...props}
    >
      <p className=" font-sans text-xs font-medium gap-6 text-gray-700 dark:text-gray-50 truncate">{title}</p>
    </div>
  )
}
