import { ElectronAPI } from '@electron-toolkit/preload'
import clsx, { ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export {}


const dateFormatter = new Intl.DateTimeFormat(window.context?.locale, {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'UTC'
})

export const formatDateFromMs = (ms: number) => dateFormatter.format(ms)

export const cn = (...args: ClassValue[]) => {
  return twMerge(clsx(...args))
}
