'use client'
import { useEffect, useState } from 'react'

let mermaidInstance: typeof import('mermaid').default | null = null
const getMermaid = async () => {
  if (!mermaidInstance) {
    mermaidInstance = (await import('mermaid')).default
    mermaidInstance.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      suppressErrorRendering: true,
    })
  }
  return mermaidInstance
}

const sanitizeSvg = (svgMarkup: string): string => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgMarkup, 'image/svg+xml')

  /* Allowlist of safe SVG tags */
  const allowedTags = new Set([
    'svg', 'g', 'path', 'rect', 'circle', 'line', 'polyline', 'polygon', 'ellipse',
    'text', 'tspan', 'style', 'defs', 'marker', 'linearGradient', 'radialGradient',
    'stop', 'clipPath', 'use', 'image', 'desc', 'title', 'symbol',
    'foreignobject', 'div', 'span', 'br', 'p', 'b', 'i', 'strong', 'em', 
    'center', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
  ]);

  /* Allowlist of safe SVG attributes */
  const allowedAttributes = new Set([
     'width', 'height', 'viewbox', 'preserveaspectratio', 'fill', 'stroke', 'stroke-width', 'd', 'points',
     'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'transform', 'style', 'class',
     'id', 'text-anchor', 'font-family', 'font-size', 'font-weight', 'opacity',
     'marker-start', 'marker-mid', 'marker-end', 'clip-path', 'gradientunits',
     'spreadmethod', 'offset', 'stop-color', 'stop-opacity', 'xmlns', 'xmlns:xhtml', 'color', 'align'
  ]);

  const allElements = doc.querySelectorAll('*')
  for (const element of allElements) {
    const tagName = element.tagName.toLowerCase()
    
    /* Remove tags not in the allowlist */
    if (!allowedTags.has(tagName)) {
      element.remove()
      continue
    }

    const attributes = Array.from(element.attributes)
    for (const attribute of attributes) {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim().toLowerCase()

      /* Remove attributes not in the allowlist or that look like event handlers */
      if (!allowedAttributes.has(name) || name.startsWith('on')) {
        element.removeAttribute(attribute.name)
        continue
      }

      /* Special check for href/xlink:href to prevent javascript: URIs */
      if ((name === 'href' || name === 'xlink:href') && value.startsWith('javascript:')) {
        element.removeAttribute(attribute.name)
      }
    }
  }

  return new XMLSerializer().serializeToString(doc)
}

export const MermaidDiagram = ({ chart }: { chart: string, }) => {
  const [svg, setSvg] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

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
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to render diagram')
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
    <div
      className="mermaid-container my-4 p-4 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 overflow-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
