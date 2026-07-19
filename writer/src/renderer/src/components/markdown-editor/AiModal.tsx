'use client'
import { AiModelInfo } from '@shared/types'
import { FileNode } from '@shared/models'
import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { VscFile, VscFolder, VscClose, VscSparkle } from 'react-icons/vsc'

interface AiModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAiModel: string;
  setSelectedAiModel: (model: string) => void;
  aiModels: AiModelInfo[];
  isLoadingAiModels: boolean;
  aiPrompt: string;
  setAiPrompt: (prompt: string) => void;
  isGeneratingWithAi: boolean;
  aiError: string | null;
  onGenerate: (contextPaths: string[]) => void;
  onStop: () => void;
  fileTree: FileNode[];
  currentNotePath?: string | null;
}

export const AiModal = ({
  isOpen,
  onClose,
  selectedAiModel,
  setSelectedAiModel,
  aiModels,
  isLoadingAiModels,
  aiPrompt,
  setAiPrompt,
  isGeneratingWithAi,
  aiError,
  onGenerate,
  onStop,
  fileTree,
  currentNotePath
}: AiModalProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [dropdownRect, setDropdownRect] = useState<{
    left: number;
    top: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const flatFiles = useMemo(() => {
    const list: Array<{ name: string; path: string; type: 'file' | 'folder' }> = [];
    const traverse = (nodes: FileNode[]) => {
      for (const node of nodes) {
        list.push({ name: node.name, path: node.path, type: node.type });
        if (node.children) traverse(node.children);
      }
    };
    traverse(fileTree);
    return list;
  }, [fileTree]);

  const pathTypeMap = useMemo(() => {
    const map = new Map<string, 'file' | 'folder'>();
    for (const item of flatFiles) map.set(item.path, item.type);
    return map;
  }, [flatFiles]);

  const filteredSuggestions = useMemo(() => {
    if (!mentionSearch) return flatFiles.slice(0, 10);
    const search = mentionSearch.toLowerCase();
    return flatFiles
      .filter(f => f.name.toLowerCase().includes(search) || f.path.toLowerCase().includes(search))
      .slice(0, 10);
  }, [flatFiles, mentionSearch]);

  useEffect(() => {
    if (!isOpen) return;
    if (!currentNotePath) {
      setSelectedPaths([]);
      return;
    }
    // Switching notes should reset default context to only the active note.
    setSelectedPaths([currentNotePath]);
    
    // Auto-focus the textarea when opened
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  }, [isOpen, currentNotePath]);

  useEffect(() => {
    if (showSuggestions) setSuggestionIndex(0);
  }, [showSuggestions, mentionSearch]);

  useLayoutEffect(() => {
    if (!isOpen || !showSuggestions) {
      setDropdownRect(null);
      return;
    }

    const update = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const rect = textarea.getBoundingClientRect();
      const margin = 8;
      const desiredMaxHeight = 250;
      const minHeight = 140;
      const spaceBelow = window.innerHeight - rect.bottom - margin;
      const spaceAbove = rect.top - margin;
      const placeBelow = spaceBelow >= minHeight || spaceBelow > spaceAbove;
      const available = placeBelow ? spaceBelow : spaceAbove;
      const maxHeight = Math.max(120, Math.min(desiredMaxHeight, Math.floor(available)));

      const top = placeBelow ? rect.bottom + margin : rect.top - margin - maxHeight;
      const clampedTop = Math.max(margin, Math.min(top, window.innerHeight - margin - maxHeight));
      const width = Math.min(rect.width, window.innerWidth - margin * 2);
      const left = Math.max(margin, Math.min(rect.left, window.innerWidth - margin - width));

      setDropdownRect({ left, top: clampedTop, width, maxHeight });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [isOpen, showSuggestions, mentionSearch]);

  useEffect(() => {
    if (!showSuggestions) return;
    const container = suggestionsRef.current;
    if (!container) return;
    const active = container.querySelector(
      `[data-suggestion-index="${suggestionIndex}"]`
    ) as HTMLElement | null;
    active?.scrollIntoView({ block: 'nearest' });
  }, [showSuggestions, suggestionIndex]);

  useEffect(() => {
    if (!showSuggestions) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (textareaRef.current?.contains(target)) return;
      if (suggestionsRef.current?.contains(target)) return;
      setShowSuggestions(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [showSuggestions]);
  
  // Close the prompt on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showSuggestions) {
        if (isGeneratingWithAi) {
          onStop();
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isGeneratingWithAi, showSuggestions, onClose, onStop]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const pos = e.target.selectionStart;
    setAiPrompt(value);

    // Detect @ mention
    const textBefore = value.slice(0, pos);
    const lastAt = textBefore.lastIndexOf('@');

    if (lastAt !== -1 && (lastAt === 0 || /\s/.test(textBefore[lastAt - 1] || ''))) {
      const search = textBefore.slice(lastAt + 1);
      if (!/\s/.test(search)) {
        setShowSuggestions(true);
        setMentionSearch(search);
        return;
      }
    }
    setShowSuggestions(false);
  };

  const addContext = (item: { name: string; path: string }) => {
    if (!selectedPaths.includes(item.path)) {
      setSelectedPaths([...selectedPaths, item.path]);
    }

    const pos = textareaRef.current?.selectionStart || 0;
    const textBefore = aiPrompt.slice(0, pos);
    const lastAt = textBefore.lastIndexOf('@');
    const newText = aiPrompt.slice(0, lastAt) + aiPrompt.slice(pos);
    setAiPrompt(newText);
    setShowSuggestions(false);
    
    // Focus back and set cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = lastAt;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const removeContext = (path: string) => {
    setSelectedPaths(selectedPaths.filter(p => p !== path));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions) {
      if (filteredSuggestions.length === 0) {
        setShowSuggestions(false);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIndex(prev => (prev + 1) % filteredSuggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIndex(prev => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredSuggestions[suggestionIndex]) {
          addContext(filteredSuggestions[suggestionIndex]);
        }
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
        e.preventDefault();
        e.stopPropagation();
      }
    } else {
      // Submit on Cmd+Enter or Enter (if we want Enter to submit)
      // Usually Cmd+Enter is standard for multiline textareas.
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (!isGeneratingWithAi && !isLoadingAiModels) {
          onGenerate(selectedPaths);
        }
      }
    }
  };

  const getBasename = (fullPath: string) => {
    const parts = fullPath.split(/[/\\]/);
    return parts[parts.length - 1];
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-12 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-4">
      <div className="rounded-xl border border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] shadow-2xl overflow-hidden flex flex-col ring-1 ring-black/5 dark:ring-white/10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header / Input Area */}
        <div className="p-3">
          {/* Selected Context Tags */}
          {selectedPaths.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5 px-1">
              {selectedPaths.map(path => (
                <div 
                  key={path} 
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--obsidian-accent-dim)] border border-[var(--obsidian-accent)]/30 text-[11px] text-[var(--obsidian-text)] group"
                >
                  {pathTypeMap.get(path) === 'folder' ? (
                    <VscFolder className="w-3 h-3 text-[var(--obsidian-accent)]" />
                  ) : (
                    <VscFile className="w-3 h-3 opacity-60" />
                  )}
                  <span className="max-w-[150px] truncate">{getBasename(path)}</span>
                  <button 
                    onClick={() => removeContext(path)}
                    className="hover:text-red-400 transition-colors"
                  >
                    <VscClose className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative flex items-start gap-2 px-1">
            <VscSparkle className="w-5 h-5 text-[var(--obsidian-accent)] mt-1.5 shrink-0" />
            <textarea
              ref={textareaRef}
              value={aiPrompt}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              placeholder="Ask AI to write or rewrite... (Type @ to add files)"
              rows={Math.min(6, Math.max(1, aiPrompt.split('\n').length))}
              className="w-full resize-none bg-transparent py-1.5 text-sm text-[var(--obsidian-text)] placeholder-[var(--obsidian-text-muted)] outline-none min-h-[32px] max-h-[200px] overflow-y-auto"
            />
          </div>
        </div>

        {/* Error Message */}
        {aiError && (
          <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20 text-xs text-red-400">
            {aiError}
          </div>
        )}

        {/* Footer Controls */}
        <div className="flex items-center justify-between border-t border-[var(--obsidian-border-soft)] bg-[var(--obsidian-workspace)]/50 px-4 py-2">
          <div className="flex items-center gap-2">
            <select
              value={selectedAiModel}
              onChange={(e) => setSelectedAiModel(e.target.value)}
              disabled={isLoadingAiModels || isGeneratingWithAi}
              className="rounded-md border border-[var(--obsidian-border)] bg-transparent px-2 py-1 text-[11px] text-[var(--obsidian-text-muted)] outline-none hover:border-[var(--obsidian-accent)] hover:text-[var(--obsidian-text)] transition-colors disabled:opacity-50"
            >
              {aiModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-[var(--obsidian-text-muted)] opacity-70">
              Cmd+Enter to submit
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isGeneratingWithAi ? (
              <button
                type="button"
                onClick={onStop}
                className="rounded-md bg-[var(--obsidian-border)] px-3 py-1.5 text-xs font-medium text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)] transition-colors flex items-center gap-1"
              >
                <div className="w-2 h-2 rounded-sm bg-red-400 animate-pulse" />
                Stop Generating
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md px-3 py-1.5 text-xs text-[var(--obsidian-text-muted)] hover:bg-[var(--obsidian-hover)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => onGenerate(selectedPaths)}
                  disabled={isLoadingAiModels || !aiPrompt.trim()}
                  className="rounded-md bg-[var(--obsidian-accent)] px-4 py-1.5 text-xs font-medium text-white transition-all hover:brightness-110 disabled:opacity-50 shadow-sm active:scale-[0.98]"
                >
                  Submit
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Suggestions Dropdown (Portal) */}
      {showSuggestions &&
        filteredSuggestions.length > 0 &&
        dropdownRect &&
        createPortal(
          <div
            ref={suggestionsRef}
            className="overflow-y-auto bg-[var(--obsidian-pane)] border border-[var(--obsidian-border)] rounded-xl shadow-2xl py-2 animate-in fade-in zoom-in-95 duration-100"
            style={{
              position: 'fixed',
              left: dropdownRect.left,
              top: dropdownRect.top,
              width: dropdownRect.width,
              maxHeight: dropdownRect.maxHeight,
              zIndex: 9999,
              scrollPaddingTop: 8,
              scrollPaddingBottom: 8,
            }}
          >
            <div className="h-1" />
            {filteredSuggestions.map((item, idx) => (
              <div
                key={item.path}
                data-suggestion-index={idx}
                onClick={() => addContext(item)}
                onMouseEnter={() => setSuggestionIndex(idx)}
                className={`px-3 py-2 mx-1 rounded-md text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                  idx === suggestionIndex
                    ? 'bg-[var(--obsidian-accent)] text-white'
                    : 'text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)]'
                }`}
              >
                {item.type === 'file' ? (
                  <VscFile className="w-3.5 h-3.5 opacity-60 shrink-0" />
                ) : (
                  <VscFolder className="w-3.5 h-3.5 shrink-0" />
                )}
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate">{item.name}</span>
                  <span
                    className={`text-[10px] truncate opacity-50 ${
                      idx === suggestionIndex ? 'text-white' : ''
                    }`}
                  >
                    {item.path}
                  </span>
                </div>
              </div>
            ))}
            <div className="h-1" />
          </div>,
          document.body
        )}
    </div>
  );
};
