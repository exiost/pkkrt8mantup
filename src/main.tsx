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
