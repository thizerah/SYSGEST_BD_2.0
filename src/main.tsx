import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './utils/suppressWarnings'
import { registerSW } from 'virtual:pwa-register'

// Registra o service worker para PWA
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Nova versão disponível. Deseja atualizar?')) {
      updateSW()
    }
  },
  onOfflineReady() {
    console.log('Aplicativo pronto para uso offline')
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
