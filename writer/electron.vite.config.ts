import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin, UserConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
/* Import tailwindcss as a plugin for Vite's PostCSS */
import tailwindcss from 'tailwindcss' // For Tailwind CSS v3
import autoprefixer from 'autoprefixer' // Autoprefixer is typically used with Tailwind

const processEnv = process.env.PROCESS || 'all'
const buildMain = processEnv === 'all' || processEnv.includes('main')
const buildPreload = processEnv === 'all' || processEnv.includes('preload')
const buildRenderer = processEnv === 'all' || processEnv.includes('renderer')

const ignoredRendererWarnings = [
  '@codemirror/lang-css',
  '@codemirror/lang-html',
  '@codemirror/lang-javascript'
]

type WarningHandler = Extract<
  NonNullable<NonNullable<UserConfig['renderer']>['build']>['rollupOptions'],
  object
>['onwarn']

const onRendererWarn: WarningHandler = (warning, warn) => {
  const message = typeof warning === 'string' ? warning : warning.message
  if (message?.includes('is dynamically imported by') && ignoredRendererWarnings.some((text) => message.includes(text))) {
    return
  }
  warn(warning)
}

const config: UserConfig = {}

if (buildMain) {
  config.main = {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@/lib': resolve('src/main/lib'),
        '@shared': resolve('src/shared')
      }
    }
  }
}

if (buildPreload) {
  config.preload = {
    plugins: [externalizeDepsPlugin()]
  }
}

if (buildRenderer) {
  config.renderer = {
    assetsInclude: ['**/*.wasm', 'src/renderer/assets/**'],
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared'),
        '@/hooks': resolve('src/renderer/src/hooks'),
        '@/assets': resolve('src/renderer/src/assets'),
        '@/store': resolve('src/renderer/src/store'),
        '@/components': resolve('src/renderer/src/components'),
        '@/mocks': resolve('src/renderer/src/mocks')
      }
    },
    plugins: [react()],
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    },
    build: {
      rollupOptions: {
        onwarn: onRendererWarn,
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('mermaid')) return 'vendor-mermaid'
              if (id.includes('katex')) return 'vendor-katex'
              if (id.includes('@xterm') || id.includes('xterm')) return 'vendor-xterm'
              if (id.includes('@excalidraw')) return 'vendor-excalidraw'
              if (id.includes('react-syntax-highlighter') || id.includes('refractor') || id.includes('highlight.js')) return 'vendor-syntax-highlighter'
              if (id.includes('@codemirror') || id.includes('@lezer')) return 'vendor-codemirror'
              if (id.includes('react') || id.includes('react-dom') || id.includes('jotai')) return 'vendor-core'
            }
            return undefined
          }
        }
      }
    },
    /* ** Add this css block for Tailwind CSS ** */
    css: {
      postcss: {
        plugins: [tailwindcss(), autoprefixer()]
      }
    }
  }
}

export default defineConfig(config)
