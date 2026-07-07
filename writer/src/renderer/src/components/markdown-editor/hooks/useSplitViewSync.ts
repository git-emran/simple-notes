import { useCallback, useEffect, useRef, useState } from 'react'
import type { SelectedNote, ViewRef } from './types'

interface UseSplitViewSyncParams {
  viewRef: ViewRef
  selectedNote: SelectedNote | null
  setDebouncedContent: (content: string) => void
}

export function useSplitViewSync({
  viewRef,
  selectedNote,
  setDebouncedContent,
}: UseSplitViewSyncParams) {
  const [isPreview, setIsPreview] = useState(false)
  const [isFullPreview, setIsFullPreview] = useState(false)
  const [showFAB, setShowFAB] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const dragBarRef = useRef<HTMLDivElement>(null)

  const lastScrollPercentageRef = useRef<number>(0)
  const scrollSyncLockRef = useRef<null | 'editor' | 'preview'>(null)
  const scrollSyncRafRef = useRef<number | null>(null)
  const lastProgrammaticScrollRef = useRef<{ editor: number; preview: number }>({
    editor: 0,
    preview: 0
  })
  const fabTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Scroll position capture / restore ────────────────────────────────────
  const captureScrollPercentage = useCallback(() => {
    if (isFullPreview) {
      if (previewContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = previewContainerRef.current
        if (scrollHeight > clientHeight) {
          lastScrollPercentageRef.current = scrollTop / (scrollHeight - clientHeight)
        }
      }
    } else {
      if (viewRef.current) {
        const { scrollDOM } = viewRef.current
        const { scrollTop, scrollHeight, clientHeight } = scrollDOM
        if (scrollHeight > clientHeight) {
          lastScrollPercentageRef.current = scrollTop / (scrollHeight - clientHeight)
        }
      }
    }
  }, [isFullPreview, viewRef])

  const restoreScrollPosition = useCallback(() => {
    const percentage = lastScrollPercentageRef.current
    if (percentage <= 0) return

    if (viewRef.current) {
      const { scrollDOM } = viewRef.current
      const { scrollHeight, clientHeight } = scrollDOM
      if (scrollHeight > clientHeight) {
        scrollDOM.scrollTop = percentage * (scrollHeight - clientHeight)
      }
    }

    if (previewContainerRef.current) {
      const { scrollHeight, clientHeight } = previewContainerRef.current
      if (scrollHeight > clientHeight) {
        previewContainerRef.current.scrollTop = percentage * (scrollHeight - clientHeight)
      }
    }
  }, [viewRef])

  // Restore scroll when mode changes
  useEffect(() => {
    const timer = setTimeout(restoreScrollPosition, 50)
    return () => clearTimeout(timer)
  }, [isPreview, isFullPreview, restoreScrollPosition])

  // ── Draggable resize ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPreview || isFullPreview) return
    const dragBar = dragBarRef.current
    const editor = editorContainerRef.current
    const preview = previewContainerRef.current
    if (!dragBar || !editor || !preview) return

    let startX = 0
    let startWidth = 0

    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX
      const newWidth = startWidth + delta
      const containerWidth = containerRef.current?.offsetWidth || 1
      const minWidth = containerWidth * 0.2
      const maxWidth = containerWidth * 0.8
      const clampedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth)
      editor.style.width = `${clampedWidth}px`
      preview.style.width = `${containerWidth - clampedWidth}px`
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    const onMouseDown = (e: MouseEvent) => {
      startX = e.clientX
      startWidth = editor.offsetWidth
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    }

    dragBar.addEventListener('mousedown', onMouseDown)
    return () => {
      dragBar.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [isPreview, isFullPreview])

  // ── Scroll sync (split view) ──────────────────────────────────────────────
  useEffect(() => {
    if (!isPreview || isFullPreview) return

    const editorContainer = editorContainerRef.current
    const previewContainer = previewContainerRef.current
    if (!editorContainer || !previewContainer) return

    const clearRaf = () => {
      if (scrollSyncRafRef.current != null) {
        window.cancelAnimationFrame(scrollSyncRafRef.current)
        scrollSyncRafRef.current = null
      }
    }

    const getScrollPercentage = (el: HTMLElement) => {
      const max = el.scrollHeight - el.clientHeight
      if (max <= 0) return 0
      return el.scrollTop / max
    }

    const setScrollPercentage = (el: HTMLElement, percentage: number) => {
      const max = el.scrollHeight - el.clientHeight
      if (max <= 0) {
        el.scrollTop = 0
        return
      }
      const nextTop = percentage * max
      if (Math.abs(el.scrollTop - nextTop) < 0.5) return
      el.scrollTop = nextTop
    }

    const getEditorScroller = (eventTarget: EventTarget | null): HTMLElement | null => {
      const viewScroller = viewRef.current?.scrollDOM as HTMLElement | undefined
      if (viewScroller) return viewScroller

      if (!(eventTarget instanceof HTMLElement)) return null
      if (eventTarget.classList.contains('cm-scroller')) return eventTarget
      return eventTarget.closest?.('.cm-scroller') ?? null
    }

    const syncFromEditor = (source: HTMLElement) => {
      if (scrollSyncLockRef.current === 'preview') return
      scrollSyncLockRef.current = 'editor'

      const percentage = getScrollPercentage(source)
      lastScrollPercentageRef.current = percentage

      clearRaf()
      scrollSyncRafRef.current = window.requestAnimationFrame(() => {
        lastProgrammaticScrollRef.current.preview = performance.now()
        setScrollPercentage(previewContainer, percentage)
        window.requestAnimationFrame(() => {
          scrollSyncLockRef.current = null
        })
      })
    }

    const syncFromPreview = () => {
      if (scrollSyncLockRef.current === 'editor') return
      const editorScroller = viewRef.current?.scrollDOM as HTMLElement | undefined
      if (!editorScroller) return

      scrollSyncLockRef.current = 'preview'

      const percentage = getScrollPercentage(previewContainer)
      lastScrollPercentageRef.current = percentage

      clearRaf()
      scrollSyncRafRef.current = window.requestAnimationFrame(() => {
        lastProgrammaticScrollRef.current.editor = performance.now()
        setScrollPercentage(editorScroller, percentage)
        window.requestAnimationFrame(() => {
          scrollSyncLockRef.current = null
        })
      })
    }

    const onEditorScroll = (e: Event) => {
      if (performance.now() - lastProgrammaticScrollRef.current.editor < 120) return
      const scroller = getEditorScroller(e.target)
      if (!scroller) return
      syncFromEditor(scroller)
    }

    const onPreviewScroll = () => {
      if (performance.now() - lastProgrammaticScrollRef.current.preview < 120) return
      syncFromPreview()
    }

    editorContainer.addEventListener('scroll', onEditorScroll, true)
    previewContainer.addEventListener('scroll', onPreviewScroll)

    return () => {
      editorContainer.removeEventListener('scroll', onEditorScroll, true)
      previewContainer.removeEventListener('scroll', onPreviewScroll)
      clearRaf()
      scrollSyncLockRef.current = null
    }
  }, [isPreview, isFullPreview, selectedNote?.path, viewRef])

  // ── FAB visibility & inactivity timer ────────────────────────────────────
  useEffect(() => {
    const fabThreshold = 5
    const inactivityTimeout = 10000

    const showAndResetTimer = () => {
      setShowFAB(true)
      if (fabTimerRef.current) clearTimeout(fabTimerRef.current)
      fabTimerRef.current = setTimeout(() => {
        setShowFAB(false)
      }, inactivityTimeout)
    }

    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement
      if (target.scrollTop !== undefined && target.scrollTop > fabThreshold) {
        showAndResetTimer()
      }
    }

    const handleMouseMove = () => {
      showAndResetTimer()
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll, true)
      container.addEventListener('mousemove', handleMouseMove)
    }

    return () => {
      container?.removeEventListener('scroll', handleScroll, true)
      container?.removeEventListener('mousemove', handleMouseMove)
      if (fabTimerRef.current) clearTimeout(fabTimerRef.current)
    }
  }, [selectedNote?.path, isPreview, isFullPreview])

  // Reset FAB when switching notes
  useEffect(() => {
    setShowFAB(false)
  }, [selectedNote?.path])

  // ── Mode toggle handlers ──────────────────────────────────────────────────
  const handleFullPreviewToggle = useCallback(() => {
    captureScrollPercentage()
    if (viewRef.current) {
      setDebouncedContent(viewRef.current.state.doc.toString())
    }

    if (isFullPreview) {
      setIsFullPreview(false)
      setIsPreview(false)
    } else {
      setIsFullPreview(true)
      setIsPreview(true)
    }
  }, [captureScrollPercentage, isFullPreview, setDebouncedContent, viewRef])

  const handleSplitViewToggle = useCallback(() => {
    captureScrollPercentage()
    if (viewRef.current) {
      setDebouncedContent(viewRef.current.state.doc.toString())
    }
    if (isFullPreview) {
      setIsFullPreview(false)
      setIsPreview(true)
    } else {
      setIsPreview((prev) => !prev)
    }
  }, [captureScrollPercentage, isFullPreview, setDebouncedContent, viewRef])

  return {
    isPreview,
    isFullPreview,
    showFAB,
    containerRef,
    editorContainerRef,
    previewContainerRef,
    dragBarRef,
    handleFullPreviewToggle,
    handleSplitViewToggle,
  }
}
