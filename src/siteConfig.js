// The canonical domain, in one place. Canonical links, og:url, the sitemap and robots.txt all read it.
// Set VITE_SITE_URL at build time to change it.
export const SITE_URL = (import.meta.env?.VITE_SITE_URL || 'https://aptatlas.org').replace(/\/+$/, '')
