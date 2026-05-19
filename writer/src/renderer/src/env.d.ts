/// <reference types="vite/client" />
import { CreateCanvasNew } from '@shared/types'

declare global {
  interface Window {
    context: {
        createCanvasNew: CreateCanvasNew;
        [key: string]: any;
    }
  }
}
