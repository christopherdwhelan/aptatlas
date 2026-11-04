// The tool logic, with no transport: server.js exposes these over MCP. Nothing here uses the network,
// and nothing is logged, so a query stays on the machine that runs it.
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { ABSOLUTE_QUANT_VARIANT_NOTE, DEFAULT_WEIGHTS, TIE_BAND, createChooseEngine, hardFilterLabel } from './bundle/engine/choose.js'
import { AXES, DEFAULT_QWEIGHTS, DEFAULT_WEIGHTS as DEFAULT_AXIS_WEIGHTS, MAX_PRIORITIES, QUALITY_DIMS, createCombineEngine, derive } from './bundle/engine/combine.js'

const here = dirname(fileURLToPath(import.meta.url))
const load = name => JSON.parse(readFileSync(join(here, 'bundle/data', `${name}.json`), 'utf-8'))

const files = {
  platforms: load('platforms'),
  catalogue: load('all_platforms'),
  scoring: load('scoring'),
  evidence: load('evidence'),
  combine: load('helpMeCombine'),
  proteins: load('proteins'),
  pathways: load('reactome_pathways'),
  pathwayCoverage: load('pathway_coverage'),
}
const platforms = files.platforms.data
const scoring = files.scoring.data
const proteins = files.proteins.data
const combine = files.combine.data
const pathways = files.pathways.data.pathways
const pathwayCoverage = files.pathwayCoverage.data

const computeResults = createChooseEngine({ platforms, scoring })
const combineEngine = createCombineEngine(combine)

const NOTE = 'For research use only. Scores and recommendations reflect the authors\' assessment of published literature, offered as opinion to guide study design; they are not clinical or purchasing advice.'
const meta = {
  version: files.scoring.version,
  last_updated: files.scoring.last_updated,
  licence: files.scoring.licence,
  citation: files.scoring.citation,
  source: 'https://aptatlas.org/data',
  note: NOTE,
}
const LOWER_CONFIDENCE = new Set(files.scoring.lower_confidence.platforms)
const respond = body => ({ ...meta, ...body })
const scoredMeta = () => ({ scores_provenance: files.scoring.provenance, lower_confidence_rule: files.scoring.lower_confidence.rule })

const byId = new Map(platforms.map(p => [p.id, p]))
const summary = p => ({ id: p.id, name: p.name, company: p.company, technology: p.technology, proteins: p.proteins, lower_confidence: LOWER_CONFIDENCE.has(p.id) })
const compositeOf = id => {
  const s = scoring.scores[id]
  return scoring.dimensions.filter(d => d.id !== 'evidence_depth').reduce((sum, d) => sum + s[d.id], 0)
}
const scoresFor = id => ({
  scores: scoring.scores[id],
  composite_out_of_45: compositeOf(id),
  lower_confidence: LOWER_CONFIDENCE.has(id),
})
const stripDisplay = p => Object.fromEntries(Object.entries(p).filter(([k]) => k !== 'color' && k !== 'textColor'))

export function list_platforms({ scope = 'assessed' } = {}) {
  const body = {}
  if (scope === 'assessed' || scope === 'all') body.assessed = platforms.map(summary)
  if (scope === 'catalogue' || scope === 'all') {
    body.catalogue = files.catalogue.data.platforms.map(p => ({
      platform: p.platform, vendor: p.vendor, technology_group: p.technology_group, integration_tier: p.integration_tier, apt_integrated: p.apt_integrated, currently_deployable: p.currently_deployable,
    }))
  }
  return respond(body)
}

export function get_platform({ id }) {
  const assessed = byId.get(id)
  if (assessed) return respond({ type: 'assessed', platform: stripDisplay(assessed), ...scoresFor(id), ...scoredMeta() })
  const wanted = id.trim().toLowerCase()
  const row = files.catalogue.data.platforms.find(p => p.platform.toLowerCase() === wanted)
  if (row) return respond({ type: 'catalogue', platform: row })
  return respond({ error: `No platform named "${id}". Use list_platforms with scope "all" to see valid names.` })
}

