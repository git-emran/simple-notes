'use client'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type PointerEvent,
  type SetStateAction,
  type WheelEvent
} from 'react'
import { VscChromeClose, VscRefresh, VscScreenFull, VscZoomIn, VscZoomOut } from 'react-icons/vsc'

let mermaidInstance: typeof import('mermaid').default | null = null
const getMermaid = async () => {
  if (!mermaidInstance) {
    mermaidInstance = (await import('mermaid')).default
    mermaidInstance.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      suppressErrorRendering: true
    })
  }
  return mermaidInstance
}

const sanitizeSvg = (svgMarkup: string): string => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgMarkup, 'image/svg+xml')

  const parserError = doc.querySelector('parsererror')
  if (parserError) return ''

  const allowedTags = new Set([
    'svg', 'g', 'path', 'rect', 'circle', 'line', 'polyline', 'polygon', 'ellipse',
    'text', 'tspan', 'style', 'defs', 'marker', 'lineargradient', 'radialgradient',
    'stop', 'clippath', 'use', 'image', 'desc', 'title', 'symbol',
    'foreignobject', 'div', 'span', 'br', 'p', 'b', 'i', 'strong', 'em',
    'center', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
  ])

  const allowedAttributes = new Set([
    'width', 'height', 'viewbox', 'preserveaspectratio', 'fill', 'stroke', 'stroke-width', 'd', 'points',
    'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'transform', 'style', 'class',
    'id', 'text-anchor', 'font-family', 'font-size', 'font-weight', 'font-style', 'opacity',
    'marker-start', 'marker-mid', 'marker-end', 'clip-path', 'gradientunits',
    'spreadmethod', 'offset', 'stop-color', 'stop-opacity', 'xmlns', 'xmlns:xhtml', 'color', 'align',
    'dominant-baseline', 'paint-order', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin',
    'href', 'xlink:href'
  ])

  const allElements = doc.querySelectorAll('*')
  for (const element of allElements) {
    const tagName = element.tagName.toLowerCase()

    if (!allowedTags.has(tagName)) {
      element.remove()
      continue
    }

    const attributes = Array.from(element.attributes)
    for (const attribute of attributes) {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim()
      const normalizedValue = value.toLowerCase()

      if (!allowedAttributes.has(name) || name.startsWith('on')) {
        element.removeAttribute(attribute.name)
        continue
      }

      if (
        (name === 'href' || name === 'xlink:href') &&
        !normalizedValue.startsWith('#') &&
        !normalizedValue.startsWith('data:image/')
      ) {
        element.removeAttribute(attribute.name)
      }
    }
  }

  return new XMLSerializer().serializeToString(doc)
}

type ViewState = {
  scale: number
  x: number
  y: number
}

const DEFAULT_VIEW: ViewState = { scale: 1, x: 0, y: 0 }
const MIN_SCALE = 0.35
const MAX_SCALE = 3
const ZOOM_STEP = 0.16

const clampScale = (scale: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
const freshDefaultView = (): ViewState => ({ ...DEFAULT_VIEW })

const zoomView = (current: ViewState, nextScale: number, anchor?: { x: number; y: number }): ViewState => {
  const scale = clampScale(nextScale)
  if (!anchor || scale === current.scale) return { ...current, scale }

  const ratio = scale / current.scale
  return {
    scale,
    x: anchor.x - (anchor.x - current.x) * ratio,
    y: anchor.y - (anchor.y - current.y) * ratio
  }
}

const MermaidViewport = ({
  svg,
  view,
  setView,
  className = '',
  isFullscreen = false
}: {
  svg: string
  view: ViewState
  setView: Dispatch<SetStateAction<ViewState>>
  className?: string
  isFullscreen?: boolean
}) => {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null)

  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const target = event.target as HTMLElement | null
    if (target?.closest('button')) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: view.x,
      originY: view.y
    }
  }, [view.x, view.y])

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    setView((current) => ({
      ...current,
      x: drag.originX + event.clientX - drag.startX,
      y: drag.originY + event.clientY - drag.startY
    }))
  }, [setView])

  const stopDrag = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      dragRef.current = null
    }
  }, [])

  const handleWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) return
    event.preventDefault()
    const direction = event.deltaY > 0 ? -1 : 1
    const viewport = viewportRef.current
    const rect = viewport?.getBoundingClientRect()
    const anchor = rect
      ? { x: event.clientX - rect.left - rect.width / 2, y: event.clientY - rect.top - rect.height / 2 }
      : undefined

    setView((current) => zoomView(current, current.scale + direction * ZOOM_STEP, anchor))
  }, [setView])

  return (
    <div
      ref={viewportRef}
      className={`mermaid-viewport ${isFullscreen ? 'is-fullscreen' : ''} ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onWheel={handleWheel}
      tabIndex={0}
    >
      <div
        className="mermaid-transform-layer"
        style={{
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`
        }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  )
}

