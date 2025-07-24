import { ComponentProps } from 'react'
import { twMerge } from 'tailwind-merge'

export const ActionButton = ({ className, children, ...props }: ComponentProps<'button'>) => {
  return (
    <button
      className={twMerge(
        'px-2 py-1 rounded-md border-zinc-600/50 transition-colors duration-100 ',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
