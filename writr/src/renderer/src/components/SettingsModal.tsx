import { useAtom } from 'jotai'
import {
  editorFontAtom,
  editorFontSizeAtom,
  lineWrappingEnabledAtom,
  relativeLineNumbersEnabledAtom,
  showFolderIconsAtom,
  showToolbarAtom,
  tabIndentUnitAtom,
  themeModeAtom,
  vimModeEnabledAtom,
  type EditorFontOption,
  type ThemeMode,
} from '@renderer/store'

const sectionTitleClass = 'text-xs font-semibold tracking-[0.12em] text-[var(--obsidian-text-muted)]'
const labelClass = 'text-sm text-[var(--obsidian-text)]'
const helpClass = 'text-xs text-[var(--obsidian-text-muted)]'
const cardClass = 'rounded-lg border border-[var(--obsidian-border)] bg-[var(--obsidian-workspace)] p-4'

const fontOptions: EditorFontOption[] = ['SF Pro', 'SFMono-Regular', 'Menlo', 'JetBrains Mono', 'Courier']

export const SettingsModal = ({ onClose }: { onClose: () => void }) => {
  const [themeMode, setThemeMode] = useAtom(themeModeAtom)
  const [showToolbar, setShowToolbar] = useAtom(showToolbarAtom)
  const [showFolderIcons, setShowFolderIcons] = useAtom(showFolderIconsAtom)
  const [vimModeEnabled, setVimModeEnabled] = useAtom(vimModeEnabledAtom)

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
      <div className="w-full max-w-2xl rounded-lg border border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] shadow-xl">
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

        <div className="space-y-6 px-4 py-4">
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
                      type="range"
                      min={11}
                      max={20}
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                    />
                    <div className="w-10 text-right text-xs text-[var(--obsidian-text-muted)]">
                      {fontSize}px
                    </div>
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
