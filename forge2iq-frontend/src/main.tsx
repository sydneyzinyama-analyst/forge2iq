import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary fallbackLabel="Application error — please refresh the page">
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
