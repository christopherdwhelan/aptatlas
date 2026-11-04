// Moving between pages. The site uses real paths; the single-file build (npm run build:html)
// opens from disk, where paths cannot work, so it stays on hash navigation.
import { ROUTES, pathForTab, tabForPath } from './routes'

const HASH_NAV = import.meta.env.VITE_HASH_NAV === 'true'
const CHANGE_EVENT = HASH_NAV ? 'hashchange' : 'popstate'

export const hrefForTab = tab => (HASH_NAV ? `#${tab}` : pathForTab(tab))

const hrefForStep = n => {
  const base = hrefForTab('chooser')
  return n <= 1 ? base : `${base}/${n}`
}

export function currentTab() {
  if (!HASH_NAV) return tabForPath(window.location.pathname)
  const base = window.location.hash.slice(1).split('/')[0]
  return ROUTES.some(r => r.tab === base) ? base : 'overview'
}

const here = () => (HASH_NAV ? window.location.hash : window.location.pathname)

function push(href) {
  if (here() === href) return false
  if (HASH_NAV) {
    window.location.hash = href.slice(1)
  } else {
    window.history.pushState(null, '', href)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
  return true
}

export function goToTab(tab) {
  if (push(hrefForTab(tab)) && !HASH_NAV) window.scrollTo(0, 0)
}

export function onNavigate(listener) {
  window.addEventListener(CHANGE_EVENT, listener)
  return () => window.removeEventListener(CHANGE_EVENT, listener)
}

// Help Me Choose keeps its step in the URL so Back and Forward move between steps.
export const goToChooserStep = n => { push(hrefForStep(n)) }

export function chooserStepFromUrl() {
  const m = here().match(HASH_NAV ? /^#chooser\/([1-4])$/ : /^\/choose\/([1-4])\/?$/)
  return m ? Number(m[1]) : 1
}

export const resetChooserUrl = () => window.history.replaceState(null, '', hrefForStep(1))

// Modified clicks (open in new tab and so on) belong to the browser.
export const isPlainClick = e => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey
