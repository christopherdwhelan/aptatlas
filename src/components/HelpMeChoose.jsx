import { useState, useMemo, useEffect, useRef } from 'react'
import platforms from '../data/platforms.json'
import scoring from '../data/scoring.json'

// ── Constants ──────────────────────────────────────────────────────────────────

const GOAL_OPTIONS = [
  { id: 'drug_target',        label: 'Drug target identification',              desc: 'Broad coverage with mechanistic resolution' },
  { id: 'discovery',          label: 'Biomarker discovery',                     desc: 'Identify novel protein associations at scale' },
  { id: 'disease_char',       label: 'Disease characterization and sub-typing', desc: 'Profile protein signatures across disease states' },
  { id: 'validation',         label: 'Biomarker validation & clinical translation', desc: 'Confirm targets with high precision and specificity' },
  { id: 'pharmacoproteomics', label: 'Pharmacoproteomics (clinical trials)',    desc: 'Drug effect monitoring requiring high reproducibility' },
  { id: 'population',         label: 'Population proteomics (large biobanks)', desc: 'Tens of thousands of samples, cost-controlled' },
]

const SAMPLE_OPTIONS = [
  { id: 'plasma',       label: 'Plasma',          desc: 'Most widely validated matrix' },
  { id: 'serum',        label: 'Serum',            desc: 'Compatible with most platforms' },
  { id: 'csf',          label: 'CSF',              desc: 'Less validated; favors sensitive platforms' },
  { id: 'tissue',       label: 'Tissue',           desc: 'Requires digestion; MS platforms preferred' },
  { id: 'cell_culture', label: 'Cell culture / screening', desc: 'Cell lines, perturb-seq, drug screening' },
  { id: 'multiple',     label: 'Multiple types',   desc: 'Work across multiple sample matrices' },
]

const SIZE_OPTIONS = [
  { id: 'small',  label: '<100',        sub: 'Pilot study' },
  { id: 'medium', label: '100–1,000',   sub: 'Exploratory cohort' },
  { id: 'large',  label: '1,000–10,000', sub: 'Large cohort' },
  { id: 'xlarge', label: '>10,000',     sub: 'Population-scale' },
]

const SLIDER_DEFS = [
  { id: 'cost',        label: 'Cost sensitivity',                   dimId: 'cost_efficiency',
    hint: 'How much should per-sample cost constrain the choice?',
    subhint: 'Cost scores are commercial price bands at volume (1,000+ samples): 5 = under ~$75; 4 = ~$75-250; 3 = ~$250-1,000; 2 = ~$1,000-3,000; 1 = above ~$3,000. Band edges are approximate; smaller studies should expect higher prices on every platform.',
    low: 'Not a constraint', high: 'Major factor' },
  { id: 'coverage',    label: 'Proteome coverage breadth',           dimId: 'proteome_coverage',
    hint: 'How important is measuring a large number of proteins?',
    low: 'Focused panel is fine', high: 'Maximum coverage needed' },
  { id: 'precision',   label: 'Measurement precision',               dimId: 'precision',
    hint: 'How critical is low CV and high reproducibility?',
    low: 'Moderate precision OK', high: 'Highest precision required' },
  { id: 'specificity', label: 'Target specificity confidence',       dimId: 'specificity',
    hint: 'How important is confidence that you are measuring the intended protein?',
    low: 'Off-target binding acceptable', high: 'Must be highly specific' },
  { id: 'sensitivity', label: 'Sensitivity for low-abundance proteins', dimId: 'sensitivity',
    hint: 'Do you need to detect pg/mL-range proteins?',
    low: 'Abundant proteins sufficient', high: 'Must detect trace-level proteins' },
  { id: 'throughput',  label: 'Throughput & scale',                  dimId: 'throughput',
    hint: 'How important is high-volume, rapid sample processing?',
    low: 'Batch size not a concern', high: 'Need high-volume automation' },
  { id: 'pqtl',        label: 'pQTL / epitope accuracy',             dimId: 'pqtl_accuracy',
    hint: 'How critical is avoiding antibody-epitope binding artifacts for genetic association or pQTL studies?',
    low: 'Not running pQTL analysis', high: 'Critical for genetic validity' },
]

const PLATFORM_BEST_WHEN = {
  'olink-explore-ht':       'specificity is critical, results need to align with UKB-PPP (54,000+ samples), or strong cis-pQTL validation is required.',
  'illumina-protein-prep':  'maximum proteome breadth (9,500+ proteins) or highest measurement precision are the top priority.',
  'nulisa':                 'detecting ultra-low-abundance proteins is essential, e.g. CNS biomarkers or neuroinflammation markers at attomolar levels.',
  'nomic-omni':             'absolute quantification, low cost per sample, or high throughput are primary drivers, especially for large or serial studies.',
  'seer-proteograph':       'unbiased deep discovery is needed across diverse matrices, pQTL studies requiring zero epitope-binding artifacts, or non-European ancestry cohorts.',
  'biognosys-truediscovery':'validation across the widest range of sample matrices is needed (plasma, tissue, CSF, cell lysates), or when MS-based absolute quantification (TrueSignature) is required.',
}

// ── Scoring Engine ─────────────────────────────────────────────────────────────

// Calibrated scores typically separate the leading platforms by only a point or two,
// so any eligible platform within TIE_BAND points of the top is treated as a
// statistical tie - a co-recommendation rather than a ranked also-ran.
const TIE_BAND = 3

// Platforms that deliver validated absolute quantification in physical concentration units.
// Nomic nELISA reports ELISA-calibrated pg/mL. The other scored products are label-free /
// relative (Olink, Illumina, and Seer Proteograph XT DIA) or semi-quantitative (NULISA).
// Biognosys offers absolute quantification only via its separate TrueSignature targeted-MS
// service, not the scored TrueDiscovery DIA product, so it is not treated as capable here.
// "Absolute quantification required" filters to this set rather than a quality-score
// threshold, so semi-quantitative platforms no longer satisfy a strict absolute requirement.
const ABSOLUTE_QUANT_CAPABLE = new Set(['nomic-omni'])

// Vendors that offer absolute quantification (pg/mL) via a separate product not scored here.
// Surfaced as a note when the scored (relative) product is filtered out by an absolute requirement.
const ABSOLUTE_QUANT_VARIANT_NOTE = {
  'olink-explore-ht':        ' Olink offers absolute quantification (pg/mL) via its custom Flex / Target 48 panels (per-assay calibrators), not the Explore HT product scored here.',
  'nulisa':                  ' Alamar offers absolute quantification (pg/mL) via its NULISAseq AQ panels, not the standard panels scored here.',
  'biognosys-truediscovery': ' Biognosys offers absolute quantification via its separate TrueSignature targeted-MS service, not the TrueDiscovery DIA product scored here.',
}

