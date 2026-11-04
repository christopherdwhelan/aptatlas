// Every public page: its tab id, the path it lives at, and its label in the nav.
// Tab ids are also the old hash names (#comparison, #chooser), which still redirect.
// No data imports here: vite.config.js reads this file to build the hash redirect.
export const ROUTES = [
  { tab: 'overview',        path: '/' },
  { tab: 'platforms',       path: '/platforms' },
  { tab: 'comparison',      path: '/compare' },
  { tab: 'proteins',        path: '/coverage' },
  { tab: 'unassayed',       path: '/unassayed' },
  { tab: 'chooser',         path: '/choose' },
  { tab: 'combine',         path: '/combine' },
  { tab: 'evidence',        path: '/evidence' },
  { tab: 'methods',         path: '/methods' },
  { tab: 'reproducibility', path: '/reproducibility' },
  // Linked from the footer and Reproducibility; not a nav tab.
  { tab: 'data',            path: '/data' },
]

export const NOT_FOUND_TAB = 'notfound'

export const pathForTab = tab => ROUTES.find(r => r.tab === tab)?.path ?? '/'

const normalise = pathname => pathname.replace(/\/index\.html$/, '/').replace(/(.)\/+$/, '$1')

export function tabForPath(pathname) {
  const path = normalise(pathname)
  if (/^\/choose\/[1-4]$/.test(path)) return 'chooser'
  return ROUTES.find(r => r.path === path)?.tab ?? NOT_FOUND_TAB
}

// Runs first in <head>, so an old link such as /#comparison moves to /compare before anything draws.
// Only on the root path: /methods#version-history is an ordinary anchor.
export function hashRedirectScript() {
  const map = JSON.stringify(Object.fromEntries(ROUTES.map(r => [r.tab, r.path])))
  return `(function(){var m=${map},l=location;if(l.pathname!=="/")return;var k=l.hash.slice(1).split("/")[0];if(Object.prototype.hasOwnProperty.call(m,k))l.replace(m[k]+l.search)})()`
}
