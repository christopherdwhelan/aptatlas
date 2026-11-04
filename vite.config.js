import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { coverageCounts, platformsByProtein } from './src/data/coverageCounts.js'
import { STATUS_NONE, UNASSAYED_JSON } from './src/data/unassayed.js'
import { hashRedirectScript } from './src/routes.js'

// Coverage counts computed from the data at build time, served to the app as virtual:apt-stats.
// The build stops if the data sources disagree, so a stale figure cannot ship.
function aptStats() {
  const virtualId = 'virtual:apt-stats'
  let stats
  return {
    name: 'apt-stats',
    buildStart() {
      const readJson = path => JSON.parse(readFileSync(resolve(path), 'utf-8'))
      const catalog = readJson('./src/data/all_platforms.json')
      const { universe } = readJson('./src/data/helpMeCombine.json')
      const unassayed = readJson(`./public${UNASSAYED_JSON}`)
      const evidence = readJson('./src/data/evidence.json')
      const proteins = readJson('./public/proteins.json')
      stats = coverageCounts(proteins)

      const noPlatform = unassayed.filter(r => r.status === STATUS_NONE).length
      const expectedNoPlatform = universe.proteome_canonical - stats.proteins
      const problems = []
      if (catalog.platforms.length !== catalog.meta.n_total) {
        problems.push(`all_platforms.json has ${catalog.platforms.length} rows but meta.n_total is ${catalog.meta.n_total}`)
      }
      if (stats.proteins !== universe.proteome_atlas_union) {
        problems.push(`proteins.json has ${stats.proteins} distinct proteins but helpMeCombine.json has ${universe.proteome_atlas_union}`)
      }
      if (noPlatform !== expectedNoPlatform) {
        problems.push(`the unassayed list has ${noPlatform} proteins on no platform but ${expectedNoPlatform} are expected`)
      }
      // The drug-target list is not in the public archive, so this check runs only where the list exists.
      const drugTargetFile = resolve('./data_migration/drug_targets_1449_canonical.csv')
      if (existsSync(drugTargetFile)) {
        const byProtein = platformsByProtein(proteins)
        const accessions = readFileSync(drugTargetFile, 'utf-8').trim().split('\n').slice(1).map(line => line.split(',')[0])
        const onAPlatform = accessions.filter(acc => byProtein.has(acc)).length
        if (onAPlatform !== universe.drug_targets_on_a_platform) {
          problems.push(`${onAPlatform} drug targets are on a platform but helpMeCombine.json has ${universe.drug_targets_on_a_platform}`)
        }
      }
      const unclassified = evidence.filter(s => !s.foundational && (s.platformsCompared.length < 2 || s.vendorAuthorship))
      if (unclassified.length) {
        problems.push(`evidence.json rows are neither foundational nor independent head-to-head: ${unclassified.map(s => s.id).join(', ')}`)
      }
      if (problems.length) this.error(`Site data disagree: ${problems.join('; ')}`)
    },
    resolveId(id) {
      return id === virtualId ? `\0${virtualId}` : null
    },
    load(id) {
      return id === `\0${virtualId}` ? `export default ${JSON.stringify(stats)}` : null
    },
  }
}

// Old hash links (/#comparison) move to their paths before the page draws.
const hashRedirect = {
  name: 'hash-redirect',
  transformIndexHtml() {
    return [{ tag: 'script', children: hashRedirectScript(), injectTo: 'head-prepend' }]
  },
}

// Standard multi-file build (for Vercel deployment)
const standardBuild = {
  outDir: 'dist',
  sourcemap: false,
  rollupOptions: {
    output: {
      manualChunks(id) {
        if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) return 'charts'
        if (id.includes('node_modules/react')) return 'vendor'
      },
    },
  },
}

// Single-file build — run with: npm run build:html
// Produces dist-html/index.html — one file, fully self-contained, no server needed.
const isSingleFile = process.env.BUILD_MODE === 'singlefile'

export default defineConfig(async ({ isSsrBuild }) => {
  const plugins = [react(), tailwindcss(), aptStats()]

  if (isSingleFile) {
    const { viteSingleFile } = await import('vite-plugin-singlefile')
    const inlineProteins = {
      name: 'inline-proteins',
      transformIndexHtml: {
        order: 'post',
        handler(html) {
          const data = readFileSync(resolve('./public/proteins.json'), 'utf-8')
          return html.replace('</head>', `<script>window.__PROTEINS__=${data}</script></head>`)
        },
      },
    }
    plugins.push(viteSingleFile(), inlineProteins)
    return {
      plugins,
      // Real paths cannot work from a file on disk, so this build stays on hash navigation.
      define: { 'import.meta.env.VITE_HASH_NAV': JSON.stringify('true') },
      build: {
        outDir: 'dist-html',
        sourcemap: false,
        assetsInlineLimit: Infinity,
        rollupOptions: { output: { inlineDynamicImports: true } },
      },
    }
  }

  // Server bundle for scripts/prerender.js, which deletes it when done.
  if (isSsrBuild) return { plugins, build: { outDir: 'dist-ssr', sourcemap: false } }

  return { plugins: [...plugins, hashRedirect], build: standardBuild }
})
