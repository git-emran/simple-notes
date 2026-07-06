'use client'
import { createNoteAtom, fileTreeAtom, isDarkModeAtom, selectedNoteAtom } from '@renderer/store'
import { useAtomValue, useSetAtom } from 'jotai'
import { isValidElement, memo, useCallback, useEffect, useRef, useState } from 'react'
import React from 'react'
import { MdDragIndicator } from 'react-icons/md'
import { VscError, VscInfo, VscLightbulb, VscWarning } from 'react-icons/vsc'
import { ContextMenu, ContextMenuItem } from '../ContextMenu'
import { AiModal } from './AiModal'
import { CommandPaletteModal } from './CommandPaletteModal'
import { EditorFAB } from './EditorFAB'
import { EditorHeader } from './EditorHeader'
import { MarkdownPreview } from './MarkdownPreview'
import { MarkdownToolbar } from './MarkdownToolbar'
import { useAiGeneration } from './hooks/useAiGeneration'
import { useCommandPalette } from './hooks/useCommandPalette'
import { useEditorCompartments } from './hooks/useEditorCompartments'
import { useEditorLifecycle } from './hooks/useEditorLifecycle'
import { useNoteMetadata } from './hooks/useNoteMetadata'
import { useSplitViewSync } from './hooks/useSplitViewSync'
import type { SelectedNote } from './hooks/types'
import type { EditorView } from '@codemirror/view'

const MarkdownToolbarMemo = memo(MarkdownToolbar)

