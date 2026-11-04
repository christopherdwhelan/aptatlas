// The Help Me Combine engine. No React and no data imports: the site and the MCP server (tools/mcp)
// both run this file, so they cannot disagree.

export const AXES = [
  { key: 'coverage',        label: 'Coverage',                 def: 1,   max: 6, hint: 'How much of the selected proteome the pair measures together.' },
  { key: 'complementarity', label: 'Complementarity (net-new)', def: 1,   max: 6, hint: 'Targets the second platform adds that the first cannot measure.' },
  { key: 'quality',         label: 'Combined measurement score', def: 1,   max: 6, hint: 'The two platforms averaged across whichever measurement properties you prioritise. Choose which properties count under customize measurement properties.' },
  { key: 'cost',            label: 'Cost (cheaper is better)', def: 1,   max: 6, hint: 'Combined relative cost of running both platforms.' },
  { key: 'class_balance',   label: 'Class balance',            def: 0.5, max: 6, hint: 'How evenly the pair spans protein classes.' },
  { key: 'sample_volume',   label: 'Sample volume',            def: 0,   max: 6, hint: 'Penalizes high joint aliquot volume.' },
  { key: 'ms_fit',          label: 'Tissue fit (mass spec)',   def: 0,   max: 6, hint: 'Rewards pairs that include mass spec, which handles tissue better.', hidden: true },
]
export const DEFAULT_WEIGHTS = Object.fromEntries(AXES.map(a => [a.key, a.def]))
export const INVERT = { cost: true, sample_volume: true }

// Priority picker: each pick raises one lever; coverage is no longer privileged.
// Measurement-property picks set the combined measurement score to emphasize only those properties.
export const PRIORITIES = [
  { key: 'coverage',        label: 'Broad coverage',                    group: 'Breadth',             axis: 'coverage' },
  { key: 'complementarity', label: 'Complementary targets (net-new)',   group: 'Breadth',             axis: 'complementarity' },
  { key: 'precision',       label: 'Precision / reproducibility',       group: 'Measurement properties', qdim: 'precision' },
  { key: 'specificity',     label: 'Target specificity',                group: 'Measurement properties', qdim: 'specificity' },
  { key: 'sensitivity',     label: 'Sensitivity (low-abundance)',       group: 'Measurement properties', qdim: 'sensitivity' },
  { key: 'quantification',  label: 'Absolute quantification',           group: 'Measurement properties', qdim: 'quantification_type' },
  { key: 'pqtl',            label: 'pQTL / genetics',                   group: 'Measurement properties', qdim: 'pqtl_accuracy' },
  { key: 'throughput',      label: 'High throughput / scale',           group: 'Practical',           qdim: 'throughput' },
  { key: 'cost',            label: 'Low cost',                          group: 'Practical',           axis: 'cost' },
  { key: 'volume',          label: 'Low sample volume',                 group: 'Practical',           axis: 'sample_volume' },
  { key: 'tissue',          label: 'Tissue work (mass spec preferred)', group: 'Special',             axis: 'ms_fit' },
]
export const PRIORITY_GROUPS = ['Breadth', 'Measurement properties', 'Practical', 'Special']
export const MAX_PRIORITIES = 3

// The combined measurement score averages the two platforms over these eight measurement
// properties, each weighted 0 to 3. Intrinsic properties default to 1; maturity properties
// (throughput, evidence depth, matrix validation) default to 0 because they reflect
// adoption rather than measurement quality itself. Raising a maturity property, e.g. throughput,
// is how a user tells the tool it matters (and lets high-throughput platforms climb).
export const QUALITY_DIMS = [
  { key: 'precision',           label: 'Precision',         group: 'Intrinsic', def: 1 },
  { key: 'specificity',         label: 'Specificity',       group: 'Intrinsic', def: 1 },
  { key: 'sensitivity',         label: 'Sensitivity',       group: 'Intrinsic', def: 1 },
  { key: 'quantification_type', label: 'Quantification',    group: 'Intrinsic', def: 1 },
  { key: 'pqtl_accuracy',       label: 'pQTL accuracy',     group: 'Intrinsic', def: 1 },
  { key: 'throughput',          label: 'Throughput',        group: 'Maturity',  def: 0 },
  { key: 'evidence_depth',      label: 'Evidence depth',    group: 'Maturity',  def: 0 },
  { key: 'sample_flexibility',  label: 'Matrix validation', group: 'Maturity',  def: 0 },
]
export const DEFAULT_QWEIGHTS = Object.fromEntries(QUALITY_DIMS.map(d => [d.key, d.def]))

export function derive(keys) {
  const w = Object.fromEntries(AXES.map(a => [a.key, a.def]))
  const pickedQ = []
  for (const k of keys) {
    const p = PRIORITIES.find(x => x.key === k); if (!p) continue
    if (p.axis) w[p.axis] = 5
    if (p.qdim) pickedQ.push(p.qdim)
  }
  const q = pickedQ.length
    ? (w.quality = 5, Object.fromEntries(QUALITY_DIMS.map(d => [d.key, pickedQ.includes(d.key) ? 1 : 0])))
    : { ...DEFAULT_QWEIGHTS }
  return { w, q }
}

