import { atomWithStorage } from 'jotai/utils'

export const canvasElementsAtom = atomWithStorage<unknown[]>('writr-canvas-elements', [])
