import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

const storedTheme = localStorage.getItem('writr-theme') as 'light' | 'dark' | null
const preferredDark = window.matchMedia('(prefers-color-scheme: dark)').matches
const mode = storedTheme ?? (preferredDark ? 'dark' : 'light')

document.documentElement.classList.remove('dark', 'light')
document.documentElement.classList.add(mode)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
