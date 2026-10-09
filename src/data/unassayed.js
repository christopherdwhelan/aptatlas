// Shared loader and labels for the Unassayed Proteome list (public/unassayed/).
// The JSON is about 4 MB uncompressed, so it is fetched only when needed: when the
// Unassayed Proteome tab opens, or on the first search in Protein Coverage. Both use
// this one cached request. Rows keep the column names of the published CSV.

export const UNASSAYED_JSON = '/unassayed/unassayed_proteome_v4.2.json'
export const UNASSAYED_CSV = '/unassayed/unassayed_proteome_v4.2.csv'

export const STATUS_NONE = 'Unassayed (no platform)'
export const STATUS_MS = 'Mass spectrometry only'

let pending = null

export function loadUnassayed() {
  if (!pending) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 30000)
    pending = fetch(UNASSAYED_JSON, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .finally(() => clearTimeout(timer))
      .catch(err => { pending = null; throw err }) // let a later call retry
  }
  return pending
}

export const isDetected = r => !r.detection.startsWith('Not detected')

export const statusLine = r =>
  r.status === STATUS_NONE ? 'Not on any of the six platforms' : `Mass spectrometry only: ${r.ms_catalogues}`

export const detectionLine = r =>
  isDetected(r)
    ? `${r.detection}: GTEx ${r.gtex_tissues_of_32} of 32, Wang ${r.wang_tissues_of_29} of 29`
    : r.detection

// Gene, accession, or protein-name substring match; q is already trimmed and lowercased.
export const matchesQuery = (r, q) =>
  r.gene.toLowerCase().includes(q) || r.uniprot.toLowerCase().includes(q) || r.protein_name.toLowerCase().includes(q)

// Matching rows with exact gene or accession hits first.
export function searchUnassayed(rows, query) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const exact = r => r.gene.toLowerCase() === q || r.uniprot.toLowerCase() === q
  return rows
    .filter(r => matchesQuery(r, q))
    .sort((a, b) => (exact(b) - exact(a)) || a.gene.localeCompare(b.gene))
}
