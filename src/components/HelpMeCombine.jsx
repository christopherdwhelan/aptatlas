import { useState, useMemo, useEffect, useRef } from 'react'
import data from '../data/helpMeCombine.json'

// ── Data helpers ────────────────────────────────────────────────────────────
const PLATS = data.platforms
const PAIRS = data.pairs
const ANCHORS = data.anchor_recommendations
const MODES = data.coverage_modes
const SLUG_BY_DISPLAY = Object.fromEntries(
  Object.entries(PLATS).map(([slug, p]) => [p.display_name, slug])
)
const ANCHOR_NAMES = Object.values(PLATS).map(p => p.display_name)

const AXES = [
  { key: 'coverage',        label: 'Coverage',                 def: 1,   max: 6, hint: 'How much of the selected proteome the pair measures together.' },
  { key: 'complementarity', label: 'Complementarity (net-new)', def: 1,   max: 6, hint: 'Targets the second platform adds that the first cannot measure.' },
  { key: 'quality',         label: 'Combined measurement score', def: 1,   max: 6, hint: 'The two platforms averaged across whichever measurement properties you prioritise. Choose which properties count under customize measurement properties.' },
  { key: 'cost',            label: 'Cost (cheaper is better)', def: 1,   max: 6, hint: 'Combined relative cost of running both platforms.' },
  { key: 'class_balance',   label: 'Class balance',            def: 0.5, max: 6, hint: 'How evenly the pair spans protein classes.' },
  { key: 'sample_volume',   label: 'Sample volume',            def: 0,   max: 6, hint: 'Penalizes high joint aliquot volume.' },
  { key: 'ms_fit',          label: 'Tissue fit (mass spec)',   def: 0,   max: 6, hint: 'Rewards pairs that include mass spec, which handles tissue better.', hidden: true },
]
const DEFAULT_WEIGHTS = Object.fromEntries(AXES.map(a => [a.key, a.def]))
const INVERT = { cost: true, sample_volume: true }

// Priority picker: each pick raises one lever; coverage is no longer privileged.
// Measurement-property picks set the combined measurement score to emphasize only those properties.
const PRIORITIES = [
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
const PRIORITY_GROUPS = ['Breadth', 'Measurement properties', 'Practical', 'Special']
const MAX_PRIORITIES = 3

function derive(keys) {
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

// The combined measurement score averages the two platforms over these eight measurement
// properties, each weighted 0 to 3. Intrinsic properties default to 1; maturity properties
// (throughput, evidence depth, matrix validation) default to 0 because they reflect
// adoption rather than measurement quality itself. Raising a maturity property, e.g. throughput,
// is how a user tells the tool it matters (and lets high-throughput platforms climb).
const QUALITY_DIMS = [
  { key: 'precision',           label: 'Precision',         group: 'Intrinsic', def: 1 },
  { key: 'specificity',         label: 'Specificity',       group: 'Intrinsic', def: 1 },
  { key: 'sensitivity',         label: 'Sensitivity',       group: 'Intrinsic', def: 1 },
  { key: 'quantification_type', label: 'Quantification',    group: 'Intrinsic', def: 1 },
  { key: 'pqtl_accuracy',       label: 'pQTL accuracy',     group: 'Intrinsic', def: 1 },
  { key: 'throughput',          label: 'Throughput',        group: 'Maturity',  def: 0 },
  { key: 'evidence_depth',      label: 'Evidence depth',    group: 'Maturity',  def: 0 },
  { key: 'sample_flexibility',  label: 'Matrix validation', group: 'Maturity',  def: 0 },
]
const DEFAULT_QWEIGHTS = Object.fromEntries(QUALITY_DIMS.map(d => [d.key, d.def]))

const COVERAGE_TIPS = {
  drug_targets: 'The ~1,450 human proteins targeted by an approved or clinical-phase drug (ChEMBL). Answers: how much of the druggable proteome can the pair measure?',
  proteome_canonical: 'All 20,190 reviewed human protein-coding genes (SwissProt), the full theoretical proteome. Most are not yet measurable by any platform.',
  proteome_atlas_union: 'The 14,340 distinct proteins measurable by at least one platform in this Atlas, that is, what is realistically detectable today.',
  fda_biomarkers: 'The 217 human proteins with an FDA-approved biomarker assay (Bhowmick et al. 2021, J Proteome Res). Answers: how much of the clinically-actionable, regulator-recognized biomarker space can the pair measure?',
  ptm_proteoforms: 'Post-translational modifications and proteoforms. Mass spec only; affinity panels cannot resolve them, so this is shown as a capability flag, not a percentage.',
}
const MODE_TIPS = {
  anchor: 'You have already run, or plan to start with, one platform. We rank the best second platform to add and show the gain over that platform alone.',
  discovery: 'You have not chosen a platform yet. We recommend the strongest overall pair from scratch.',
}

// Thin-line SVG icons for the setup checklist, matching the Overview KPI icon style.
const STEP_ICON = {
  start: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  ),
  anchor: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 10l4 4 4-4" />
    </svg>
  ),
  coverage: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  ),
  priorities: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
}

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

const TIER_STYLE = {
  1: { bg: 'rgba(128,171,122,0.14)', fg: '#4F6B4A', label: 'Leading choice' },
  2: { bg: 'rgba(124,134,168,0.14)', fg: '#4A5373', label: 'Strong contender' },
  3: { bg: 'rgba(245,200,74,0.16)',  fg: '#8C6E1F', label: 'Situational' },
  4: { bg: 'rgba(108,114,128,0.12)', fg: '#6C7280', label: 'Not recommended' },
}

// Short, grammatically singular axis names for inline prose (AXES.label carries
// slider-UI parentheticals like "(cheaper is better)" that read badly mid-sentence).
const AXIS_SHORT_LABEL = {
  coverage: 'coverage',
  complementarity: 'net-new complementarity',
  quality: 'combined measurement score',
  cost: 'cost',
  class_balance: 'class balance',
  sample_volume: 'sample volume',
}

// This pair's best- and worst-performing axis (excluding the hidden ms_fit axis,
// same axes AdvancedWeights exposes), from the live per-axis normalization already
// computed for every pair by scorePairs - not re-derived or approximated.
function axisProfile(norm) {
  const entries = AXES.filter(a => !a.hidden).map(a => ({ key: a.key, label: AXIS_SHORT_LABEL[a.key], norm: norm[a.key] ?? 0 }))
  entries.sort((a, b) => b.norm - a.norm)
  return { top: entries[0], bottom: entries[entries.length - 1] }
}

