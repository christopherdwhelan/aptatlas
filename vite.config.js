import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'fs'
import { resolve } from 'path'

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

export default defineConfig(async () => {
  const plugins = [react(), tailwindcss()]

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
      build: {
        outDir: 'dist-html',
        sourcemap: false,
        assetsInlineLimit: Infinity,
        rollupOptions: { output: { inlineDynamicImports: true } },
      },
    }
  }

  return { plugins, build: standardBuild }
})
