// Lower-confidence flag. A platform whose evidence-depth score is at or below the
// threshold has its other nine scores flagged as lower confidence wherever they appear.
// Computed from scoring.json at runtime, so the flag follows any score change.
// Display only: it never changes a score, weight, ranking, filter, tie or recommendation.
import scoring from './scoring.json'

export const LOW_EVIDENCE_THRESHOLD = 2

export const evidenceDepth = id => scoring.scores[id]?.evidence_depth

export const isLowerConfidence = id => {
  const d = evidenceDepth(id)
  return d != null && d <= LOW_EVIDENCE_THRESHOLD
}

const REASON = 'Most supporting data are unpublished, vendor-supplied or semi-quantitative'

export const platformNote = id =>
  `Evidence depth is ${evidenceDepth(id)}/5. ${REASON}, so these scores are provisional.`

// For a pair or other multi-platform result: names each flagged platform.
export function includesNote(flagged) {
  const list = flagged.map(f => `${f.name} (evidence depth ${evidenceDepth(f.id)}/5)`).join(' and ')
  return flagged.length > 1
    ? `Includes ${list}. ${REASON}, so their scores are provisional.`
    : `Includes ${list}. ${REASON}, so its scores are provisional.`
}
