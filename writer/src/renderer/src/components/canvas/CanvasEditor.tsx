/**
 * CanvasEditor
 *
 * Renders an Excalidraw canvas for `.canvas` files, wired into the app's
 * Jotai atom store.  Key design decisions:
 *
 * 1. Theme / background synchronisation
 *    Excalidraw's `initialData.appState.viewBackgroundColor` is consumed only
 *    once on mount and subsequently ignored.  The only reliable mechanism to
 *    keep the canvas background in sync with the app theme is the imperative
 *    `updateScene()` API, exposed via the `excalidrawAPI` callback prop.
 *
 *    Flow:
 *    a) `excalidrawAPI` callback fires on mount → stores the API ref and
 *       toggles `apiReady` state, scheduling a React re-render.
 *    b) `useEffect([apiReady, isDarkMode, canvasPath])` runs after every
 *       re-render triggered by those three values. At that point
 *       `excalidrawApiRef.current` is guaranteed non-null, so we call
 *       `updateScene` with the correct colours.  `CaptureUpdateAction.NEVER`
 *       prevents the background change from being added to the undo stack.
 *
 * 2. Save guard
 *    `readyRef` prevents the very first `onChange` (which Excalidraw fires
 *    immediately on mount with the initialData values) from triggering a
 *    redundant file write.  It is reset synchronously in the `excalidrawAPI`
 *    callback whenever the Excalidraw instance remounts (i.e. when
 *    `canvasPath` changes and the `key` prop changes).
 *
 * 3. Tab preservation
 *    CanvasEditor instances are kept permanently in the DOM (hidden via
 *    `display:none`) so the Excalidraw state is never lost on tab switch.
 *    The `isActive` prop is reserved for future use (e.g. focus management).
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Excalidraw, CaptureUpdateAction } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'

import { useAtomValue, useSetAtom } from 'jotai'
import { noteByPathAtomFamily, saveCanvasAtom, movePathAtom, isDarkModeAtom } from '../../store'
import { VscTypeHierarchy, VscFilePdf } from 'react-icons/vsc'

// ── Types ─────────────────────────────────────────────────────────────────────

/** Imperative API surface Excalidraw passes to its `excalidrawAPI` callback. */
type ExcalidrawAPI = NonNullable<
  Parameters<NonNullable<React.ComponentProps<typeof Excalidraw>['excalidrawAPI']>>[0]
>

type ExcalidrawOnChange = NonNullable<React.ComponentProps<typeof Excalidraw>['onChange']>
type ExcalidrawOnChangeParams = Parameters<ExcalidrawOnChange>

// ── Constants ─────────────────────────────────────────────────────────────────

/** Canvas drawing-surface background per theme. */
const BG_DARK = '#121212'
const BG_LIGHT = '#ffffff'

/** How long (ms) to debounce auto-saves after a canvas change. */
const SAVE_DEBOUNCE_MS = 500

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse raw canvas file content into Excalidraw's `initialData` shape.
 *
 * Returns `null` while content hasn't resolved yet (empty string from the
 * async atom's unwrap default), allowing the loading state to be shown.
 * Returns `{ elements, appState, files }` for both valid Excalidraw JSON
 * and edge cases (old React-Flow format, malformed JSON).
 *
 * NOTE: We intentionally do NOT embed `viewBackgroundColor` or `theme` here.
 * Those are injected at the call site so this function stays pure and
 * theme-agnostic.
 */
