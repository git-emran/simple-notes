import { ComponentProps } from 'react'
import { twMerge } from 'tailwind-merge'

export const FloatingNoteTitle = ({ className, ...props }: ComponentProps<'div'>) => {
  const title = 'Note Title'
  return (
    <div {...props} className={twMerge('flex justify-center', className)}>
      <span className="text-gray-400">{title}</span>
    </div>
  )
}
