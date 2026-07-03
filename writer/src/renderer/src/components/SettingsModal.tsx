import { useAtom } from 'jotai'
import {
  aiApiKeyAtom,
  editorFontAtom,
  editorFontSizeAtom,
  lineWrappingEnabledAtom,
  relativeLineNumbersEnabledAtom,
  showFolderIconsAtom,
  showToolbarAtom,
  tabIndentUnitAtom,
  themeModeAtom,
  vimModeEnabledAtom,
  rememberLastStateAtom,
  accentColorAtom,
  type EditorFontOption,
  type ThemeMode,
} from '@renderer/store'

const ACCENT_PRESETS = [
  { label: 'Blue',    value: '#3b82f6' },
  { label: 'Indigo',  value: '#6366f1' },
  { label: 'Violet',  value: '#8b5cf6' },
  { label: 'Purple',  value: '#a855f7' },
  { label: 'Pink',    value: '#ec4899' },
  { label: 'Rose',    value: '#f43f5e' },
  { label: 'Orange',  value: '#f97316' },
  { label: 'Amber',   value: '#f59e0b' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Teal',    value: '#14b8a6' },
  { label: 'Cyan',    value: '#06b6d4' },
  { label: 'Sky',     value: '#0ea5e9' },
]

const sectionTitleClass = 'text-xs font-semibold tracking-[0.12em] text-[var(--obsidian-text-muted)]'
const labelClass = 'text-sm text-[var(--obsidian-text)]'
const helpClass = 'text-xs text-[var(--obsidian-text-muted)]'
const cardClass = 'rounded-lg border border-[var(--obsidian-border)] bg-[var(--obsidian-workspace)] p-4'

const fontOptions: EditorFontOption[] = ['SF Pro', 'SFMono-Regular', 'Menlo', 'JetBrains Mono', 'Martian Mono', 'Courier']

export const SettingsModal = ({ onClose }: { onClose: () => void }) => {
  const [themeMode, setThemeMode] = useAtom(themeModeAtom)
  const [showToolbar, setShowToolbar] = useAtom(showToolbarAtom)
  const [showFolderIcons, setShowFolderIcons] = useAtom(showFolderIconsAtom)
  const [vimModeEnabled, setVimModeEnabled] = useAtom(vimModeEnabledAtom)
  const [rememberLastState, setRememberLastState] = useAtom(rememberLastStateAtom)
  const [aiApiKey, setAiApiKey] = useAtom(aiApiKeyAtom)
  const [accentColor, setAccentColor] = useAtom(accentColorAtom)


  const [relativeLineNumbers, setRelativeLineNumbers] = useAtom(relativeLineNumbersEnabledAtom)
  const [lineWrapping, setLineWrapping] = useAtom(lineWrappingEnabledAtom)
  const [tabIndentUnit, setTabIndentUnit] = useAtom(tabIndentUnitAtom)
  const [fontSize, setFontSize] = useAtom(editorFontSizeAtom)
  const [editorFont, setEditorFont] = useAtom(editorFontAtom)

  const themeOptions: Array<{ label: string; value: ThemeMode }> = [
    { label: 'System', value: 'system' },
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
  ]

  return (
    <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-black/45 px-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-lg border border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--obsidian-border-soft)] px-4 py-3">
          <h3 className="text-sm font-semibold text-[var(--obsidian-text)]">Settings</h3>
          <button
            type="button"
            className="rounded px-2 py-1 text-xs text-[var(--obsidian-text-muted)] hover:bg-[var(--obsidian-hover)]"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="max-h-[calc(85vh-49px)] space-y-6 overflow-y-auto px-4 py-4">
          <div className="space-y-2">
            <div className={sectionTitleClass}>EDITING</div>
            <div className={cardClass}>
              <label className="flex items-center justify-between gap-4">
                <div>
                  <div className={labelClass}>Toolbar</div>
                  <div className={helpClass}>Toggle the toolbar inside the editor.</div>
                </div>
                <input
                  type="checkbox"
                  checked={showToolbar}
                  onChange={(e) => setShowToolbar(e.target.checked)}
                />
              </label>

              <label className="mt-4 flex items-center justify-between gap-4">
                <div>
                  <div className={labelClass}>Vim mode</div>
                  <div className={helpClass}>Enable or disable Vim keybindings.</div>
                </div>
                <input
                  type="checkbox"
                  checked={vimModeEnabled}
                  onChange={(e) => setVimModeEnabled(e.target.checked)}
                />
              </label>

              <div className="mt-4 flex items-center justify-between gap-4">
                <div>
                  <div className={labelClass}>Theme</div>
                  <div className={helpClass}>Choose light or dark mode.</div>
                </div>
                <select
                  value={themeMode}
                  onChange={(e) => setThemeMode(e.target.value as ThemeMode)}
                  className="rounded border border-[var(--obsidian-border)] bg-[var(--obsidian-workspace)] px-3 py-2 text-sm text-[var(--obsidian-text)] outline-none focus:border-[var(--obsidian-accent)]"
                >
                  {themeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <label className="mt-4 flex items-center justify-between gap-4">
                <div>
                  <div className={labelClass}>Remember session</div>
                  <div className={helpClass}>Remember open tabs and active file on reopen.</div>
                </div>
                <input
                  type="checkbox"
                  checked={rememberLastState}
                  onChange={(e) => setRememberLastState(e.target.checked)}
                />
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <div className={sectionTitleClass}>INTERFACE</div>
            <div className={cardClass}>
              <div className="space-y-4">
                <label className="flex items-center justify-between gap-4">
                  <div>
                    <div className={labelClass}>Folder icons</div>
                    <div className={helpClass}>Show folder glyphs next to folder names in the file tree.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={showFolderIcons}
                    onChange={(e) => setShowFolderIcons(e.target.checked)}
                  />
                </label>

                <label className="flex items-center justify-between gap-4">
                  <div>
                    <div className={labelClass}>Formatting toolbar</div>
                    <div className={helpClass}>Show the floating markdown formatting dock in the editor.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={showToolbar}
                    onChange={(e) => setShowToolbar(e.target.checked)}
                  />
                </label>

                <label className="flex items-center justify-between gap-4">
                  <div>
                    <div className={labelClass}>Relative line numbers</div>
                    <div className={helpClass}>Show relative numbers in the gutter.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={relativeLineNumbers}
                    onChange={(e) => setRelativeLineNumbers(e.target.checked)}
                  />
                </label>

                <label className="flex items-center justify-between gap-4">
                  <div>
                    <div className={labelClass}>Line wrapping</div>
                    <div className={helpClass}>Wrap long lines instead of horizontal scrolling.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={lineWrapping}
                    onChange={(e) => setLineWrapping(e.target.checked)}
                  />
                </label>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className={labelClass}>Tab indent unit</div>
                    <div className={helpClass}>Number of spaces to insert on Tab.</div>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={tabIndentUnit}
                    onChange={(e) => {
                      const next = Number(e.target.value)
                      if (Number.isFinite(next)) setTabIndentUnit(Math.min(8, Math.max(1, next)))
                    }}
                    className="w-20 rounded border border-[var(--obsidian-border)] bg-[var(--obsidian-workspace)] px-2 py-1.5 text-sm text-[var(--obsidian-text)] outline-none focus:border-[var(--obsidian-accent)]"
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className={labelClass}>Font size</div>
                    <div className={helpClass}>Editor font size in pixels.</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={9}
                      max={32}
                      value={fontSize}
                      onChange={(e) => {
                        const next = Number(e.target.value)
                        if (!Number.isFinite(next)) return
                        setFontSize(Math.min(32, Math.max(9, Math.floor(next))))
                      }}
                      className="w-20 rounded border border-[var(--obsidian-border)] bg-[var(--obsidian-workspace)] px-2 py-1.5 text-sm text-[var(--obsidian-text)] outline-none focus:border-[var(--obsidian-accent)]"
                    />
                    <div className="text-xs text-[var(--obsidian-text-muted)]">px</div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className={labelClass}>Editor font</div>
                    <div className={helpClass}>Choose a font for the editor.</div>
                  </div>
                  <select
                    value={editorFont}
                    onChange={(e) => setEditorFont(e.target.value as EditorFontOption)}
                    className="rounded border border-[var(--obsidian-border)] bg-[var(--obsidian-workspace)] px-3 py-2 text-sm text-[var(--obsidian-text)] outline-none focus:border-[var(--obsidian-accent)]"
                  >
                    {fontOptions.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Accent / primary color */}
                <div className="flex flex-col gap-2">
                  <div>
                    <div className={labelClass}>Accent color</div>
                    <div className={helpClass}>Sets the primary highlight color across the app.</div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {ACCENT_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        title={preset.label}
                        onClick={() => setAccentColor(preset.value)}
                        style={{ backgroundColor: preset.value }}
                        className={`w-5 h-5 rounded-full transition-all shrink-0 ${
                          accentColor === preset.value
                            ? 'ring-2 ring-offset-2 ring-[var(--obsidian-accent)] ring-offset-[var(--obsidian-workspace)] scale-110'
                            : 'opacity-80 hover:opacity-100 hover:scale-110'
                        }`}
                      />
                    ))}
                    {/* Custom picker */}
                    <label
                      title="Custom color"
                      className="relative w-5 h-5 rounded-full overflow-hidden border-2 border-dashed border-[var(--obsidian-border)] hover:border-[var(--obsidian-accent)] cursor-pointer shrink-0 transition-colors flex items-center justify-center"
                    >
                      <span className="text-[8px] text-[var(--obsidian-text-muted)] select-none">+</span>
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      />
                    </label>
                    {/* Current hex display */}
                    <span
                      className="ml-1 text-xs font-mono text-[var(--obsidian-text-muted)] select-all"
                    >
                      {accentColor}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className={sectionTitleClass}>AI</div>
            <div className={cardClass}>
              <label className="block">
                <div className={labelClass}>OpenRouter API key</div>
                <div className={helpClass}>Used only for Write with AI and stored locally on this device.</div>
                <input
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  placeholder="sk-or-v1-..."
                  className="mt-3 w-full rounded border border-[var(--obsidian-border)] bg-[var(--obsidian-workspace)] px-3 py-2 text-sm text-[var(--obsidian-text)] outline-none placeholder:opacity-30 focus:border-[var(--obsidian-accent)]"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