export function compare_platforms({ ids }) {
  const unknown = ids.filter(id => !byId.has(id))
  if (unknown.length) return respond({ error: `Not assessed platform ids: ${unknown.join(', ')}. Scores exist only for the six assessed platforms; see list_platforms.` })
  return respond({
    dimensions: scoring.dimensions.map(d => ({ id: d.id, label: d.label, description: d.description, scores: Object.fromEntries(ids.map(id => [id, scoring.scores[id][d.id]])) })),
    platforms: ids.map(id => ({ ...summary(byId.get(id)), composite_out_of_45: compositeOf(id) })),
    ...scoredMeta(),
  })
}

// ── recommend: same inputs and scoring as Help Me Choose ─────────────────────────
const geneBySymbol = new Map(proteins.filter(p => p.gene).map(p => [p.gene.toUpperCase(), p.gene]))

export function recommend({ primaryGoal, sampleType, studySize, weights = {}, toggles = {}, proteinTargets = [], pathwayId }) {
  const answers = { primaryGoal, sampleType, studySize }
  const fullWeights = { ...DEFAULT_WEIGHTS, ...weights }
  const fullToggles = { absoluteQuant: null, ptmDetection: null, cnsFocus: null, longitudinal: null, ...toggles }

  // As on the site, a pathway replaces the target list outright.
  let activePathway = null
  let targets = proteinTargets.map(t => geneBySymbol.get(t.trim().toUpperCase()) ?? t.trim())
  if (pathwayId) {
    const pathway = pathways.find(p => p.id === pathwayId)
    if (!pathway) return respond({ error: `No pathway with id "${pathwayId}".` })
    activePathway = { id: pathway.id, name: pathway.name, n: pathway.n }
    targets = [...pathway.genes]
  }
  const results = computeResults(answers, fullWeights, fullToggles, targets, targets.length ? proteins : [])
  const eligible = results.filter(r => !r.hardFilter)
  const topTier = eligible.filter(r => r.isTopTier).map(r => r.platform.id)
  return respond({
    tie_band: TIE_BAND,
    outcome: !eligible.length ? 'no_eligible_platform' : topTier.length === 1 ? 'outright' : 'tie',
    top_tier: topTier,
    targets_not_on_any_catalogue: activePathway ? [] : targets.filter(t => !geneBySymbol.has(t.toUpperCase())),
    active_pathway: activePathway,
    results: results.map((r, i) => ({
      rank: r.hardFilter ? null : i + 1,
      platform_id: r.platform.id,
      name: r.platform.name,
      match_pct: r.displayPct,
      top_tier: !!r.isTopTier,
      hard_filter: r.hardFilter,
      filter_reason: r.hardFilter ? hardFilterLabel(r.hardFilter, activePathway) : null,
      absolute_quant_note: r.hardFilter === 'absquant' ? (ABSOLUTE_QUANT_VARIANT_NOTE[r.platform.id] ?? '').trim() || null : null,
      priority_warnings: r.priorityWarnings,
      targets_covered: r.proteinCoverageCount,
      pathway_coverage_pct: activePathway ? pathwayCoverage.single?.[activePathway.id]?.[r.platform.id] ?? null : null,
      lower_confidence: LOWER_CONFIDENCE.has(r.platform.id),
    })),
    ...scoredMeta(),
  })
}

// ── recommend_pair: same inputs and scoring as Help Me Combine ───────────────────
const { SLUG_BY_DISPLAY, coLeadersOf, pairCoverage, pairNetNew, pairPTM, pathwayPairCoverage, scorePairs, cov } = combineEngine
const displayNameFor = value => {
  if (SLUG_BY_DISPLAY[value]) return value
  return combine.platforms[value]?.display_name ?? null
}

