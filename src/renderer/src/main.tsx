import React from 'react'
import ReactDOM from 'react-dom/client'
// Bundled locally (CSP-safe, offline) — Geist body + JetBrains Mono labels.
import '@fontsource-variable/geist'
import '@fontsource-variable/jetbrains-mono'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
