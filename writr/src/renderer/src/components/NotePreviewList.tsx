import { ComponentProps } from 'react'
import { NotePreview } from './NotePreview'
import { twMerge } from 'tailwind-merge'
import { useNotesList } from '@renderer/hooks/useNotesList'
import { isEmpty } from 'lodash'

export type NotePreviewListProps = ComponentProps<'ul'> & {
  onSelect?: () => void
}
export const NotePreviewList = ({ onSelect, className, ...props }: NotePreviewListProps) => {
  const { notes, selectedNoteIndex, handleNoteSelect } = useNotesList({ onSelect })

  if (!notes) return null
  if (isEmpty(notes)) {
    return (
      <ul className={twMerge('text-center pt-2', className)} {...props}>
        <span>No notes yet</span>
      </ul>
    )
  }
  return (
    <ul {...props}>
      {notes.map((note, index) => (
        <NotePreview
          key={note.title + note.lastEditTime}
          isActive={selectedNoteIndex === index}
          onClick={handleNoteSelect(index)}
          {...note}
        />
      ))}
    </ul>
  )
}
