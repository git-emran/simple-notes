import { useSetAtom } from 'jotai'
import { ActionButton, ActionButtonProps } from './ActionButton'
import { FaRegTrashCan } from 'react-icons/fa6'
import { deleteNoteAtom } from '@renderer/store'

export const DeleteNoteButton = ({ ...props }: ActionButtonProps) => {
  const deleteNote = useSetAtom(deleteNoteAtom)

  const handleDelete = () => {
    deleteNote()
  }
  return (
    <ActionButton onClick={handleDelete} {...props}>
      <FaRegTrashCan className="w-4 h-4 dark:text-zinc-300 text-gray-700" />
    </ActionButton>
  )
}