function parseCanvasContent(
  content: string
): { elements: unknown[]; appState: Record<string, unknown>; files: Record<string, unknown> } | null {
  if (!content) return null
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>
    // Discard legacy React-Flow format (nodes/edges arrays)
    if (parsed.nodes || parsed.edges) {
      return { elements: [], appState: {}, files: {} }
    }
    return {
      elements: (parsed.elements as unknown[]) || [],
      appState: (parsed.appState as Record<string, unknown>) || {},
      files: (parsed.files as Record<string, unknown>) || {}
    }
  } catch {
    // Malformed JSON — treat as a valid but empty canvas
    return { elements: [], appState: {}, files: {} }
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export const CanvasEditor = ({
  path,
  tabId: _tabId,
  isActive: _isActive
}: {
  path: string | null
  /** Tab identifier — reserved for future focus/lifecycle management. */
  tabId: string
  /** Whether this tab is currently visible — reserved for future use. */
  isActive: boolean
}) => {
  const isDarkMode = useAtomValue(isDarkModeAtom)
  const selectedNote = useAtomValue(noteByPathAtomFamily(path))
  const saveCanvas = useSetAtom(saveCanvasAtom)
  const movePath = useSetAtom(movePathAtom)

  const rootRef = useRef<HTMLDivElement>(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const renameTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Excalidraw imperative API ──────────────────────────────────────────────

  const excalidrawApiRef = useRef<ExcalidrawAPI | null>(null)
  /**
   * Toggled (not incremented) each time the `excalidrawAPI` callback fires,
   * which happens once per Excalidraw mount.  The toggle schedules a
   * re-render so that `useEffect` below runs with a guaranteed non-null API ref.
   */
  const [apiReady, setApiReady] = useState(false)

  // ── Derived values ─────────────────────────────────────────────────────────

  const canvasTitle = selectedNote?.title ?? 'Canvas'
  const isCanvasFile = !!selectedNote?.path && selectedNote.path.endsWith('.canvas')
  const canvasPath = selectedNote?.path ?? ''
  const canvasContent = selectedNote?.content ?? ''

  const parsedData = useMemo(() => parseCanvasContent(canvasContent), [canvasContent])
  const hasLoaded = parsedData !== null

  const currentTheme = isDarkMode ? ('dark' as const) : ('light' as const)
  const currentBg = isDarkMode ? BG_DARK : BG_LIGHT

  // ── Theme synchronisation ──────────────────────────────────────────────────

  /**
   * Push the correct theme and background colour to the live Excalidraw
   * instance.  Runs after:
   *   - initial mount  (apiReady flip from the excalidrawAPI callback)
   *   - theme toggle   (isDarkMode change)
   *   - file change    (canvasPath change → key change → new Excalidraw mount
   *                     → new apiReady flip)
   *
   * `CaptureUpdateAction.NEVER` ensures these programmatic updates never
   * appear in the user's undo / redo history.
   */
  useEffect(() => {
    const api = excalidrawApiRef.current
    if (!api) return
    api.updateScene({
      appState: {
        theme: currentTheme,
        viewBackgroundColor: currentBg
      },
      captureUpdate: CaptureUpdateAction.NEVER
    })
    // apiReady is intentionally included so this fires on the first mount.
    // canvasPath ensures it fires after a file switch (new Excalidraw instance).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiReady, isDarkMode, canvasPath])

  // ── Save guard ─────────────────────────────────────────────────────────────

  /**
   * Flipped to `true` after the first `onChange` fires on a given Excalidraw
   * instance (which reflects initialData, not a real edit).  Reset to `false`
   * synchronously inside the `excalidrawAPI` callback so a new Excalidraw
   * mount (i.e. a file switch) always starts in the guarded state.
   */
  const readyRef = useRef(false)

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = useCallback(
    (
      elements: ExcalidrawOnChangeParams[0],
      appState: ExcalidrawOnChangeParams[1],
      files: ExcalidrawOnChangeParams[2]
    ) => {
      if (!isCanvasFile || !selectedNote?.path) return

      // Skip the synthetic onChange Excalidraw fires immediately after mount
      // with the initialData values — it is not a real user edit.
      if (!readyRef.current) {
        readyRef.current = true
        return
      }

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)

      saveTimeoutRef.current = setTimeout(() => {
        const contentToSave = JSON.stringify(
          {
            elements,
            // Only persist the fields we actually care about.  This avoids
            // bloating the saved file with Excalidraw's many transient UI state
            // fields (selection, zoom, scroll position, etc.).
            appState: {
              viewBackgroundColor: appState.viewBackgroundColor,
              gridSize: appState.gridSize,
              theme: appState.theme
            },
            files
          },
          null,
          2
        )
        saveCanvas({ path: selectedNote.path, jsonContent: contentToSave })
      }, SAVE_DEBOUNCE_MS)
    },
    [isCanvasFile, selectedNote?.path, saveCanvas]
  )

  // Clean up any pending save on unmount.
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  // ── PDF export ─────────────────────────────────────────────────────────────

  const exportAsPdf = useCallback(async () => {
    const currentPath = selectedNote?.path
    if (!currentPath) return
    const canvasEl = rootRef.current?.querySelector('.excalidraw') as HTMLElement | null
    if (!canvasEl) return

    document.documentElement.classList.add('canvas-exporting')
    // Wait two rAF frames so the DOM has settled before we capture geometry.
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    })
    try {
      const rect = canvasEl.getBoundingClientRect()
      await window.context.exportCanvasToPdf(currentPath, canvasTitle, {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      })
    } finally {
      document.documentElement.classList.remove('canvas-exporting')
    }
  }, [selectedNote?.path, canvasTitle])

  // ── Rename ─────────────────────────────────────────────────────────────────

  const handleRename = useCallback(() => {
    setIsRenaming(false)
    if (!editTitle.trim() || editTitle === canvasTitle || !selectedNote?.path) return

    const currentPath = selectedNote.path
    const currentName = currentPath.substring(
      Math.max(currentPath.lastIndexOf('/'), currentPath.lastIndexOf('\\')) + 1
    )
    const ext = currentName.includes('.') ? currentName.substring(currentName.lastIndexOf('.')) : ''
    const newFileName = editTitle.trim().endsWith(ext)
      ? editTitle.trim()
      : `${editTitle.trim()}${ext}`
    const parentPath = currentPath.substring(
      0,
      Math.max(currentPath.lastIndexOf('/'), currentPath.lastIndexOf('\\'))
    )
    const separator = currentPath.includes('\\') ? '\\' : '/'
    const newPath = parentPath ? `${parentPath}${separator}${newFileName}` : newFileName

    if (newPath !== currentPath) {
      void movePath({ src: currentPath, dest: newPath })
    }
  }, [editTitle, canvasTitle, selectedNote?.path, movePath])

  useEffect(() => {
    if (!isRenaming) return
    setEditTitle(canvasTitle)
    // Defer focus so the input has rendered before we attempt to focus it.
    renameTimeoutRef.current = setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)
    return () => {
      if (renameTimeoutRef.current) clearTimeout(renameTimeoutRef.current)
    }
  }, [isRenaming, canvasTitle])

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!isCanvasFile) {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--obsidian-workspace)]">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-[var(--obsidian-text)]">No canvas selected</h2>
          <p className="mt-2 text-sm text-[var(--obsidian-text-muted)]">
            Create or select a <span className="font-mono">.canvas</span> file to start.
          </p>
        </div>
      </div>
    )
  }

  if (!hasLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--obsidian-workspace)]">
        <div className="text-sm text-[var(--obsidian-text-muted)]">Loading Canvas…</div>
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      className="w-full h-full bg-[var(--obsidian-workspace)] relative overflow-hidden"
    >
      <Excalidraw
        /*
         * Key on canvasPath only.  Excalidraw remounts when the file changes
         * (different path → different key).  We do NOT include theme in the
         * key — theme and background are updated imperatively via
         * `updateScene()` so no remount is needed for theme switches.
         */
        key={canvasPath}
        theme={currentTheme}
        excalidrawAPI={(api) => {
          // Reset the save guard so the new instance's first onChange is skipped.
          readyRef.current = false
          // Store the API reference.
          excalidrawApiRef.current = api
          // Toggle apiReady to schedule a re-render and trigger the theme
          // useEffect with the now-available API ref.
          setApiReady((v) => !v)
        }}
        initialData={{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          elements: parsedData.elements as any,
          appState: {
            ...parsedData.appState,
            // Provide best-effort values here too.  The imperative updateScene
            // in the useEffect is the authoritative source, but these values
            // avoid a visible flash on very fast devices before the effect runs.
            theme: currentTheme,
            viewBackgroundColor: currentBg
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          files: parsedData.files as any
        }}
        onChange={handleChange}
        UIOptions={{
          canvasActions: {
            toggleTheme: true,
            export: { saveFileToDisk: true }
          }
        }}
      />

      {/* ── Floating header ───────────────────────────────────────────────── */}
      <div className="absolute top-4 left-16 z-20 pointer-events-none">
        <div className="bg-[var(--obsidian-pane)]/90 backdrop-blur-md px-4 py-2 rounded-full border border-obsidian-border shadow-lg flex items-center gap-2 pointer-events-auto">
          <VscTypeHierarchy className="w-4 h-4 text-[var(--obsidian-accent)]" />

          {isRenaming ? (
            <input
              ref={inputRef}
              type="text"
              aria-label="Rename canvas"
              className="text-xs font-bold tracking-wider text-[var(--obsidian-text)] bg-transparent border-none outline-none uppercase w-48"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') setIsRenaming(false)
              }}
            />
          ) : (
            <span
              role="button"
              tabIndex={0}
              aria-label={`Canvas title: ${canvasTitle}. Double-click to rename.`}
              className="text-xs font-bold tracking-wider text-[var(--obsidian-text)] uppercase cursor-text"
              onDoubleClick={() => setIsRenaming(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'F2') setIsRenaming(true)
              }}
            >
              {canvasTitle}
            </span>
          )}

          <button
            type="button"
            onClick={exportAsPdf}
            className="p-1 hover:bg-[var(--obsidian-hover)] rounded text-red-500 transition-all active:scale-95 ml-2"
            title="Export as PDF"
            aria-label="Export canvas as PDF"
          >
            <VscFilePdf className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