export const MarkdownEditor = () => {
  const selectedNote = useAtomValue(selectedNoteAtom)
  const createNote = useSetAtom(createNoteAtom)
  const fileTree = useAtomValue(fileTreeAtom)
  const isDarkMode = useAtomValue(isDarkModeAtom)

  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [rootDir, setRootDir] = useState<string>('')

  const previewReadableWidthClass = 'w-full min-w-0 max-w-[860px]'

  // Resolve the vault root directory once on mount
  useEffect(() => {
    let cancelled = false
    void window.context
      .getRootDir()
      .then((dir) => {
        if (!cancelled) setRootDir(dir)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // ── Callout / react-node helpers (passed to MarkdownPreview) ──────────────
  const getReactNodeText = useCallback((node: unknown): string => {
    if (node == null) return ''
    if (typeof node === 'string' || typeof node === 'number') return String(node)
    if (Array.isArray(node)) return node.map(getReactNodeText).join('')
    if (isValidElement(node))
      return getReactNodeText((node.props as { children?: unknown })?.children)
    return ''
  }, [])

  const getCalloutMeta = useCallback(
    (type: string) => {
      const upper = type.toUpperCase()

      const make = (
        label: string,
        Icon: React.ComponentType<{ className?: string }>,
        colors: { light: { border: string; fg: string }; dark: { border: string; fg: string } }
      ) => {
        const c = isDarkMode ? colors.dark : colors.light
        return { label, Icon, ...c }
      }

      switch (upper) {
        case 'NOTE':
          return make('Note', VscInfo, {
            light: { border: '#3b82f6', fg: '#2563eb' },
            dark: { border: '#60a5fa', fg: '#93c5fd' }
          })
        case 'TIP':
          return make('Tip', VscLightbulb, {
            light: { border: '#22c55e', fg: '#16a34a' },
            dark: { border: '#34d399', fg: '#6ee7b7' }
          })
        case 'IMPORTANT':
          return make('Important', VscWarning, {
            light: { border: '#a855f7', fg: '#a855f7' },
            dark: { border: '#c084fc', fg: '#d8b4fe' }
          })
        case 'WARNING':
          return make('Warning', VscWarning, {
            light: { border: '#f97316', fg: '#f97316' },
            dark: { border: '#fb923c', fg: '#fdba74' }
          })
        case 'CAUTION':
          return make('Caution', VscError, {
            light: { border: '#ef4444', fg: '#ef4444' },
            dark: { border: '#f87171', fg: '#fecaca' }
          })
        default:
          return null
      }
    },
    [isDarkMode]
  )

  // ── Custom hooks ──────────────────────────────────────────────────────────
  const noteMetadata = useNoteMetadata({
    selectedNote: selectedNote as SelectedNote | null,
    viewRef
  })

  const { compartments, applyEditorSettings, reconfigureLanguage, ...editorSettings } =
    useEditorCompartments({
      viewRef,
      selectedNotePath: selectedNote?.path,
      rootDir
    })

  const lifecycle = useEditorLifecycle({
    selectedNote: selectedNote as SelectedNote | null,
    editorRef,
    viewRef,
    compartments,
    isDarkMode: editorSettings.isDarkMode,
    vimModeEnabled: editorSettings.vimModeEnabled,
    relativeLineNumbersEnabled: editorSettings.relativeLineNumbersEnabled,
    lineWrappingEnabled: editorSettings.lineWrappingEnabled,
    tabIndentUnit: editorSettings.tabIndentUnit,
    rootDir,
    reconfigureLanguage
  })

  const splitView = useSplitViewSync({
    viewRef,
    selectedNote: selectedNote as SelectedNote | null,
    setDebouncedContent: lifecycle.setDebouncedContent
  })

  const ai = useAiGeneration({
    viewRef,
    rootDir,
    selectedNote: selectedNote as SelectedNote | null
  })

  const palette = useCommandPalette({
    viewRef,
    selectedNote: selectedNote as SelectedNote | null,
    isFullPreview: splitView.isFullPreview,
    isAiModalOpen: ai.isAiModalOpen,
    openAiModal: ai.openAiModal
  })

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!selectedNote?.path) {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--obsidian-base)]">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-[var(--obsidian-text)]">No note selected</h2>
          <p className="mt-2 text-sm text-[var(--obsidian-text-muted)]">
            Create a note to start writing.
          </p>
          <button
            type="button"
            onClick={() => {
              void createNote('')
            }}
            className="mt-5 text-sm font-medium text-[var(--obsidian-accent)] hover:opacity-80 transition-opacity"
          >
            Create New Note
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full bg-[var(--obsidian-base)]">
      {noteMetadata.exportNotice && (
        <div className="absolute top-14 right-5 z-50 rounded-md border border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] px-3 py-2 text-xs text-[var(--obsidian-text)] shadow-lg">
          {noteMetadata.exportNotice}
        </div>
      )}

      <EditorHeader
        title={selectedNote.title}
        path={selectedNote.path}
        saveStatus={selectedNote.readError ? 'error' : lifecycle.saveStatus}
        saveError={selectedNote.readError ?? lifecycle.saveError}
        hasUnsavedChanges={lifecycle.hasUnsavedChanges}
        onRetrySave={selectedNote.readError ? undefined : lifecycle.retrySaveNow}
        currentStatus={noteMetadata.currentNoteStatus}
        currentTag={noteMetadata.currentNoteTag}
        tagInput={noteMetadata.tagInput}
        setTagInput={noteMetadata.setTagInput}
        handleStatusChange={noteMetadata.handleStatusChange}
        handleTagChange={noteMetadata.handleTagChange}
        handleExportPdf={() => void noteMetadata.handleExportPdf()}
        onRename={noteMetadata.handleHeaderRename}
        isExportingPdf={noteMetadata.isExportingPdf}
      />

      {selectedNote.readError ? (
        <div className="flex flex-1 items-center justify-center bg-[var(--obsidian-base)] px-6">
          <div className="max-w-md rounded-md border border-red-500/30 bg-red-500/10 p-5 text-center">
            <h2 className="text-base font-semibold text-red-500">Could not open this note</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--obsidian-text-muted)]">
              The file could not be read, so editing is disabled to protect the content on disk.
            </p>
            <p className="mt-3 break-words text-xs text-[var(--obsidian-text-muted)]">
              {selectedNote.readError}
            </p>
          </div>
        </div>
      ) : (
        <div
          ref={splitView.containerRef}
          className="flex-1 flex h-full overflow-hidden relative"
          onContextMenu={(e) => {
            if (splitView.isFullPreview) return
            e.preventDefault()
            setContextMenu({ x: e.clientX, y: e.clientY })
          }}
        >
          {/* Floating Format Toolbar */}
          {!splitView.isFullPreview && palette.showToolbar && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[100] pointer-events-auto shrink-0">
              <MarkdownToolbarMemo
                view={viewRef.current}
                onWriteWithAi={() => void ai.openAiModal()}
              />
            </div>
          )}

          {/* Floating Action Button (FAB) */}
          <EditorFAB
            showFAB={splitView.showFAB}
            isFullPreview={splitView.isFullPreview}
            isPreview={splitView.isPreview}
            handleFullPreviewToggle={splitView.handleFullPreviewToggle}
            handleSplitViewToggle={splitView.handleSplitViewToggle}
          />

          {/* Editor pane */}
          <div
            ref={splitView.editorContainerRef}
            className="h-full"
            style={{
              width: splitView.isFullPreview ? '0' : splitView.isPreview ? '50%' : '100%',
              display: splitView.isFullPreview ? 'none' : 'block'
            }}
          >
            <div ref={editorRef} className="absolute inset-0 w-full h-full visible" />
          </div>

          {/* Drag resize bar */}
          {splitView.isPreview && !splitView.isFullPreview && (
            <div
              ref={splitView.dragBarRef}
              className="w-1.5 cursor-col-resize bg-[var(--obsidian-border)] hover:bg-[var(--obsidian-accent)] z-10 flex items-center justify-center transition-colors"
            >
              <MdDragIndicator className="w-3 h-3 text-[var(--obsidian-text-muted)]" />
            </div>
          )}

          {/* Preview pane */}
          <div
            ref={splitView.previewContainerRef}
            className="h-full writr-markdown-preview preview-scrollbar overflow-auto bg-[var(--obsidian-base)] p-8"
            style={{
              width: splitView.isFullPreview ? '100%' : '50%',
              display: splitView.isPreview ? 'block' : 'none'
            }}
          >
            <div className="w-full min-w-0">
              <div className="prose prose-sm max-w-none w-full break-words text-[var(--obsidian-text)]">
                <MarkdownPreview
                  previewMarkdown={lifecycle.previewMarkdown}
                  selectedNotePath={selectedNote.path}
                  rootDir={rootDir || undefined}
                  isDarkMode={isDarkMode}
                  previewReadableWidthClass={previewReadableWidthClass}
                  getReactNodeText={getReactNodeText}
                  getCalloutMeta={getCalloutMeta}
                  isFullPreview={splitView.isFullPreview}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Modal */}
      <AiModal
        isOpen={ai.isAiModalOpen}
        onClose={() => ai.setIsAiModalOpen(false)}
        selectedAiModel={ai.selectedAiModel}
        setSelectedAiModel={ai.setSelectedAiModel}
        aiModels={ai.aiModels}
        isLoadingAiModels={ai.isLoadingAiModels}
        aiPrompt={ai.aiPrompt}
        setAiPrompt={ai.setAiPrompt}
        isGeneratingWithAi={ai.isGeneratingWithAi}
        aiProgress={ai.aiProgress}
        aiError={ai.aiError}
        onGenerate={(paths) => void ai.handleGenerateWithAi(paths)}
        fileTree={fileTree ?? []}
        currentNotePath={selectedNote?.path ?? null}
      />

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          className="fixed z-50 bg-[var(--obsidian-pane)] border border-[var(--obsidian-border)] shadow-xl rounded-md py-1 min-w-[180px] max-h-[350px] overflow-y-auto preview-scrollbar"
        >
          {palette.editorMenuEntries.map((entry) => {
            if (entry.type === 'separator') {
              return <div key={entry.id} className="my-1 h-px bg-[var(--obsidian-border-soft)]" />
            }

            return (
              <ContextMenuItem
                key={entry.id}
                onClick={() => {
                  setContextMenu(null)
                  entry.run(viewRef.current)
                }}
              >
                {entry.icon}
                <span>{entry.label}</span>
                {entry.shortcut ? (
                  <span className="ml-auto text-[10px] opacity-40">{entry.shortcut}</span>
                ) : null}
              </ContextMenuItem>
            )
          })}
        </ContextMenu>
      )}

      {/* Command palette */}
      <CommandPaletteModal
        isOpen={palette.isCommandPaletteOpen}
        items={palette.commandPaletteItems}
        onClose={() => {
          palette.setIsCommandPaletteOpen(false)
          viewRef.current?.focus()
        }}
      />
    </div>
  )
}

/* MarkdownPreview component has been moved to MarkdownPreview.tsx */