function computeResults(answers, weights, toggles, proteinTargets, allProteins) {
  const sizeCostBoost  = answers.studySize === 'xlarge' ? 1 : answers.studySize === 'large' ? 0.5 : 0
  const sizeTputBoost  = answers.studySize === 'xlarge' ? 1 : answers.studySize === 'large' ? 0.5 : 0

  const goalAdj = { coverage: 0, precision: 0, specificity: 0, sensitivity: 0, cost: 0, throughput: 0 }
  if (answers.primaryGoal === 'drug_target')        { goalAdj.coverage   += 1; goalAdj.specificity += 1 }
  if (answers.primaryGoal === 'discovery')          { goalAdj.coverage   += 2; goalAdj.throughput  += 1; goalAdj.specificity += 1 }
  if (answers.primaryGoal === 'disease_char')       { goalAdj.coverage   += 1; goalAdj.sensitivity += 1; goalAdj.precision += 1 }
  if (answers.primaryGoal === 'validation')         { goalAdj.precision  += 1; goalAdj.specificity += 1 }
  if (answers.primaryGoal === 'pharmacoproteomics') { goalAdj.precision  += 1; goalAdj.sensitivity += 1 }
  if (answers.primaryGoal === 'population')         { goalAdj.cost       += 1; goalAdj.throughput  += 1; goalAdj.coverage += 1 }

  // CSF boosts sensitivity - ultra-low-abundance detection is what matters in CSF
  const csfSensBoost   = answers.sampleType === 'csf' ? 4 : 0
  // CNS / neuroscience focus - single combined toggle encoding both neuro sensitivity
  // and pTau specificity requirements. Boost magnitudes are expert-assigned by the tool's
  // authors (Whelan & Smith-Byrne; see Methods > Author Contributions), not derived from
  // an external published source.
  // CSF override: stronger boost reflecting clinical pTau measurement context.
  const cnsSensBoost = toggles.cnsFocus === 'yes' ? (answers.sampleType === 'csf' ? 8 : 6) : 0
  const cnsSpecBoost = toggles.cnsFocus === 'yes' ? (answers.sampleType === 'csf' ? 4 : 2) : 0

  // Longitudinal / repeat sampling: precision becomes critical for within-person
  // change detection. Boost applied when user confirms longitudinal design.
  const longPrecBoost = toggles.longitudinal === 'yes' ? 2 : 0

  const eff = {
    cost:        Math.max(0, weights.cost        + sizeCostBoost + goalAdj.cost),
    coverage:    Math.max(0, weights.coverage    + goalAdj.coverage),
    precision:   Math.max(0, weights.precision   + goalAdj.precision + longPrecBoost),
    specificity: Math.max(0, weights.specificity + goalAdj.specificity + cnsSpecBoost),
    sensitivity: Math.max(0, weights.sensitivity + goalAdj.sensitivity + csfSensBoost + cnsSensBoost),
    throughput:  Math.max(0, weights.throughput  + sizeTputBoost  + goalAdj.throughput),
    pqtl:        Math.max(0, weights.pqtl || 1),
  }

  const quantWeight      = toggles.absoluteQuant === 'yes' ? 4 : toggles.absoluteQuant === 'nice' ? 1 : 0
  // Sample-type weight: how much matrix compatibility matters relative to the user's own
  // priority sliders (a fully-maxed slider contributes at most 5 x 5 = 25). Tissue matches
  // cell_culture/multiple at 5 rather than sitting above them uncapped at 8, so it can
  // meaningfully favor a tissue-compatible platform without being able to override every
  // slider priority the user explicitly sets. The platform ranking below (which score gets
  // used for tissue) is unaffected: it reflects real validation differences, not this weight.
  const sampleFlexWeight = answers.sampleType === 'tissue' ? 5 :
                           answers.sampleType === 'cell_culture' ? 5 :
                           answers.sampleType === 'multiple' ? 5 :
                           answers.sampleType === 'csf' ? 3 : 1
  const proteinCoverageWeight = (proteinTargets && proteinTargets.length > 0) ? 6 : 0

  // Matrix-specific sample flexibility overrides for tissue:
  //   1/5 - Nomic, NULISA, Seer XT: not validated for solid tissue at all
  //          (Seer XT nanoparticle corona requires liquid-phase input; Proteograph DIRECT
  //           is the correct Seer product for tissue)
  //   2/5 - Olink, Illumina: validated in tissue homogenates only, not native solid
  //          tissue MS workflows; a step below TrueDiscovery which handles both
  // Cell culture boost:
  //   4/5 - Nomic: extensively validated in perturb-seq / high-throughput cell assays
  function getSampleFlexScore(pid) {
    const base = scoring.scores[pid].sample_flexibility
    if (answers.sampleType === 'tissue') {
      if (pid === 'nulisa' || pid === 'nomic-omni' || pid === 'seer-proteograph') return 1
      if (pid === 'olink-explore-ht' || pid === 'illumina-protein-prep')           return 3
    }
    if (answers.sampleType === 'cell_culture' && pid === 'nomic-omni') return 4
    return base
  }

  function getProteinCoverageScore(pid) {
    if (!proteinTargets || proteinTargets.length === 0 || !allProteins || allProteins.length === 0) return 0
    const covered = proteinTargets.filter(gene =>
      allProteins.some(p => p.gene === gene && Array.isArray(p.platforms) && p.platforms.includes(pid))
    ).length
    return (covered / proteinTargets.length) * 5
  }

  function getHardFilter(pid) {
    const p = platforms.find(x => x.id === pid)
    if (toggles.ptmDetection === 'systematic') return 'ptm_systematic'
    if (toggles.ptmDetection === 'incidental' && !p.ptmCapable) return 'ptm'
    if (toggles.absoluteQuant === 'yes' && !ABSOLUTE_QUANT_CAPABLE.has(pid)) return 'absquant'
    if (proteinTargets && proteinTargets.length >= 3 && getProteinCoverageScore(pid) < 2.5) return 'protein_coverage'
    return null
  }

  // Pass 1: compute raw scores for all platforms
  const rawScores = platforms.map(p => {
    const s = scoring.scores[p.id]

    let rawScore =
        eff.cost        * s.cost_efficiency   +
        eff.coverage    * s.proteome_coverage +
        eff.precision   * s.precision         +
        eff.specificity * s.specificity       +
        eff.sensitivity * s.sensitivity       +
        eff.throughput  * s.throughput        +
        eff.pqtl        * s.pqtl_accuracy     +
        quantWeight           * s.quantification_type +
        sampleFlexWeight      * getSampleFlexScore(p.id) +
        proteinCoverageWeight * getProteinCoverageScore(p.id)

    // Soft priority-miss penalty: if a platform scores 1/5 on any slider dimension
    // the user has personally set to 5, apply a 15% penalty. Gated on the user's raw
    // slider value rather than the context-boosted effective weight, so an automatic
    // goal/size/toggle adjustment can no longer trigger a penalty the user never asked
    // for by pushing an untouched dimension's effective weight over the threshold.
    // Prevents strong scores elsewhere from fully masking a critical weakness on the
    // user's stated top priority. Also fires when the platform has zero published
    // validation for the selected sample type (getSampleFlexScore returns 1 - e.g.
    // Nomic, NULISA, and Seer XT for tissue), so unrelated strength on other
    // dimensions (cost, throughput) can no longer buy back a recommendation for a
    // matrix the platform has never actually been deployed on.
    const PRIORITY_MISS_LABELS = [
      { score: s.cost_efficiency,   w: weights.cost,        label: 'High cost per sample' },
      { score: s.proteome_coverage, w: weights.coverage,    label: 'Limited proteome coverage' },
      { score: s.precision,         w: weights.precision,   label: 'Limited precision / reproducibility' },
      { score: s.specificity,       w: weights.specificity, label: 'Limited target specificity' },
      { score: s.sensitivity,       w: weights.sensitivity, label: 'Limited sensitivity' },
      { score: s.throughput,        w: weights.throughput,  label: 'Limited throughput' },
      { score: s.pqtl_accuracy,     w: eff.pqtl,             label: 'Limited pQTL accuracy' },
    ]
    const priorityWarnings = PRIORITY_MISS_LABELS.filter(d => d.score === 1 && d.w >= 5).map(d => d.label)
    if (getSampleFlexScore(p.id) === 1) priorityWarnings.push('Not validated for this sample type')
    if (priorityWarnings.length > 0) rawScore *= 0.85

    return { id: p.id, rawScore, priorityWarnings }
  })

  // Calibrated scoring, anchored to the full meaningful range for THIS user's weighting:
  // a platform scoring 1/5 on every dimension = 0%, one scoring 5/5 across the board = 100%.
  // This uses the whole scale and reflects true separation, without the range-normalization
  // trick of pinning the leader to 100% and flooring the worst at 40%. Real platforms cluster
  // in the upper-middle; when priorities are evenly weighted they legitimately sit close
  // together, and strong priorities pull them apart.
  const totalWeight =
      eff.cost + eff.coverage + eff.precision + eff.specificity +
      eff.sensitivity + eff.throughput + eff.pqtl +
      quantWeight + sampleFlexWeight + proteinCoverageWeight
  const minPossibleRaw = totalWeight * 1   // every dimension at 1/5
  const maxPossibleRaw = totalWeight * 5   // every dimension at 5/5
  const scoreSpan = (maxPossibleRaw - minPossibleRaw) || 1

  // Pass 2: normalize and build result objects
  const raw = platforms.map((p, i) => {
    const s = scoring.scores[p.id]
    const displayPct = Math.max(0, Math.min(100, Math.round(((rawScores[i].rawScore - minPossibleRaw) / scoreSpan) * 100)))

    const hardFilter = getHardFilter(p.id)
    const priorityWarnings = rawScores[i].priorityWarnings ?? []
    const proteinCoverageCount = (proteinTargets && proteinTargets.length > 0 && allProteins && allProteins.length > 0)
      ? proteinTargets.filter(gene => allProteins.some(pr => pr.gene === gene && Array.isArray(pr.platforms) && pr.platforms.includes(p.id))).length
      : null
    return { platform: p, scores: s, effWeights: eff, displayPct, hardFilter, priorityWarnings, proteinCoverageCount }
  })

  const eligible   = raw.filter(r => !r.hardFilter).sort((a, b) => b.displayPct - a.displayPct)
  const ineligible = raw.filter(r =>  r.hardFilter).sort((a, b) => b.displayPct - a.displayPct)

  // Flag the top tier: every eligible platform within TIE_BAND points of the leader.
  // When more than one qualifies, the result is a co-recommendation, not a single winner.
  const topPct = eligible.length ? eligible[0].displayPct : 0
  eligible.forEach(r => { r.isTopTier = (topPct - r.displayPct) <= TIE_BAND })

  return [...eligible, ...ineligible]
}

// ── Explanation helpers ────────────────────────────────────────────────────────

function getTopSlider(weights) {
  return SLIDER_DEFS.reduce((best, d) => weights[d.id] > weights[best.id] ? d : best, SLIDER_DEFS[0])
}

function getScoreExplanation(result, eligibleResults, weights, activePathway) {
  const { platform, scores, displayPct, hardFilter } = result
  const rank = eligibleResults.findIndex(r => r.platform.id === platform.id) + 1

  if (hardFilter === 'ptm_systematic') {
    return `${platform.name} does not offer systematic PTM enrichment workflows (e.g., IMAC phosphopeptide enrichment). Consider Spectronaut or Nautilus for dedicated PTM discovery.`
  }
  if (hardFilter === 'protein_coverage') {
    return activePathway
      ? `${platform.name} covers fewer than half of the genes in the ${activePathway.name} pathway and has been excluded. Check the Protein Coverage tab to see exactly which targets are and aren't measured.`
      : `${platform.name} covers fewer than half of your specified target proteins and has been excluded. Check the Protein Coverage tab to see exactly which targets are and aren't measured.`
  }
  if (hardFilter === 'ptm') {
    return `${platform.name} is antibody-based and cannot detect PTMs or isoforms. Only MS-based platforms (Seer XT, TrueDiscovery) can capture incidental PTM signal from DIA-MS readout.`
  }
  if (hardFilter === 'absquant') {
    const kind = scores.quantification_type >= 3 ? 'label-free MS quantification (relative abundance, not physical concentrations)' : 'within-assay relative units only (not physical concentrations)'
    const variantNote = ABSOLUTE_QUANT_VARIANT_NOTE[platform.id] ?? ''
    return `${platform.name} provides ${kind}, which does not meet your absolute quantification requirement.${variantNote}`
  }

  const topDef  = getTopSlider(weights)
  const platVal = scores[topDef.dimId]
  const top     = eligibleResults[0]
  const topTier = eligibleResults.filter(r => r.isTopTier)
  const best    = SLIDER_DEFS.reduce((b, d) => scores[d.dimId] > scores[b.dimId] ? d : b, SLIDER_DEFS[0])

  if (result.isTopTier && topTier.length > 1) {
    const others = topTier.length - 1
    return `Top tier: statistically tied with ${others} other platform${others > 1 ? 's' : ''} (within ${TIE_BAND} points). ${platform.name} stands out for ${best.label.toLowerCase()} (${scores[best.dimId]}/5). Treat the top tier as co-equal and decide on practical factors like cost, lab access, or comparability with existing data.`
  }
  if (rank === 1) {
    return `Best overall match for your priorities. ${platform.name} excels at ${best.label.toLowerCase()} (${scores[best.dimId]}/5) and separates clearly from the rest on your weighted dimensions.`
  }

  const topVal = top.scores[topDef.dimId]
  const gap    = top.displayPct - displayPct
  if (platVal < topVal) {
    return `Ranked #${rank}: ${gap}% behind the top pick. On ${topDef.label.toLowerCase()}, your highest-weighted dimension, ${platform.name} scores ${platVal}/5 vs ${topVal}/5 for ${top.platform.name}.`
  }
  return `Ranked #${rank} (${gap}% behind ${top.platform.name}). Competitive on your top dimension (${platVal}/5), but lower across the combined weighting of all dimensions.`
}

