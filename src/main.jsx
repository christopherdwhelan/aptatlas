import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Admin from './components/Admin.jsx'

// /admin is a separate, unlisted root: no public nav link, no shared state with the tabbed app.
// vercel.json serves it from the empty app-shell.html.
const isAdmin = window.location.pathname === '/admin'
const tree = <StrictMode>{isAdmin ? <main><Admin /></main> : <App />}</StrictMode>

// Public pages arrive prerendered (scripts/prerender.js) and hydrate. The dev server,
// the single-file build and /admin start from an empty root.
const root = document.getElementById('root')
if (root.hasChildNodes()) hydrateRoot(root, tree)
else createRoot(root).render(tree)