// 1-based rank of `value` on `axisKey` among `rows` (ties share the better rank).
function axisRank(rows, axisKey, value) {
  return 1 + rows.filter(r => r.norm[axisKey] > value).length
}

const COST_TIER_LABEL = t => (t <= 1.5 ? 'budget-tier' : t <= 2.5 ? 'mid-tier' : 'premium-tier')

// The concrete platform-level fact behind this pair's position on one axis: each
// platform's own solo coverage, cost tier, per-dimension measurement score, or sample
// volume, not just the axis name. Every axis maps to something in the platform/pair
// data the user can check directly, except class_balance, which has no per-platform
// decomposition and falls back to the pair's own score.
function axisWhy(axisKey, pair, mode, qWeights, wantHigh) {
  const platA = PLATS[SLUG_BY_DISPLAY[pair.a]], platB = PLATS[SLUG_BY_DISPLAY[pair.b]]
  if (axisKey === 'coverage') {
    const aCov = cov(SLUG_BY_DISPLAY[pair.a], mode), bCov = cov(SLUG_BY_DISPLAY[pair.b], mode)
    const [hiName, hiPct, loName, loPct] = aCov >= bCov ? [pair.a, aCov, pair.b, bCov] : [pair.b, bCov, pair.a, aCov]
    return `${hiName} alone already reaches ${hiPct}%, ${loName} ${loPct}%`
  }
  if (axisKey === 'complementarity') {
    const aCov = cov(SLUG_BY_DISPLAY[pair.a], mode), bCov = cov(SLUG_BY_DISPLAY[pair.b], mode)
    const better = aCov >= bCov ? pair.a : pair.b
    return `adds +${pairNetNew(pair, mode)}pp of coverage beyond ${better} alone`
  }
  if (axisKey === 'quality') {
    const dims = QUALITY_DIMS.filter(d => (qWeights[d.key] || 0) > 0)
    if (!dims.length) return 'no measurement property is currently weighted'
    const scored = dims.map(d => ({ label: d.label.toLowerCase(), a: platA.app_scores[d.key], b: platB.app_scores[d.key], avg: (platA.app_scores[d.key] + platB.app_scores[d.key]) / 2 }))
    scored.sort((x, y) => (wantHigh ? y.avg - x.avg : x.avg - y.avg))
    const s = scored[0]
    return s.a === s.b ? `both score ${s.a}/5 on ${s.label}` : `${pair.a} ${s.a}/5, ${pair.b} ${s.b}/5 on ${s.label}`
  }
  if (axisKey === 'cost') {
    const la = COST_TIER_LABEL(platA.cost_tier_rel), lb = COST_TIER_LABEL(platB.cost_tier_rel)
    return la === lb ? `both platforms are ${la}` : `${pair.a} is ${la}, ${pair.b} is ${lb}`
  }
  if (axisKey === 'sample_volume') {
    return `${pair.a} needs ${platA.sample_volume_uL} µL, ${pair.b} needs ${platB.sample_volume_uL} µL per sample`
  }
  return `a protein-class evenness score of ${pair.class_balance.toFixed(2)}` // class_balance
}

// Tailored tier explanation: the pair's own sweep stats (win_pct_secondary/top3_pct,
// the same numbers behind the tier assignment) plus the concrete platform-level fact
// behind its strongest and weakest axis (from the live per-pair normalization and the
// platform data itself), not a generic definition of the tier label.
function tierTooltip(pair, tier, norm, rows, mode, qWeights) {
  const win = pair.win_pct_secondary.toFixed(1)
  const top3 = pair.top3_pct.toFixed(1)
  const total = rows.length
  const { top: topAxis, bottom: bottomAxis } = axisProfile(norm)
  const topRank = axisRank(rows, topAxis.key, topAxis.norm)
  const bottomRank = axisRank(rows, bottomAxis.key, bottomAxis.norm)
  const topPhrase = `${topAxis.label} (${axisWhy(topAxis.key, pair, mode, qWeights, true)})`
  const bottomWhy = axisWhy(bottomAxis.key, pair, mode, qWeights, false)
  const bottomPhrase = `${bottomAxis.label} (${bottomWhy})`
  // Tier 1 is the one case where "even its weak axis isn't a problem" is itself the
  // claim being made, so unlike the other tiers it needs the axis's rank as evidence,
  // not just the mechanism - otherwise a genuinely bad rank (e.g. a joint sample volume
  // the app elsewhere flags as exceeding a typical aliquot) reads as contradicting the
  // "not exposed" claim instead of supporting it.
  const bottomPhraseRanked = `${bottomAxis.label} (#${bottomRank} of ${total}: ${bottomWhy})`
  return {
    1: bottomRank <= Math.ceil(total / 3)
      ? `Clears the 80% top-3 bar for a leading choice (wins outright in ${win}%, top-3 in ${top3}% of weightings). Even its weakest axis, ${bottomPhraseRanked}, lands in the better third of the field, so nothing here is a real liability and it holds up almost regardless of priority.`
      : `Clears the 80% top-3 bar for a leading choice (wins outright in ${win}%, top-3 in ${top3}% of weightings). It does have a real soft spot, ${bottomPhraseRanked}, but its strength elsewhere, especially ${topPhrase}, is large enough to clear the 80% bar regardless.`,
    2: `A strong contender (wins outright in ${win}%, top-3 in ${top3}% of weightings). It's strongest on ${topPhrase}, but comparatively weak on ${bottomPhrase}, enough to stay broadly competitive without clearing the 80% bar for a leading choice.`,
    3: `Situational (wins outright in just ${win}%, top-3 in only ${top3}% of weightings). It's strongest on ${topPhrase} but weak on ${bottomPhrase}, so it only leads when ${topAxis.label} carries enough weight to outweigh that gap.`,
    4: topRank <= 2
      ? `Not recommended (wins outright in just ${win}%, top-3 in only ${top3}% of weightings). It leads the field on ${topPhrase}, but other pairs match that while also beating it on ${bottomPhrase}, so no realistic priority combination favors it consistently.`
      : `Not recommended (wins outright in just ${win}%, top-3 in only ${top3}% of weightings). Even its best axis, ${topPhrase}, isn't a standout, and it's weak on ${bottomPhrase} too, so no realistic priority combination favors it consistently.`,
  }[tier] || ''
}

