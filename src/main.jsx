import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PwaManager from './components/PwaManager.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <PwaManager />
  </StrictMode>,
)