export function createCombineEngine(data) {
  const PLATS = data.platforms
  const PAIRS = data.pairs
  const SLUG_BY_DISPLAY = Object.fromEntries(
    Object.entries(PLATS).map(([slug, p]) => [p.display_name, slug])
  )

  function cov(slug, mode) { return PLATS[slug]?.coverage?.[mode] }

  // Exact, precomputed per-pair union for every numeric mode (P13: no independence-model
  // estimate anywhere). drug_targets and fda_biomarkers are exact set intersections against
  // their external reference lists; proteome_canonical/proteome_atlas_union are exact unions
  // of each platform's own accession set, computed directly from public/proteins.json.
  const PAIR_COVERAGE_FIELD = {
    drug_targets: 'coverage_pct',
    proteome_canonical: 'coverage_pct_canonical',
    proteome_atlas_union: 'coverage_pct_atlas_union',
    fda_biomarkers: 'coverage_pct_fda',
  }
  function pairCoverage(pair, mode) {
    const field = PAIR_COVERAGE_FIELD[mode]
    return field ? pair[field] : null
  }
  function pairNetNew(pair, mode) {
    if (mode === 'ptm_proteoforms') return null
    if (mode === 'drug_targets') return pair.net_new_pct
    const a = SLUG_BY_DISPLAY[pair.a], b = SLUG_BY_DISPLAY[pair.b]
    return +(pairCoverage(pair, mode) - Math.max(cov(a, mode), cov(b, mode))).toFixed(2)
  }
  function pairPTM(pair) {
    const a = SLUG_BY_DISPLAY[pair.a], b = SLUG_BY_DISPLAY[pair.b]
    return PLATS[a].ptm_proteoform_capable || PLATS[b].ptm_proteoform_capable
  }
  function ciOverlap(p1, p2) {
    return p1.coverage_ci_lo <= p2.coverage_ci_hi && p2.coverage_ci_lo <= p1.coverage_ci_hi
  }

  // Pathway coverage is a pure display overlay, sourced from the same reactome_pathways.json /
  // pathway_coverage.json Help Me Choose uses - never folded into the composite (no eighth
  // axis, no new weight; the seven AXES and eleven PRIORITIES above are untouched). The pair
  // block keys each unordered pair once as "platformA|platformB"; try both orderings rather
  // than assume which platform_ids order the source file used.
  function pathwayPairCoverage(pathwayCoverage, pathwayId, pair) {
    const entry = pathwayCoverage?.pair?.[pathwayId]
    if (!entry) return null
    const a = SLUG_BY_DISPLAY[pair.a], b = SLUG_BY_DISPLAY[pair.b]
    const v = entry[`${a}|${b}`] ?? entry[`${b}|${a}`]
    return v == null ? null : v
  }

  // Combined measurement score = the average of the two platforms on each property (so a
  // platform that is weak on a prioritized property drags the pair down), weighted over the sub-dimensions.
  function customQuality(pair, qWeights) {
    const sa = PLATS[SLUG_BY_DISPLAY[pair.a]]?.app_scores
    const sb = PLATS[SLUG_BY_DISPLAY[pair.b]]?.app_scores
    if (!sa || !sb) return 0
    let sum = 0, wsum = 0
    for (const d of QUALITY_DIMS) {
      const w = qWeights[d.key] || 0
      if (w <= 0) continue
      sum += w * (sa[d.key] + sb[d.key]) / 2
      wsum += w
    }
    return wsum > 0 ? sum / wsum : 0
  }

  // Live composite: normalize each axis across all 15 pairs to [0,1], weighted mean.
  function scorePairs(mode, weights, qWeights) {
    const raw = PAIRS.map(p => ({
      coverage: pairCoverage(p, mode) ?? 0,
      complementarity: pairNetNew(p, mode) ?? 0,
      quality: customQuality(p, qWeights),
      cost: p.total_cost,
      class_balance: p.class_balance,
      sample_volume: p.joint_volume_uL,
      ms_fit: pairPTM(p) ? 1 : 0,
    }))
    const norm = {}
    AXES.forEach(({ key }) => {
      const xs = raw.map(r => r[key])
      const mn = Math.min(...xs), mx = Math.max(...xs), range = (mx - mn) || 1
      norm[key] = xs.map(x => (INVERT[key] ? (mx - x) : (x - mn)) / range)
    })
    const wsum = AXES.reduce((s, a) => s + (weights[a.key] || 0), 0) || 1
    return PAIRS.map((p, i) => ({
      pair: p,
      composite: AXES.reduce((s, a) => s + (weights[a.key] || 0) * norm[a.key][i], 0) / wsum,
      norm: Object.fromEntries(AXES.map(a => [a.key, norm[a.key][i]])),
    }))
  }

  // Co-leaders: consecutive top pairs that are a coverage tie with the leader
  // (CI overlap in drug-target mode, the only mode whose ties use a computed CI; within 2pp elsewhere).
  function coLeadersOf(rows, covMode) {
    const lead = [rows[0]]
    const c0 = pairCoverage(rows[0].pair, covMode)
    for (let i = 1; i < rows.length && lead.length < 3; i++) {
      const ci = pairCoverage(rows[i].pair, covMode)
      const tied = covMode === 'drug_targets'
        ? ciOverlap(rows[0].pair, rows[i].pair)
        : (c0 != null && ci != null && Math.abs(ci - c0) <= 2)
      if (tied) lead.push(rows[i]); else break
    }
    return lead
  }

  return { SLUG_BY_DISPLAY, cov, pairCoverage, pairNetNew, pairPTM, ciOverlap, pathwayPairCoverage, customQuality, scorePairs, coLeadersOf }
}
