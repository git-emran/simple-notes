import { randomUUID } from 'crypto'
import { accessSync, chmodSync, constants, existsSync, statSync } from 'fs'
import { homedir } from 'os'
import path from 'path'
import type { WebContents } from 'electron'
import pty, { type IPty } from 'node-pty'
import type {
  CreateTerminalSessionParams,
  TerminalSessionInfo,
  TerminalSnapshot,
} from '@shared/types'

type TerminalSessionRecord = {
  id: string
  pty: IPty
  webContents: WebContents
  cwd: string
  shell: string
  buffer: string
  sequence: number
  lastCols: number
  lastRows: number
}

const MAX_BUFFER_LENGTH = 1_000_000
const sessions = new Map<string, TerminalSessionRecord>()
let hasEnsuredSpawnHelperPermissions = false

const toUnpackedAsarPath = (targetPath: string) =>
  targetPath.replace(/([\\/])app\.asar([\\/])/, '$1app.asar.unpacked$2')

const resolveSpawnHelperPath = () => {
  const nodePtyDir = path.dirname(require.resolve('node-pty/package.json'))
  const helperPath = path.join(nodePtyDir, 'prebuilds', `${process.platform}-${process.arch}`, 'spawn-helper')
  if (existsSync(helperPath)) return helperPath

  const unpackedHelperPath = toUnpackedAsarPath(helperPath)
  if (unpackedHelperPath !== helperPath && existsSync(unpackedHelperPath)) {
    return unpackedHelperPath
  }

  return null
}

const ensureNodePtySpawnHelperExecutable = () => {
  if (hasEnsuredSpawnHelperPermissions || process.platform === 'win32') return

  const helperPath = resolveSpawnHelperPath()
  if (!helperPath) {
    hasEnsuredSpawnHelperPermissions = true
    return
  }

  try {
    const mode = statSync(helperPath).mode & 0o777
    if ((mode & 0o111) === 0) {
      chmodSync(helperPath, mode | 0o755)
    }
  } catch {
    void 0
  }

  hasEnsuredSpawnHelperPermissions = true
}

const getShellCandidates = () => {
  if (process.platform === 'win32') {
    return [
      process.env['COMSPEC'],
      'pwsh.exe',
      'powershell.exe',
      'cmd.exe',
    ].filter(Boolean) as string[]
  }

  const candidates = [
    process.env['SHELL'],
    process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash',
    '/bin/bash',
    '/bin/sh',
  ].filter(Boolean) as string[]

  return Array.from(new Set(candidates))
}

const getShellArgs = (shellPath: string) => {
  if (process.platform === 'win32') {
    const lower = shellPath.toLowerCase()
    if (lower.includes('powershell') || lower.includes('pwsh')) {
      return ['-NoLogo']
    }
    return []
  }

  return ['-l']
}

const resolveCwd = (candidate?: string) => {
  if (candidate && existsSync(candidate)) {
    return path.resolve(candidate)
  }

  return homedir()
}

const isShellUsable = (shellPath: string) => {
  if (!shellPath) return false
  if (process.platform === 'win32') return true

  try {
    accessSync(shellPath, constants.X_OK)
    return true
  } catch {
    return false
  }
}

const getTerminalEnv = () => {
  const fallbackPath =
    process.platform === 'darwin'
      ? '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin'
      : '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'

  return {
    ...process.env,
    PATH: process.env['PATH'] || fallbackPath,
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    TERM_PROGRAM: 'Writr',
  }
}

const spawnTerminalProcess = (cwd: string, cols: number, rows: number) => {
  const errors: string[] = []
  for (const shell of getShellCandidates()) {
    if (!isShellUsable(shell)) {
      errors.push(`Shell not executable: ${shell}`)
      continue
    }

    try {
      const terminalProcess = pty.spawn(shell, getShellArgs(shell), {
        name: 'xterm-256color',
        cols,
        rows,
        cwd,
        env: getTerminalEnv(),
      })
      return { shell, terminalProcess }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`Spawn failed for ${shell}: ${message}`)
    }
  }

  throw new Error(errors.join(' | ') || 'No shell candidates available')
}

const appendToBuffer = (session: TerminalSessionRecord, chunk: string) => {
  session.buffer += chunk
  if (session.buffer.length > MAX_BUFFER_LENGTH) {
    session.buffer = session.buffer.slice(-MAX_BUFFER_LENGTH)
  }
}

const getSessionForSender = (sessionId: string, sender: WebContents) => {
  const session = sessions.get(sessionId)
  if (!session) return null
  if (session.webContents.id !== sender.id) return null
  return session
}

export const createTerminalSession = (
  sender: WebContents,
  params?: CreateTerminalSessionParams
): TerminalSessionInfo => {
  ensureNodePtySpawnHelperExecutable()

  const cwd = resolveCwd(params?.cwd)
  const id = randomUUID()
  const cols = Math.max(40, params?.cols ?? 120)
  const rows = Math.max(10, params?.rows ?? 32)
  const { shell, terminalProcess } = spawnTerminalProcess(cwd, cols, rows)

  const session: TerminalSessionRecord = {
    id,
    pty: terminalProcess,
    webContents: sender,
    cwd,
    shell,
    buffer: '',
    sequence: 0,
    lastCols: cols,
    lastRows: rows,
  }

  sessions.set(id, session)

  terminalProcess.onData((data) => {
    appendToBuffer(session, data)
    session.sequence += 1
    if (!sender.isDestroyed()) {
      sender.send('terminal:data', { sessionId: id, data, sequence: session.sequence })
    }
  })

  terminalProcess.onExit(({ exitCode, signal }) => {
    sessions.delete(id)
    if (!sender.isDestroyed()) {
      sender.send('terminal:exit', { sessionId: id, exitCode, signal })
    }
  })

  return { sessionId: id, cwd, shell }
}

export const getTerminalSnapshot = (
  sender: WebContents,
  sessionId: string
): TerminalSnapshot | null => {
  const session = getSessionForSender(sessionId, sender)
  if (!session) return null

  return {
    sessionId: session.id,
    cwd: session.cwd,
    shell: session.shell,
    buffer: session.buffer,
    sequence: session.sequence,
  }
}

export const writeTerminalInput = (sender: WebContents, sessionId: string, data: string) => {
  const session = getSessionForSender(sessionId, sender)
  if (!session || !data) return
  session.pty.write(data)
}

export const resizeTerminalSession = (
  sender: WebContents,
  sessionId: string,
  cols: number,
  rows: number
) => {
  const session = getSessionForSender(sessionId, sender)
  if (!session) return

  if (!Number.isFinite(cols) || !Number.isFinite(rows)) return
  const safeCols = Math.max(1, Math.floor(cols))
  const safeRows = Math.max(1, Math.floor(rows))
  if (session.lastCols === safeCols && session.lastRows === safeRows) return

  session.lastCols = safeCols
  session.lastRows = safeRows

  try {
    session.pty.resize(safeCols, safeRows)
  } catch {
    sessions.delete(sessionId)
  }
}

export const closeTerminalSession = (sender: WebContents, sessionId: string) => {
  const session = getSessionForSender(sessionId, sender)
  if (!session) return
  sessions.delete(sessionId)
  try {
    session.pty.kill()
  } catch {
    /* no-op */
  }
}

export const disposeTerminalSessionsForSender = (sender: WebContents) => {
  for (const [sessionId, session] of sessions) {
    if (session.webContents.id !== sender.id) continue
    sessions.delete(sessionId)
    try {
      session.pty.kill()
    } catch {
      /* no-op */
    }
  }
}
