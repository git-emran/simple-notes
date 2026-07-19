import { aiApiKeyAtom, fileTreeIndexAtom } from '@renderer/store'
import type { FileNode } from '@shared/models'
import type { AiModelInfo } from '@shared/types'
import { useAtomValue } from 'jotai'
import { useCallback, useRef, useState } from 'react'
import type { SelectedNote, ViewRef } from './types'
import { EditorView } from '@codemirror/view'

interface UseAiGenerationParams {
  viewRef: ViewRef
  rootDir: string
  selectedNote: SelectedNote | null
}

export function useAiGeneration({ viewRef, rootDir, selectedNote }: UseAiGenerationParams) {
  const aiApiKey = useAtomValue(aiApiKeyAtom)
  const fileTreeIndex = useAtomValue(fileTreeIndexAtom)

  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiModels, setAiModels] = useState<AiModelInfo[]>([])
  const [selectedAiModel, setSelectedAiModel] = useState('')
  const [isLoadingAiModels, setIsLoadingAiModels] = useState(false)
  const [isGeneratingWithAi, setIsGeneratingWithAi] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  
  const cancelRef = useRef<(() => void) | null>(null)

  const stopGeneration = useCallback(() => {
    if (cancelRef.current) {
      cancelRef.current()
      cancelRef.current = null
    }
    setIsGeneratingWithAi(false)
  }, [])

  const openAiModal = useCallback(async () => {
    setIsAiModalOpen(true)
    setAiError(null)
    setIsLoadingAiModels(true)

    try {
      const models = await window.context.listFreeAiModels(aiApiKey.trim() || undefined)
      setAiModels(models)
      setSelectedAiModel((prev) => prev || models[0]?.id || '')
    } catch {
      setAiError('Failed to load models.')
    } finally {
      setIsLoadingAiModels(false)
    }
  }, [aiApiKey])

  const handleGenerateWithAi = useCallback(
    async (contextPaths: string[] = []) => {
      if (!viewRef.current) return

      const prompt = aiPrompt.trim()
      if (!prompt) {
        setAiError('Prompt is required.')
        return
      }
      if (!selectedAiModel) {
        setAiError('Please select a model.')
        return
      }

      setIsGeneratingWithAi(true)
      setAiError(null)

      try {
        const view = viewRef.current
        const currentContent = view.state.doc.toString()

        const normalizePath = (p: string) => p.replace(/\\/g, '/')
        const rootDirNormalized = normalizePath(rootDir || '').replace(/\/+$/, '')
        const displayPath = (absPath: string) => {
          const n = normalizePath(absPath)
          if (rootDirNormalized && n.startsWith(`${rootDirNormalized}/`)) {
            return n.slice(rootDirNormalized.length + 1)
          }
          return n
        }

        const truncateMiddle = (text: string, maxChars: number) => {
          if (text.length <= maxChars) return text
          const head = Math.floor(maxChars * 0.6)
          const tail = maxChars - head
          return `${text.slice(0, head)}\n\n…(truncated ${text.length - maxChars} chars)…\n\n${text.slice(
            text.length - tail
          )}`
        }

        const MAX_NOTE_CHARS = 40_000
        const contentForAi = truncateMiddle(currentContent, MAX_NOTE_CHARS)
        const currentNotePath = selectedNote?.path || ''
        const effectiveContextPaths = currentNotePath
          ? Array.from(new Set([currentNotePath, ...contextPaths]))
          : contextPaths

        // Gather context content
        let fullContext = ''
        if (effectiveContextPaths.length > 0) {
          const MAX_CONTEXT_FILES = 20
          const MAX_CONTEXT_TOTAL_CHARS = 60_000
          const MAX_CONTEXT_CHARS_PER_FILE = 12_000

          const collectedFiles: FileNode[] = []
          const visited = new Set<string>()
          const stack: string[] = [...effectiveContextPaths]
          while (stack.length) {
            const p = stack.pop()!
            if (visited.has(p)) continue
            visited.add(p)

            const node = fileTreeIndex.get(p)
            if (!node) continue

            if (node.type === 'file') {
              if (currentNotePath && node.path === currentNotePath) continue
              collectedFiles.push(node)
            } else if (node.children?.length) {
              for (const child of node.children) stack.push(child.path)
            }
          }

          const uniqueFiles = Array.from(
            new Map(collectedFiles.map((n) => [n.path, n])).values()
          ).sort((a, b) => displayPath(a.path).localeCompare(displayPath(b.path)))

          const contextLines: string[] = []
          let used = 0
          let addedFiles = 0
          let hitLimit = false

          for (const node of uniqueFiles) {
            if (addedFiles >= MAX_CONTEXT_FILES) {
              hitLimit = true
              break
            }

            try {
              const raw = await window.context.readFileNew(node.path)
              if (raw == null) continue

              const truncated = raw.length > MAX_CONTEXT_CHARS_PER_FILE
              const snippet = truncated
                ? `${raw.slice(0, MAX_CONTEXT_CHARS_PER_FILE)}\n…(truncated ${
                    raw.length - MAX_CONTEXT_CHARS_PER_FILE
                  } chars)…\n`
                : raw

              const block = `--- FILE: ${displayPath(node.path)} ---\n${snippet}\n`
              if (used + block.length > MAX_CONTEXT_TOTAL_CHARS) {
                hitLimit = true
                break
              }

              contextLines.push(block)
              used += block.length
              addedFiles++
            } catch {
              // Silently skip files that can't be read
            }
          }

          if (hitLimit) {
            contextLines.push(
              `---\n(Some context was omitted to stay within size limits. Try selecting fewer files/folders.)\n---\n`
            )
          }

          fullContext = contextLines.join('\n')
        }

        const noteLine = currentNotePath ? `Current note: ${displayPath(currentNotePath)}\n\n` : ''
        const finalPrompt = fullContext
          ? `${noteLine}I am providing some file context below to help with your task.\n\nContext:\n${fullContext}\n\nTask:\n${prompt}`
          : `${noteLine}${prompt}`

        // If there's a selection, remove it first so the AI replaces it.
        const selection = view.state.selection.main
        if (!selection.empty) {
          view.dispatch({
            changes: { from: selection.from, to: selection.to, insert: '' },
            selection: { anchor: selection.from }
          })
        }

        const stream = window.context.streamWithAi(
          {
            model: selectedAiModel,
            prompt: finalPrompt,
            content: contentForAi,
            apiKey: aiApiKey.trim() || undefined
          },
          {
            onChunk: (chunk) => {
              const v = viewRef.current
              if (v) {
                const sel = v.state.selection.main
                v.dispatch({
                  changes: { from: sel.from, insert: chunk },
                  selection: { anchor: sel.from + chunk.length },
                  effects: EditorView.scrollIntoView(sel.from + chunk.length)
                })
              }
            },
            onDone: () => {
              setIsGeneratingWithAi(false)
              cancelRef.current = null
              setIsAiModalOpen(false)
              setAiPrompt('')
            },
            onError: (err) => {
              setAiError(err)
              setIsGeneratingWithAi(false)
              cancelRef.current = null
            }
          }
        )

        cancelRef.current = stream.cancel
      } catch {
        setAiError('Failed to generate text.')
        setIsGeneratingWithAi(false)
      }
    },
    [aiApiKey, aiPrompt, selectedAiModel, fileTreeIndex, rootDir, selectedNote?.path, viewRef]
  )

  return {
    isAiModalOpen,
    setIsAiModalOpen,
    aiPrompt,
    setAiPrompt,
    aiModels,
    selectedAiModel,
    setSelectedAiModel,
    isLoadingAiModels,
    isGeneratingWithAi,
    aiError,
    openAiModal,
    handleGenerateWithAi,
    stopGeneration
  }
}