function getGainsAndMisses(result, weights) {
  const { scores, effWeights } = result

  const dims = SLIDER_DEFS.map(d => ({
    id:     d.id,
    label:  d.label,
    score:  scores[d.dimId],
    weight: effWeights[d.id] || 1,
  }))

  const GAIN_TEXT = {
    cost:        s => s >= 5 ? 'Ultra-low cost tier' : s >= 4 ? 'Low cost tier' : null,
    coverage:    s => s >= 5 ? '9,500+ proteins measured' : s >= 4 ? '~5,400 proteins measured' : null,
    precision:   s => s >= 5 ? 'Best-in-class precision (CV ~5%)' : s >= 4 ? 'Strong precision (CV ~12%)' : null,
    specificity: s => s >= 5 ? 'Highest target specificity (dual-capture / 99.99%)' : s >= 4 ? 'High specificity (cis-pQTL supported)' : null,
    sensitivity: s => s >= 5 ? 'Attomolar sensitivity: detects ultra-low-abundance proteins' : s >= 4 ? 'Strong sensitivity for low-abundance targets' : null,
    throughput:  s => s >= 5 ? 'High throughput (>1,000 samples/day)' : s >= 4 ? 'Good throughput for large cohorts' : null,
    pqtl:        s => s >= 5 ? 'Gold standard for pQTL studies: MS-based, zero epitope-binding artifacts' : s >= 4 ? 'Strong pQTL reliability (low epitope-binding risk)' : null,
  }
  const MISS_TEXT = {
    cost:        s => s <= 2 ? 'Moderate-to-high cost tier' : s <= 3 ? 'Mid-range cost vs cheaper alternatives' : null,
    coverage:    s => s <= 2 ? 'Focused panel only (~200–1,000 proteins)' : s <= 3 ? 'Limited breadth vs ultra-high-plex options' : null,
    precision:   s => s <= 2 ? 'Higher CV (~26–30%) vs affinity platforms' : null,
    specificity: s => s <= 2 ? 'Higher off-target binding risk (aptamer-based)' : null,
    sensitivity: s => s <= 2 ? 'Less sensitive for very low-abundance proteins' : null,
    throughput:  s => s <= 2 ? 'Lower throughput: better suited for smaller batches' : null,
    pqtl:        s => s <= 2 ? 'Aptamer-based binding may introduce epitope-driven cis-pQTL artifacts' : null,
  }

  const gains = dims
    .filter(d => scores[d.id === 'cost' ? 'cost_efficiency' : d.id] !== undefined)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(d => GAIN_TEXT[d.id]?.(d.score))
    .filter(Boolean)

  const misses = dims
    .sort((a, b) => (b.weight * (5 - b.score)) - (a.weight * (5 - a.score)))
    .slice(0, 2)
    .map(d => MISS_TEXT[d.id]?.(d.score))
    .filter(Boolean)

  return { gains, misses }
}

// ── UI Components ──────────────────────────────────────────────────────────────

