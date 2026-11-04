// Runs the published fairness scenarios through the MCP tools over stdio and compares the result with the
// published CSVs, byte for byte, CRLF line endings included.
// choose: baseline grid (1,259,712), uniform legacy grid, secondary check, real-world, tie distribution.
// combine: priority sweep (924).
import { readFileSync } from 'fs'
import { connect } from './client.js'

const root = new URL('../../../public/', import.meta.url)
const text = path => readFileSync(new URL(path, root), 'utf-8')
const spec = JSON.parse(text('choose/choose_engine_spec.json'))
const { call, close } = await connect()
const BATCH = 8

const pyRound = (x, d) => { const r = Number(x.toFixed(d)); return Number.isInteger(r) ? r.toFixed(1) : String(r) }
const cleanRounded = (x, d) => String(Number(x.toFixed(d)))

class Tally {
  constructor() { this.win = {}; this.co = {}; this.hist = new Map(); this.n = 0; for (const p of spec.platform_ids) { this.win[p] = 0; this.co[p] = 0 } }
  add(response, weight = 1) {
    const eligible = response.results.filter(r => !r.hard_filter)
    if (!eligible.length) return
    this.n += weight
    const tie = eligible.filter(r => r.top_tier)
    this.hist.set(tie.length, (this.hist.get(tie.length) ?? 0) + weight)
    if (tie.length === 1) this.win[eligible[0].platform_id] += weight
    else for (const r of tie) this.co[r.platform_id] += weight
  }
}
const platformCsv = (t, nDisplay) => {
  const n = nDisplay ?? String(t.n)
  const rows = [...spec.platform_ids].sort((a, b) => t.co[b] - t.co[a]).map(p => `${p},${pyRound(t.co[p] / t.n * 100, 2)},${pyRound(t.win[p] / t.n * 100, 2)},${n}`)
  return ['platform_id,co_recommended_pct,outright_win_pct,n', ...rows].join('\r\n') + '\r\n'
}
const tieRows = (name, t, nDisplay) => {
  const n = nDisplay ?? String(t.n)
  return [...t.hist.keys()].sort((a, b) => a - b).map(k => `${name},${k},${k === 1 ? 'outright_win' : `${k}_way_tie`},${cleanRounded(t.hist.get(k), 2)},${pyRound(t.hist.get(k) / t.n * 100, 2)},${n}`)
}

const LEVELS = [1, 3, 5]
const KEYS = Object.keys(spec.slider_dimensions)
const WEIGHTS = LEVELS.flatMap(a => LEVELS.flatMap(b => LEVELS.flatMap(c => LEVELS.flatMap(d => LEVELS.flatMap(e => LEVELS.flatMap(f => LEVELS.map(g => Object.fromEntries(KEYS.map((k, i) => [k, [a, b, c, d, e, f, g][i]])))))))))

let calls = 0
async function run(scenarios, tally) {
  for (let i = 0; i < scenarios.length; i += BATCH) {
    const slice = scenarios.slice(i, i + BATCH)
    const responses = await Promise.all(slice.map(s => call('recommend', s.args)))
    responses.forEach((r, j) => tally.add(r, slice[j].weight))
    calls += slice.length
  }
}
const GOAL = { discovery: 0.554, disease_char: 0.169, population: 0.138, drug_target: 0.077, validation: 0.062, pharmacoproteomics: 0 }
const SAMPLE = { plasma: 0.554, multiple: 0.231, serum: 0.062, csf: 0.062, tissue: 0.062, cell_culture: 0.031 }
const SIZE = { small: 0.108, medium: 0.185, large: 0.508, xlarge: 0.2 }
const CNS = 0.077
const LONG = 0.175
const STATES = [[{ cnsFocus: 'no', longitudinal: 'no' }, (1 - CNS) * (1 - LONG)], [{ cnsFocus: 'yes', longitudinal: 'no' }, CNS * (1 - LONG)], [{ cnsFocus: 'no', longitudinal: 'yes' }, (1 - CNS) * LONG], [{ cnsFocus: 'yes', longitudinal: 'yes' }, CNS * LONG]]

const started = Date.now()
const baseline = new Tally()
for (const goal of spec.goals) for (const sample of spec.sample_types) for (const size of spec.study_sizes) for (const [state, prevalence] of STATES) {
  const weight = GOAL[goal] * SAMPLE[sample] * SIZE[size] * prevalence / WEIGHTS.length
  await run(WEIGHTS.map(weights => ({ weight, args: { primaryGoal: goal, sampleType: sample, studySize: size, weights, toggles: { absoluteQuant: 'no', ptmDetection: 'no', ...state } } })), baseline)
}
console.log(`baseline grid: ${calls} calls, ${Math.round((Date.now() - started) / 1000)}s`)

const legacy = new Tally()
for (const goal of spec.goals) for (const sample of spec.sample_types) for (const size of spec.study_sizes) {
  await run(WEIGHTS.map(weights => ({ args: { primaryGoal: goal, sampleType: sample, studySize: size, weights, toggles: { absoluteQuant: 'no', ptmDetection: 'no', cnsFocus: 'no', longitudinal: 'no' } } })), legacy)
}
const secondary = new Tally()
for (const size of ['large', 'xlarge']) {
  await run(WEIGHTS.map(weights => ({ args: { primaryGoal: 'discovery', sampleType: 'plasma', studySize: size, weights, toggles: { absoluteQuant: 'no', ptmDetection: 'no', cnsFocus: 'no', longitudinal: 'no' } } })), secondary)
}

