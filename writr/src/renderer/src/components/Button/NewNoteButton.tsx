import { ActionButton, ActionButtonProps } from '@/components'
import { createEmptyNoteAtom } from '@renderer/store'
import { useSetAtom } from 'jotai'
import { PiNotePencilDuotone } from 'react-icons/pi'

export const NewNoteButton = ({ ...props }: ActionButtonProps) => {
  const createEmptyNote = useSetAtom(createEmptyNoteAtom)

  const handleCreation = () => {
    createEmptyNote()
  }
  return (
    <ActionButton onClick={handleCreation} {...props}>
      <PiNotePencilDuotone className="w-5 h-5  text-gray-800 dark:text-zinc-300" />
    </ActionButton>
  )
}
