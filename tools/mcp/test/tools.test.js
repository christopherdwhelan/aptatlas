// Each tool over stdio: shape, version fields, wording and edge cases.
import assert from 'assert'
import { readFileSync } from 'fs'
import { connect } from './client.js'

const scoring = JSON.parse(readFileSync(new URL('../bundle/data/scoring.json', import.meta.url)))
const { client, call, close } = await connect()
const seen = []
const check = async (name, args, verify) => {
  const r = await call(name, args)
  assert.equal(r.version, scoring.version, `${name} version`)
  assert.equal(r.last_updated, scoring.last_updated, `${name} last_updated`)
  verify(r)
  seen.push(name)
}

const { tools } = await client.listTools()
assert.deepEqual(tools.map(t => t.name).sort(), ['compare_platforms', 'coverage_lookup', 'evidence_search', 'get_platform', 'list_platforms', 'recommend', 'recommend_pair'])

await check('list_platforms', {}, r => assert.equal(r.assessed.length, 6))
await check('list_platforms', { scope: 'catalogue' }, r => assert.equal(r.catalogue.length, 46))
await check('get_platform', { id: 'nomic-omni' }, r => { assert.equal(r.lower_confidence, true); assert.match(r.scores_provenance, /28 and 33/) })
await check('get_platform', { id: 'no-such-platform' }, r => assert.match(r.error, /No platform/))
await check('compare_platforms', { ids: ['nulisa', 'seer-proteograph'] }, r => { assert.equal(r.dimensions.length, 10); assert.match(r.scores_provenance, /28 and 33/) })
await check('recommend', { primaryGoal: 'discovery', sampleType: 'plasma', studySize: 'large' }, r => {
  assert.equal(r.results.length, 6)
  assert.ok(['outright', 'tie'].includes(r.outcome))
  assert.match(r.note, /research use only/i)
})
await check('recommend', { primaryGoal: 'discovery', sampleType: 'plasma', studySize: 'large', toggles: { ptmDetection: 'systematic' } }, r => assert.equal(r.outcome, 'no_eligible_platform'))
await check('recommend', { primaryGoal: 'validation', sampleType: 'serum', studySize: 'medium', toggles: { absoluteQuant: 'yes' } }, r => {
  assert.deepEqual(r.top_tier, ['nomic-omni'])
  assert.ok(r.results.find(x => x.platform_id === 'olink-explore-ht').absolute_quant_note)
})
await check('recommend', { primaryGoal: 'discovery', sampleType: 'plasma', studySize: 'large', proteinTargets: ['il6', 'TNF', 'NOTAGENE1'] }, r => {
  assert.deepEqual(r.targets_not_on_any_catalogue, ['NOTAGENE1'])
  assert.ok(r.results.every(x => x.targets_covered != null))
})
await check('recommend', { primaryGoal: 'discovery', sampleType: 'plasma', studySize: 'large', pathwayId: 'R-HSA-76005' }, r => {
  assert.equal(r.active_pathway.id, 'R-HSA-76005')
  assert.ok(r.results.every(x => x.pathway_coverage_pct != null))
})
await check('recommend_pair', {}, r => {
  assert.equal(r.pairs.length, 15)
  assert.equal(r.pairs[0].coverage_ci.length, 2)
  assert.match(r.class_balance_provenance, /ChEMBL/)
  assert.ok(r.third_party.some(t => t.name === 'ChEMBL'))
})
await check('recommend_pair', { coverageMode: 'fda_biomarkers', priorities: ['cost', 'precision'] }, r => assert.equal(r.pairs[0].coverage_ci.length, 2))
await check('recommend_pair', { anchor: 'olink-explore-ht' }, r => { assert.equal(r.pairs.length, 5); assert.equal(r.anchor, 'Olink Explore HT') })
await check('recommend_pair', { anchor: 'nope' }, r => assert.match(r.error, /not one of/))
await check('coverage_lookup', { queries: ['TNF', 'Q9BX95', 'NOTAGENE1'] }, r => {
  assert.equal(r.results[0].matched_by, 'gene')
  assert.deepEqual(r.results[1].platforms, ['seer-proteograph'])
  assert.equal(r.results[2].found, false)
  assert.match(r.results[2].message, /Not on any catalogue/)
  assert.doesNotMatch(JSON.stringify(r), /missed by|fails to/i)
})
await check('evidence_search', { limit: 100 }, r => {
  assert.equal(r.total, 67)
  assert.ok(r.claims.every(c => c.study.doi && c.source.location))
  assert.ok(r.claims.every(c => c.source.version !== 'unverified'))
  const noted = id => r.claims.find(c => c.id === id).product_note
  for (const [id, text] of [['rooney-2023-2', 'Proseek'], ['eldjarn-2023-1', 'Explore 3072'], ['katz-2022-1', 'SomaScan 5K'], ['haslam-2022-1', 'SomaScan 7K'], ['kirsher-2025-2', 'SomaScan 7K'], ['kirsher-2025-4', 'Explore 3072']]) assert.match(noted(id), new RegExp(text), id)
  assert.equal(noted('nicholas-2026-2'), null)
})
await check('evidence_search', { platform: 'seer-proteograph', topic: 'pqtl' }, r => assert.ok(r.claims.every(c => c.platforms.includes('seer-proteograph') && c.topics.includes('pqtl'))))
await close()
console.log(`tools: ${seen.length} calls passed`)
