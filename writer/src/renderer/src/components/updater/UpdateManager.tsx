import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { VscClose, VscCloudDownload, VscSparkle, VscSync } from 'react-icons/vsc'

interface UpdateInfo {
  version: string
  releaseNotes?: string
  releaseDate?: string
}

export const UpdateManager: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'gated' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [showPromptModal, setShowPromptModal] = useState(false)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [currentVersion, setCurrentVersion] = useState<string>('')
  const [welcomeReleaseNotes, setWelcomeReleaseNotes] = useState<string>('')

  // 1. Hook up Electron auto-updater listeners
  useEffect(() => {
    if (!window.context || !window.context.onUpdaterStatus) return

    // Get current version
    window.context.getAppVersion().then((v) => {
      setCurrentVersion(v)
      checkFirstLaunchAfterUpdate(v)
    })

    // Listen to updater status channel
    const unsubscribe = window.context.onUpdaterStatus(({ event, payload }) => {
      console.log('[Updater Event]', event, payload)
      switch (event) {
        case 'checking':
          setStatus('checking')
          break
        case 'available':
          setStatus('available')
          setUpdateInfo(payload)
          break
        case 'not-available':
          setStatus('idle')
          break
        case 'downloading':
          setStatus('downloading')
          break
        case 'progress':
          setStatus('downloading')
          if (payload && typeof payload.percent === 'number') {
            setProgress(Math.round(payload.percent))
          }
          break
        case 'downloaded':
          setStatus('downloaded')
          if (payload) {
            setUpdateInfo(payload)
          }
          break
        case 'gated':
          setStatus('gated')
          if (payload) setUpdateInfo(payload)
          break
        case 'error':
          setStatus('error')
          console.error('[Updater Error]', payload)
          break
        default:
          break
      }
    })

    // Silent background check 5s after start
    const timer = setTimeout(() => {
      window.context.checkForUpdates()
    }, 5000)

    return () => {
      unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  // 2. Check for post-update first launch
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
    } catch (e) {
      console.warn('Welcome note lookup failed:', e)
    }
  }

  const handleDismissWelcome = async () => {
    if (window.context && window.context.dismissWelcome) {
      await window.context.dismissWelcome(currentVersion)
    }
    setShowWelcomeModal(false)
  }

  const triggerRestart = () => {
    if (window.context && window.context.restartAndInstall) {
      window.context.restartAndInstall()
    }
  }

  return (
    <>
      {/* Dynamic Background Download Progress Toast */}
      {status === 'downloading' && (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 w-80 p-4 rounded-xl border border-[var(--obsidian-border)] bg-[rgba(30,30,30,0.75)] backdrop-blur-md shadow-2xl animate-slide-up text-white">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[rgba(65,105,225,0.2)] text-blue-400">
              <VscCloudDownload className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold tracking-wide">Downloading update...</h4>
              <p className="text-xs text-gray-400">Downloading Writer {updateInfo?.version || ''}</p>
            </div>
          </div>
          <div className="w-full bg-[rgba(255,255,255,0.1)] h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-blue-500 h-full transition-all duration-300 rounded-full" 
              style={{ width: `${progress}%` }} 
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-gray-400">
            <span>Progress: {progress}%</span>
            <span>Local Transfer</span>
          </div>
        </div>
      )}

      {/* Ready to Install Banner/Toast */}
      {status === 'downloaded' && !showPromptModal && (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 w-80 p-4 rounded-xl border border-green-900/50 bg-[rgba(20,35,20,0.85)] backdrop-blur-md shadow-2xl animate-slide-up text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-500/20 text-green-400">
                <VscSync className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold tracking-wide">Update Ready!</h4>
                <p className="text-xs text-gray-300">Writer v{updateInfo?.version}</p>
              </div>
            </div>
            <button 
              className="p-1 hover:bg-white/10 rounded-md transition text-gray-400 hover:text-white"
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
              className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 transition text-gray-300 hover:text-white"
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
          <div className="flex flex-col w-[540px] max-h-[80vh] rounded-2xl border border-[var(--obsidian-border)] bg-[var(--obsidian-pane)] shadow-2xl text-[var(--obsidian-text)] animate-scale-up overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[var(--obsidian-border)]">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400">
                  <VscSparkle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-wide">Software Update</h3>
                  <p className="text-xs text-gray-500">A new version of Writer is available</p>
                </div>
              </div>
              <button 
                className="p-2 hover:bg-white/5 rounded-lg transition text-gray-400 hover:text-white"
                onClick={() => setShowPromptModal(false)}
              >
                <VscClose className="w-5 h-5" />
              </button>
            </div>

            {/* Content (Release Notes) */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar text-sm leading-relaxed prose prose-invert max-w-none">
              <div className="mb-4">
                <span className="text-xs font-bold tracking-widest text-blue-400 uppercase">Version {updateInfo.version}</span>
                {updateInfo.releaseDate && (
                  <span className="ml-3 text-xs text-gray-500">Released: {new Date(updateInfo.releaseDate).toLocaleDateString()}</span>
                )}
              </div>
              <h4 className="text-md font-semibold mb-2 text-gray-300">Release Notes:</h4>
              <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] text-gray-300">
                {updateInfo.releaseNotes ? (
                  <ReactMarkdown>{updateInfo.releaseNotes}</ReactMarkdown>
                ) : (
                  <p className="italic text-gray-500">No release details provided.</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-5 border-t border-[var(--obsidian-border)] bg-[rgba(0,0,0,0.15)]">
              <button 
                className="py-2 px-4 rounded-xl text-xs font-semibold border border-[var(--obsidian-border)] hover:bg-white/5 transition"
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
          <div className="flex flex-col w-[540px] max-h-[80vh] rounded-2xl border border-yellow-900/30 bg-[var(--obsidian-pane)] shadow-2xl text-[var(--obsidian-text)] animate-scale-up overflow-hidden">
            {/* Celebrate Header */}
            <div className="flex items-center justify-between p-6 border-b border-[var(--obsidian-border)] bg-gradient-to-r from-blue-900/10 via-purple-900/10 to-yellow-900/10">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-yellow-500/20 text-yellow-400 animate-bounce">
                  <VscSparkle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-wide">Writer Successfully Updated!</h3>
                  <p className="text-xs text-gray-500">Welcome to version {currentVersion}</p>
                </div>
              </div>
              <button 
                className="p-2 hover:bg-white/5 rounded-lg transition text-gray-400 hover:text-white"
                onClick={handleDismissWelcome}
              >
                <VscClose className="w-5 h-5" />
              </button>
            </div>

            {/* Markdown Release Notes */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar text-sm leading-relaxed prose prose-invert max-w-none">
              <h4 className="text-md font-bold mb-3 text-gray-300">Here is what changed:</h4>
              <div className="p-5 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] text-gray-300">
                <ReactMarkdown>{welcomeReleaseNotes || '### Core System Upgrades\n\n- General performance and rendering updates.\n- Minor issue corrections.'}</ReactMarkdown>
              </div>
            </div>

            {/* Action Footer */}
            <div className="flex justify-end p-5 border-t border-[var(--obsidian-border)] bg-[rgba(0,0,0,0.15)]">
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
