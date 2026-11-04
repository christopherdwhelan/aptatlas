// Writes a static HTML page for every route after the client and server builds, plus the
// sitemap and robots.txt. Interactive parts hydrate in the browser.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { pathToFileURL } from 'url'

const dist = resolve('dist')
const serverDir = resolve('dist-ssr')
const { render, headHtml, ROUTES, NOT_FOUND_TAB, SITE_URL } = await import(pathToFileURL(resolve(serverDir, 'entry-server.js')).href)

const template = readFileSync(resolve(dist, 'index.html'), 'utf-8')
const HEAD = /<!--app-head:start-->[\s\S]*<!--app-head:end-->/
if (!HEAD.test(template) || !template.includes('<div id="root"></div>')) {
  throw new Error('index.html is missing the head markers or the empty root element')
}

const write = (file, text) => {
  const path = resolve(dist, file)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

const page = tab => {
  const body = render(tab)
  if (!body) throw new Error(`Prerender produced no HTML for ${tab}`)
  return template
    .replace(HEAD, () => headHtml(tab))
    .replace('<div id="root"></div>', () => `<div id="root">${body}</div>`)
}

// /admin mounts client-side from this empty page, so it never shows a prerendered public page first.
write('app-shell.html', template.replace(HEAD, () => '<title>Atlas of Proteomic Technologies</title>\n    <meta name="robots" content="noindex" />'))

for (const { tab, path } of ROUTES) {
  write(path === '/' ? 'index.html' : `${path.slice(1)}/index.html`, page(tab))
}
write('404.html', page(NOT_FOUND_TAB))

const urlFor = path => (path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`)
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ROUTES.map(r => `  <url><loc>${urlFor(r.path)}</loc></url>`).join('\n')}
</urlset>
`)
write('robots.txt', `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`)

rmSync(serverDir, { recursive: true, force: true })
console.log(`Prerendered ${ROUTES.length} routes and 404.html`)
