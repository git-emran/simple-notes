'use client'
import { AiModelInfo } from '@shared/types'

interface AiModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiApiKey: string;
  setAiApiKey: (key: string) => void;
  selectedAiModel: string;
  setSelectedAiModel: (model: string) => void;
  aiModels: AiModelInfo[];
  isLoadingAiModels: boolean;
  aiPrompt: string;
  setAiPrompt: (prompt: string) => void;
  isGeneratingWithAi: boolean;
  aiProgress: number;
  aiError: string | null;
  onGenerate: () => void;
}

export const AiModal = ({
  isOpen,
  onClose,
  aiApiKey,
  setAiApiKey,
  selectedAiModel,
  setSelectedAiModel,
  aiModels,
  isLoadingAiModels,
  aiPrompt,
  setAiPrompt,
  isGeneratingWithAi,
  aiProgress,
  aiError,
  onGenerate
}: AiModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-2xl rounded-lg border border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--obsidian-border-soft)] px-4 py-3">
          <h3 className="text-sm font-semibold text-[var(--obsidian-text)]">Write with AI</h3>
          <button
            type="button"
            className="rounded px-2 py-1 text-xs text-[var(--obsidian-text-muted)] hover:bg-[var(--obsidian-hover)]"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="space-y-3 px-4 py-4">
          <div>
            <label className="mb-1 block text-xs text-[var(--obsidian-text-muted)]">OpenRouter API Key</label>
            <input
              type="password"
              value={aiApiKey}
              onChange={(e) => setAiApiKey(e.target.value)}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              placeholder="sk-or-v1-..."
              className="w-full rounded border border-[var(--obsidian-border)] bg-[var(--obsidian-workspace)] px-3 py-2 text-sm text-[var(--obsidian-text)] outline-none focus:border-[var(--obsidian-accent)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-[var(--obsidian-text-muted)]">Free Model</label>
            <select
              value={selectedAiModel}
              onChange={(e) => setSelectedAiModel(e.target.value)}
              disabled={isLoadingAiModels}
              className="w-full rounded border border-[var(--obsidian-border)] bg-[var(--obsidian-workspace)] px-3 py-2 text-sm text-[var(--obsidian-text)] outline-none focus:border-[var(--obsidian-accent)] disabled:opacity-60"
            >
              {aiModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-[var(--obsidian-text-muted)]">Prompt</label>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              placeholder="Example: Rewrite my note in a clearer and concise way."
              rows={6}
              className="w-full resize-y rounded border border-[var(--obsidian-border)] bg-[var(--obsidian-workspace)] px-3 py-2 text-sm text-[var(--obsidian-text)] outline-none focus:border-[var(--obsidian-accent)]"
            />
          </div>

          {isGeneratingWithAi && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-[var(--obsidian-text-muted)]">
                <span>Generating with AI...</span>
                <span>{Math.min(aiProgress, 99)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded bg-[var(--obsidian-border-soft)]">
                <div
                  className="h-full rounded bg-[var(--obsidian-accent)] transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(aiProgress, 99)}%` }}
                />
              </div>
            </div>
          )}

          {aiError && (
            <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {aiError}
            </div>
          )}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-[var(--obsidian-border-soft)] px-4 py-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded border border-[var(--obsidian-border)] px-3 py-1.5 text-xs text-[var(--obsidian-text)] hover:bg-[var(--obsidian-hover)] sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGeneratingWithAi || isLoadingAiModels}
            className="w-full rounded bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-black/85 disabled:opacity-60 sm:w-auto"
          >
            {isGeneratingWithAi ? 'Generating...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
};
