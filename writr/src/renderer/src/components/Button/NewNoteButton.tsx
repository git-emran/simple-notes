import { ActionButton, ActionButtonProps } from '@/components'
import { PiNotePencilDuotone } from 'react-icons/pi'

export const NewNoteButton = ({ ...props }: ActionButtonProps) => {
  return (
    <ActionButton {...props}>
      <PiNotePencilDuotone className="w-5 h-5  text-gray-800 dark:text-zinc-300" />
    </ActionButton>
  )
}
