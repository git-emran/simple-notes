import { NOTE_STATUS_VALUES } from '@renderer/constants/noteStatus'
import { movePathAtom, noteStatusByPathAtom, noteTagByPathAtom } from '@renderer/store'
import { useAtom, useSetAtom } from 'jotai'
import { useCallback, useEffect, useState } from 'react'
import type { SelectedNote, ViewRef } from './types'

interface UseNoteMetadataParams {
  selectedNote: SelectedNote | null
  viewRef: ViewRef
}

export function useNoteMetadata({ selectedNote, viewRef }: UseNoteMetadataParams) {
  const [noteStatuses, setNoteStatuses] = useAtom(noteStatusByPathAtom)
  const [noteTags, setNoteTags] = useAtom(noteTagByPathAtom)
  const movePath = useSetAtom(movePathAtom)

  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [exportNotice, setExportNotice] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')

  const currentNoteStatus = selectedNote?.path ? noteStatuses[selectedNote.path] : undefined
  const currentNoteTag = selectedNote?.path ? noteTags[selectedNote.path] : undefined

  // Reset tag input when switching notes
  useEffect(() => {
    setTagInput('')
  }, [selectedNote?.path])

  // Auto-dismiss export notice
  useEffect(() => {
    if (!exportNotice) return
    const timer = window.setTimeout(() => setExportNotice(null), 2200)
    return () => window.clearTimeout(timer)
  }, [exportNotice])

  const handleExportPdf = useCallback(async () => {
    if (!selectedNote?.path) return
    setIsExportingPdf(true)
    try {
      const latestContent =
        viewRef.current?.state.doc.toString() ?? selectedNote?.content ?? ''
      const success = await window.context.exportNoteToPdf(
        selectedNote.path,
        selectedNote.title,
        latestContent
      )
      if (success) {
        setExportNotice('PDF exported successfully')
      }
    } finally {
      setIsExportingPdf(false)
    }
  }, [selectedNote?.path, selectedNote?.title, selectedNote?.content, viewRef])

  const handleHeaderRename = useCallback(
    (newName: string) => {
      if (!selectedNote?.path) return
      const currentName = selectedNote.path.substring(
        Math.max(selectedNote.path.lastIndexOf('/'), selectedNote.path.lastIndexOf('\\')) + 1
      )
      const ext = currentName.includes('.')
        ? currentName.substring(currentName.lastIndexOf('.'))
        : ''
      const newFileName = newName.endsWith(ext) ? newName : `${newName}${ext}`

      const parentPath = selectedNote.path.substring(
        0,
        Math.max(selectedNote.path.lastIndexOf('/'), selectedNote.path.lastIndexOf('\\'))
      )
      const separator = selectedNote.path.includes('\\') ? '\\' : '/'
      const newPath = parentPath ? `${parentPath}${separator}${newFileName}` : newFileName

      if (newPath !== selectedNote.path) {
        void movePath({ src: selectedNote.path, dest: newPath })
      }
    },
    [selectedNote?.path, movePath]
  )

  const handleStatusChange = useCallback(
    (status: string) => {
      const notePath = selectedNote?.path
      if (!notePath) return

      setNoteStatuses((prev) => {
        const next = { ...prev }
        if (!status) {
          delete next[notePath]
          return next
        }
        next[notePath] = status as (typeof NOTE_STATUS_VALUES)[number]
        return next
      })
    },
    [selectedNote?.path, setNoteStatuses]
  )

  const handleTagChange = useCallback(
    (tag: string) => {
      const notePath = selectedNote?.path
      if (!notePath) return

      setNoteTags((prev) => {
        const next = { ...prev }
        if (!tag) {
          delete next[notePath]
          return next
        }
        next[notePath] = tag
        return next
      })
    },
    [selectedNote?.path, setNoteTags]
  )

  return {
    currentNoteStatus,
    currentNoteTag,
    tagInput,
    setTagInput,
    isExportingPdf,
    exportNotice,
    handleExportPdf,
    handleHeaderRename,
    handleStatusChange,
    handleTagChange,
  }
}
