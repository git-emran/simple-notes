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

const resolveSpawnHelperCandidates = (): string[] => {
  const candidates: string[] = []

  let nodePtyDir: string | null = null
  try {
    nodePtyDir = path.dirname(require.resolve('node-pty/package.json'))
  } catch {
    nodePtyDir = null
  }

  const relativeHelperSubpaths = [
    path.join('prebuilds', `${process.platform}-${process.arch}`, 'spawn-helper'),
    path.join('build', 'Release', 'spawn-helper'),
    path.join('build', 'Debug', 'spawn-helper'),
    path.join('bin', `${process.platform}-${process.arch}`, 'spawn-helper'),
  ]

  const baseDirs: string[] = []
  if (nodePtyDir) {
    baseDirs.push(nodePtyDir)
  }
  if (process.resourcesPath) {
    baseDirs.push(
      path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'node-pty'),
      path.join(process.resourcesPath, 'node_modules', 'node-pty')
    )
  }

  for (const base of baseDirs) {
    for (const sub of relativeHelperSubpaths) {
      const fullPath = path.join(base, sub)
      candidates.push(fullPath)
      const unpacked = toUnpackedAsarPath(fullPath)
      if (unpacked !== fullPath) {
        candidates.push(unpacked)
      }
    }
  }

  return Array.from(new Set(candidates))
}

const ensureNodePtySpawnHelperExecutable = () => {
  if (hasEnsuredSpawnHelperPermissions || process.platform === 'win32') return

  const candidatePaths = resolveSpawnHelperCandidates()
  for (const helperPath of candidatePaths) {
    try {
      if (existsSync(helperPath)) {
        const mode = statSync(helperPath).mode & 0o777
        if ((mode & 0o111) === 0) {
          chmodSync(helperPath, mode | 0o755)
        }
      }
    } catch {
      // Ignore filesystem permission read/write errors on non-writable paths
    }
  }

  hasEnsuredSpawnHelperPermissions = true
}

const getShellCandidates = (): string[] => {
  if (process.platform === 'win32') {
    const systemRoot = process.env['SystemRoot'] || 'C:\\Windows'
    const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files'
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
    const localAppData = process.env['LocalAppData'] || ''

    return [
      process.env['COMSPEC'],
      path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      path.join(systemRoot, 'System32', 'cmd.exe'),
      path.join(programFiles, 'PowerShell', '7', 'pwsh.exe'),
      path.join(programFiles, 'Git', 'bin', 'bash.exe'),
      path.join(programFilesX86, 'Git', 'bin', 'bash.exe'),
      localAppData ? path.join(localAppData, 'Programs', 'Git', 'bin', 'bash.exe') : '',
      'pwsh.exe',
      'powershell.exe',
      'cmd.exe',
    ].filter(Boolean) as string[]
  }

  const userHome = homedir()
  const candidates: string[] = []

  if (process.env['SHELL']) {
    candidates.push(process.env['SHELL'])
  }

  if (process.platform === 'darwin') {
    candidates.push(
      '/bin/zsh',
      '/bin/bash',
      '/opt/homebrew/bin/zsh',
      '/opt/homebrew/bin/bash',
      '/usr/local/bin/zsh',
      '/usr/local/bin/bash',
      '/usr/bin/zsh',
      '/usr/bin/bash',
      path.join(userHome, '.nix-profile/bin/zsh'),
      path.join(userHome, '.nix-profile/bin/bash'),
      '/bin/sh',
      '/usr/bin/sh'
    )
  } else {
    // Linux and other Unixes
    candidates.push(
      '/bin/bash',
      '/usr/bin/bash',
      '/bin/zsh',
      '/usr/bin/zsh',
      '/usr/bin/fish',
      '/bin/sh',
      '/usr/bin/sh'
    )
  }

  return Array.from(new Set(candidates.filter(Boolean)))
}

const getShellArgs = (shellPath: string): string[] => {
  const lower = shellPath.toLowerCase()
  if (process.platform === 'win32') {
    if (lower.includes('powershell') || lower.includes('pwsh')) {
      return ['-NoLogo']
    }
    if (lower.includes('bash')) {
      return ['-l']
    }
    return []
  }

  // On POSIX, 'sh' and 'dash' may not support login option '-l'
  const base = path.basename(lower)
  if (base === 'sh' || base === 'dash') {
    return []
  }

  return ['-l']
}

const resolveCwd = (candidate?: string): string => {
  if (candidate) {
    try {
      const resolved = path.resolve(candidate)
      if (existsSync(resolved)) {
        const stat = statSync(resolved)
        if (stat.isDirectory()) {
          return resolved
        }
        return path.dirname(resolved)
      }
    } catch {
      // fallback
    }
  }

  try {
    const home = homedir()
    if (existsSync(home)) return home
  } catch {
    // fallback
  }

  try {
    return process.cwd()
  } catch {
    return process.platform === 'win32' ? 'C:\\' : '/'
  }
}