export function recommend_pair({ coverageMode = 'drug_targets', anchor, priorities = [], axisWeights, qualityWeights, pathwayId, sortByPathway = false }) {
  if (priorities.length > MAX_PRIORITIES) return respond({ error: `Choose at most ${MAX_PRIORITIES} priorities.` })
  const anchorName = anchor ? displayNameFor(anchor) : null
  if (anchor && !anchorName) return respond({ error: `"${anchor}" is not one of the six assessed platforms.` })
  if (pathwayId && !pathwayCoverage.pair?.[pathwayId]) return respond({ error: `No pathway with id "${pathwayId}".` })

  const derived = derive(priorities)
  const w = { ...derived.w, ...axisWeights }
  const q = { ...derived.q, ...qualityWeights }
  let rows = scorePairs(coverageMode, w, q)
  if (anchorName) rows = rows.filter(s => s.pair.a === anchorName || s.pair.b === anchorName)
  rows = rows.map(s => ({ ...s, pathwayCoveragePct: pathwayId ? pathwayPairCoverage(pathwayCoverage, pathwayId, s.pair) : null }))
  rows = [...rows].sort((a, b) => (pathwayId && sortByPathway
    ? (b.pathwayCoveragePct ?? -1) - (a.pathwayCoveragePct ?? -1)
    : b.composite - a.composite))

  const anchorSlug = anchorName ? SLUG_BY_DISPLAY[anchorName] : null
  const isPTM = coverageMode === 'ptm_proteoforms'
  const anchorSolo = anchorSlug && !isPTM
    ? (coverageMode === 'drug_targets' ? combine.anchor_recommendations[anchorName]?.anchor_solo_pct : cov(anchorSlug, coverageMode))
    : null
  const flagged = pair => [pair.a, pair.b].map(n => SLUG_BY_DISPLAY[n]).filter(id => LOWER_CONFIDENCE.has(id))

  return respond({
    coverage_mode: coverageMode,
    mode: anchorName ? 'anchor' : 'discovery',
    anchor: anchorName,
    anchor_alone_pct: anchorSolo,
    single_platform_may_suffice: anchorSolo != null && anchorSolo >= 60,
    co_leaders: coLeadersOf(rows, coverageMode).map(r => `${r.pair.a} + ${r.pair.b}`),
    axis_weights: w,
    quality_weights: q,
    pairs: rows.map((r, i) => {
      const p = r.pair
      return {
        rank: i + 1,
        a: p.a,
        b: p.b,
        platform_ids: [SLUG_BY_DISPLAY[p.a], SLUG_BY_DISPLAY[p.b]],
        composite: r.composite,
        tier: p.tier,
        coverage_pct: pairCoverage(p, coverageMode),
        coverage_ci: coverageMode === 'drug_targets' ? [p.coverage_ci_lo, p.coverage_ci_hi]
          : coverageMode === 'fda_biomarkers' ? [p.coverage_fda_ci_lo, p.coverage_fda_ci_hi] : null,
        net_new: pairNetNew(p, coverageMode),
        total_cost: p.total_cost,
        joint_volume_uL: p.joint_volume_uL,
        class_balance: p.class_balance,
        ptm_proteoform_capable: !!pairPTM(p),
        pathway_coverage_pct: r.pathwayCoveragePct,
        lower_confidence_platforms: flagged(p),
      }
    }),
    axes: AXES.map(a => a.key),
    quality_dimensions: QUALITY_DIMS.map(d => d.key),
    defaults: { axis_weights: DEFAULT_AXIS_WEIGHTS, quality_weights: DEFAULT_QWEIGHTS },
    class_balance_provenance: files.scoring.class_balance_provenance,
    third_party: files.combine.third_party.map(t => ({ name: t.name, licence: t.licence, note: t.note })),
    ...scoredMeta(),
  })
}

// ── coverage_lookup ──────────────────────────────────────────────────────────────
const canonFor = (p, pid) => (p.canonical_by_platform && p.canonical_by_platform[pid]) || p.canonical || []
const byGene = new Map()
const byAccession = new Map()
const addTo = (map, key, row) => { if (!map.has(key)) map.set(key, []); map.get(key).push(row) }
for (const row of proteins) {
  if (row.gene) addTo(byGene, row.gene.toUpperCase(), row)
  const accessions = new Set(String(row.uniprot ?? '').split(/[;_]/).map(a => a.trim().replace(/-\d+$/, '')).filter(Boolean))
  for (const acc of row.canonical ?? []) accessions.add(acc)
  for (const acc of accessions) addTo(byAccession, acc.toUpperCase(), row)
}

