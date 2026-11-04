// Server entry used only by scripts/prerender.js.
/* eslint-disable react-refresh/only-export-components -- never hot-reloaded */
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App.jsx'

export { ROUTES, NOT_FOUND_TAB } from './routes'
export { SITE_URL } from './siteConfig'
export { headHtml } from './routeMeta'

export const render = tab => renderToString(<StrictMode><App initialTab={tab} /></StrictMode>)