// ── Small UI pieces ─────────────────────────────────────────────────────────
function Section({ label, subtitle, children }) {
  return (
    <div className="mb-5">
      <p className="uppercase" style={{ color: '#8B1A1A', fontSize: 10, letterSpacing: '0.08em', fontWeight: 500, marginBottom: subtitle ? 3 : 10 }}>{label}</p>
      {subtitle && <p className="text-xs mb-2.5" style={{ color: '#6f6d67', fontWeight: 400 }}>{subtitle}</p>}
      {children}
    </div>
  )
}

function Tooltip({ text, children, width = 230 }) {
  const [show, setShow] = useState(false)
  if (!text) return children
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 6, width,
          background: '#fff', border: '1px solid #e5e4e2', borderRadius: 6, padding: '8px 10px',
          fontSize: 11, lineHeight: 1.4, color: '#52504a', fontWeight: 400,
          boxShadow: '0 2px 10px rgba(31,36,48,0.10)', zIndex: 40, pointerEvents: 'none',
        }}>
          {text}
        </span>
      )}
    </span>
  )
}

function Segmented({ options, value, onChange, stacked }) {
  // Stacked = mutually-exclusive, full-width choices (e.g. "Where are you starting?"):
  // rendered as radio cards with the tip always visible as sub-text, matching Help Me
  // Choose's RadioCard, rather than hidden behind a hover-only tooltip.
  if (stacked) {
    return (
      <div className="flex flex-col gap-2">
        {options.map(o => {
          const active = value === o.value
          return (
            <button key={o.value} onClick={() => onChange(o.value)}
              className="text-left border transition-all w-full"
              style={{ padding: '12px 16px', borderColor: active ? '#8B1A1A' : '#e5e4e2', background: '#ffffff' }}>
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0"
                  style={{ borderColor: active ? '#8B1A1A' : '#d0cfcc', background: active ? '#8B1A1A' : 'transparent' }} />
                <div>
                  <p className="text-sm leading-snug" style={{ color: '#141310', fontWeight: 400 }}>{o.label}</p>
                  {o.tip && <p className="text-xs mt-0.5" style={{ color: '#6f6d67', fontWeight: 400 }}>{o.tip}</p>}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    )
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const active = value === o.value
        return (
          <Tooltip key={o.value} text={o.tip}>
            <button onClick={() => onChange(o.value)}
              className="px-3 py-2 text-sm border transition-all"
              style={{ background: active ? '#8B1A1A' : '#ffffff', color: active ? '#fff' : '#52504a', borderColor: active ? '#8B1A1A' : '#e5e4e2', fontWeight: 400 }}>
              {o.label}
            </button>
          </Tooltip>
        )
      })}
    </div>
  )
}

function WeightSlider({ axis, value, onChange }) {
  return (
    <div className="mb-3.5">
      <div className="flex items-center justify-between mb-0.5">
        <label className="text-sm" style={{ color: '#141310', fontWeight: 400 }}>{axis.label}</label>
        <span className="text-xs w-8 text-right" style={{ color: value > 0 ? '#8B1A1A' : '#b3b1ab', fontWeight: 500 }}>{value.toFixed(1)}</span>
      </div>
      <p className="text-xs mb-1.5" style={{ color: '#6f6d67', fontWeight: 400 }}>{axis.hint}</p>
      <input type="range" min={0} max={axis.max} step={0.5} value={value}
        onChange={e => onChange(axis.key, parseFloat(e.target.value))}
        className="w-full h-1.5 appearance-none cursor-pointer" style={{ accentColor: '#8B1A1A' }} />
    </div>
  )
}

function TierBadge({ pair, tier, norm, rows, mode, qWeights }) {
  const t = TIER_STYLE[tier] || TIER_STYLE[4]
  const tip = tierTooltip(pair, tier, norm, rows, mode, qWeights)
  return (
    <Tooltip text={tip} width={320}>
      <span className="text-xs px-2 py-0.5 cursor-help" style={{ background: t.bg, color: t.fg, fontWeight: 500 }}>{t.label}</span>
    </Tooltip>
  )
}

function Stat({ label, value, sub }) {
  return (
    <div style={{ background: '#fafaf9', padding: '10px 12px' }}>
      <p className="text-xs mb-0.5" style={{ color: '#6f6d67', fontWeight: 400, minHeight: 32 }}>{label}</p>
      <p style={{ color: '#141310', fontWeight: 500, fontSize: 18 }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: '#6f6d67', fontWeight: 400 }}>{sub}</p>}
    </div>
  )
}

