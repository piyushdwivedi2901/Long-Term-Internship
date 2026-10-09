import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/instrument-sans/wght.css'
import '@fontsource/instrument-serif/latin-400.css'
import './styles/app.css'
import { App } from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
