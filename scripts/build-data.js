// Writes /data at build time from the site's own source files, so the two cannot drift.
//   dist/data/<file>        latest
//   dist/data/vX.Y/<file>   frozen for this release
// data_releases/vX.Y/ holds the committed copy of each release. The build fails if today's output
// differs from the committed copy for the current version: changing published data needs a version bump.
//   npm run data:freeze                              commit point for a new version
//   npm run data:freeze -- --overwrite-unreleased    redo a version that has never been deployed
import { Buffer } from 'buffer'
import { createHash } from 'crypto'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import process from 'process'
import Ajv2020 from 'ajv/dist/2020.js'
import { APP_VERSION, LAST_UPDATED_ISO, VERSION } from '../src/version.js'
import { ARCHIVE_DOI, CITATION, DATA_FILES, LICENCE, LICENCE_URL, SCORING_PROVENANCE, CLASS_BALANCE_PROVENANCE, fileName, schemaName } from '../src/dataFiles.js'
import { coverageCounts } from '../src/data/coverageCounts.js'

const SITE_URL = (process.env.VITE_SITE_URL || 'https://aptatlas.org').replace(/\/+$/, '')
const LOW_EVIDENCE_THRESHOLD = 2 // src/data/confidence.js, checked below
const readJson = path => JSON.parse(readFileSync(resolve(path), 'utf-8'))
const confidenceSource = readFileSync(resolve('src/data/confidence.js'), 'utf-8')
if (!confidenceSource.includes(`LOW_EVIDENCE_THRESHOLD = ${LOW_EVIDENCE_THRESHOLD}`)) throw new Error('The lower-confidence threshold changed; update scripts/build-data.js')

const proteins = readJson('public/proteins.json')
const scoring = readJson('src/data/scoring.json')
const evidence = readJson('src/data/evidence.json')

const SOURCES = {
  platforms: () => readJson('src/data/platforms.json'),
  all_platforms: () => readJson('src/data/all_platforms.json'),
  scoring: () => scoring,
  evidence: () => evidence,
  helpMeCombine: () => readJson('src/data/helpMeCombine.json'),
  coverage_counts: () => coverageCounts(proteins),
  proteins: () => proteins,
  reactome_pathways: () => readJson('public/pathways/reactome_pathways.json'),
  pathway_coverage: () => readJson('public/pathways/pathway_coverage.json'),
  choose_engine_spec: () => readJson('public/choose/choose_engine_spec.json'),
  combine_engine_spec: () => readJson('public/combine/combine_engine_spec.json'),
}

const release = `${SITE_URL}/data/${APP_VERSION}`
const common = { version: VERSION, last_updated: LAST_UPDATED_ISO, licence: LICENCE, licence_url: LICENCE_URL, citation: CITATION, archive_doi: ARCHIVE_DOI }

function jsonFile(f) {
  const extras = f.name === 'scoring'
    ? {
        provenance: SCORING_PROVENANCE,
        class_balance_provenance: CLASS_BALANCE_PROVENANCE,
        lower_confidence: {
          rule: `A platform with an evidence-depth score of ${LOW_EVIDENCE_THRESHOLD} or lower has its other scores flagged as provisional. The flag never changes a score, ranking or recommendation.`,
          platforms: Object.keys(scoring.scores).filter(id => scoring.scores[id].evidence_depth <= LOW_EVIDENCE_THRESHOLD),
        },
      }
    : {}
  return { schema: `${release}/${schemaName(f)}`, name: f.name, title: f.title, ...common, third_party: f.third_party, ...extras, data: SOURCES[f.name]() }
}

