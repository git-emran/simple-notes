import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { DedicatedTerminalApp } from './components/terminal/DedicatedTerminalApp'

const urlParams = new URLSearchParams(window.location.search)
const isAuxiliaryWindow =
  urlParams.get('window') === 'terminal' ||
  urlParams.get('window') === 'separated' ||
  window.location.hash.startsWith('#terminal') ||
  window.location.hash.startsWith('#separated')

const preferredDark = window.matchMedia('(prefers-color-scheme: dark)').matches
const mode = preferredDark ? 'dark' : 'light'

document.documentElement.classList.remove('dark', 'light')
document.documentElement.classList.add(mode)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAuxiliaryWindow ? <DedicatedTerminalApp /> : <App />}
  </StrictMode>
)
