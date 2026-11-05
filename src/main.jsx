import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App.jsx'
import PwaManager from './components/pwa/PwaManager.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <PwaManager />
  </StrictMode>,
)