function WhyBreakdown({ scored, weights, pairLabel }) {
  const [open, setOpen] = useState(false)
  const active = AXES.filter(a => (weights[a.key] || 0) > 0)
  const totalW = active.reduce((s, a) => s + weights[a.key], 0) || 1
  const parts = active.map(a => {
    const norm = scored.norm[a.key] ?? 0
    const contrib = weights[a.key] * norm / totalW
    return { key: a.key, label: a.label, weight: weights[a.key], norm, share: scored.composite > 0 ? contrib / scored.composite : 0 }
  }).sort((x, y) => y.share - x.share)
  return (
    <div className="bg-white mb-4" style={{ border: '1px solid #e5e4e2', padding: '14px 18px' }}>
      <button onClick={() => setOpen(o => !o)} className="flex items-center justify-between w-full">
        <span className="uppercase" style={{ color: '#8B1A1A', fontSize: 10, letterSpacing: '0.08em', fontWeight: 500 }}>Why this ranks here</span>
        <span className="text-xs" style={{ color: '#6f6d67', fontWeight: 400 }}>{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="mt-3">
          <p className="text-xs mb-3" style={{ color: '#6f6d67', fontWeight: 400 }}>
            Under your current weights, {pairLabel}'s score is each axis's weight times how well this pair does on that
            axis relative to the other pairs. Bars show each axis's share of the total; axes at weight zero are omitted.
          </p>
          {parts.map(p => (
            <div key={p.key} className="flex items-center gap-3 mb-2">
              <span className="text-xs" style={{ color: '#141310', fontWeight: 400, width: 148, flexShrink: 0 }}>{p.label}</span>
              <div className="flex-1 h-2" style={{ background: '#f0efec', minWidth: 40 }}>
                <div style={{ width: `${Math.round(p.share * 100)}%`, height: '100%', background: '#8B1A1A' }} />
              </div>
              <span className="text-xs text-right" style={{ color: '#52504a', fontWeight: 500, width: 36, flexShrink: 0 }}>{Math.round(p.share * 100)}%</span>
              <span className="text-xs" style={{ color: '#b3b1ab', fontWeight: 400, width: 74, flexShrink: 0 }}>×{p.weight}, {p.norm >= 0.8 ? 'top' : p.norm >= 0.5 ? 'mid' : 'low'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function QualityDims({ qWeights, onChange }) {
  const [open, setOpen] = useState(false)
  const anyChanged = QUALITY_DIMS.some(d => qWeights[d.key] !== d.def)
  return (
    <div className="mb-4" style={{ marginTop: -6 }}>
      <button onClick={() => setOpen(o => !o)} className="text-xs" style={{ color: '#8B1A1A', fontWeight: 400 }}>
        {open ? '▾' : '▸'} Customize measurement properties{!open && anyChanged ? ' (edited)' : ''}
      </button>
      {open && (
        <div className="mt-2 pl-3" style={{ borderLeft: '2px solid #f0efec' }}>
          <p className="text-xs mb-1" style={{ color: '#6f6d67', fontWeight: 400 }}>
            Weight each property that feeds the combined measurement score (0 to 3); the pair is scored as the average of its two platforms on each.
          </p>
          {['Intrinsic', 'Maturity'].map(group => (
            <div key={group}>
              <p className="uppercase mt-2 mb-1" style={{ color: '#a8a69d', fontSize: 10, letterSpacing: '0.05em', fontWeight: 500 }}>
                {group === 'Intrinsic' ? 'Intrinsic (measurement)' : 'Maturity (adoption, off by default)'}
              </p>
              {QUALITY_DIMS.filter(d => d.group === group).map(d => (
                <div key={d.key} className="flex items-center gap-2 mb-1.5">
                  <label className="text-xs" style={{ color: '#141310', fontWeight: 400, width: 96, flexShrink: 0 }}>{d.label}</label>
                  <input type="range" min={0} max={3} step={0.5} value={qWeights[d.key]}
                    onChange={e => onChange(d.key, parseFloat(e.target.value))}
                    className="flex-1 h-1.5 appearance-none cursor-pointer" style={{ accentColor: '#8B1A1A' }} />
                  <span className="text-xs text-right" style={{ color: qWeights[d.key] > 0 ? '#8B1A1A' : '#b3b1ab', fontWeight: 500, width: 22, flexShrink: 0 }}>{qWeights[d.key].toFixed(1)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Same picker pattern as Help Me Choose's PathwaySearchInput, restyled to Combine's own
// accent. Unlike Choose, selecting a pathway here populates no scoring input - it only
// unlocks the coverage overlay and sort toggle below, so there is no gene list to expand
// or edit, and no "detach" concept; select/clear is the whole interaction.
function PathwaySearchInput({ activePathway, onSelectPathway, onClearPathway }) {
  const [pathways, setPathways] = useState(null) // null = not yet fetched
  const [loading,  setLoading]  = useState(false)
  const [query,    setQuery]    = useState('')
  const [open,     setOpen]     = useState(false)

  const ensureLoaded = () => {
    if (pathways !== null || loading) return
    setLoading(true)
    fetch('/pathways/reactome_pathways.json')
      .then(r => r.json())
      .then(data => setPathways(data.pathways || []))
      .catch(() => setPathways([]))
      .finally(() => setLoading(false))
  }

  const suggestions = useMemo(() => {
    if (!pathways || !query || query.length < 2) return []
    const q = query.toLowerCase()
    return pathways.filter(p => p.name.toLowerCase().includes(q)).slice(0, 8)
  }, [pathways, query])

  const handleSelect = (pathway) => {
    onSelectPathway({ id: pathway.id, name: pathway.name, n: pathway.n })
    setQuery('')
    setOpen(false)
  }

  if (activePathway) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs"
        style={{ background: 'rgba(139,26,26,0.08)', color: '#8B1A1A', fontWeight: 400, border: '1px solid rgba(139,26,26,0.2)' }}>
        Pathway: {activePathway.name} ({activePathway.n} genes)
        <button onClick={onClearPathway}
          className="ml-0.5 leading-none hover:opacity-60" style={{ fontSize: 14, lineHeight: 1 }}>×</button>
      </span>
    )
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        placeholder={loading ? 'Loading pathways…' : 'Search Reactome pathway (e.g. Complement cascade)…'}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => { ensureLoaded(); setOpen(true) }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full text-sm px-3 py-2 border outline-none"
        style={{ borderColor: '#e5e4e2', color: '#141310', fontWeight: 400 }}
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border overflow-hidden overflow-y-auto"
          style={{ borderColor: '#e5e4e2', maxHeight: 260 }}>
          {suggestions.map(p => (
            <button key={p.id}
              onMouseDown={() => handleSelect(p)}
              className="w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between gap-3"
              style={{ color: '#141310', fontWeight: 400 }}
              onMouseEnter={e => e.currentTarget.style.background = '#fafaf9'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <span className="min-w-0 truncate">{p.name}</span>
              <span className="text-xs flex-shrink-0" style={{ color: '#6f6d67' }}>{p.n} genes</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PriorityPicker({ selected, onToggle }) {
  const full = selected.length >= MAX_PRIORITIES
  return (
    <div>
      {PRIORITY_GROUPS.map(group => (
        <div key={group} className="mb-2.5">
          <p className="uppercase mb-1.5" style={{ color: '#a8a69d', fontSize: 10, letterSpacing: '0.05em', fontWeight: 500 }}>{group}</p>
          <div className="flex flex-wrap gap-1.5">
            {PRIORITIES.filter(p => p.group === group).map(p => {
              const active = selected.includes(p.key)
              const disabled = full && !active
              return (
                <button key={p.key} onClick={() => onToggle(p.key)} disabled={disabled}
                  className="px-3 py-2 text-sm border transition-all"
                  style={{ background: active ? '#8B1A1A' : '#ffffff', color: active ? '#fff' : disabled ? '#c9c7c0' : '#52504a', borderColor: active ? '#8B1A1A' : '#e5e4e2', cursor: disabled ? 'default' : 'pointer', fontWeight: 400 }}>
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function AdvancedWeights({ weights, qWeights, setW, setQW }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-3" style={{ borderTop: '1px solid #f0efec', paddingTop: 12 }}>
      <button onClick={() => setOpen(o => !o)} className="text-sm flex items-center gap-1.5" style={{ color: '#8B1A1A', fontWeight: 500 }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
          <polyline points="9 6 15 12 9 18" />
        </svg>
        Advanced: fine-tune weights
      </button>
      {open && (
        <div className="mt-3">
          <p className="text-xs mb-3" style={{ color: '#6f6d67', fontWeight: 400 }}>
            Your priorities set these weights; adjust any directly. Changing a priority above resets them.
          </p>
          {AXES.filter(a => !a.hidden).map(a => (
            <div key={a.key}>
              <WeightSlider axis={a} value={weights[a.key]} onChange={setW} />
              {a.key === 'quality' && <QualityDims qWeights={qWeights} onChange={setQW} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
export default function HelpMeCombine() {
  const [mode, setMode] = useState(null)              // null (landing) | 'anchor' | 'discovery'
  const [anchor, setAnchor] = useState('')
  const [covMode, setCovMode] = useState(null)
  const [priorities, setPriorities] = useState([])
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS)
  const [qWeights, setQWeights] = useState(DEFAULT_QWEIGHTS)
  const [activePathway, setActivePathway] = useState(null) // {id, name, n} | null
  const [pathwayCoverage, setPathwayCoverage] = useState(null)
  const [sortByPathway, setSortByPathway] = useState(false) // false = composite (scored), true = pathway coverage (view only)

  // pathway_coverage.json (0.62 MB) fetched only once a pathway is actually selected, same
  // lazy-loading discipline as Help Me Choose - never affects first paint.
  useEffect(() => {
    if (activePathway && !pathwayCoverage) {
      fetch('/pathways/pathway_coverage.json').then(r => r.json()).then(setPathwayCoverage).catch(() => {})
    }
  }, [activePathway, pathwayCoverage])

  const handleSelectPathway = (pathway) => setActivePathway(pathway)
  const handleClearPathway  = () => { setActivePathway(null); setSortByPathway(false) }

  const setW = (k, v) => setWeights(w => ({ ...w, [k]: v }))
  const setQW = (k, v) => setQWeights(w => ({ ...w, [k]: v }))
  const togglePriority = (key) => {
    const next = priorities.includes(key)
      ? priorities.filter(k => k !== key)
      : (priorities.length < MAX_PRIORITIES ? [...priorities, key] : priorities)
    setPriorities(next)
    const { w, q } = derive(next)
    setWeights(w); setQWeights(q)
  }
  const resetW = () => { setPriorities([]); const { w, q } = derive([]); setWeights(w); setQWeights(q) }

  const modeObj = MODES.find(m => m.key === covMode)
  const isPTM = covMode === 'ptm_proteoforms'
  const modeReady = mode === 'discovery' || (mode === 'anchor' && !!anchor)
  const showResults = modeReady && !!covMode && priorities.length >= 1
  const setupSteps = [
    { label: 'Where are you starting?', done: !!mode, val: mode === 'anchor' ? 'I have a platform' : mode === 'discovery' ? 'No platform yet' : null, icon: STEP_ICON.start },
    ...(mode === 'anchor' ? [{ label: 'Your first platform', done: !!anchor, val: anchor || null, icon: STEP_ICON.anchor }] : []),
    { label: 'What is your coverage denominator (targets, biomarkers, PTMs, all proteins)?', done: !!covMode, val: covMode ? (MODES.find(m => m.key === covMode)?.label || null) : null, icon: STEP_ICON.coverage },
    { label: 'What are your top priorities (specificity, cost, absolute quant, etc.)?', done: priorities.length >= 1, val: priorities.length ? `${priorities.length} of ${MAX_PRIORITIES} selected` : null, icon: STEP_ICON.priorities },
  ]

  const scored = useMemo(() => (covMode ? scorePairs(covMode, weights, qWeights) : []), [covMode, weights, qWeights])

  // filter + sort by live composite (default) or, once a pathway is active, optionally by
  // its precomputed pair coverage instead - a re-sort of the same rows, never a rescoring:
  // pathwayCoveragePct rides along on each row but never enters `composite`.
  const rows = useMemo(() => {
    let list = scored
    if (mode === 'anchor') list = list.filter(s => s.pair.a === anchor || s.pair.b === anchor)
    list = list.map(s => ({
      ...s,
      pathwayCoveragePct: activePathway && pathwayCoverage
        ? pathwayPairCoverage(pathwayCoverage, activePathway.id, s.pair)
        : null,
    }))
    const byPathway = sortByPathway && activePathway && pathwayCoverage
    return [...list].sort((a, b) => byPathway
      ? (b.pathwayCoveragePct ?? -1) - (a.pathwayCoveragePct ?? -1)
      : b.composite - a.composite)
  }, [scored, mode, anchor, activePathway, pathwayCoverage, sortByPathway])

  const anchorSlug = SLUG_BY_DISPLAY[anchor]
  const anchorSolo = mode === 'anchor' && anchorSlug && covMode && !isPTM
    ? (covMode === 'drug_targets' ? ANCHORS[anchor]?.anchor_solo_pct : cov(anchorSlug, covMode))
    : null
  const singleSuffices = anchorSolo != null && anchorSolo >= 60

  const partnerOf = pair => (pair.a === anchor ? pair.b : pair.a)
  const top = rows[0]

  // Co-leaders: consecutive top pairs that are a coverage tie with the leader
  // (CI overlap in drug-target mode, the only mode with a computed CI; within 2pp
  // elsewhere). When 2+, we present them as co-leading rather than crowning one on
  // a tie-breaker.
  const coLeaders = useMemo(() => {
    if (!showResults || !rows.length) return []
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
  }, [rows, covMode, showResults])

  // Automatic record that a recommendation was shown, fired once the first time
  // results become viewable (results update live as inputs change, unlike Help Me
  // Choose's discrete steps, so this captures state at first-viewable rather than a
  // "final submit" that doesn't exist here). Logs what was asked (mode, coverage
  // denominator, priorities, weights) and what was recommended, plus coarse IP
  // geolocation. Disclosed in the note above the results, not hidden. Help Me
  // Combine has no identity-collecting step to keep separate from this in the first
  // place. If this fails or is blocked, it never affects what the user sees.
  const loggedRef = useRef(false)
  useEffect(() => {
    if (!showResults || loggedRef.current) return
    loggedRef.current = true
    const tied = coLeaders.length >= 2
    const logTop = !isPTM ? (tied ? coLeaders[0] : top) : null
    fetch('/api/log-combine-recommendation', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        anchorPlatform:  mode === 'anchor' ? anchor : null,
        coverageMode:    covMode,
        priorities,
        topPairA:        logTop ? logTop.pair.a : null,
        topPairB:        logTop ? logTop.pair.b : null,
        topPairTier:     logTop ? logTop.pair.tier : null,
        compositePct:    logTop ? Math.round(logTop.composite * 100) : null,
        isCoLeading:     tied,
        coLeadingPairs:  tied ? coLeaders.map(c => `${c.pair.a} + ${c.pair.b}`) : null,
        weights,
        qWeights,
      }),
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResults])

  return (
    <div>
      {/* Header */}
      <h2 className="text-lg mb-1" style={{ color: '#141310', fontWeight: 400 }}>Help Me Combine</h2>
      <p className="text-sm mb-5" style={{ color: '#52504a', fontWeight: 400 }}>
        As population-scale plasma proteomics matures and the measurement landscape diversifies, investigators may wish to employ more than one technology to widen biological coverage. This tool ranks how well two platforms work together, either by suggesting the best second platform to add to one you already have, or by recommending the strongest pair from scratch. Tell us your top priorities and the ranking follows them; no single factor is privileged by default.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Controls ── */}
        <div className="lg:col-span-2">
          <div className="bg-white" style={{ border: '1px solid #e5e4e2', padding: '18px 18px 8px' }}>
            <Section label="Where are you starting?">
              <Segmented stacked value={mode} onChange={setMode} options={[
                { value: 'anchor', label: 'I already know my first platform', tip: MODE_TIPS.anchor },
                { value: 'discovery', label: "I haven't decided on either platform yet", tip: MODE_TIPS.discovery },
              ]} />
            </Section>

            {mode === 'anchor' && (
              <Section label="Your first platform">
                <select value={anchor} onChange={e => setAnchor(e.target.value)}
                  className="w-full text-sm px-3 py-2" style={{ border: '1px solid #e5e4e2', color: anchor ? '#141310' : '#6f6d67', background: '#fff' }}>
                  <option value="" disabled>Choose a platform...</option>
                  {ANCHOR_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </Section>
            )}

            <Section label="Coverage denominator" subtitle="Which reference set to measure coverage against; this changes what 'coverage' means for every pair below.">
              <Segmented value={covMode} onChange={setCovMode}
                options={MODES.map(m => ({ value: m.key, label: m.label, tip: COVERAGE_TIPS[m.key] }))} />
              {modeObj?.denominator && (
                <p className="text-xs mt-1.5" style={{ color: '#6f6d67', fontWeight: 400 }}>{modeObj.denominator.toLocaleString()} targets in this universe.</p>
              )}
            </Section>

            <div className="flex items-center justify-between mb-2">
              <p className="uppercase" style={{ color: '#8B1A1A', fontSize: 10, letterSpacing: '0.08em', fontWeight: 500 }}>What matters most? Pick up to {MAX_PRIORITIES}</p>
              <button onClick={resetW} className="text-xs" style={{ color: '#6f6d67', fontWeight: 400 }}>Reset</button>
            </div>
            <PriorityPicker selected={priorities} onToggle={togglePriority} />
            <AdvancedWeights weights={weights} qWeights={qWeights} setW={setW} setQW={setQW} />

            <div className="mt-4" style={{ borderTop: '1px solid #f0efec', paddingTop: 14 }}>
              <Section label="Pathway filter (optional)" subtitle="See how much of a specific Reactome pathway each pair covers, shown alongside your ranking. This is a reference view, not a new priority: it never changes any pair's composite score.">
                <PathwaySearchInput
                  activePathway={activePathway}
                  onSelectPathway={handleSelectPathway}
                  onClearPathway={handleClearPathway}
                />
              </Section>
            </div>
          </div>
          <p className="text-xs mt-2" style={{ color: '#b3b1ab', fontWeight: 400 }}>
            Tiers reflect robustness across many weightings; the score below reflects your current weights.
          </p>
        </div>

        {/* ── Results ── */}
        <div className="lg:col-span-3">
          {showResults && (
            <p className="text-xs mb-3" style={{ color: '#6f6d67', fontWeight: 400 }}>
              We log anonymized usage data, including your approximate location and the choices on the left, to improve this tool.
            </p>
          )}
          {!showResults ? (
            <div className="bg-white" style={{ border: '1px dashed #d5d5d0', padding: '18px', minHeight: 260 }}>
              <p className="uppercase mb-2.5" style={{ color: '#8B1A1A', fontSize: 10, letterSpacing: '0.08em', fontWeight: 500 }}>Your Result</p>
              <p className="text-sm mb-1" style={{ color: '#141310', fontWeight: 500 }}>A few choices, then your recommendation</p>
              <p className="text-sm mb-5" style={{ color: '#6f6d67', fontWeight: 400 }}>Make each selection on the left. The recommendation appears only once all of them are set, so nothing is pre-decided for you.</p>
              <div className="space-y-2">
                {setupSteps.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5" style={{ background: s.done ? 'rgba(128,171,122,0.08)' : '#f7f6f4', borderRadius: 6 }}>
                    <span style={{
                      width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      background: s.done ? '#80AB7A' : '#ffffff',
                      border: s.done ? 'none' : '1.5px solid #d0cfcc',
                      color: s.done ? '#fff' : '#8B1A1A',
                    }}>
                      {s.done ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : s.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[15px]" style={{ color: s.done ? '#141310' : '#52504a', fontWeight: 500 }}>{i + 1}. {s.label}</span>
                      {s.val && <span className="block text-xs mt-0.5" style={{ color: '#6f6d67', fontWeight: 400 }}>{s.val}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : isPTM ? (
            <div className="bg-white" style={{ border: '1px solid #e5e4e2', padding: '18px' }}>
              <p className="uppercase mb-2.5" style={{ color: '#8B1A1A', fontSize: 10, letterSpacing: '0.08em', fontWeight: 500 }}>Your Result</p>
              <p className="text-sm mb-3" style={{ color: '#141310', fontWeight: 500 }}>PTMs and proteoforms are mass-spec only</p>
              <p className="text-sm mb-4" style={{ color: '#52504a', fontWeight: 400 }}>
                Affinity panels cannot resolve post-translational modifications or proteoforms. A mass-spec run can be re-mined for them, so any pair that includes a mass-spectrometry platform (Seer Proteograph XT or Biognosys TrueDiscovery) carries this capability. This is a capability flag, not a coverage percentage.
              </p>
              <div className="space-y-1.5">
                {rows.map(({ pair }) => (
                  <div key={pair.a + pair.b} className="flex items-center justify-between text-sm px-3 py-2" style={{ background: '#fafaf9' }}>
                    <span style={{ color: '#141310', fontWeight: 400 }}>{pair.a} + {pair.b}</span>
                    <span style={{ color: pairPTM(pair) ? '#4F6B4A' : '#b3b1ab', fontWeight: 500 }}>{pairPTM(pair) ? 'PTM capable' : 'no PTM'}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Headline */}
              {coLeaders.length >= 2 ? (
                <div className="bg-white mb-4" style={{ borderTop: '2px solid #8B1A1A', borderRight: '1px solid #e5e4e2', borderBottom: '1px solid #e5e4e2', borderLeft: '1px solid #e5e4e2', padding: '18px' }}>
                  <p className="uppercase mb-2.5" style={{ color: '#8B1A1A', fontSize: 10, letterSpacing: '0.08em', fontWeight: 500 }}>Your Result</p>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="text-xs px-2 py-0.5" style={{ background: 'rgba(124,134,168,0.14)', color: '#4A5373', fontWeight: 500 }}>Co-leading, statistical tie</span>
                    <span className="text-xs" style={{ color: '#6f6d67', fontWeight: 400 }}>{mode === 'anchor' ? `Best partners for ${anchor}` : 'Best overall pairs'}</span>
                  </div>
                  <p className="mb-2" style={{ color: '#141310', fontWeight: 500, fontSize: 20 }}>
                    {mode === 'anchor'
                      ? `${anchor} + ${coLeaders.map(c => partnerOf(c.pair)).join(' or ')}`
                      : coLeaders.map(c => `${c.pair.a} + ${c.pair.b}`).join('  or  ')}
                  </p>
                  <p className="text-sm mb-4" style={{ color: '#52504a', fontWeight: 400 }}>
                    These are a coverage tie in this mode; their confidence intervals overlap, so neither clearly wins. They separate only on the tie-breakers below, so choose on your priority.
                  </p>
                  <div>
                    {coLeaders.map(({ pair, composite, pathwayCoveragePct }) => (
                      <div key={pair.a + pair.b} className="flex items-center gap-x-4 gap-y-1 flex-wrap py-2" style={{ borderTop: '1px solid #f0efec' }}>
                        <span className="text-sm" style={{ color: '#141310', fontWeight: 500, minWidth: 150 }}>{mode === 'anchor' ? partnerOf(pair) : `${pair.a} + ${pair.b}`}</span>
                        <span className="text-xs" style={{ color: '#8B1A1A', fontWeight: 500 }}>{Math.round(composite * 100)}% score (your weights)</span>
                        <span className="text-xs" style={{ color: '#52504a', fontWeight: 400 }}>{pairCoverage(pair, covMode)}% coverage</span>
                        <span className="text-xs" style={{ color: '#52504a', fontWeight: 400 }}>+{pair.net_new_targets} net-new</span>
                        <span className="text-xs" style={{ color: '#52504a', fontWeight: 400 }}>{pair.joint_volume_uL} µL</span>
                        <span className="text-xs" style={{ color: pairPTM(pair) ? '#4F6B4A' : '#b3b1ab', fontWeight: 400 }}>{pairPTM(pair) ? 'PTM capable' : 'no PTMs'}</span>
                        {activePathway && pathwayCoveragePct != null && (
                          <span className="text-xs" style={{ color: '#52504a', fontWeight: 400 }}>{pathwayCoveragePct.toFixed(1)}% of {activePathway.name}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : top ? (
                <div className="bg-white mb-4" style={{ borderTop: '2px solid #8B1A1A', borderRight: '1px solid #e5e4e2', borderBottom: '1px solid #e5e4e2', borderLeft: '1px solid #e5e4e2', padding: '18px' }}>
                  <p className="uppercase mb-2.5" style={{ color: '#8B1A1A', fontSize: 10, letterSpacing: '0.08em', fontWeight: 500 }}>Your Result</p>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <TierBadge pair={top.pair} tier={top.pair.tier} norm={top.norm} rows={rows} mode={covMode} qWeights={qWeights} />
                    <span className="text-xs" style={{ color: '#6f6d67', fontWeight: 400 }}>
                      {mode === 'anchor' ? `Best partner for ${anchor}` : 'Best overall pair'}
                    </span>
                  </div>
                  <p className="mb-2" style={{ color: '#141310', fontWeight: 500, fontSize: 20 }}>
                    {mode === 'anchor' ? `${anchor} + ${partnerOf(top.pair)}` : `${top.pair.a} + ${top.pair.b}`}
                  </p>
                  {activePathway && top.pathwayCoveragePct != null && (
                    <span className="text-xs px-2 py-0.5 inline-block mb-3" style={{
                      background: top.pathwayCoveragePct >= 99.95 ? '#dcfce7' : top.pathwayCoveragePct === 0 ? '#fef2f2' : '#fef9c3',
                      color: top.pathwayCoveragePct >= 99.95 ? '#166534' : top.pathwayCoveragePct === 0 ? '#b91c1c' : '#854d0e',
                      fontWeight: 400,
                    }}>
                      Pathway coverage: {top.pathwayCoveragePct.toFixed(1)}% of {activePathway.name}
                    </span>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <Stat label="Composite score (your weights)"
                      value={`${Math.round(top.composite * 100)}%`}
                      sub="Blends all weighted axes below" />
                    <Stat label="Coverage"
                      value={`${pairCoverage(top.pair, covMode)}%`}
                      sub={covMode === 'drug_targets' ? `CI ${top.pair.coverage_ci_lo}-${top.pair.coverage_ci_hi}` : modeObj.label} />
                    {mode === 'anchor'
                      ? <Stat label="Gain over anchor alone" value={`+${(pairCoverage(top.pair, covMode) - anchorSolo).toFixed(1)}pp`} sub={`${anchor} alone ${anchorSolo}%`} />
                      : <Stat label="Net-new targets" value={top.pair.net_new_targets} sub={`${pairNetNew(top.pair, covMode)}% of universe`} />}
                    <Stat label="Combined measurement score (your weights)" value={`${customQuality(top.pair, qWeights).toFixed(1)}/5`} />
                    <Stat label="Joint volume" value={`${top.pair.joint_volume_uL} µL`} sub={top.pair.joint_volume_uL > 200 ? 'exceeds ~200 µL aliquot' : ''} />
                  </div>
                  {singleSuffices && (
                    <p className="text-sm mt-3" style={{ color: '#8C6E1F', fontWeight: 400 }}>
                      {anchor} alone already covers {anchorSolo}% in this mode, so a second platform may add limited marginal value. Weigh the gain above against the added cost.
                    </p>
                  )}
                  {pairPTM(top.pair) && (
                    <p className="text-xs mt-2" style={{ color: '#6f6d67', fontWeight: 400 }}>
                      Includes mass spectrometry: this pair can also be re-mined for PTMs and proteoforms.
                    </p>
                  )}
                </div>
              ) : null}

              {top && (
                <WhyBreakdown scored={top} weights={weights}
                  pairLabel={mode === 'anchor' ? `${anchor} + ${partnerOf(top.pair)}` : `${top.pair.a} + ${top.pair.b}`} />
              )}

              {/* Ranked list */}
              <div className="bg-white" style={{ border: '1px solid #e5e4e2', padding: '14px 18px' }}>
                <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                  <p className="uppercase" style={{ color: '#8B1A1A', fontSize: 10, letterSpacing: '0.08em', fontWeight: 500 }}>
                    {mode === 'anchor' ? `Partners for ${anchor}` : 'All pairs'}
                  </p>
                  {activePathway && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <button onClick={() => setSortByPathway(false)}
                        className="px-2 py-1 border transition-all"
                        style={{ background: !sortByPathway ? '#8B1A1A' : '#fff', color: !sortByPathway ? '#fff' : '#6f6d67', borderColor: !sortByPathway ? '#8B1A1A' : '#e5e4e2', fontWeight: 400 }}>
                        Ranked by composite
                      </button>
                      <button onClick={() => setSortByPathway(true)}
                        className="px-2 py-1 border transition-all"
                        style={{ background: sortByPathway ? '#8B1A1A' : '#fff', color: sortByPathway ? '#fff' : '#6f6d67', borderColor: sortByPathway ? '#8B1A1A' : '#e5e4e2', fontWeight: 400 }}>
                        Ranked by pathway coverage
                      </button>
                    </div>
                  )}
                </div>
                {activePathway && (
                  <p className="text-xs mb-3" style={{ color: '#6f6d67', fontWeight: 400 }}>
                    Pathway coverage of <strong>{activePathway.name}</strong> ({activePathway.n} genes) is shown for reference: it is not one of the seven scored axes and never changes a pair's composite score. The toggle above re-orders the list below; it does not rescore it.
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs pb-1.5 mb-1" style={{ borderBottom: '1px solid #e5e4e2' }}>
                  <span className="w-4 flex-shrink-0" />
                  <span className="flex-1 min-w-0" />
                  <span className="w-14 flex-shrink-0 text-right" style={{ color: '#b3b1ab', fontWeight: 400 }}>Coverage</span>
                  <span className="w-10 flex-shrink-0 text-right" style={{ color: '#b3b1ab', fontWeight: 400 }}>Score</span>
                  {activePathway && <span className="w-14 flex-shrink-0 text-right" style={{ color: '#b3b1ab', fontWeight: 400 }}>Pathway</span>}
                  <span className="w-20 flex-shrink-0" />
                  <span className="hidden sm:inline flex-shrink-0" style={{ width: 108 }} />
                </div>
                <div className="space-y-2">
                  {rows.map(({ pair, composite, norm, pathwayCoveragePct }, i) => {
                    const cvg = pairCoverage(pair, covMode)
                    const pairName = mode === 'anchor' ? partnerOf(pair) : `${pair.a} + ${pair.b}`
                    return (
                      <div key={pair.a + pair.b} className="flex items-center gap-3 text-sm py-1.5" style={{ borderBottom: i < rows.length - 1 ? '1px solid #f0efec' : 'none' }}>
                        <span className="w-4 flex-shrink-0 text-xs" style={{ color: '#b3b1ab', fontWeight: 500 }}>{i + 1}</span>
                        <span className="flex-1 min-w-0" title={pairName}
                          style={{ color: '#141310', fontWeight: 400, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          {pairName}
                        </span>
                        <span className="w-14 flex-shrink-0 text-right text-xs" style={{ color: '#52504a', fontWeight: 400 }}>{cvg}%</span>
                        <span className="w-10 flex-shrink-0 text-right text-xs" style={{ color: '#8B1A1A', fontWeight: 500 }}>{Math.round(composite * 100)}%</span>
                        {activePathway && (
                          <span className="w-14 flex-shrink-0 text-right text-xs" style={{ color: pathwayCoveragePct != null ? '#52504a' : '#c9c7c0', fontWeight: 400 }}>
                            {pathwayCoveragePct != null ? `${pathwayCoveragePct.toFixed(1)}%` : '—'}
                          </span>
                        )}
                        <div className="w-20 flex-shrink-0 h-1.5" style={{ background: '#f0efec' }}>
                          <div style={{ width: `${Math.round(composite * 100)}%`, height: '100%', background: '#8B1A1A' }} />
                        </div>
                        <span className="hidden sm:inline flex-shrink-0" style={{ width: 108 }}><TierBadge pair={pair} tier={pair.tier} norm={norm} rows={rows} mode={covMode} qWeights={qWeights} /></span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Honest-limits */}
              <p className="text-xs mt-4" style={{ color: '#b3b1ab', fontWeight: 400 }}>
                No pair is universally best; the ranking depends on your weights. Coverage counts are list membership and over-count usable coverage. Combined measurement score and cost are ordinal expert estimates. Treat this as a transparent, re-weightable decision aid, not a verdict.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Reproducibility pointer */}
      <section className="mt-8 pt-5 flex items-start justify-between gap-4 flex-wrap" style={{ borderTop: '1px solid #e5e4e2' }}>
        <div>
          <h3 className="text-base mb-1" style={{ color: '#141310', fontWeight: 500 }}>Reproducibility: data and code</h3>
          <p className="text-sm" style={{ color: '#52504a', fontWeight: 400, lineHeight: 1.6, maxWidth: '44rem' }}>
            The scoring engine specification, a self-contained sweep script, and both sweep outputs behind the
            fairness analysis above are downloadable from the Reproducibility tab.
          </p>
        </div>
        <a href="#reproducibility"
          className="flex-shrink-0 px-4 py-2.5 text-sm border hover:opacity-90 transition-all"
          style={{ background: '#8B1A1A', color: '#fff', borderColor: '#8B1A1A', fontWeight: 400 }}>
          Open Reproducibility →
        </a>
      </section>
    </div>
  )
}
