import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

const preferredDark = window.matchMedia('(prefers-color-scheme: dark)').matches
const mode = preferredDark ? 'dark' : 'light'

document.documentElement.classList.remove('dark', 'light')
document.documentElement.classList.add(mode)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
