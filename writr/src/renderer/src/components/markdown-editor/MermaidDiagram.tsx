'use client'
import { useEffect, useState } from 'react'

let mermaidInstance: typeof import('mermaid').default | null = null
const getMermaid = async () => {
  if (!mermaidInstance) {
    mermaidInstance = (await import('mermaid')).default
    mermaidInstance.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
    })
  }
  return mermaidInstance
}

const sanitizeSvg = (svgMarkup: string): string => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgMarkup, 'image/svg+xml')

  // Allowlist of safe SVG tags
  const allowedTags = new Set([
    'svg', 'g', 'path', 'rect', 'circle', 'line', 'polyline', 'polygon', 'ellipse',
    'text', 'tspan', 'style', 'defs', 'marker', 'linearGradient', 'radialGradient',
    'stop', 'clipPath', 'use', 'image', 'desc', 'title', 'symbol'
  ]);

  // Allowlist of safe SVG attributes
  const allowedAttributes = new Set([
     'width', 'height', 'viewbox', 'fill', 'stroke', 'stroke-width', 'd', 'points',
     'cx', 'cy', 'r', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'transform', 'style', 'class',
     'id', 'text-anchor', 'font-family', 'font-size', 'font-weight', 'opacity',
     'marker-start', 'marker-mid', 'marker-end', 'clip-path', 'gradientunits',
     'spreadmethod', 'offset', 'stop-color', 'stop-opacity'
  ]);

  const allElements = doc.querySelectorAll('*')
  for (const element of allElements) {
    const tagName = element.tagName.toLowerCase()
    
    // Remove tags not in the allowlist
    if (!allowedTags.has(tagName)) {
      element.remove()
      continue
    }

    const attributes = Array.from(element.attributes)
    for (const attribute of attributes) {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim().toLowerCase()

      // Remove attributes not in the allowlist or that look like event handlers
      if (!allowedAttributes.has(name) || name.startsWith('on')) {
        element.removeAttribute(attribute.name)
        continue
      }

      // Special check for href/xlink:href to prevent javascript: URIs
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
      return
    }

    let isMounted = true
    const renderMermaid = async () => {
      setIsLoading(true)
      setError('')

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
          console.error('Mermaid rendering error:', err)
          setError(err.message || 'Failed to render diagram')
          setSvg('')
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    renderMermaid()
    return () => {
      isMounted = false
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
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
        <div className="text-sm text-red-700 dark:text-red-400">
          <strong>Mermaid Error:</strong> {error}
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