export function coverage_lookup({ queries }) {
  const results = queries.map(raw => {
    const key = raw.trim().toUpperCase()
    const accessionRows = byAccession.get(key)
    const rows = byGene.get(key) ?? accessionRows
    if (!rows) return { query: raw, found: false, platforms: [], message: 'Not on any catalogue in the atlas, or not recognised as a gene symbol or UniProt accession.' }
    const isAccession = !byGene.has(key)
    const onPlatforms = new Set()
    for (const row of rows) {
      for (const pid of row.platforms) {
        // An accession can be credited to only some platforms on a merged row.
        if (!isAccession || !row.canonical_by_platform || canonFor(row, pid).some(a => a.toUpperCase() === key)) onPlatforms.add(pid)
      }
    }
    return {
      query: raw,
      found: true,
      matched_by: isAccession ? 'uniprot' : 'gene',
      platforms: platforms.map(p => p.id).filter(id => onPlatforms.has(id)),
      entries: rows.map(r => ({ gene: r.gene, name: r.name, uniprot: r.uniprot, canonical: r.canonical ?? [], platforms: r.platforms })),
    }
  })
  return respond({ results })
}

// ── evidence_search ──────────────────────────────────────────────────────────────
// Where a claim's text names a product version, say so: platform tags cover the whole family.
const PRODUCT_PATTERNS = [
  [/Explore 3072|Olink(?: HT)? (?:vs )?3072|Olink Explore HT and 3072|HT vs 3072/, 'Olink Explore 3072'],
  [/Proseek/, 'Olink Proseek'],
  [/384-plex/, 'Olink Explore 384-plex'],
  [/1\.3K/, 'SomaScan 1.3K'],
  [/SomaScan (?:1\.3K(?: and |, .*?with SomaScan ))?5K/, 'SomaScan 5K'],
  [/(?:SOMAscan|SomaScan) 7K|\b11K and 7K|\b11K vs 7K|for 7K/, 'SomaScan 7K'],
  [/SomaScan v4/, 'SomaScan v4'],
  [/(?:SomaScan|SomaLogic) 11[Kk]|for 11K/, 'SomaScan 11K'],
]
export function productNote(text) {
  const named = PRODUCT_PATTERNS.filter(([pattern]) => pattern.test(text)).map(([, name]) => name)
  return named.length ? `This claim names ${named.join(', ')}. The platform tag covers the whole product family, including this version.` : null
}

export function evidence_search({ platform, topic, query, studyId, limit = 25 }) {
  const q = query?.trim().toLowerCase()
  const claims = []
  for (const study of files.evidence.data) {
    if (studyId && study.id !== studyId) continue
    for (const claim of study.keyFindings) {
      if (platform && !claim.platforms.includes(platform)) continue
      if (topic && !claim.topics.includes(topic)) continue
      if (q && !`${claim.text} ${study.shortCitation} ${study.journal}`.toLowerCase().includes(q)) continue
      claims.push({
        id: claim.id,
        text: claim.text,
        product_note: productNote(claim.text),
        platforms: claim.platforms,
        topics: claim.topics,
        figures: claim.figures,
        source: claim.source,
        study: {
          id: study.id,
          citation: study.shortCitation,
          doi: study.doi,
          url: study.url,
          year: study.year,
          journal: study.journal,
          sample_size: study.sampleSize,
          vendor_authorship: study.vendorAuthorship,
          disclosure: study.disclosureNote,
          note: study.note,
          foundational: study.foundational,
        },
      })
    }
  }
  return respond({ total: claims.length, returned: Math.min(limit, claims.length), claims: claims.slice(0, limit) })
}