function ProgressBar({ step }) {
  const steps = [
    { id: 1, label: 'Study Context' },
    { id: 2, label: 'Your Priorities' },
    { id: 3, label: 'About You (optional)' },
    { id: 4, label: 'Results' },
  ]
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => {
        const active = s.id === step
        const done   = s.id < step
        return (
          <div key={s.id} className="flex items-center" style={{ flex: i < steps.length - 1 ? '1' : 'none' }}>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className="text-xs font-mono"
                style={{ color: done ? '#8B1A1A' : active ? '#141310' : '#d0cfcc', fontVariantNumeric: 'tabular-nums' }}
              >
                {String(s.id).padStart(2, '0')}
              </span>
              <span
                className="text-xs"
                style={{
                  color: active ? '#141310' : done ? '#8B1A1A' : '#d0cfcc',
                  fontWeight: active ? 400 : 300,
                  borderBottom: active ? '1px solid #141310' : 'none',
                  paddingBottom: active ? 1 : 0,
                }}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 mx-3" style={{ height: 1, background: '#e5e4e2', minWidth: 16 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function RadioCard({ option, selected, onSelect, compact }) {
  const active = selected === option.id
  return (
    <button
      onClick={() => onSelect(option.id)}
      role="radio"
      aria-checked={active}
      className="text-left border transition-all w-full"
      style={{
        padding: compact ? '10px 14px' : '12px 16px',
        borderColor: active ? '#8B1A1A' : '#e5e4e2',
        background: '#ffffff',
        cursor: 'pointer',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0"
          style={{ borderColor: active ? '#8B1A1A' : '#d0cfcc', background: active ? '#8B1A1A' : 'transparent' }}
        />
        <div>
          <p className="text-sm leading-snug" style={{ color: '#141310', fontWeight: 400 }}>{option.label}</p>
          {(option.desc || option.sub) && (
            <p className="text-xs mt-0.5" style={{ color: '#6f6d67', fontWeight: 400 }}>{option.desc || option.sub}</p>
          )}
        </div>
      </div>
    </button>
  )
}

// ── Step 1 ─────────────────────────────────────────────────────────────────────

function ProteinSearchInput({ proteins, selected, onAdd, onRemove }) {
  const [query, setQuery] = useState('')
  const [open,  setOpen]  = useState(false)
  const inputRef = useRef(null)

  const suggestions = useMemo(() => {
    if (!query || query.length < 2) return []
    const q = query.toUpperCase()
    return proteins
      .filter(p => p.gene && p.gene.toUpperCase().includes(q) && !selected.includes(p.gene))
      .slice(0, 8)
      .map(p => p.gene)
      .filter((g, i, arr) => arr.indexOf(g) === i)
  }, [query, proteins, selected])

  const handleSelect = (gene) => {
    onAdd(gene)
    setQuery('')
    setOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map(gene => (
            <span key={gene}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs"
              style={{ background: 'rgba(139,26,26,0.08)', color: '#8B1A1A', fontWeight: 400, border: '1px solid rgba(139,26,26,0.2)' }}
            >
              {gene}
              <button onClick={() => onRemove(gene)}
                className="ml-0.5 leading-none hover:opacity-60" style={{ fontSize: 14, lineHeight: 1, cursor: 'pointer' }}>×</button>
            </span>
          ))}
        </div>
      )}
      {selected.length < 20 && (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder={selected.length === 0 ? 'Search gene name (e.g. TNF, IL6, APOE)…' : 'Add another…'}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            className="w-full text-sm px-3 py-2 border outline-none"
            style={{ borderColor: '#e5e4e2', color: '#141310', fontWeight: 400 }}
          />
          {open && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border overflow-hidden"
              style={{ borderColor: '#e5e4e2' }}>
              {suggestions.map(gene => (
                <button key={gene}
                  onMouseDown={() => handleSelect(gene)}
                  className="w-full text-left px-3 py-2 text-sm transition-colors"
                  style={{ color: '#141310', fontWeight: 400, cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafaf9'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  {gene}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {proteins.length === 0 && (
        <p className="text-xs mt-1" style={{ color: '#6f6d67', fontWeight: 400 }}>Loading protein list…</p>
      )}
    </div>
  )
}

// Alternative way to populate the same proteinTargets list: selecting a pathway expands
// its gene list into proteinTargets exactly as if typed, so protein_target_weight and its
// coverage hard filter apply unchanged. Reactome data (0.44 MB) is fetched only when this
// input is focused, not on mount, so it never affects first paint. One pathway at a time.
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
    onSelectPathway(pathway)
    setQuery('')
    setOpen(false)
  }

  if (activePathway) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs"
        style={{ background: 'rgba(196,77,24,0.08)', color: '#C44D18', fontWeight: 400, border: '1px solid rgba(196,77,24,0.25)' }}>
        Pathway: {activePathway.name} ({activePathway.n} genes)
        <button onClick={onClearPathway}
          className="ml-0.5 leading-none hover:opacity-60" style={{ fontSize: 14, lineHeight: 1, cursor: 'pointer' }}>×</button>
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
              style={{ color: '#141310', fontWeight: 400, cursor: 'pointer' }}
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

function StepContext({
  answers, onChange, onNext, proteins, proteinTargets, onProteinTargetsChange,
  activePathway, onSelectPathway, onClearPathway, onDetachPathway,
}) {
  const canAdvance = answers.primaryGoal && answers.sampleType && answers.studySize

  // Manually editing the list after a pathway populated it detaches the pathway label
  // (onDetachPathway), since the list no longer exactly matches that pathway's membership -
  // the precomputed "Pathway coverage" figure shown in results would no longer be accurate
  // for a hand-edited subset. The genes themselves are untouched; scoring is unaffected
  // either way, since protein_target_weight only ever looks at proteinTargets directly.
  const addProtein = (gene) => {
    onProteinTargetsChange([...proteinTargets, gene])
    if (activePathway) onDetachPathway()
  }
  const removeProtein = (gene) => {
    onProteinTargetsChange(proteinTargets.filter(g => g !== gene))
    if (activePathway) onDetachPathway()
  }

  return (
    <div>
      <div className="mb-7">
        <h2 className="text-2xl font-light mb-1" style={{ color: '#141310' }}>Tell us about your study</h2>
        <p className="text-sm" style={{ color: '#52504a', fontWeight: 400 }}>
          Your answers calibrate the recommendation engine. All questions are neutral; the results are driven entirely by your priorities.
        </p>
      </div>

      <div className="mb-6">
        <p className="text-sm mb-3" style={{ color: '#141310', fontWeight: 400 }}>What is your primary research goal?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Primary research goal">
          {GOAL_OPTIONS.map(opt => (
            <RadioCard key={opt.id} option={opt} selected={answers.primaryGoal} onSelect={v => onChange('primaryGoal', v)} />
          ))}
        </div>
      </div>

      <div className="mb-6">
        <p className="text-sm mb-3" style={{ color: '#141310', fontWeight: 400 }}>What is your primary sample type?</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Primary sample type">
          {SAMPLE_OPTIONS.map(opt => (
            <RadioCard key={opt.id} option={opt} selected={answers.sampleType} onSelect={v => onChange('sampleType', v)} compact />
          ))}
        </div>
      </div>

      <div className="mb-6">
        <p className="text-sm mb-3" style={{ color: '#141310', fontWeight: 400 }}>Approximate number of samples</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Approximate number of samples">
          {SIZE_OPTIONS.map(opt => (
            <RadioCard key={opt.id} option={opt} selected={answers.studySize} onSelect={v => onChange('studySize', v)} compact />
          ))}
        </div>
      </div>

      <div className="mb-7 p-4" style={{ background: '#fafaf9', border: '1px solid #e5e4e2' }}>
        <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#6f6d67', fontSize: 10, letterSpacing: '0.08em', fontWeight: 400 }}>
          Optional: Protein Coverage Preferences
        </p>
        <p className="text-xs mb-3" style={{ color: '#6f6d67', fontWeight: 400 }}>
          {activePathway
            ? `${proteinTargets.length} genes from this pathway are set as your targets. Platforms covering more of them will rank higher.`
            : 'Add up to 20 proteins you need to measure, or select a Reactome pathway below to populate the list automatically. Platforms that cover more of your targets will rank higher.'}
        </p>
        <ProteinSearchInput
          proteins={proteins}
          selected={proteinTargets}
          onAdd={addProtein}
          onRemove={removeProtein}
        />
        <div className="mt-2.5 pt-2.5" style={{ borderTop: '1px solid #e5e4e2' }}>
          <p className="text-xs mb-1.5" style={{ color: '#6f6d67', fontWeight: 400 }}>Or select a Reactome pathway:</p>
          <PathwaySearchInput
            activePathway={activePathway}
            onSelectPathway={onSelectPathway}
            onClearPathway={onClearPathway}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onNext}
          disabled={!canAdvance}
          className="px-6 py-2.5 text-sm transition-all border"
          style={{
            background: canAdvance ? '#8B1A1A' : '#f3f2f0',
            color: canAdvance ? '#fff' : '#6f6d67',
            borderColor: canAdvance ? '#8B1A1A' : '#e5e4e2',
            fontWeight: 400,
            cursor: canAdvance ? 'pointer' : 'not-allowed',
          }}
        >
          Next: Set Priorities →
        </button>
      </div>
    </div>
  )
}

// ── Step 2 ─────────────────────────────────────────────────────────────────────

function PrioritySlider({ def, value, onChange }) {
  const LEVEL_LABELS = ['', 'Low', 'Low–Med', 'Medium', 'Med–High', 'High']
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm" htmlFor={`slider-${def.id}`} style={{ color: '#141310', fontWeight: 400 }}>{def.label}</label>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#6f6d67', fontWeight: 400 }}>{LEVEL_LABELS[value]}</span>
          <div
            className="w-6 h-6 flex items-center justify-center text-xs"
            style={{ background: '#8B1A1A', color: '#fff', fontWeight: 500 }}
          >
            {value}
          </div>
        </div>
      </div>
      <p className="text-xs mb-2" style={{ color: '#6f6d67', fontWeight: 400 }}>{def.hint}</p>
      {def.subhint && (
        <p className="text-xs mb-2" style={{ color: '#a3a19d', fontWeight: 400, lineHeight: 1.45 }}>{def.subhint}</p>
      )}
      <input
        id={`slider-${def.id}`}
        type="range" min={1} max={5} step={1}
        value={value}
        aria-valuetext={LEVEL_LABELS[value]}
        onChange={e => onChange(def.id, parseInt(e.target.value))}
        className="w-full h-1.5 appearance-none cursor-pointer"
        style={{ accentColor: '#8B1A1A' }}
      />
      <div className="flex justify-between mt-1">
        <span className="text-xs" style={{ color: '#52504a', fontWeight: 400 }}>{def.low}</span>
        <span className="text-xs" style={{ color: '#52504a', fontWeight: 400 }}>{def.high}</span>
      </div>
    </div>
  )
}

function ToggleGroup({ label, options, value, onChange }) {
  return (
    <div className="mb-4">
      <p className="text-sm mb-2.5" style={{ color: '#141310', fontWeight: 400 }}>{label}</p>
      <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label={label}>
        {options.map(opt => {
          const active = value === opt.id
          return (
            <button
              key={opt.id}
              onClick={() => onChange(active ? null : opt.id)}
              role="radio"
              aria-checked={active}
              className="px-4 py-1.5 text-xs border transition-all"
              style={{
                background: active ? '#8B1A1A' : '#ffffff',
                color: active ? '#fff' : '#52504a',
                borderColor: active ? '#8B1A1A' : '#e5e4e2',
                fontWeight: 400,
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StepWeights({ weights, toggles, onWeightChange, onToggleChange, onBack, onSubmit, answers }) {
  const [showNudge, setShowNudge] = useState(false)
  const mandatoryDone = toggles.cnsFocus !== null && toggles.longitudinal !== null

  function handleSubmit() {
    if (!mandatoryDone) { setShowNudge(true); return }
    onSubmit()
  }

  return (
    <div>
      <div className="mb-7">
        <h2 className="text-2xl font-light mb-1" style={{ color: '#141310' }}>Set your priorities</h2>
        <p className="text-sm" style={{ color: '#52504a', fontWeight: 400 }}>
          All sliders start at 3 (medium). Your choices directly drive the ranking; there are no hidden defaults that favor any platform.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10">
        <div>
          <p className="uppercase mb-4" style={{ fontSize: 10, letterSpacing: '0.08em', color: '#6f6d67', fontWeight: 400 }}>
            How important is each dimension?
          </p>
          {SLIDER_DEFS.map(def => (
            <PrioritySlider key={def.id} def={def} value={weights[def.id]} onChange={onWeightChange} />
          ))}
        </div>

        <div>
          <p className="uppercase mb-4" style={{ fontSize: 10, letterSpacing: '0.08em', color: '#6f6d67', fontWeight: 400 }}>
            Binary requirements
          </p>
          <div className="p-4 mb-4" style={{ background: '#fafaf9', border: '1px solid #e5e4e2' }}>
            <ToggleGroup
              label="Do you need absolute quantification?"
              options={[
                { id: 'yes',  label: 'Yes, required' },
                { id: 'nice', label: 'Nice to have' },
                { id: 'no',   label: 'No' },
              ]}
              value={toggles.absoluteQuant}
              onChange={v => onToggleChange('absoluteQuant', v)}
            />
            {toggles.absoluteQuant === 'yes' && (
              <p className="text-xs p-2 mb-1" style={{ borderLeft: '2px solid #8B1A1A', paddingLeft: 8, color: '#8B1A1A', fontWeight: 400 }}>
                Hard filter active: platforms with only relative quantification (Olink, SomaSeq) will be marked ineligible.
              </p>
            )}
            <div style={{ borderTop: '1px solid #e5e4e2', marginTop: 14, paddingTop: 14 }}>
              <ToggleGroup
                label="Do you need PTM or isoform detection?"
                options={[
                  { id: 'incidental',  label: 'Incidental (DIA-MS)' },
                  { id: 'systematic',  label: 'Systematic enrichment' },
                  { id: 'no',          label: 'No' },
                ]}
                value={toggles.ptmDetection}
                onChange={v => onToggleChange('ptmDetection', v)}
              />
              {toggles.ptmDetection === 'incidental' && (
                <p className="text-xs p-2" style={{ borderLeft: '2px solid #8B1A1A', paddingLeft: 8, color: '#8B1A1A', fontWeight: 400 }}>
                  Seer XT and TrueDiscovery can capture PTMs and isoforms as incidental signal from unbiased DIA-MS; no systematic enrichment performed. Other platforms are marked ineligible.
                </p>
              )}
              {toggles.ptmDetection === 'systematic' && (
                <p className="text-xs p-2" style={{ borderLeft: '2px solid #d97706', paddingLeft: 8, color: '#92400e', fontWeight: 400 }}>
                  No evaluated platform performs systematic PTM enrichment (e.g., IMAC phosphopeptide enrichment). All platforms shown below for reference; consider <strong>Spectronaut</strong> for broad PTM discovery or <strong>Nautilus</strong> for targeted PTM profiling.
                </p>
              )}
            </div>
            <div style={{ borderTop: '1px solid #e5e4e2', marginTop: 14, paddingTop: 14 }}>
              <ToggleGroup
                label="Is detection of phosphorylated tau species (pTau-181, pTau-217, pTau-231) or other neuroscience biomarkers a priority? *"
                options={[
                  { id: 'yes', label: 'Yes' },
                  { id: 'no',  label: 'No' },
                ]}
                value={toggles.cnsFocus}
                onChange={v => onToggleChange('cnsFocus', v || toggles.cnsFocus)}
                mandatory
              />
              {toggles.cnsFocus === 'yes' && (
                <p className="text-xs p-2" style={{ borderLeft: '2px solid #6b5b95', paddingLeft: 8, color: '#6b5b95', fontWeight: 400 }}>
                  {answers.sampleType === 'csf'
                    ? 'Strong sensitivity and specificity boost applied: NULISA\'s attomolar detection limit and FDA-cleared pTau-217 assay make it the benchmark for CSF pTau and CNS biomarker studies.'
                    : 'Sensitivity and specificity weights boosted to reflect requirements for low-abundance CNS biomarker detection and phospho-epitope discrimination. Select No if neuroscience is one component of a broader multi-domain study (e.g., UK Biobank). This boost is intended for studies where CNS biology is the primary scientific question.'}
                </p>
              )}
            </div>
            <div style={{ borderTop: '1px solid #e5e4e2', marginTop: 14, paddingTop: 14 }}>
              <ToggleGroup
                label="Are you planning to measure the same individuals at multiple time points (longitudinal / repeat sampling)? *"
                options={[
                  { id: 'yes', label: 'Yes' },
                  { id: 'no',  label: 'No' },
                ]}
                value={toggles.longitudinal}
                onChange={v => onToggleChange('longitudinal', v || toggles.longitudinal)}
                mandatory
              />
              {toggles.longitudinal === 'yes' && (
                <p className="text-xs p-2" style={{ borderLeft: '2px solid #0e7490', paddingLeft: 8, color: '#0e7490', fontWeight: 400 }}>
                  Precision weight boosted: detecting within-person change over time requires low inter-assay CV. Platforms with high measurement reproducibility are ranked higher.
                </p>
              )}
            </div>
          </div>

          <div className="p-4" style={{ borderLeft: '3px solid #8B1A1A' }}>
            <p className="text-xs mb-1.5" style={{ color: '#8B1A1A', fontWeight: 400 }}>How scoring works</p>
            <p className="text-xs leading-relaxed" style={{ color: '#52504a', fontWeight: 400 }}>
              Each slider weight multiplies the platform's base score (1–5) for that dimension. Study context (goal, sample type, size) adds small adjustments to reflect real-world constraints. All 6 platforms are always shown; none are hidden.
            </p>
          </div>
        </div>
      </div>

      {showNudge && !mandatoryDone && (
        <p className="text-xs mt-4 px-3 py-2" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', fontWeight: 400 }}>
          Please answer the two questions marked * before continuing.
        </p>
      )}

      <div className="flex items-center justify-between mt-4 pt-6" style={{ borderTop: '1px solid #e5e4e2' }}>
        <button onClick={onBack} className="px-4 py-2.5 text-sm border"
          style={{ borderColor: '#e5e4e2', color: '#52504a', background: '#ffffff', fontWeight: 400, cursor: 'pointer' }}>
          ← Back
        </button>
        <button onClick={handleSubmit} className="px-6 py-2.5 text-sm border"
          style={{ background: mandatoryDone ? '#8B1A1A' : '#f3f2f0', color: mandatoryDone ? '#fff' : '#6f6d67', borderColor: mandatoryDone ? '#8B1A1A' : '#e5e4e2', fontWeight: 400, cursor: mandatoryDone ? 'pointer' : 'not-allowed' }}>
          See Results →
        </button>
      </div>
    </div>
  )
}

// ── Result Card ────────────────────────────────────────────────────────────────

function ResultCard({ result, rank, isTopTier, topTierCount, eligibleResults, weights, totalProteinTargets, activePathway, pathwayCoveragePct }) {
  const [expanded, setExpanded] = useState(false)
  const { platform, displayPct, hardFilter, priorityWarnings = [], proteinCoverageCount } = result
  const isIneligible = !!hardFilter
  const highlight = isTopTier && !isIneligible          // co-leaders all get the top styling
  const tied      = topTierCount > 1                    // more than one platform in the top tier

  const explanation       = getScoreExplanation(result, eligibleResults, weights, activePathway)
  const { gains, misses } = getGainsAndMisses(result, weights)

  const filterLabel = hardFilter === 'ptm'              ? 'Requires systematic PTM enrichment' :
                      hardFilter === 'ptm_systematic'   ? 'No systematic PTM workflow available' :
                      hardFilter === 'absquant'         ? 'Requires absolute quantification'  :
                      hardFilter === 'protein_coverage' ? (activePathway ? `Covers <50% of the ${activePathway.name} pathway` : `Covers <50% of your target proteins`) : ''

  return (
    <div
      style={{
        border: '1px solid ' + (isIneligible ? '#e5e4e2' : highlight ? 'rgba(139,26,26,0.3)' : '#e5e4e2'),
        borderTop: highlight ? '2px solid #141310' : undefined,
        background:  isIneligible ? '#fafaf9' : highlight ? 'rgba(139,26,26,0.02)' : '#ffffff',
        opacity:     isIneligible ? 0.72 : 1,
      }}
    >
      {highlight && (
        <div className="px-5 pt-3 pb-0">
          <span className="uppercase" style={{ fontSize: 10, letterSpacing: '0.08em', color: '#8B1A1A', fontWeight: 400 }}>
            ★ {tied ? 'Top tier (essentially tied)' : 'Top recommendation'}
          </span>
        </div>
      )}

      <div className="px-5 py-4">
        <div className="flex items-start gap-4">
          {/* Rank */}
          <div
            className="w-8 h-8 flex items-center justify-center text-sm flex-shrink-0 mt-0.5"
            style={{
              background: isIneligible ? '#f3f2f0' : highlight ? '#8B1A1A' : rank <= 3 ? 'rgba(139,26,26,0.08)' : '#f3f2f0',
              color:      isIneligible ? '#6f6d67' : highlight ? '#fff'    : rank <= 3 ? '#8B1A1A' : '#52504a',
              fontWeight: 500,
            }}
          >
            {isIneligible ? '-' : (highlight && tied) ? '=' : rank}
          </div>

          <div className="flex-1 min-w-0">
            {/* Platform header */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ background: platform.color }} />
              <span className="text-base" style={{ color: isIneligible ? '#6f6d67' : '#141310', fontWeight: 400 }}>
                {platform.name}
              </span>
              <span className="text-xs" style={{ color: '#6f6d67', fontWeight: 400 }}>{platform.company.split(' ')[0]}</span>
              {activePathway && pathwayCoveragePct != null ? (
                <span className="text-xs px-2 py-0.5" style={{
                  background: pathwayCoveragePct >= 99.95 ? '#dcfce7' : pathwayCoveragePct === 0 ? '#fef2f2' : '#fef9c3',
                  color: pathwayCoveragePct >= 99.95 ? '#166534' : pathwayCoveragePct === 0 ? '#b91c1c' : '#854d0e',
                  fontWeight: 400,
                }}>
                  Pathway coverage: {pathwayCoveragePct.toFixed(1)}%
                </span>
              ) : proteinCoverageCount !== null && totalProteinTargets > 0 && (
                <span className="text-xs px-2 py-0.5" style={{
                  background: proteinCoverageCount === totalProteinTargets ? '#dcfce7' : proteinCoverageCount === 0 ? '#fef2f2' : '#fef9c3',
                  color: proteinCoverageCount === totalProteinTargets ? '#166534' : proteinCoverageCount === 0 ? '#b91c1c' : '#854d0e',
                  fontWeight: 400,
                }}>
                  {proteinCoverageCount}/{totalProteinTargets} target proteins covered
                </span>
              )}
              {isIneligible && (
                <span className="text-xs px-2 py-0.5" style={{ background: '#fef3c7', color: '#d97706', fontWeight: 400 }}>
                  {filterLabel}
                </span>
              )}
              {!isIneligible && priorityWarnings.map(w => (
                <span key={w} className="text-xs px-2 py-0.5" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d', fontWeight: 400 }}>
                  ⚠ {w}
                </span>
              ))}
            </div>

            {/* Score - typographic */}
            {!isIneligible && (
              <div className="flex items-baseline gap-1.5 mt-2 mb-3">
                <span
                  className="font-light leading-none"
                  style={{ fontSize: 38, color: highlight ? '#8B1A1A' : '#141310' }}
                >
                  {displayPct}
                </span>
                <span className="text-sm font-light" style={{ color: highlight ? '#8B1A1A' : '#52504a' }}>%</span>
                <span className="text-xs ml-1" style={{ color: '#6f6d67', fontWeight: 400 }}>match</span>
              </div>
            )}

            <p className="text-sm leading-relaxed" style={{ color: isIneligible ? '#6f6d67' : '#52504a', fontWeight: 400 }}>
              {explanation}
            </p>

            {/* Expand toggle */}
            {!isIneligible && (
              <div className="mt-3">
                <button
                  onClick={() => setExpanded(e => !e)}
                  className="text-xs flex items-center gap-1"
                  style={{ color: '#C44D18', fontWeight: 400, cursor: 'pointer' }}
                >
                  {expanded ? '▲ Hide details' : '▼ Show gains & trade-offs'}
                </button>

                {expanded && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {gains.length > 0 && (
                      <div>
                        <p className="text-xs mb-2" style={{ color: '#8B1A1A', fontWeight: 400 }}>What you'd gain</p>
                        <ul className="space-y-1">
                          {gains.map((g, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs leading-snug" style={{ color: '#52504a', fontWeight: 400 }}>
                              <span style={{ color: '#8B1A1A', flexShrink: 0 }}>✓</span> {g}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {misses.length > 0 && (
                      <div>
                        <p className="text-xs mb-2" style={{ color: '#d97706', fontWeight: 400 }}>What you'd trade off</p>
                        <ul className="space-y-1">
                          {misses.map((m, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs leading-snug" style={{ color: '#52504a', fontWeight: 400 }}>
                              <span style={{ color: '#f59e0b', flexShrink: 0 }}>△</span> {m}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {!isTopTier && (
                      <div className="sm:col-span-2 pt-3" style={{ borderTop: '1px solid #e5e4e2' }}>
                        <p className="text-xs" style={{ color: '#6f6d67', fontWeight: 400 }}>
                          <span style={{ color: '#52504a', fontWeight: 400 }}>When this would rank #1: </span>
                          {PLATFORM_BEST_WHEN[platform.id]}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Ineligible: when it would qualify */}
            {isIneligible && (
              <p className="text-xs mt-2" style={{ color: '#6f6d67', fontWeight: 400 }}>
                <span style={{ color: '#52504a', fontWeight: 400 }}>When this would be eligible: </span>
                {PLATFORM_BEST_WHEN[platform.id]}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Step 3 ─────────────────────────────────────────────────────────────────────

const GOAL_LABELS   = { drug_target: 'Drug target ID', discovery: 'Biomarker discovery', disease_char: 'Disease characterization', validation: 'Biomarker validation', pharmacoproteomics: 'Pharmacoproteomics', population: 'Population proteomics' }
const SAMPLE_LABELS = { plasma: 'Plasma', serum: 'Serum', csf: 'CSF', tissue: 'Tissue', cell_culture: 'Cell culture / screening', multiple: 'Multiple matrices' }
const SIZE_LABELS   = { small: '<100 samples', medium: '100–1,000', large: '1,000–10,000', xlarge: '>10,000' }

function ProfileChip({ label, value }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs"
      style={{ border: '1px solid rgba(139,26,26,0.25)', color: '#8B1A1A', background: 'transparent', fontWeight: 400 }}>
      <span style={{ color: '#6f6d67', fontWeight: 400 }}>{label}:</span> {value}
    </span>
  )
}

// ── Download results ──────────────────────────────────────────────────────────

function DownloadResults({ results, answers }) {
  const GOAL_LABELS   = { drug_target: 'Drug target identification', discovery: 'Biomarker discovery', disease_char: 'Disease characterization and sub-typing', validation: 'Biomarker validation & clinical translation', pharmacoproteomics: 'Pharmacoproteomics (clinical trials)', population: 'Population proteomics (large biobanks)' }
  const SAMPLE_LABELS = { plasma: 'Plasma', serum: 'Serum', csf: 'CSF', tissue: 'Tissue', cell_culture: 'Cell culture / screening', multiple: 'Multiple sample types' }
  const SIZE_LABELS   = { small: '<100 samples', medium: '100–1,000', large: '1,000–10,000', xlarge: '>10,000' }

  const handleDownload = () => {
    const eligible   = results.filter(r => !r.hardFilter)
    const ineligible = results.filter(r =>  r.hardFilter)
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    const lines = [
      'PROTEOMICS PLATFORM NAVIGATOR: RESULTS SUMMARY',
      'Ignition Scientific | ignitionscientific.com',
      '='.repeat(52),
      '',
      `Date: ${date}`,
      '',
      'STUDY CONTEXT',
      '-'.repeat(30),
      `Primary goal:   ${GOAL_LABELS[answers.primaryGoal]  || '-'}`,
      `Sample type:    ${SAMPLE_LABELS[answers.sampleType]  || '-'}`,
      `Study size:     ${SIZE_LABELS[answers.studySize]     || '-'}`,
      '',
      'PLATFORM RANKINGS',
      '-'.repeat(30),
      ...eligible.map((r, i) =>
        `${i + 1}. ${r.platform.name.padEnd(30)} ${r.displayPct}% match`
      ),
      ...(ineligible.length > 0 ? [
        '',
        'DID NOT MEET HARD FILTER:',
        ...ineligible.map(r => `  - ${r.platform.name}`)
      ] : []),
      '',
      '='.repeat(52),
      'Want a custom analysis? Email this file to:',
      '  chris@ignitionscientific.com',
      '',
      'Ignition Scientific provides custom platform selection analyses',
      'for pharmaceutical, biotech, and academic research groups.',
      '',
      'For research use only. Not for clinical decision making.',
    ]

    const text = lines.join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'proteomics-platform-results.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mt-6 border px-5 py-4" style={{ borderColor: '#e5e4e2', background: 'transparent' }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-sm mb-0.5" style={{ color: '#141310', fontWeight: 400 }}>Save your results</p>
          <p className="text-xs leading-relaxed" style={{ color: '#52504a', fontWeight: 400 }}>
            Download a plain-text summary to share with colleagues.{' '}
            Email it to{' '}
            <a href="mailto:chris@ignitionscientific.com" className="hover:underline" style={{ color: '#C44D18' }}>
              chris@ignitionscientific.com
            </a>
            {' '}for a custom platform selection analysis.
          </p>
        </div>
        <button
          onClick={handleDownload}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 text-sm transition-all border hover:opacity-90"
          style={{ background: '#8B1A1A', color: '#fff', borderColor: '#8B1A1A', fontWeight: 400, cursor: 'pointer' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download (.txt)
        </button>
      </div>
    </div>
  )
}

// ── Share / survey form ────────────────────────────────────────────────────────

const EXPERTISE_OPTIONS = [
  { id: 'genomics',         label: 'Genomics / GWAS / genetic epidemiology' },
  { id: 'clinical',         label: 'Clinical biomarkers / translational research' },
  { id: 'mass_spec',        label: 'Mass spectrometry / proteomics' },
  { id: 'computational',    label: 'Computational biology / bioinformatics' },
  { id: 'immunology',       label: 'Immunology / cell biology' },
  { id: 'neuroscience',     label: 'Neuroscience / CNS' },
  { id: 'oncology',         label: 'Oncology' },
  { id: 'drug_development', label: 'Drug development / pharmacology' },
  { id: 'other',            label: 'Other' },
]

const FAMILIARITY_OPTIONS = [
  { id: 'new',          label: 'New to proteomics: first study' },
  { id: 'some',         label: 'Some experience: 1–3 studies' },
  { id: 'experienced',  label: 'Experienced: regularly run proteomics studies' },
  { id: 'expert',       label: 'Expert: platform scientist or developer' },
]

const CAREER_TYPES = [
  { id: 'academic',       label: 'Academic researcher' },
  { id: 'industry',       label: 'Industry / pharma / biotech' },
  { id: 'clinical',       label: 'Clinical researcher / physician-scientist' },
  { id: 'bioinformatics', label: 'Bioinformatician / data scientist' },
  { id: 'student',        label: 'Research student (PhD / MSc)' },
  { id: 'other',          label: 'Other' },
]

const CAREER_STAGES = [
  { id: 'phd',    label: 'PhD student' },
  { id: 'postdoc',label: 'Postdoctoral researcher' },
  { id: 'early',  label: 'Early career (≤5 yrs post-PhD)' },
  { id: 'mid',    label: 'Mid-career researcher' },
  { id: 'senior', label: 'Senior researcher / PI / director' },
  { id: 'other',  label: 'Other' },
]

// A real, visible step, not buried in a collapsed panel, but nothing on it is
// required and both paths forward lead to the same results. Every field is optional;
// "Skip" and "Submit" are given equal visual weight on purpose, so neither reads as
// the "real" button. Submitting still emails the full profile to Chris and Karl via
// /api/submit-results, unchanged, for whoever opts in.
function StepAboutYou({ form, onFormChange, results, answers, weights, toggles, onBack, onNext }) {
  const setField = (k, v) => onFormChange({ ...form, [k]: v })

  const handleSubmit = () => {
    fetch('/api/submit-results', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers,
        weights,
        toggles,
        results: results.map(r => ({
          displayPct: r.displayPct,
          hardFilter: r.hardFilter ?? null,
          isTopTier:  r.isTopTier ?? false,
          platform:   { id: r.platform.id, name: r.platform.name, company: r.platform.company },
        })),
        contact: form,
      }),
    }).catch(() => {})
    onNext()
  }

  const inputCls = "w-full px-3 py-2 border text-sm outline-none"
  const inputSty = { borderColor: '#e5e4e2', color: '#141310', background: '#ffffff', fontWeight: 400 }

  return (
    <div>
      <div className="mb-7">
        <h2 className="text-2xl font-light mb-1" style={{ color: '#141310' }}>About you (optional)</h2>
        <p className="text-sm" style={{ color: '#52504a', fontWeight: 400 }}>
          This tool is part of an ongoing study on proteomics platform selection. If you're willing, tell us a
          little about yourself and your study below; every field is optional, and you'll see your results
          either way.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs mb-1.5" style={{ color: '#52504a', fontWeight: 400 }}>Name</label>
          <input type="text" value={form.name} placeholder="Your name"
            onChange={e => setField('name', e.target.value)} className={inputCls} style={inputSty} />
        </div>
        <div>
          <label className="block text-xs mb-1.5" style={{ color: '#52504a', fontWeight: 400 }}>Email</label>
          <input type="email" value={form.email} placeholder="you@institution.edu"
            onChange={e => setField('email', e.target.value)} className={inputCls} style={inputSty} />
        </div>
        <div>
          <label className="block text-xs mb-1.5" style={{ color: '#52504a', fontWeight: 400 }}>Institution</label>
          <input type="text" value={form.institution} placeholder="University / company"
            onChange={e => setField('institution', e.target.value)} className={inputCls} style={inputSty} />
        </div>
        <div>
          <label className="block text-xs mb-1.5" style={{ color: '#52504a', fontWeight: 400 }}>Country</label>
          <input type="text" value={form.country} placeholder="Country"
            onChange={e => setField('country', e.target.value)} className={inputCls} style={inputSty} />
        </div>
        <div>
          <label className="block text-xs mb-1.5" style={{ color: '#52504a', fontWeight: 400 }}>Career type</label>
          <select value={form.careerType} onChange={e => setField('careerType', e.target.value)} className={inputCls} style={inputSty}>
            <option value="">Select…</option>
            {CAREER_TYPES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1.5" style={{ color: '#52504a', fontWeight: 400 }}>Career stage</label>
          <select value={form.careerStage} onChange={e => setField('careerStage', e.target.value)} className={inputCls} style={inputSty}>
            <option value="">Select…</option>
            {CAREER_STAGES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1.5" style={{ color: '#52504a', fontWeight: 400 }}>Primary area of expertise</label>
          <select value={form.expertise} onChange={e => setField('expertise', e.target.value)} className={inputCls} style={inputSty}>
            <option value="">Select…</option>
            {EXPERTISE_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1.5" style={{ color: '#52504a', fontWeight: 400 }}>Familiarity with proteomics</label>
          <select value={form.familiarity} onChange={e => setField('familiarity', e.target.value)} className={inputCls} style={inputSty}>
            <option value="">Select…</option>
            {FAMILIARITY_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <p className="text-xs mb-6" style={{ color: '#6f6d67', fontWeight: 400 }}>
        Whatever you fill in, plus your study configuration and priorities, will be shared with Chris Whelan
        (Royal College of Surgeons &amp; Ignition Scientific) and Karl Smith-Byrne (Oxford) to inform research
        into platform selection patterns and to guide future app updates.
      </p>

      <div className="flex items-center justify-between pt-6" style={{ borderTop: '1px solid #e5e4e2' }}>
        <button onClick={onBack} className="px-4 py-2.5 text-sm border"
          style={{ borderColor: '#e5e4e2', color: '#52504a', background: '#ffffff', fontWeight: 400, cursor: 'pointer' }}>
          ← Back
        </button>
        <div className="flex items-center gap-3">
          <button onClick={onNext} className="px-4 py-2.5 text-sm border"
            style={{ borderColor: '#e5e4e2', color: '#52504a', background: '#ffffff', fontWeight: 400, cursor: 'pointer' }}>
            Skip and see results →
          </button>
          <button onClick={handleSubmit} className="px-4 py-2.5 text-sm border"
            style={{ background: '#8B1A1A', color: '#fff', borderColor: '#8B1A1A', fontWeight: 400, cursor: 'pointer' }}>
            Submit and see results →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Step 3 ─────────────────────────────────────────────────────────────────────

function StepResults({ results, answers, weights, toggles, proteinTargets, activePathway, pathwayCoverage, onBack, onReset }) {
  const eligible   = results.filter(r => !r.hardFilter)
  const ineligible = results.filter(r =>  r.hardFilter)
  const topTierCount = eligible.filter(r => r.isTopTier).length
  const topDef     = getTopSlider(weights)

  // Automatic record that a recommendation was shown: no gate, no form to fill in.
  // Logs what was asked (study context, priority weights) and what was recommended,
  // plus coarse IP geolocation (country + city, server-side, never entered or seen
  // by the visitor). Disclosed in the note below, not hidden. No name, email, career
  // info, or other identifying field is ever included here; those only exist if a
  // user separately fills in and submits the optional "About you" step. Fires once
  // per results view; if this fails or is blocked, it never affects what the user
  // sees (see .catch below).
  useEffect(() => {
    const top = eligible[0]
    const tied = eligible.filter(r => r.isTopTier)
    fetch('/api/log-recommendation', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topPlatform:     top ? top.platform.name : null,
        topPlatformPct:  top ? top.displayPct : null,
        isTie:           tied.length > 1,
        tiedPlatforms:   tied.length > 1 ? tied.map(r => r.platform.name) : null,
        primaryGoal:     answers.primaryGoal ?? null,
        sampleType:      answers.sampleType ?? null,
        studySize:       answers.studySize ?? null,
        toggles,
        weights,
      }),
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-light mb-1" style={{ color: '#141310' }}>Your platform recommendations</h2>
        <p className="text-sm mb-4" style={{ color: '#52504a', fontWeight: 400 }}>
          Ranked by match to your stated priorities. All 6 platforms are shown. Expand any card to see gains, trade-offs, and when it would rank #1.
        </p>
        <div className="flex flex-wrap gap-2">
          {answers.primaryGoal && <ProfileChip label="Goal"   value={GOAL_LABELS[answers.primaryGoal]} />}
          {answers.sampleType  && <ProfileChip label="Sample" value={SAMPLE_LABELS[answers.sampleType]} />}
          {answers.studySize   && <ProfileChip label="Size"   value={SIZE_LABELS[answers.studySize]} />}
          {topDef              && <ProfileChip label="Top priority" value={topDef.label} />}
          {toggles.absoluteQuant === 'yes'         && <ProfileChip label="Filter" value="Absolute quant required" />}
          {toggles.ptmDetection  === 'incidental'  && <ProfileChip label="Filter" value="PTM: incidental DIA-MS" />}
          {toggles.ptmDetection  === 'systematic'  && <ProfileChip label="Filter" value="PTM: systematic enrichment" />}
          {toggles.cnsFocus      === 'yes' && <ProfileChip label="Focus"  value="Neuroscience / CNS (incl. pTau)" />}
          {toggles.longitudinal  === 'yes' && <ProfileChip label="Design" value="Longitudinal / repeat sampling" />}
          {activePathway ? (
            <ProfileChip label="Pathway" value={`${activePathway.name} (${proteinTargets.length} genes)`} />
          ) : proteinTargets && proteinTargets.length > 0 && (
            <ProfileChip label="Proteins" value={proteinTargets.join(', ')} />
          )}
        </div>
        <p className="text-xs mt-3" style={{ color: '#6f6d67', fontWeight: 400 }}>
          We log anonymized usage data, including your approximate location and the inputs above, to improve this tool.
          No name or contact details are included unless you choose to share them in the optional step below.
        </p>
      </div>

      {/* Transparency note */}
      <div className="mb-5 px-4 py-3 text-xs"
        style={{ borderLeft: '3px solid #8B1A1A', color: '#52504a', fontWeight: 400 }}>
        <strong style={{ color: '#8B1A1A', fontWeight: 500 }}>Transparent scoring: </strong>
        Your highest-weighted dimension is <strong>{topDef.label}</strong>. Platforms that score higher on this dimension rank higher, all else equal.
        Expand any card to see exactly how weights mapped to scores.
        {ineligible.length > 0 && ` ${ineligible.length} platform${ineligible.length > 1 ? 's' : ''} did not meet your hard filter and are shown below.`}
      </div>

      {/* Pathway note */}
      {activePathway && (
        <div className="mb-5 px-4 py-3 text-xs"
          style={{ borderLeft: '3px solid #C44D18', color: '#52504a', fontWeight: 400 }}>
          <strong style={{ color: '#C44D18', fontWeight: 500 }}>Pathway filter: </strong>
          The {proteinTargets.length} genes in <strong>{activePathway.name}</strong> were added as your target proteins:
          this contributes a weight of 6 to each platform's score (same as manually-entered targets) and excludes any
          platform covering under 50% of them. Pathway coverage does not replace your stated priorities from Step 2;
          it filters the candidate set and adds one weighted input alongside them.
        </div>
      )}

      {/* Tissue context note */}
      {answers.sampleType === 'tissue' && (
        <div className="mb-5 px-4 py-3 text-xs"
          style={{ borderLeft: '3px solid #d97706', color: '#52504a', fontWeight: 400 }}>
          <strong style={{ color: '#92400e', fontWeight: 500 }}>Note on tissue proteomics: </strong>
          <strong>TrueDiscovery (Biognosys)</strong> is the best-established platform for solid tissue workflows.
          Olink and SomaSeq are validated in <em>tissue homogenates</em>, not native solid tissue workflows, and are ranked lower accordingly.
          Nomic nELISA and NULISA have very limited tissue validation.
          Seer Proteograph XT is also penalised here: its nanoparticle corona enrichment requires liquid-phase input; the appropriate Seer product for solid tissue (including brain) is <strong>Proteograph DIRECT</strong>.
        </div>
      )}

      {/* Systematic PTM banner - no eligible platforms */}
      {toggles.ptmDetection === 'systematic' && (
        <div className="mb-5 px-5 py-4" style={{ borderLeft: '4px solid #d97706', background: 'transparent' }}>
          <p className="text-sm mb-1" style={{ color: '#92400e', fontWeight: 400 }}>None of these platforms perform systematic PTM enrichment</p>
          <p className="text-xs leading-relaxed mb-3" style={{ color: '#52504a', fontWeight: 400 }}>
            Systematic PTM discovery (e.g., phosphoproteomics via IMAC enrichment, ubiquitinomics, glycoproteomics) requires dedicated workflows not offered by any of the six platforms evaluated here. The rankings below are shown for reference only.
          </p>
          <p className="text-xs mb-1" style={{ color: '#141310', fontWeight: 400 }}>Recommended alternatives:</p>
          <ul className="text-xs space-y-1" style={{ color: '#52504a', fontWeight: 400 }}>
            <li>• <strong>LC-MS/MS + IMAC enrichment</strong>: gold standard for phosphoproteomics; Fe³⁺- or Ti⁴⁺-IMAC cartridges followed by DIA-MS. Available at most proteomics core facilities.</li>
            <li>• <strong>EasyPhos</strong>: high-throughput phosphoproteomics protocol (Humphrey et al., <em>Nature Protocols</em>) designed for large sample series; compatible with DIA-MS readout in Spectronaut or DIA-NN.</li>
            <li>• <strong>CST PTMScan</strong>: immunoaffinity enrichment using modification-specific antibodies (phosphotyrosine, acetyl-lysine, K-GG ubiquitin remnant) paired with LC-MS/MS; best for targeted PTM classes.</li>
            <li>• <strong>Spectronaut (Biognosys)</strong>: DIA-MS software + service with curated PTM spectral libraries; suited for broad phospho-, acetyl-, and ubiquitin-proteomics discovery.</li>
          </ul>
        </div>
      )}

      {/* Top-tier tie notice */}
      {topTierCount > 1 && (
        <div className="mb-4 px-5 py-4" style={{ borderLeft: '4px solid #8B1A1A', background: 'rgba(139,26,26,0.03)' }}>
          <p className="text-sm mb-1" style={{ color: '#8B1A1A', fontWeight: 500 }}>
            Top tier: {topTierCount} platforms are statistically tied for your study
          </p>
          <p className="text-xs leading-relaxed" style={{ color: '#52504a', fontWeight: 400 }}>
            Their match scores fall within {TIE_BAND} points of one another, too close to call a single winner.
            Treat them as co-equal recommendations and choose on practical factors like cost, lab access, or
            comparability with data you already have. If several platforms tie, it usually means your priorities
            are evenly weighted; raise the sliders for what matters most to see clearer separation.
          </p>
        </div>
      )}

      {/* Eligible ranked */}
      <div className="space-y-3 mb-5">
        {eligible.map((result, i) => (
          <div key={result.platform.id}>
            <ResultCard
              result={result}
              rank={i + 1}
              isTopTier={!!result.isTopTier}
              topTierCount={topTierCount}
              eligibleResults={eligible}
              weights={weights}
              totalProteinTargets={proteinTargets ? proteinTargets.length : 0}
              activePathway={activePathway}
              pathwayCoveragePct={activePathway && pathwayCoverage ? pathwayCoverage.single?.[activePathway.id]?.[result.platform.id] : null}
            />
            {result.platform.id === 'nomic-omni' && (
              <div className="mt-2 px-5 py-4" style={{ borderLeft: '4px solid #0ea5e9', background: 'transparent' }}>
                <p className="text-sm mb-1" style={{ color: '#0369a1', fontWeight: 400 }}>Also consider: Olink Reveal</p>
                <p className="text-xs leading-relaxed" style={{ color: '#52504a', fontWeight: 400 }}>
                  <strong>Olink Reveal</strong> is a proximity extension assay (PEA) platform from Olink targeting approximately 1,000 proteins at a list price under $100 per sample, directly comparable in scope and cost to Nomic nELISA. It was not evaluated in this tool as it launched after our evidence cutoff, but if nELISA is your top recommendation you should evaluate both before committing: Olink Reveal uses PEA dual-antibody detection (higher specificity, no physical concentration units) while nELISA uses sandwich ELISA (absolute quantification in pg/mL).
                </p>
              </div>
            )}
            {result.platform.id === 'illumina-protein-prep' && (
              <div className="mt-2 px-5 py-4" style={{ borderLeft: '4px solid #0ea5e9', background: 'transparent' }}>
                <p className="text-sm mb-1" style={{ color: '#0369a1', fontWeight: 400 }}>Also consider: SomaScan v5.0 (legacy platform, 11k aptamers)</p>
                <p className="text-xs leading-relaxed" style={{ color: '#52504a', fontWeight: 400 }}>
                  <strong>SomaSeq</strong> (Illumina; briefly sold as Illumina Protein Prep) is the NGS-based version of SomaScan, using the same SOMAmer aptamer reagents read out by next-generation sequencing rather than microarray. The legacy <strong>SomaScan v5.0</strong> platform (11,000 aptamers, microarray readout) has a larger published literature base; if cross-study comparability with existing cohorts is important, you may want to evaluate both versions before committing.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Ineligible section */}
      {ineligible.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px" style={{ background: '#e5e4e2' }} />
            <span className="uppercase flex-shrink-0" style={{ fontSize: 10, letterSpacing: '0.08em', color: '#6f6d67', fontWeight: 400 }}>
              Does not meet hard filter
            </span>
            <div className="flex-1 h-px" style={{ background: '#e5e4e2' }} />
          </div>
          <div className="space-y-3">
            {ineligible.map((result, i) => (
              <ResultCard
                key={result.platform.id}
                result={result}
                rank={eligible.length + i + 1}
                isTopTier={false}
                topTierCount={topTierCount}
                eligibleResults={eligible}
                weights={weights}
                totalProteinTargets={proteinTargets ? proteinTargets.length : 0}
                activePathway={activePathway}
                pathwayCoveragePct={activePathway && pathwayCoverage ? pathwayCoverage.single?.[activePathway.id]?.[result.platform.id] : null}
              />
            ))}
          </div>
        </div>
      )}

      <DownloadResults results={results} answers={answers} />

      <div className="flex items-center justify-between mt-6 pt-6" style={{ borderTop: '1px solid #e5e4e2' }}>
        <button onClick={onBack} className="px-4 py-2.5 text-sm border"
          style={{ borderColor: '#e5e4e2', color: '#52504a', background: '#ffffff', fontWeight: 400, cursor: 'pointer' }}>
          ← Back
        </button>
        <button onClick={onReset} className="px-4 py-2.5 text-sm border"
          style={{ background: '#f3f2f0', color: '#52504a', borderColor: '#e5e4e2', fontWeight: 400, cursor: 'pointer' }}>
          Start over
        </button>
      </div>

      {/* Reproducibility pointer */}
      <section className="mt-8 pt-5 flex items-start justify-between gap-4 flex-wrap" style={{ borderTop: '1px solid #e5e4e2' }}>
        <div>
          <h3 className="text-base mb-1" style={{ color: '#141310', fontWeight: 500 }}>Reproducibility: data and code</h3>
          <p className="text-sm" style={{ color: '#52504a', fontWeight: 400, lineHeight: 1.6, maxWidth: '44rem' }}>
            The engine specification, a self-contained regeneration script, anonymized real-world input data, and
            every result file behind the fairness analysis above are downloadable from the Reproducibility tab.
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

// ── Root Component ─────────────────────────────────────────────────────────────

const DEFAULT_ANSWERS     = { primaryGoal: null, sampleType: null, studySize: null }
const DEFAULT_WEIGHTS     = { cost: 3, coverage: 3, precision: 3, specificity: 3, sensitivity: 3, throughput: 3, pqtl: 3 }
const DEFAULT_TOGGLES     = { absoluteQuant: null, ptmDetection: null, cnsFocus: null, longitudinal: null }
const DEFAULT_SURVEY_FORM = { name: '', email: '', institution: '', country: '', careerType: '', careerStage: '', expertise: '', familiarity: '' }

export default function HelpMeChoose() {
  const [step,           setStep]           = useState(1)
  const [answers,        setAnswers]        = useState(DEFAULT_ANSWERS)
  const [weights,        setWeights]        = useState(DEFAULT_WEIGHTS)
  const [toggles,        setToggles]        = useState(DEFAULT_TOGGLES)
  const [surveyForm,     setSurveyForm]     = useState(DEFAULT_SURVEY_FORM)
  const [proteinTargets, setProteinTargets] = useState([])
  const [allProteins,    setAllProteins]    = useState([])
  const [activePathway,  setActivePathway]  = useState(null) // {id, name, n} | null
  const [pathwayCoverage, setPathwayCoverage] = useState(null)

  useEffect(() => {
    if (window.__PROTEINS__) {
      setAllProteins(window.__PROTEINS__)
    } else {
      fetch('/proteins.json').then(r => r.json()).then(setAllProteins).catch(() => {})
    }
  }, [])

  // pathway_coverage.json (0.62 MB) is only fetched once a pathway is actually selected,
  // not on mount, so it never affects first paint - same lazy-loading discipline as
  // reactome_pathways.json in PathwaySearchInput.
  useEffect(() => {
    if (activePathway && !pathwayCoverage) {
      fetch('/pathways/pathway_coverage.json').then(r => r.json()).then(setPathwayCoverage).catch(() => {})
    }
  }, [activePathway, pathwayCoverage])

  // Wizard step lives in the URL hash (#chooser, #chooser/2 …) so the browser Back/Forward
  // buttons move between steps instead of leaving the tool. App keys the tab on 'chooser'
  // (ignoring the step suffix), so the component stays mounted across step changes and
  // answers/sliders are preserved when navigating back.
  const goToStep = (n) => {
    window.location.hash = n <= 1 ? 'chooser' : `chooser/${n}`
  }

  useEffect(() => {
    // A cold load has no answers, so a deep-linked step is meaningless — normalize to step 1.
    if (/^#chooser\/[2-4]$/.test(window.location.hash)) {
      window.history.replaceState(null, '', '#chooser')
    }
    const sync = () => {
      const m = window.location.hash.match(/^#chooser(?:\/([1-4]))?$/)
      setStep(m && m[1] ? Number(m[1]) : 1)
    }
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const handleAnswerChange = (k, v) => setAnswers(a => ({ ...a, [k]: v }))
  const handleWeightChange = (k, v) => setWeights(w => ({ ...w, [k]: v }))
  const handleToggleChange = (k, v) => setToggles(t => ({ ...t, [k]: v }))

  // Selecting a pathway replaces the current target list outright (at most one pathway at
  // a time); its genes enter proteinTargets exactly as if typed, so protein_target_weight
  // and its coverage hard filter apply unchanged - no new weight, priority, or scoring branch.
  const handleSelectPathway = (pathway) => {
    setProteinTargets([...pathway.genes])
    setActivePathway({ id: pathway.id, name: pathway.name, n: pathway.n })
  }
  // Explicit clear (the pathway chip's ×): drops both the pathway label and the gene list.
  const handleClearPathway = () => {
    setActivePathway(null)
    setProteinTargets([])
  }
  // Detach only (triggered by a manual add/remove while a pathway is active): keeps
  // whatever genes remain, just stops labeling the list as "the pathway", since it no
  // longer exactly matches that pathway's membership and the precomputed coverage figure
  // would no longer be accurate for a hand-edited subset.
  const handleDetachPathway = () => setActivePathway(null)

  // Compute results from step 3 onward so they're available for the email on the survey step
  const results = useMemo(
    () => step >= 3 ? computeResults(answers, weights, toggles, proteinTargets, allProteins) : [],
    [step, answers, weights, toggles, proteinTargets, allProteins]
  )

  const handleReset = () => {
    window.history.replaceState(null, '', '#chooser')
    setStep(1)
    setAnswers(DEFAULT_ANSWERS)
    setWeights(DEFAULT_WEIGHTS)
    setToggles(DEFAULT_TOGGLES)
    setSurveyForm(DEFAULT_SURVEY_FORM)
    setProteinTargets([])
    setActivePathway(null)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <ProgressBar step={step} />
      <div className="px-8 py-8" style={{ background: '#ffffff', border: '1px solid #e5e4e2', borderTop: '2px solid #141310' }}>
        {step === 1 && (
          <StepContext
            answers={answers} onChange={handleAnswerChange} onNext={() => goToStep(2)}
            proteins={allProteins} proteinTargets={proteinTargets} onProteinTargetsChange={setProteinTargets}
            activePathway={activePathway} onSelectPathway={handleSelectPathway}
            onClearPathway={handleClearPathway} onDetachPathway={handleDetachPathway}
          />
        )}
        {step === 2 && (
          <StepWeights
            weights={weights} toggles={toggles} answers={answers}
            onWeightChange={handleWeightChange} onToggleChange={handleToggleChange}
            onBack={() => goToStep(1)} onSubmit={() => goToStep(3)}
          />
        )}
        {step === 3 && (
          <StepAboutYou
            form={surveyForm} onFormChange={setSurveyForm}
            results={results} answers={answers} weights={weights} toggles={toggles}
            onBack={() => goToStep(2)} onNext={() => goToStep(4)}
          />
        )}
        {step === 4 && (
          <StepResults
            results={results} answers={answers} weights={weights} toggles={toggles}
            proteinTargets={proteinTargets}
            activePathway={activePathway} pathwayCoverage={pathwayCoverage}
            onBack={() => goToStep(3)} onReset={handleReset}
          />
        )}
      </div>
    </div>
  )
}
