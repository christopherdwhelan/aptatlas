import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Admin from './components/Admin.jsx'

// /admin is a separate, unlisted root: no public nav link, no shared state
// with the tabbed app. vercel.json rewrites every path to index.html, so
// this is the only place that needs to know the route exists.
const isAdmin = window.location.pathname === '/admin'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isAdmin ? <Admin /> : <App />}
  </StrictMode>,
)
