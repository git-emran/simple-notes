import { NoteInfo } from '@shared/models'
import { cn, formatDateFromMs } from '@renderer/utils'
import { ComponentProps } from 'react'

export type NotePreviewProps = NoteInfo & {
  isActive?: boolean
} & ComponentProps<'div'>

export const NotePreview = ({
  title,
  content,
  lastEditTime,
  isActive = false,
  className,
  ...props
}: NotePreviewProps) => {
  const date = formatDateFromMs(lastEditTime)
  return (
    <div
      className={cn(
        'cursor-pointer px-2.5 py-3 rounded-md transition-colors duration-75',
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
      <p className="mb-1 text-xs text-gray-700 dark:text-gray-50 truncate">{title}</p>
      <span className="inline-block w-full dark:text-gray-50 mb-2 text-xs font-light text-left text-gray-600 ">{date}</span>
    </div>
  )
}
