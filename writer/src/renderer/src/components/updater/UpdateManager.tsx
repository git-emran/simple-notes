import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { VscClose, VscCloudDownload, VscSparkle, VscSync } from 'react-icons/vsc'
import { useUpdater } from '@renderer/store'

export const UpdateManager: React.FC = () => {
  const {
    status,
    setStatus,
    updateInfo,
    progress,
    appVersion,
    autoUpdateEnabled,
    restartAndInstall
  } = useUpdater()

  const [showPromptModal, setShowPromptModal] = useState(false)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [welcomeReleaseNotes, setWelcomeReleaseNotes] = useState<string>('')

  // Silent background check 5s after start only if auto-update is enabled
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    if (autoUpdateEnabled && window.context?.checkForUpdates) {
      timer = setTimeout(() => {
        window.context.checkForUpdates(false)
      }, 5000)
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [autoUpdateEnabled])

  // Check for post-update first launch
  useEffect(() => {
    if (!appVersion || !window.context?.getUpdateConfig) return

    const checkFirstLaunchAfterUpdate = async (v: string) => {
      try {
        const config = await window.context.getUpdateConfig()
        if (config && config.lastPromptedVersion !== v) {
          // Fetch release notes from GitHub dynamically for the current version
          const response = await fetch('https://api.github.com/repos/git-emran/simple-notes/releases/latest')
          if (response.ok) {
            const data = await response.json()
            if (data && data.tag_name && (data.tag_name.includes(v) || v.includes(data.tag_name.replace('v', '')))) {
              setWelcomeReleaseNotes(data.body || 'No release notes available.')
              setShowWelcomeModal(true)
            }
          }
        }
      } catch {
        // Ignore welcome note lookup failures
      }
    }

    checkFirstLaunchAfterUpdate(appVersion)
  }, [appVersion])

  const handleDismissWelcome = async () => {
    if (window.context && window.context.dismissWelcome) {
      await window.context.dismissWelcome(appVersion)
    }
    setShowWelcomeModal(false)
  }

  const triggerRestart = () => {
    restartAndInstall()
  }

  return (
    <>
      {/* Dynamic Background Download Progress Toast */}
      {status === 'downloading' && (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 w-80 p-4 rounded-xl border border-obsidian-border bg-[var(--obsidian-surface)] backdrop-blur-md shadow-2xl animate-slide-up text-[var(--obsidian-text)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400">
              <VscCloudDownload className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold tracking-wide">Downloading update...</h4>
              <p className="text-xs text-[var(--obsidian-text-muted)]">Downloading Writer {updateInfo?.version || ''}</p>
            </div>
          </div>
          <div className="w-full bg-[var(--obsidian-hover)] h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-blue-500 h-full transition-all duration-300 rounded-full" 
              style={{ width: `${progress}%` }} 
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-[var(--obsidian-text-muted)]">
            <span>Progress: {progress}%</span>
            <span>Update Transfer</span>
          </div>
        </div>
      )}

      {/* Ready to Install Banner/Toast */}
      {status === 'downloaded' && !showPromptModal && (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 w-80 p-4 rounded-xl border border-green-600/30 bg-[var(--obsidian-surface)] backdrop-blur-md shadow-2xl animate-slide-up text-[var(--obsidian-text)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-500/20 text-green-500">
                <VscSync className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold tracking-wide">Update Ready!</h4>
                <p className="text-xs text-[var(--obsidian-text-muted)]">Writer v{updateInfo?.version}</p>
              </div>
            </div>
            <button 
              className="p-1 hover:bg-[var(--obsidian-hover)] rounded-md transition text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)]"
              onClick={() => setStatus('idle')}
            >
              <VscClose className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2 mt-1">
            <button 
              className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-green-600 hover:bg-green-500 transition text-white"
              onClick={triggerRestart}
            >
              Restart & Install
            </button>
            <button 
              className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-[var(--obsidian-hover)] hover:bg-[var(--obsidian-hover-soft)] transition text-[var(--obsidian-text)]"
              onClick={() => setShowPromptModal(true)}
            >
              Details
            </button>
          </div>
        </div>
      )}

      {/* Release Notes / Details Modal (UpdatePromptModal) */}
      {showPromptModal && updateInfo && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col w-[540px] max-h-[80vh] rounded-2xl border border-obsidian-border bg-[var(--obsidian-surface)] shadow-2xl text-[var(--obsidian-text)] animate-scale-up overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-obsidian-border bg-[var(--obsidian-workspace)]">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400">
                  <VscSparkle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-wide">Software Update</h3>
                  <p className="text-xs text-[var(--obsidian-text-muted)]">A new version of Writer is available</p>
                </div>
              </div>
              <button 
                className="p-2 hover:bg-[var(--obsidian-hover)] rounded-lg transition text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)]"
                onClick={() => setShowPromptModal(false)}
              >
                <VscClose className="w-5 h-5" />
              </button>
            </div>

            {/* Content (Release Notes) */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar text-sm leading-relaxed max-w-none bg-[var(--obsidian-surface)]">
              <div className="mb-4">
                <span className="text-xs font-bold tracking-widest text-blue-400 uppercase">Version {updateInfo.version}</span>
                {updateInfo.releaseDate && (
                  <span className="ml-3 text-xs text-[var(--obsidian-text-muted)]">Released: {new Date(updateInfo.releaseDate).toLocaleDateString()}</span>
                )}
              </div>
              <h4 className="text-md font-semibold mb-2 text-[var(--obsidian-text)]">Release Notes:</h4>
              <div className="p-4 rounded-xl bg-[var(--obsidian-workspace)] border border-obsidian-border text-[var(--obsidian-text)]">
                {updateInfo.releaseNotes ? (
                  <ReactMarkdown>{updateInfo.releaseNotes}</ReactMarkdown>
                ) : (
                  <p className="italic text-[var(--obsidian-text-muted)]">No release details provided.</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-5 border-t border-obsidian-border bg-[var(--obsidian-workspace)]">
              <button 
                className="py-2 px-4 rounded-xl text-xs font-semibold border border-obsidian-border hover:bg-[var(--obsidian-hover)] transition text-[var(--obsidian-text)]"
                onClick={() => setShowPromptModal(false)}
              >
                Remind Me Later
              </button>
              <button 
                className="py-2 px-5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 transition text-white"
                onClick={triggerRestart}
              >
                Install and Restart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Update "What's New" Welcome Modal */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col w-[540px] max-h-[80vh] rounded-2xl border border-obsidian-border bg-[var(--obsidian-surface)] shadow-2xl text-[var(--obsidian-text)] animate-scale-up overflow-hidden">
            {/* Celebrate Header */}
            <div className="flex items-center justify-between p-6 border-b border-obsidian-border bg-[var(--obsidian-workspace)]">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-yellow-500/20 text-yellow-500 animate-bounce">
                  <VscSparkle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-wide text-[var(--obsidian-text)]">Writer Successfully Updated!</h3>
                  <p className="text-xs text-[var(--obsidian-text-muted)]">Welcome to version {appVersion}</p>
                </div>
              </div>
              <button 
                className="p-2 hover:bg-[var(--obsidian-hover)] rounded-lg transition text-[var(--obsidian-text-muted)] hover:text-[var(--obsidian-text)]"
                onClick={handleDismissWelcome}
              >
                <VscClose className="w-5 h-5" />
              </button>
            </div>

            {/* Markdown Release Notes */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar text-sm leading-relaxed max-w-none bg-[var(--obsidian-surface)] text-[var(--obsidian-text)]">
              <h4 className="text-md font-bold mb-3 text-[var(--obsidian-text)]">Here is what changed:</h4>
              <div className="p-5 rounded-xl bg-[var(--obsidian-workspace)] border border-obsidian-border text-[var(--obsidian-text)]">
                <ReactMarkdown>{welcomeReleaseNotes || '### Core System Upgrades\n\n- General performance and rendering updates.\n- Minor issue corrections.'}</ReactMarkdown>
              </div>
            </div>

            {/* Action Footer */}
            <div className="flex justify-end p-5 border-t border-obsidian-border bg-[var(--obsidian-workspace)]">
              <button 
                className="py-2.5 px-6 rounded-xl text-xs font-bold bg-yellow-600 hover:bg-yellow-500 transition text-white shadow-lg shadow-yellow-950/20"
                onClick={handleDismissWelcome}
              >
                Awesome, Let's Write!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