const isShellUsable = (shellPath: string): boolean => {
  if (!shellPath) return false

  if (process.platform === 'win32') {
    if (path.isAbsolute(shellPath)) {
      return existsSync(shellPath)
    }
    return true
  }

  try {
    if (!existsSync(shellPath)) return false
    accessSync(shellPath, constants.X_OK)
    return true
  } catch {
    return false
  }
}

const buildAugmentedPath = (): string => {
  const pathSeparator = process.platform === 'win32' ? ';' : ':'
  const existingPath = process.env['PATH'] || ''
  const existingParts = existingPath.split(pathSeparator).filter(Boolean)

  const additionalParts: string[] = []
  const userHome = homedir()

  if (process.platform === 'darwin') {
    additionalParts.push(
      '/opt/homebrew/bin',
      '/opt/homebrew/sbin',
      '/usr/local/bin',
      '/usr/local/sbin',
      path.join(userHome, '.local', 'bin'),
      path.join(userHome, '.cargo', 'bin'),
      path.join(userHome, 'bin'),
      '/usr/bin',
      '/bin',
      '/usr/sbin',
      '/sbin'
    )
  } else if (process.platform === 'linux') {
    additionalParts.push(
      '/usr/local/sbin',
      '/usr/local/bin',
      '/usr/sbin',
      '/usr/bin',
      '/sbin',
      '/bin',
      path.join(userHome, '.local', 'bin'),
      path.join(userHome, 'bin'),
      path.join(userHome, '.cargo', 'bin')
    )
  } else if (process.platform === 'win32') {
    const systemRoot = process.env['SystemRoot'] || 'C:\\Windows'
    additionalParts.push(
      path.join(systemRoot, 'System32'),
      systemRoot,
      path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0')
    )
  }

  const combined = [...existingParts, ...additionalParts]
  const deduplicated: string[] = []
  const seen = new Set<string>()

  for (const part of combined) {
    const normalized = process.platform === 'win32' ? part.toLowerCase() : part
    if (!seen.has(normalized)) {
      seen.add(normalized)
      deduplicated.push(part)
    }
  }

  return deduplicated.join(pathSeparator)
}

const getTerminalEnv = () => {
  const home = homedir()
  const user = process.env['USER'] || process.env['LOGNAME'] || process.env['USERNAME'] || ''

  return {
    ...process.env,
    PATH: buildAugmentedPath(),
    HOME: process.env['HOME'] || home,
    USER: user,
    LOGNAME: user,
    LANG: process.env['LANG'] || 'en_US.UTF-8',
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    TERM_PROGRAM: 'Writr',
  }
}

const spawnTerminalProcess = (cwd: string, cols: number, rows: number) => {
  const errors: string[] = []
  const candidates = getShellCandidates()
  const env = getTerminalEnv()

  for (const shell of candidates) {
    if (!isShellUsable(shell)) {
      errors.push(`Shell not accessible: ${shell}`)
      continue
    }

    const defaultArgs = getShellArgs(shell)
    // Try with preferred args first, then with empty args [] if preferred args fail
    const argAttempts = defaultArgs.length > 0 ? [defaultArgs, []] : [[]]

    for (const args of argAttempts) {
      if (process.platform === 'win32') {
        // First try ConPTY on Windows
        try {
          const terminalProcess = pty.spawn(shell, args, {
            name: 'xterm-256color',
            cols,
            rows,
            cwd,
            env,
            useConpty: true,
          })
          return { shell, terminalProcess }
        } catch (conptyError) {
          const conptyMsg = conptyError instanceof Error ? conptyError.message : String(conptyError)
          errors.push(`ConPTY spawn failed for ${shell} (${JSON.stringify(args)}): ${conptyMsg}`)

          // Fallback to WinPTY on Windows
          try {
            const terminalProcess = pty.spawn(shell, args, {
              name: 'xterm-256color',
              cols,
              rows,
              cwd,
              env,
              useConpty: false,
            })
            return { shell, terminalProcess }
          } catch (winptyError) {
            const winptyMsg = winptyError instanceof Error ? winptyError.message : String(winptyError)
            errors.push(`WinPTY spawn failed for ${shell} (${JSON.stringify(args)}): ${winptyMsg}`)
          }
        }
      } else {
        // POSIX (macOS & Linux)
        try {
          const terminalProcess = pty.spawn(shell, args, {
            name: 'xterm-256color',
            cols,
            rows,
            cwd,
            env,
          })
          return { shell, terminalProcess }
        } catch (posixError) {
          const posixMsg = posixError instanceof Error ? posixError.message : String(posixError)
          errors.push(`Spawn failed for ${shell} (${JSON.stringify(args)}): ${posixMsg}`)
        }
      }
    }
  }

  throw new Error(`Failed to start terminal: ${errors.join(' | ') || 'No usable shell candidates available'}`)
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
  try {
    session.pty.write(data)
  } catch {
    // Process might have closed
  }
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
