export const getBasenameFromPath = (fullPath: string) => {
  const lastSlash = fullPath.lastIndexOf('/')
  const lastBackslash = fullPath.lastIndexOf('\\')
  const idx = Math.max(lastSlash, lastBackslash)
  return idx === -1 ? fullPath : fullPath.substring(idx + 1)
}

export const getParentPath = (fullPath: string) => {
  const lastSlash = fullPath.lastIndexOf('/')
  const lastBackslash = fullPath.lastIndexOf('\\')
  const idx = Math.max(lastSlash, lastBackslash)
  return idx === -1 ? '' : fullPath.substring(0, idx)
}

export const joinPath = (parentPath: string, name: string) => {
  if (!parentPath) return name
  const separator = parentPath.includes('\\') ? '\\' : '/'
  return `${parentPath}${separator}${name}`
}

export const normalizePath = (path: string) => path.replace(/\\/g, '/')

export const isSameOrDescendantPath = (path: string, candidateParent: string) => {
  const pathN = normalizePath(path)
  const parentN = normalizePath(candidateParent)
  return pathN === parentN || pathN.startsWith(`${parentN}/`)
}

export const buildMoveDestination = (src: string, destinationDir: string) => {
  return joinPath(destinationDir, getBasenameFromPath(src))
}

export const canMovePathToDirectory = (
  src: string,
  destinationDir: string,
  nodeType: 'file' | 'folder'
) => {
  if (!src) return false

  const currentParent = getParentPath(src)
  if (normalizePath(currentParent) === normalizePath(destinationDir)) return false

  if (nodeType === 'folder' && isSameOrDescendantPath(destinationDir, src)) return false

  const destination = buildMoveDestination(src, destinationDir)
  return normalizePath(destination) !== normalizePath(src)
}
