import { randomUUID } from 'crypto'
import { chmodSync, existsSync, statSync } from 'fs'
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

const ensureNodePtySpawnHelperExecutable = () => {
  if (hasEnsuredSpawnHelperPermissions || process.platform === 'win32') return

  const nodePtyDir = path.dirname(require.resolve('node-pty/package.json'))
  const helperPath = path.join(nodePtyDir, 'prebuilds', `${process.platform}-${process.arch}`, 'spawn-helper')

  if (!existsSync(helperPath)) {
    hasEnsuredSpawnHelperPermissions = true
    return
  }

  const mode = statSync(helperPath).mode & 0o777
  if ((mode & 0o111) === 0) {
    chmodSync(helperPath, mode | 0o755)
  }

  hasEnsuredSpawnHelperPermissions = true
}

const getDefaultShell = () => {
  if (process.platform === 'win32') {
    return process.env['COMSPEC'] || 'powershell.exe'
  }

  return process.env['SHELL'] || (process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash')
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

  const shell = getDefaultShell()
  const cwd = resolveCwd(params?.cwd)
  const id = randomUUID()
  const cols = Math.max(40, params?.cols ?? 120)
  const rows = Math.max(10, params?.rows ?? 32)

  const terminalProcess = pty.spawn(shell, getShellArgs(shell), {
    name: 'xterm-256color',
    cols,
    rows,
    cwd,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      TERM_PROGRAM: 'Writr',
    },
  })

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
