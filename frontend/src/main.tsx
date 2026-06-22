import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: '#13151c',
          color: '#e5e7eb',
          border: '1px solid #1e2029',
          borderRadius: '10px',
          fontFamily: 'Inter, sans-serif',
          fontSize: '13px',
        },
        success: { iconTheme: { primary: '#6366f1', secondary: '#fff' } },
        error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
      }}
    />
  </React.StrictMode>,
)
