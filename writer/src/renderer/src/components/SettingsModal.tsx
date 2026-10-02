import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useState, useEffect } from 'react'
import { VscFolderOpened, VscFolder, VscCopy, VscCheck, VscRefresh, VscCloudDownload, VscSync } from 'react-icons/vsc'
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
  transparentBgAtom,
  autoUpdateEnabledAtom,
  vaultRootDirAtom,
  defaultVaultRootDirAtom,
  selectVaultDirectoryAtom,
  resetVaultDirectoryAtom,
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

const sectionTitleClass = 'app-section-title'
const labelClass = 'app-label'
const helpClass = 'app-help-text'
const cardClass = 'app-card'

const fontOptions: EditorFontOption[] = ['SF Pro', 'SFMono-Regular', 'Menlo', 'JetBrains Mono', 'Martian Mono', 'Courier']

export const SettingsPanel = () => {
  const [themeMode, setThemeMode] = useAtom(themeModeAtom)
  const [showToolbar, setShowToolbar] = useAtom(showToolbarAtom)
  const [showFolderIcons, setShowFolderIcons] = useAtom(showFolderIconsAtom)
  const [vimModeEnabled, setVimModeEnabled] = useAtom(vimModeEnabledAtom)
  const [rememberLastState, setRememberLastState] = useAtom(rememberLastStateAtom)
  const [aiApiKey, setAiApiKey] = useAtom(aiApiKeyAtom)
  const [accentColor, setAccentColor] = useAtom(accentColorAtom)
  const [transparentBg, setTransparentBg] = useAtom(transparentBgAtom)
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useAtom(autoUpdateEnabledAtom)

  const [appVersion, setAppVersion] = useState<string>('')
  const [updateCheckStatus, setUpdateCheckStatus] = useState<
    'idle' | 'checking' | 'up-to-date' | 'available' | 'downloading' | 'downloaded' | 'error' | 'dev-bypass'
  >('idle')
  const [downloadProgress, setDownloadProgress] = useState<number>(0)
  const [availableVersion, setAvailableVersion] = useState<string>('')
  const [updateError, setUpdateError] = useState<string>('')

  const [relativeLineNumbers, setRelativeLineNumbers] = useAtom(relativeLineNumbersEnabledAtom)
  const [lineWrapping, setLineWrapping] = useAtom(lineWrappingEnabledAtom)
  const [tabIndentUnit, setTabIndentUnit] = useAtom(tabIndentUnitAtom)
  const [fontSize, setFontSize] = useAtom(editorFontSizeAtom)
  const [editorFont, setEditorFont] = useAtom(editorFontAtom)

  const vaultRootDir = useAtomValue(vaultRootDirAtom)
  const defaultVaultRootDir = useAtomValue(defaultVaultRootDirAtom)
  const selectVaultDirectory = useSetAtom(selectVaultDirectoryAtom)
  const resetVaultDirectory = useSetAtom(resetVaultDirectoryAtom)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!window.context) return
    window.context.getAppVersion?.().then((v) => {
      if (v) setAppVersion(v)
    })

    if (window.context.onUpdaterStatus) {
      const unsub = window.context.onUpdaterStatus(({ event, payload }) => {
        const p = payload as Record<string, unknown> | null | undefined
        if (event === 'checking') {
          setUpdateCheckStatus('checking')
          setUpdateError('')
        } else if (event === 'available') {
          setUpdateCheckStatus('available')
          if (p && typeof p.version === 'string') {
            setAvailableVersion(p.version)
          }
        } else if (event === 'not-available') {
          setUpdateCheckStatus('up-to-date')
        } else if (event === 'downloading') {
          setUpdateCheckStatus('downloading')
        } else if (event === 'progress') {
          setUpdateCheckStatus('downloading')
          if (p && typeof p.percent === 'number') {
            setDownloadProgress(Math.round(p.percent))
          }
        } else if (event === 'downloaded') {
          setUpdateCheckStatus('downloaded')
          if (p && typeof p.version === 'string') {
            setAvailableVersion(p.version)
          }
        } else if (event === 'error') {
          setUpdateCheckStatus('error')
          setUpdateError(typeof payload === 'string' ? payload : 'Failed to check for updates.')
        }
      })
      return unsub
    }
  }, [])

  const handleCheckForUpdates = async () => {
    if (!window.context?.checkForUpdates) return
    setUpdateCheckStatus('checking')
    setUpdateError('')
    try {
      const res = await window.context.checkForUpdates(true)
      if (res?.status === 'dev-bypass') {
        setUpdateCheckStatus('dev-bypass')
      }
    } catch (e: unknown) {
      setUpdateCheckStatus('error')
      setUpdateError(e instanceof Error ? e.message : 'Failed to check for updates.')
    }
  }

  const handleRestartAndInstall = () => {
    if (window.context?.restartAndInstall) {
      window.context.restartAndInstall()
    }
  }

  const isCustomVault = Boolean(vaultRootDir && defaultVaultRootDir && vaultRootDir !== defaultVaultRootDir)

  const handleCopyPath = () => {
    if (!vaultRootDir) return
    void navigator.clipboard.writeText(vaultRootDir)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRevealVault = () => {
    if (vaultRootDir && window.context?.revealPath) {
      void window.context.revealPath(vaultRootDir)
    }
  }

  const themeOptions: Array<{ label: string; value: ThemeMode }> = [
    { label: 'System', value: 'system' },
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
  ]

  const customThemeOptions: Array<{ label: string; value: ThemeMode }> = [
    { label: 'Gruvbox Dark', value: 'gruvbox-dark' },
    { label: 'Gruvbox Light', value: 'gruvbox-light' },
    { label: 'Catppuccin Dark (Mocha)', value: 'catppuccin-dark' },
    { label: 'Catppuccin Light (Latte)', value: 'catppuccin-light' },
  ]

  return (
    <div className="flex h-full flex-col bg-[var(--obsidian-base)]">
      <div className="shrink-0 border-b border-obsidian-border-soft bg-[var(--obsidian-pane)] px-6 py-4">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-semibold text-[var(--obsidian-text)]">Settings</h1>
            <p className="mt-1 text-xs text-[var(--obsidian-text-muted)]">
              Preferences are saved locally and apply immediately.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto w-full max-w-4xl space-y-6">
          <div className="space-y-2">
            <div className={sectionTitleClass}>VAULT / NOTES DIRECTORY</div>
            <div className={cardClass}>
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className={labelClass}>Notes Location</div>
                    <div className={helpClass}>
                      The root folder containing your markdown files, canvas boards, and scripts.
                    </div>
                  </div>
                  {isCustomVault && (
                    <span className="rounded bg-[var(--obsidian-accent-dim)] px-2 py-0.5 text-[11px] font-medium text-[var(--obsidian-accent)]">
                      Custom Directory
                    </span>
                  )}
                </div>

                {/* Path display box */}
                <div className="flex items-center gap-2 rounded border border-obsidian-border bg-[var(--obsidian-base)] p-2">
                  <VscFolder className="h-4 w-4 shrink-0 text-[var(--obsidian-accent)]" />
                  <span className="flex-1 truncate font-mono text-xs text-[var(--obsidian-text)] select-all">
                    {vaultRootDir || 'Loading...'}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPath}
                    className="app-btn-ghost flex items-center gap-1 rounded px-2 py-1 text-xs"
                    title="Copy path"
                  >
                    {copied ? <VscCheck className="h-3.5 w-3.5 text-green-500" /> : <VscCopy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRevealVault}
                    className="app-btn-ghost flex items-center gap-1 rounded px-2 py-1 text-xs"
                    title="Reveal in file manager"
                  >
                    <span>Reveal</span>
                  </button>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => void selectVaultDirectory()}
                    className="app-btn-primary px-3 py-2"
                  >
                    <VscFolderOpened className="h-3.5 w-3.5" />
                    <span>Choose Directory / Vault...</span>
                  </button>

                  {isCustomVault && (
                    <button
                      type="button"
                      onClick={() => void resetVaultDirectory()}
                      className="app-btn-secondary px-3 py-2"
                      title="Reset to default directory (~/Writr)"
                    >
                      <VscRefresh className="h-3.5 w-3.5" />
                      <span>Reset to Default (~/Writr)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

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
                  className="app-select"
                >
                  <optgroup label="Base">
                    {themeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Color Schemes">
                    {customThemeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </optgroup>
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
                    <div className={labelClass}>Transparent background</div>
                    <div className={helpClass}>Enable glassmorphism — translucent panels with backdrop blur.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={transparentBg}
                    onChange={(e) => setTransparentBg(e.target.checked)}
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
                    value={tabIndentUnit === 0 ? '' : tabIndentUnit}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === '') {
                        setTabIndentUnit(0)
                        return
                      }
                      const next = Number(val)
                      if (Number.isFinite(next)) setTabIndentUnit(Math.min(8, next))
                    }}
                    onBlur={() => {
                      const current = Number(tabIndentUnit)
                      if (!current || current < 1) setTabIndentUnit(1)
                    }}
                    className="app-input w-20 px-2 py-1.5"
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
                      max={50}
                      value={fontSize === 0 ? '' : fontSize}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === '') {
                          setFontSize(0)
                          return
                        }
                        const next = Number(val)
                        if (!Number.isFinite(next)) return
                        setFontSize(Math.min(50, Math.floor(next)))
                      }}
                      onBlur={() => {
                        const current = Number(fontSize)
                        if (!current || current < 9) {
                          setFontSize(9)
                        }
                      }}
                      className="app-input w-20 px-2 py-1.5"
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
                    className="app-select"
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
                      className="relative w-5 h-5 rounded-full overflow-hidden border-2 border-dashed border-obsidian-border hover:border-[var(--obsidian-accent)] cursor-pointer shrink-0 transition-colors flex items-center justify-center"
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
                  className="app-input mt-3 placeholder:opacity-30"
                />
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <div className={sectionTitleClass}>APP UPDATES</div>
            <div className={cardClass}>
              <div className="space-y-4">
                <label className="flex items-center justify-between gap-4">
                  <div>
                    <div className={labelClass}>Automatic updates</div>
                    <div className={helpClass}>
                      Automatically check for updates in the background on startup.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoUpdateEnabled}
                    onChange={(e) => setAutoUpdateEnabled(e.target.checked)}
                  />
                </label>

                <div className="flex flex-col gap-3 pt-3 border-t border-obsidian-border-soft">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className={labelClass}>App Version</div>
                      <div className={helpClass}>
                        {appVersion ? `Installed version: v${appVersion}` : 'Checking version...'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {updateCheckStatus === 'downloaded' ? (
                        <button
                          type="button"
                          onClick={handleRestartAndInstall}
                          className="app-btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-green-600 hover:bg-green-500 text-white"
                        >
                          <VscSync className="h-3.5 w-3.5" />
                          <span>Restart & Install</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleCheckForUpdates}
                          disabled={updateCheckStatus === 'checking' || updateCheckStatus === 'downloading'}
                          className="app-btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs"
                        >
                          {updateCheckStatus === 'checking' || updateCheckStatus === 'downloading' ? (
                            <VscSync className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <VscCloudDownload className="h-3.5 w-3.5" />
                          )}
                          <span>
                            {updateCheckStatus === 'checking'
                              ? 'Checking...'
                              : updateCheckStatus === 'downloading'
                              ? `Downloading (${downloadProgress}%)`
                              : 'Check for Updates'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Status Badges & Banners */}
                  {updateCheckStatus === 'up-to-date' && (
                    <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2 text-xs text-green-400">
                      <VscCheck className="h-4 w-4 shrink-0 text-green-500" />
                      <span>You are running the latest version of Writer.</span>
                    </div>
                  )}

                  {updateCheckStatus === 'dev-bypass' && (
                    <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2 text-xs text-blue-400">
                      <span>Development build — update checks are bypassed in dev mode.</span>
                    </div>
                  )}

                  {updateCheckStatus === 'available' && (
                    <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2 text-xs text-blue-400">
                      <VscCloudDownload className="h-4 w-4 shrink-0" />
                      <span>A new version ({availableVersion ? `v${availableVersion}` : 'latest'}) is available and downloading...</span>
                    </div>
                  )}

                  {updateCheckStatus === 'downloading' && (
                    <div className="flex flex-col gap-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-xs text-blue-400">
                      <div className="flex justify-between items-center font-medium">
                        <span>Downloading update {availableVersion ? `v${availableVersion}` : ''}...</span>
                        <span>{downloadProgress}%</span>
                      </div>
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-500 h-full transition-all duration-200 rounded-full"
                          style={{ width: `${downloadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {updateCheckStatus === 'downloaded' && (
                    <div className="flex items-center justify-between gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2 text-xs text-green-400">
                      <div className="flex items-center gap-2">
                        <VscCheck className="h-4 w-4 shrink-0" />
                        <span>Version {availableVersion ? `v${availableVersion}` : ''} has been downloaded and is ready to install!</span>
                      </div>
                    </div>
                  )}

                  {updateCheckStatus === 'error' && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
                      <span>{updateError || 'Check failed. Please check your internet connection.'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const SettingsModal = ({ onClose }: { onClose: () => void }) => (
  <div className="app-modal-backdrop">
    <div className="app-modal-dialog h-[85vh] max-w-3xl">
      <div className="flex h-full flex-col">
        <div className="app-modal-header">
          <h3 className="text-sm font-semibold text-[var(--obsidian-text)]">Settings</h3>
          <button
            type="button"
            className="app-btn-ghost px-2 py-1 text-xs"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <SettingsPanel />
        </div>
      </div>
    </div>
  </div>
)
