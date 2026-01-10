'use client'
import { useEffect, useRef, useState } from 'react'
import { $typst } from '@myriaddreamin/typst.ts'

interface TypstPreviewProps {
  source: string
}

export const TypstPreview = ({ source }: TypstPreviewProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const run = async () => {
      try {
        // Optionally set WASM paths if necessary:
        // $typst.setCompilerInitOptions({ getModule: () => '/path/typst_ts_web_compiler_bg.wasm' })
        // $typst.setRendererInitOptions({ getModule: () => '/path/typst_ts_renderer_bg.wasm' })

        const svgOrResult = await $typst.svg({ mainContent: source })
        // If version returns a string, svgOrResult is that string
        // If version returns an object, it might be { svg: string } or similar
        let svgString: string
        if (typeof svgOrResult === 'string') {
          svgString = svgOrResult
        } else if ((svgOrResult as any).svg && typeof (svgOrResult as any).svg === 'string') {
          svgString = (svgOrResult as any).svg
        } else {
          throw new Error('Unexpected result from $typst.svg')
        }

        if (mounted && ref.current) {
          ref.current.innerHTML = svgString
          setError(null)
        }
      } catch (err) {
        console.error('Typst render error:', err)
        const msg = err instanceof Error ? err.message : String(err)
        if (mounted) {
          setError(msg)
        }
      }
    }

    run()

    return () => {
      mounted = false
    }
  }, [source])

  if (error) {
    return (
      <div className="text-red-500 font-mono text-sm bg-red-50 p-2 rounded">
        {error}
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className="typst-preview my-4 p-2 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
    />
  )
}

