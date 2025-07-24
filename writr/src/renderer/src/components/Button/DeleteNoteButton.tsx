import { ActionButton, ActionButtonProps } from './ActionButton'
import { FaRegTrashCan } from 'react-icons/fa6'

export const DeleteNoteButton = ({ ...props }: ActionButtonProps) => {
  return (
    <ActionButton {...props}>
      <FaRegTrashCan className="w-4 h-4 dark:text-zinc-300 text-gray-700" />
    </ActionButton>
  )
}
