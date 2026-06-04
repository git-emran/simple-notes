import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
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

const onRendererWarn = (warning: any, warn: (warning: any) => void) => {
  const message = typeof warning === 'string' ? warning : warning.message
  if (message?.includes('is dynamically imported by') && ignoredRendererWarnings.some((text) => message.includes(text))) {
    return
  }
  warn(warning)
}

const config: any = {}

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
    build: {
      rollupOptions: {
        onwarn: onRendererWarn
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
