// Copies the shared engines and the published data into bundle/, which is what the package ships.
// Run after the site build, because the data comes from dist/data.
import { cpSync, existsSync, mkdirSync, rmSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../../..')
const bundle = resolve(here, '../bundle')
const FILES = ['platforms', 'all_platforms', 'scoring', 'evidence', 'helpMeCombine', 'proteins', 'reactome_pathways', 'pathway_coverage', 'manifest']

if (!existsSync(join(root, 'dist/data/manifest.json'))) throw new Error('dist/data is missing. Build the site first.')
rmSync(bundle, { recursive: true, force: true })
mkdirSync(join(bundle, 'data'), { recursive: true })
cpSync(join(root, 'src/engine'), join(bundle, 'engine'), { recursive: true })
for (const name of FILES) cpSync(join(root, `dist/data/${name}.json`), join(bundle, 'data', `${name}.json`))
console.log(`Bundled the engines and ${FILES.length} data files`)
