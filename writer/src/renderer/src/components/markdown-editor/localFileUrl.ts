const isWindowsAbsolutePath = (value: string) => /^[a-zA-Z]:\//.test(value)

const normalizePath = (value: string) => value.replace(/\\/g, '/')

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico']

const joinPaths = (base: string, child: string) => {
  const baseNormalized = normalizePath(base).replace(/\/+$/, '')
  const childNormalized = normalizePath(child).replace(/^\/+/, '')
  if (!baseNormalized) return childNormalized
  if (!childNormalized) return baseNormalized
  return `${baseNormalized}/${childNormalized}`
}

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

  const baseFileUrl = isWindowsAbsolutePath(baseDir)
    ? `file:///${baseDir}`
    : `file:///${baseDir.replace(/^\/+/, '')}`

  try {
    const pathname = decodeURIComponent(new URL(normalizedTarget, baseFileUrl).pathname)
    return pathname.startsWith('//') ? pathname.replace(/^\/+/, '/') : pathname
  } catch {
    return normalizedTarget
  }
}

const resolveAgainstRootDir = (targetPath: string, rootDir?: string) => {
  const normalizedTarget = normalizePath(targetPath.trim()).replace(/^\.\//, '')
  if (!normalizedTarget || !rootDir) return null

  if (normalizedTarget === 'image' || normalizedTarget.startsWith('image/')) {
    return joinPaths(rootDir, normalizedTarget)
  }
  if (normalizedTarget.startsWith('/image/')) {
    return joinPaths(rootDir, normalizedTarget.slice(1))
  }
  if (!normalizedTarget.includes('/')) {
    const lower = normalizedTarget.toLowerCase().split('?')[0]
    if (IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      return joinPaths(rootDir, `image/${normalizedTarget}`)
    }
  }

  return null
}

export const toLocalFileUrl = (value: string, notePath?: string, rootDir?: string) => {
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

  const resolvedPath = resolveAgainstRootDir(normalized, rootDir) ?? resolveAgainstNotePath(normalized, notePath)
  const encodedPath = encodeURI(resolvedPath)

  if (encodedPath.startsWith('/')) {
    return `local-file://${encodedPath}`
  }

  return `local-file:///${encodedPath}`
}