const MermaidToolbar = ({
  onZoomIn,
  onZoomOut,
  onReset,
  onExpand
}: {
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  onExpand?: () => void
}) => (
  <div className="mermaid-toolbar no-print">
    <button type="button" onClick={onZoomOut} title="Zoom out" aria-label="Zoom out">
      <VscZoomOut className="h-4 w-4" />
    </button>
    <button type="button" onClick={onReset} title="Reset zoom" aria-label="Reset zoom">
      <VscRefresh className="h-4 w-4" />
    </button>
    <button type="button" onClick={onZoomIn} title="Zoom in" aria-label="Zoom in">
      <VscZoomIn className="h-4 w-4" />
    </button>
    {onExpand && (
      <button type="button" onClick={onExpand} title="Fullscreen" aria-label="Open fullscreen viewer">
        <VscScreenFull className="h-4 w-4" />
      </button>
    )}
  </div>
)

export const MermaidDiagram = ({ chart }: { chart: string, }) => {
  const [svg, setSvg] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [view, setView] = useState<ViewState>(DEFAULT_VIEW)
  const [fullscreenView, setFullscreenView] = useState<ViewState>(DEFAULT_VIEW)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const fullscreenRef = useRef<HTMLDivElement | null>(null)

  const zoomIn = useCallback(() => {
    setView((current) => zoomView(current, current.scale + ZOOM_STEP))
  }, [])

  const zoomOut = useCallback(() => {
    setView((current) => zoomView(current, current.scale - ZOOM_STEP))
  }, [])

  const reset = useCallback(() => setView(freshDefaultView()), [])

  const fullscreenZoomIn = useCallback(() => {
    setFullscreenView((current) => zoomView(current, current.scale + ZOOM_STEP))
  }, [])

  const fullscreenZoomOut = useCallback(() => {
    setFullscreenView((current) => zoomView(current, current.scale - ZOOM_STEP))
  }, [])

  const fullscreenReset = useCallback(() => setFullscreenView(freshDefaultView()), [])

  const openFullscreen = useCallback(() => {
    setFullscreenView(view)
    setIsFullscreen(true)
  }, [view])

  useEffect(() => {
    if (!chart || !chart.trim()) {
      setSvg('')
      setError('')
      setIsLoading(false)
      return
    }

    let isMounted = true
    setIsLoading(true)

    const renderMermaid = async () => {
      try {
        const mermaid = await getMermaid()
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
        const { svg: renderedSvg } = await mermaid.render(id, chart)

        if (isMounted) {
          setSvg(sanitizeSvg(renderedSvg))
          setError('')
          setView(freshDefaultView())
          setFullscreenView(freshDefaultView())
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram')
          setSvg('')
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    const timer = setTimeout(() => {
      void renderMermaid()
    }, 300)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [chart])

  useEffect(() => {
    if (!isFullscreen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    fullscreenRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsFullscreen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [isFullscreen])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-800 rounded border-2 border-dashed border-gray-300 dark:border-gray-600 min-h-[80px]">
        <div className="text-sm text-gray-500 dark:text-gray-400">Rendering diagram...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="my-4 p-4 bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500 rounded-r-md shadow-sm">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-red-700 dark:text-red-400 overflow-hidden break-words w-full">
            <strong className="block mb-1 font-semibold text-red-800 dark:text-red-300">Mermaid Syntax Error</strong>
            <div className="font-mono text-xs opacity-90 line-clamp-3 overflow-hidden">{error}</div>
          </div>
        </div>
      </div>
    )
  }

  if (!svg) return null

  return (
    <>
      <div className="mermaid-container group relative my-4 rounded-lg border border-obsidian-border bg-[var(--obsidian-workspace)]">
        <MermaidToolbar
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onReset={reset}
          onExpand={openFullscreen}
        />
        <MermaidViewport svg={svg} view={view} setView={setView} />
      </div>

      {isFullscreen && (
        <div
          ref={fullscreenRef}
          className="mermaid-fullscreen no-print"
          role="dialog"
          aria-modal="true"
          aria-label="Mermaid diagram viewer"
          tabIndex={-1}
        >
          <div className="mermaid-fullscreen-topbar">
            <div className="text-xs font-semibold text-[var(--obsidian-text-muted)]">Diagram viewer</div>
            <div className="flex items-center gap-1">
              <MermaidToolbar
                onZoomIn={fullscreenZoomIn}
                onZoomOut={fullscreenZoomOut}
                onReset={fullscreenReset}
              />
              <button
                type="button"
                className="mermaid-fullscreen-close"
                onClick={() => setIsFullscreen(false)}
                title="Close"
                aria-label="Close fullscreen viewer"
              >
                <VscChromeClose className="h-4 w-4" />
              </button>
            </div>
          </div>
          <MermaidViewport
            svg={svg}
            view={fullscreenView}
            setView={setFullscreenView}
            className="flex-1"
            isFullscreen
          />
        </div>
      )}
    </>
  )
}
