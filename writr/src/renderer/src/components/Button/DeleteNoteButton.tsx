import { useSetAtom } from 'jotai'
import { ActionButton, ActionButtonProps } from './ActionButton'
import { deleteNoteAtom } from '@renderer/store'
import { LuDelete } from "react-icons/lu";
export const DeleteNoteButton = ({ ...props }: ActionButtonProps) => {
  const deleteNote = useSetAtom(deleteNoteAtom)

  const handleDelete = async () => {
    await deleteNote()
  }
  return (
    <ActionButton onClick={handleDelete} {...props}>
      <LuDelete className="w-4 h-4 dark:text-zinc-300 text-gray-700" />
    </ActionButton>
  )
}
