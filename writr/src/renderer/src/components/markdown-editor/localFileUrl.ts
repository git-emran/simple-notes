const isWindowsAbsolutePath = (value: string) => /^[a-zA-Z]:\//.test(value)

const normalizePath = (value: string) => value.replace(/\\/g, '/')

const dirname = (filePath: string) => {
  const normalized = normalizePath(filePath)
  const lastSlashIndex = normalized.lastIndexOf('/')
  if (lastSlashIndex === -1) return ''
  return normalized.slice(0, lastSlashIndex + 1)
}

const resolveAgainstNotePath = (targetPath: string, notePath?: string) => {
  const normalizedTarget = normalizePath(targetPath.trim())
  if (!normalizedTarget) return normalizedTarget
  if (normalizedTarget.startsWith('/') || isWindowsAbsolutePath(normalizedTarget)) {
    return normalizedTarget
  }
  if (!notePath) return normalizedTarget

  const baseDir = dirname(notePath)
  if (!baseDir) return normalizedTarget

  const baseFileUrl = isWindowsAbsolutePath(baseDir) ? `file:///${baseDir}` : `file://${baseDir}`

  try {
    return decodeURIComponent(new URL(normalizedTarget, baseFileUrl).pathname)
  } catch {
    return normalizedTarget
  }
}

export const toLocalFileUrl = (value: string, notePath?: string) => {
  if (!value) return value

  const normalized = value.trim()
  if (
    normalized.startsWith('http://') ||
    normalized.startsWith('https://') ||
    normalized.startsWith('data:') ||
    normalized.startsWith('local-file://')
  ) {
    return normalized
  }

  const resolvedPath = resolveAgainstNotePath(normalized, notePath)
  const encodedPath = encodeURI(resolvedPath)

  if (encodedPath.startsWith('/')) {
    return `local-file://${encodedPath}`
  }

  return `local-file:///${encodedPath}`
}
