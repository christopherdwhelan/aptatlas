// The Help Me Choose engine. No React and no data imports: the site and the MCP server (tools/mcp)
// both run this file, so they cannot disagree.

export const DEFAULT_WEIGHTS = { cost: 3, coverage: 3, precision: 3, specificity: 3, sensitivity: 3, throughput: 3, pqtl: 3 }

// Calibrated scores typically separate the leading platforms by only a point or two,
// so any eligible platform within TIE_BAND points of the top is treated as a
// statistical tie - a co-recommendation rather than a ranked also-ran.
export const TIE_BAND = 3


// Platforms that deliver validated absolute quantification in physical concentration units.
// Nomic nELISA reports ELISA-calibrated pg/mL. The other scored products are label-free /
// relative (Olink, Illumina, and Seer Proteograph XT DIA) or semi-quantitative (NULISA).
// Biognosys offers absolute quantification only via its separate TrueSignature targeted-MS
// service, not the scored TrueDiscovery DIA product, so it is not treated as capable here.
// "Absolute quantification required" filters to this set rather than a quality-score
// threshold, so semi-quantitative platforms no longer satisfy a strict absolute requirement.
export const ABSOLUTE_QUANT_CAPABLE = new Set(['nomic-omni'])

// Vendors that offer absolute quantification (pg/mL) via a separate product not scored here.
// Surfaced as a note when the scored (relative) product is filtered out by an absolute requirement.
export const ABSOLUTE_QUANT_VARIANT_NOTE = {
  'olink-explore-ht':        ' Olink offers absolute quantification (pg/mL) via its custom Flex / Target 48 panels (per-assay calibrators), not the Explore HT product scored here.',
  'nulisa':                  ' Alamar offers absolute quantification (pg/mL) via its NULISAseq AQ panels, not the standard panels scored here.',
  'biognosys-truediscovery': ' Biognosys offers absolute quantification via its separate TrueSignature targeted-MS service, not the TrueDiscovery DIA product scored here.',
}

// Why a hard filter removed a platform, in the words the results page uses.
export function hardFilterLabel(hardFilter, activePathway) {
  return hardFilter === 'ptm'              ? 'Requires DIA-MS PTM capture' :
         hardFilter === 'ptm_systematic'   ? 'No systematic PTM workflow available' :
         hardFilter === 'absquant'         ? 'Requires absolute quantification'  :
         hardFilter === 'protein_coverage' ? (activePathway ? `Covers <50% of the ${activePathway.name} pathway` : `Covers <50% of your target proteins`) : ''
}

export function createChooseEngine({ platforms, scoring }) {
  return function computeResults(answers, weights, toggles, proteinTargets, allProteins) {
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
}
