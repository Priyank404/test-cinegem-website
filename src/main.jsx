import * as THREE from 'three'
if (typeof window !== 'undefined') {
  window.THREE = THREE
}

import { StrictMode }    from 'react'
import { createRoot }    from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './App'
import './styles/globals.css'
import { initRuntimeProtection } from './utils/runtimeProtect'

initRuntimeProtection()

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
