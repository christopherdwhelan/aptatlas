// Writes a static HTML page for every route after the client and server builds, plus the
// sitemap and robots.txt. Interactive parts hydrate in the browser.
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { pathToFileURL } from 'url'
import { APP_VERSION } from '../src/version.js'
import { ARCHIVE_DOI, CITATION, DATA_FILES, fileName } from '../src/dataFiles.js'

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

// Every published data file, latest and each frozen release. data_releases/ is committed.
const releasesDir = resolve('data_releases')
const releases = readdirSync(releasesDir).sort()
const current = releases.includes(APP_VERSION) ? readdirSync(resolve(releasesDir, APP_VERSION)).sort() : []
const dataPaths = [
  ...current.map(file => `/data/${file}`),
  ...releases.flatMap(release => readdirSync(resolve(releasesDir, release)).sort().map(file => `/data/${release}/${file}`)),
]
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...ROUTES.map(r => r.path), ...dataPaths].map(path => `  <url><loc>${urlFor(path)}</loc></url>`).join('\n')}
</urlset>
`)
write('robots.txt', `User-agent: *
Allow: /
Allow: /data/

Sitemap: ${SITE_URL}/sitemap.xml
`)
write('llms.txt', `# Atlas of Proteomic Technologies (APT)

> An independent, evidence-based reference for selecting and combining commercial high-plex proteomics platforms. Release ${APP_VERSION}. For research use only; scores and recommendations reflect the authors' assessment of published literature, not clinical or purchasing advice.

## Data

- [Data page](${SITE_URL}/data): files, schemas, licence, citation and changelog
- [Manifest](${SITE_URL}/data/manifest.json): every file in the latest release, with its schema, size and SHA-256
${DATA_FILES.map(f => `- [${f.title}](${SITE_URL}/data/${fileName(f)}): ${f.desc}`).join('\n')}

Files at /data/ are the latest release. Files at /data/${APP_VERSION}/ are frozen. Licence: CC BY 4.0, with third-party sources noted in each file's third_party field.

## MCP server

- [aptatlas-mcp](https://github.com/christopherdwhelan/aptatlas/tree/main/tools/mcp): query the data and run the recommendation engines from an AI assistant or MCP client

## Pages

- [Overview](${SITE_URL}/): summary of the assessed platforms
- [All Platforms](${SITE_URL}/platforms): the full catalogue
- [Platform Comparison](${SITE_URL}/compare): scores for the six assessed platforms
- [Protein Coverage](${SITE_URL}/coverage): which platforms list a protein
- [Unassayed Proteome](${SITE_URL}/unassayed): reviewed human proteins not on any catalogue
- [Help Me Choose](${SITE_URL}/choose): ranked recommendation for a study
- [Help Me Combine](${SITE_URL}/combine): ranked platform pairs
- [Evidence Base](${SITE_URL}/evidence): the studies behind the atlas
- [Methods](${SITE_URL}/methods): how the scores and tools were built, and the version history
- [Reproducibility](${SITE_URL}/reproducibility): engine specifications, scripts and outputs

## Citation

${CITATION}
Archive, all versions: https://doi.org/${ARCHIVE_DOI}
`)

rmSync(serverDir, { recursive: true, force: true })
console.log(`Prerendered ${ROUTES.length} routes and 404.html`)
