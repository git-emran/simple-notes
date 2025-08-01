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
          'bg-zinc-400/75': isActive,
          'hover:bg-zinc-500/50': !isActive
        },
        className
      )}
      {...props}
    >
      <h2 className="mb-1 font-bold truncate">{title}</h2>
      <span className="inline-block w-full mb-2 text-xs font-light text-left ">{date}</span>
    </div>
  )
}