const csvCell = v => (/[",\r\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v)
function evidenceRows() {
  return evidence.flatMap(study => study.keyFindings.map(claim => {
    for (const { about } of claim.figures) if (about.includes(';')) throw new Error(`${claim.id}: a figure description contains a semicolon`)
    return {
      claim_id: claim.id,
      study_id: study.id,
      study: study.shortCitation,
      doi: study.doi,
      claim: claim.text,
      figures: claim.figures.map(x => `${x.value} (${x.about})`).join('; '),
      source_location: claim.source.location,
      source_version: claim.source.version,
      platforms: claim.platforms.join('; '),
      topics: claim.topics.join('; '),
      vendor_authorship: study.vendorAuthorship ?? '',
      version: VERSION,
      last_updated: LAST_UPDATED_ISO,
      licence: LICENCE,
    }
  }))
}

// Every file for this release, as { name: bytes }
const output = {}
const manifestFiles = []
const ajv = new Ajv2020({ allErrors: true, strict: false })
const schemaDir = resolve('data_schemas')
const compiled = {}
const validate = (schemaFile, value, label) => {
  const check = (compiled[schemaFile] ??= ajv.compile(JSON.parse(output[schemaFile])))
  if (!check(value)) throw new Error(`${label} does not match ${schemaFile}: ${ajv.errorsText(check.errors.slice(0, 5))}`)
}
for (const f of DATA_FILES) {
  const name = fileName(f)
  const schema = schemaName(f)
  output[schema] = readFileSync(join(schemaDir, schema), 'utf-8')
  if (f.format === 'csv') {
    const rows = evidenceRows()
    for (const row of rows) validate(schema, row, `${name} row ${row.claim_id}`)
    const columns = Object.keys(rows[0])
    output[name] = [columns.join(','), ...rows.map(r => columns.map(c => csvCell(r[c])).join(','))].join('\n') + '\n'
  } else {
    const file = jsonFile(f)
    validate(schema, file, name)
    output[name] = `${JSON.stringify(file, null, 2)}\n`
  }
  manifestFiles.push({
    file: name,
    format: f.format,
    title: f.title,
    description: f.desc,
    url: `${release}/${name}`,
    latest_url: `${SITE_URL}/data/${name}`,
    schema_url: `${release}/${schema}`,
    licence: LICENCE,
    third_party: f.third_party.map(t => ({ name: t.name, licence: t.licence, relationship: t.relationship })),
    bytes: Buffer.byteLength(output[name]),
    sha256: createHash('sha256').update(output[name]).digest('hex'),
  })
}
output['manifest.schema.json'] = readFileSync(join(schemaDir, 'manifest.schema.json'), 'utf-8')
const manifest = { schema: `${release}/manifest.schema.json`, name: 'manifest', ...common, files: manifestFiles }
validate('manifest.schema.json', manifest, 'manifest.json')
output['manifest.json'] = `${JSON.stringify(manifest, null, 2)}\n`

// Compare with, or create, the committed copy of this release
const releases = resolve('data_releases')
const frozen = join(releases, APP_VERSION)
const args = process.argv.slice(2)
if (args.includes('--freeze')) {
  if (existsSync(frozen) && !args.includes('--overwrite-unreleased')) {
    throw new Error(`${APP_VERSION} is already frozen. Bump src/version.js for a new release, or pass --overwrite-unreleased only if ${APP_VERSION} has never been deployed.`)
  }
  rmSync(frozen, { recursive: true, force: true })
  mkdirSync(frozen, { recursive: true })
  for (const [name, bytes] of Object.entries(output)) writeFileSync(join(frozen, name), bytes)
  console.log(`Froze ${Object.keys(output).length} files in data_releases/${APP_VERSION}`)
}
// --unfrozen is for local work between freezes only; npm run build never passes it.
if (!args.includes('--unfrozen')) {
  if (!existsSync(frozen)) throw new Error(`data_releases/${APP_VERSION} does not exist. Run npm run data:freeze and commit it.`)
  const committed = readdirSync(frozen).sort()
  const changed = [...new Set([...committed, ...Object.keys(output)])].filter(name =>
    !existsSync(join(frozen, name)) || output[name] === undefined || readFileSync(join(frozen, name), 'utf-8') !== output[name])
  if (changed.length) {
    throw new Error(`Published data changed without a version bump (${APP_VERSION}): ${changed.join(', ')}. Bump src/version.js and run npm run data:freeze.`)
  }
}

// Write latest and every release to dist
const dist = resolve('dist/data')
mkdirSync(dist, { recursive: true })
for (const [name, bytes] of Object.entries(output)) writeFileSync(join(dist, name), bytes)
for (const dir of readdirSync(releases)) cpSync(join(releases, dir), join(dist, dir), { recursive: true })
console.log(`Wrote /data (${APP_VERSION}): ${Object.keys(output).length} files; releases: ${readdirSync(releases).join(', ')}`)