// Real-world respondents
const parseCsv = source => {
  const lines = source.trim().split(/\r?\n/).map(line => (line.match(/("([^"]*)"|[^,]*)(,|$)/g) ?? []).map(c => c.replace(/,$/, '').replace(/^"|"$/g, '')))
  return lines.slice(1).map(cells => Object.fromEntries(lines[0].map((h, i) => [h, cells[i]])))
}
const GOAL_MAP = { 'Population-scale': 'population', 'Biomarker discovery': 'discovery', 'Drug target ID': 'drug_target', 'Biomarker validation': 'validation', 'Disease characterization': 'disease_char' }
const SAMPLE_MAP = { Plasma: 'plasma', Serum: 'serum', CSF: 'csf', Tissue: 'tissue', 'Cell culture': 'cell_culture', 'Multiple matrices': 'multiple' }
const SIZE_MAP = { '1,000-10,000': 'large', '>10,000': 'xlarge', '100-1,000': 'medium', '<100': 'small' }
const PTM_MAP = { no: 'no', systematic: 'systematic', incidental: 'incidental', not_selected: 'no' }
const realWorld = new Tally()
await run(parseCsv(text('choose/choose_real_world_data.csv')).map(row => ({ args: {
  primaryGoal: GOAL_MAP[row.primary_goal], sampleType: SAMPLE_MAP[row.sample_type], studySize: SIZE_MAP[row.study_size],
  weights: Object.fromEntries(KEYS.map(k => [k, Number(row[`w_${k}`])])),
  toggles: { absoluteQuant: row.absolute_quant, ptmDetection: PTM_MAP[row.ptm_detection], cnsFocus: row.cns_focus, longitudinal: 'no' },
} })), realWorld)

// Combine priority sweep
const combineSpec = JSON.parse(text('combine/combine_engine_spec.json'))
const P = Object.keys(combineSpec.priority_to_lever)
const combos = [...P.map(a => [a])]
P.forEach((a, i) => P.slice(i + 1).forEach(b => combos.push([a, b])))
P.forEach((a, i) => P.slice(i + 1).forEach((b, j) => P.slice(i + j + 2).forEach(c => combos.push([a, b, c]))))
const pairKeys = combineSpec.pairs.map(p => `${p.a} + ${p.b}`)
const stat = Object.fromEntries(pairKeys.map(k => [k, { win: 0, top3: 0, regret: 0, rank: 0 }]))
const part = Object.fromEntries(Object.values(combineSpec.platforms).map(p => [p.display_name, 0]))
let sweepN = 0
for (const coverageMode of ['drug_targets', 'proteome_atlas_union', 'proteome_canonical', 'fda_biomarkers']) {
  for (const priorities of combos) {
    const { pairs } = await call('recommend_pair', { coverageMode, priorities })
    sweepN++; calls++
    const best = pairs[0]
    stat[`${best.a} + ${best.b}`].win++
    part[best.a]++; part[best.b]++
    pairs.forEach((p, i) => {
      const s = stat[`${p.a} + ${p.b}`]
      if (i < 3) s.top3++
      s.regret += best.composite - p.composite
      s.rank += i + 1
    })
  }
}
const sweep = ['type,entity,win_count,win_pct,top3_count,top3_pct,mean_regret,mean_rank,participation_pct',
  ...pairKeys.map(k => { const s = stat[k]; return `pair,${k},${s.win},${pyRound(100 * s.win / sweepN, 2)},${s.top3},${pyRound(100 * s.top3 / sweepN, 2)},${pyRound(s.regret / sweepN, 4)},${pyRound(s.rank / sweepN, 2)},` }),
  ...Object.entries(part).sort((a, b) => b[1] - a[1]).map(([k, v]) => `platform,${k},,,,,,,${pyRound(100 * v / sweepN, 1)}`)].join('\r\n') + '\r\n'
await close()

const expected = {
  'choose/choose_baseline_grid_results.csv': platformCsv(baseline, '1259712'),
  'choose/choose_baseline_grid_uniform_legacy.csv': platformCsv(legacy),
  'choose/choose_secondary_check_results.csv': platformCsv(secondary),
  'choose/choose_real_world_results.csv': platformCsv(realWorld),
  'choose/choose_tie_distribution.csv': ['dataset,tie_group_size,label,count,pct,n',
    ...tieRows('baseline_grid', baseline, '1259712'), ...tieRows('baseline_grid_uniform_legacy', legacy), ...tieRows('secondary_check', secondary), ...tieRows('real_world', realWorld)].join('\r\n') + '\r\n',
  'combine/fairness_priority_sweep.csv': sweep,
}
let failed = 0
for (const [path, generated] of Object.entries(expected)) {
  const published = text(path)
  const same = generated === published
  console.log(`${same ? 'identical' : 'DIFFERENT'}  ${path}  (${Buffer.byteLength(published)} bytes)`)
  if (!same) {
    failed++
    const a = generated.split('\r\n'); const b = published.split('\r\n')
    a.forEach((line, i) => { if (line !== b[i]) console.log(`  generated: ${line}\n  published: ${b[i]}`) })
  }
}
console.log(`${calls} tool calls over stdio, ${Math.round((Date.now() - started) / 1000)}s`)
if (failed) process.exit(1)
