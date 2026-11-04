// Headline figures for the site, computed from the same data the tables use.
// `coverage` comes from the aptStats plugin in vite.config.js, which counts public/proteins.json
// at build time and stops the build if the data sources disagree.
import coverage from 'virtual:apt-stats'
import catalog from './all_platforms.json'
import platforms from './platforms.json'
import evidence from './evidence.json'
import combine from './helpMeCombine.json'
import scoring from './scoring.json'

export { coverage }

const fmt = n => n.toLocaleString('en-US')

export const catalogueCount = catalog.platforms.length
export const assessedCount = platforms.length
export const scoredDimensionCount = scoring.dimensions.length
export const maxProteinsOnOnePlatform = Math.max(...Object.values(coverage.perPlatform))
export const canonicalProteome = combine.universe.proteome_canonical
export const proteinsOnNoPlatform = canonicalProteome - coverage.proteins
export const drugTargetCount = combine.universe.drug_targets
export const drugTargetsOnAPlatform = combine.universe.drug_targets_on_a_platform

export const studyCount = evidence.length
// Independent head-to-head: the same samples on two or more high-plex platforms, not vendor-authored
// (criterion stated in Methods). Foundational rows are other papers cited on the site, not counted here.
export const independentHeadToHeadCount = evidence.filter(s => !s.foundational && s.platformsCompared.length > 1 && !s.vendorAuthorship).length
export const foundationalCount = evidence.filter(s => s.foundational).length

// Summed study by study over the studies that report a participant count
export const studiesWithParticipants = evidence.filter(s => s.participants != null)
export const participantsAny = studiesWithParticipants.reduce((n, s) => n + s.participants, 0)
export const participantsMulti = studiesWithParticipants.reduce((n, s) => n + s.participantsMultiPlatform, 0)

// Two significant figures: 6,591 -> "~6,600", 95,617 -> "95K+"
const magnitude = n => 10 ** (Math.floor(Math.log10(n)) - 1)
export const approx = n => `~${fmt(Math.round(n / magnitude(n)) * magnitude(n))}`
export const atLeastK = n => `${(Math.floor(n / magnitude(n)) * magnitude(n)) / 1000}K+`

// Seer's headline count is the protein groups it lists, not the distinct proteins counted elsewhere
export function proteinCountNote(platform) {
  if (platform.id !== 'seer-proteograph') return null
  return `${fmt(platform.proteinsNumeric)} is the protein groups Seer lists; they map to ${fmt(coverage.perPlatform[platform.id])} distinct human proteins, the number Protein Coverage counts.`
}
