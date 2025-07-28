import { selectedNoteAtom } from '@renderer/store'
import { useAtomValue } from 'jotai'
import { ComponentProps } from 'react'
import { twMerge } from 'tailwind-merge'

export const FloatingNoteTitle = ({ className, ...props }: ComponentProps<'div'>) => {
  const selectedNote = useAtomValue(selectedNoteAtom)
  if (!selectedNote) return null
  return (
    <div {...props} className={twMerge('flex justify-center', className)}>
      <span className="text-gray-400">{selectedNote.title}</span>
    </div>
  )
}
