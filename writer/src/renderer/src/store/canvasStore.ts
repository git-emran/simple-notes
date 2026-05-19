import { atomWithStorage } from 'jotai/utils'
import { Node, Edge } from '@xyflow/react'

export const canvasNodesAtom = atomWithStorage<Node[]>('writr-canvas-nodes', [])
export const canvasEdgesAtom = atomWithStorage<Edge[]>('writr-canvas-edges', [])
