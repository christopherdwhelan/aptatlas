// Counting over the protein catalogue (public/proteins.json). The build uses this for the
// site-wide figures and Protein Coverage uses it for its filters, so both count the same way.
// A catalogue entry is one row of proteins.json; a protein is one canonical Swiss-Prot accession.

// Canonical Swiss-Prot accessions credited to a platform for an entry, honoring the
// osteopontin split override (the Q9BX95 row credits P10451 to NULISA, Q9BX95 to Seer).
export const canonFor = (p, pid) => (p.canonical_by_platform && p.canonical_by_platform[pid]) || p.canonical || []

// Canonical accession -> Set of the platforms that measure it
export function platformsByProtein(proteins) {
  const byProtein = new Map()
  for (const p of proteins) {
    for (const pid of p.platforms) {
      for (const acc of canonFor(p, pid)) {
        if (!byProtein.has(acc)) byProtein.set(acc, new Set())
        byProtein.get(acc).add(pid)
      }
    }
  }
  return byProtein
}

export function coverageCounts(proteins) {
  const byProtein = platformsByProtein(proteins)
  const perPlatform = {}
  for (const pids of byProtein.values()) {
    for (const pid of pids) perPlatform[pid] = (perPlatform[pid] || 0) + 1
  }
  const nPlatforms = Object.keys(perPlatform).length
  const platformCounts = [...byProtein.values()].map(pids => pids.size)
  return {
    entries: proteins.length,
    unmappedEntries: proteins.filter(p => p.platforms.every(pid => canonFor(p, pid).length === 0)).length,
    proteins: byProtein.size,
    perPlatform,
    onOnePlatform: platformCounts.filter(n => n === 1).length,
    onAllPlatforms: platformCounts.filter(n => n === nPlatforms).length,
  }
}
