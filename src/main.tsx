/// <reference types="vite/client" />
import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import Boot from './components/Boot'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <Boot>
        <App />
      </Boot>
    </HashRouter>
  </React.StrictMode>,
)

// aplikasi bisa dibuka tanpa internet (dipasang di HP: menu browser → "Tambahkan ke layar utama")
if ('serviceWorker' in navigator && location.protocol !== 'file:' && import.meta.env.PROD) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}) })
}
