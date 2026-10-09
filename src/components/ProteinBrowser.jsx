import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { loadUnassayed, searchUnassayed, statusLine, detectionLine, STATUS_NONE } from '../data/unassayed'

const PLATFORM_META = {
  'olink-explore-ht':      { label: 'Olink Explore HT',       color: '#E85D26', partial: false },
  'illumina-protein-prep': { label: 'SomaSeq',  color: '#1B8A4E', partial: false },
  'nulisa':                { label: 'Alamar NULISA',           color: '#7C3AED', partial: false },
  'nomic-omni':            { label: 'Nomic nELISA',            color: '#0891B2', partial: false },
  'seer-proteograph':      { label: 'Seer Proteograph XT',    color: '#DC2626', partial: false },
  'biognosys-truediscovery': { label: 'Biognosys TrueDiscovery', color: '#2563EB', partial: true },
}

const ALL_PLATFORM_IDS = Object.keys(PLATFORM_META)

// Canonical Swiss-Prot accessions credited to a platform for an entry, honoring the
// osteopontin split override (the Q9BX95 row credits P10451 to NULISA, Q9BX95 to Seer).
const canonFor = (p, pid) => (p.canonical_by_platform && p.canonical_by_platform[pid]) || p.canonical || []
const PAGE_SIZE = 100

const SHORT_LABELS = {
  'olink-explore-ht':        'Olink HT',
  'illumina-protein-prep':   'SomaSeq',
  'nulisa':                  'NULISA',
  'nomic-omni':              'Nomic',
  'seer-proteograph':        'Seer XT',
  'biognosys-truediscovery': 'Biognosys',
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

// CSV-escape a single field (quote if it contains comma, quote, or newline)
function csvField(val) {
  const s = val == null ? '' : String(val)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// Build a CSV string from protein records and trigger a download.
function downloadProteinsCSV(records, filename) {
  const header = ['UniProt ID', 'Gene', 'Protein Name', 'Platforms']
  const lines = [header.map(csvField).join(',')]
  for (const p of records) {
    const platforms = (p.platforms || []).map(pid => SHORT_LABELS[pid] || pid).join('; ')
    lines.push([p.uniprot, p.gene, p.name, platforms].map(csvField).join(','))
  }
  // Prepend UTF-8 BOM so Excel reads accented protein names correctly
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function OverlapHeatmap({ proteins }) {
  const { sets, totals } = useMemo(() => {
    const sets = {}
    for (const pid of ALL_PLATFORM_IDS) sets[pid] = new Set()
    for (const p of proteins) {
      for (const pid of p.platforms) { for (const acc of canonFor(p, pid)) sets[pid]?.add(acc) }
    }
    const totals = {}
    for (const pid of ALL_PLATFORM_IDS) totals[pid] = sets[pid].size
    return { sets, totals }
  }, [proteins])

  const overlaps = useMemo(() => {
    const result = {}
    for (const a of ALL_PLATFORM_IDS) {
      for (const b of ALL_PLATFORM_IDS) {
        if (a === b) { result[`${a}|${b}`] = totals[a]; continue }
        let count = 0
        for (const id of sets[a]) { if (sets[b].has(id)) count++ }
        result[`${a}|${b}`] = count
      }
    }
    return result
  }, [sets, totals])

  return (
    <div>
      <div className="overflow-x-auto">
        <table style={{ borderCollapse: 'separate', borderSpacing: 3 }}>
          <thead>
            <tr>
              <th style={{ width: 90 }} />
              {ALL_PLATFORM_IDS.map(pid => (
                <th key={pid} style={{
                  color: PLATFORM_META[pid].color,
                  fontSize: 10, fontWeight: 500, textAlign: 'center',
                  padding: '0 2px 10px', whiteSpace: 'nowrap', width: 82,
                }}>
                  {SHORT_LABELS[pid]}
                  {PLATFORM_META[pid].partial && <span style={{ opacity: 0.6 }}>*</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_PLATFORM_IDS.map(rowPid => (
              <tr key={rowPid}>
                <td style={{
                  color: PLATFORM_META[rowPid].color,
                  fontSize: 10, fontWeight: 500, textAlign: 'right',
                  paddingRight: 10, whiteSpace: 'nowrap', verticalAlign: 'middle',
                }}>
                  {SHORT_LABELS[rowPid]}
                  {PLATFORM_META[rowPid].partial && <span style={{ opacity: 0.6 }}>*</span>}
                </td>
                {ALL_PLATFORM_IDS.map(colPid => {
                  const isDiag = rowPid === colPid
                  const val = overlaps[`${rowPid}|${colPid}`] ?? 0
                  const pct = isDiag ? 1 : val / Math.min(totals[rowPid], totals[colPid])
                  const rgb = hexToRgb(PLATFORM_META[rowPid].color)
                  const bg = isDiag
                    ? `rgba(${rgb},0.12)`
                    : `rgba(${rgb},${Math.max(0.04, pct * 0.8)})`
                  const textColor = !isDiag && pct > 0.55 ? 'white' : isDiag ? PLATFORM_META[rowPid].color : '#52504a'
                  const tooltip = isDiag
                    ? `${SHORT_LABELS[rowPid]}: ${val.toLocaleString()} proteins total`
                    : `${SHORT_LABELS[rowPid]} ∩ ${SHORT_LABELS[colPid]}: ${val.toLocaleString()} shared (${Math.round(pct * 100)}% of smaller panel)`
                  return (
                    <td key={colPid} title={tooltip} style={{
                      background: bg,
                      textAlign: 'center',
                      fontSize: 11,
                      fontWeight: isDiag ? 500 : 400,
                      color: textColor,
                      padding: '7px 4px',
                      borderRadius: 0,
                      minWidth: 66,
                      cursor: 'default',
                    }}>
                      {val.toLocaleString()}
                      {!isDiag && (
                        <div style={{ fontSize: 9, opacity: 0.75, marginTop: 1 }}>
                          {Math.round(pct * 100)}%
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[10px]" style={{ color: '#6f6d67' }}>
        Diagonal = total proteins per platform. Off-diagonal = shared proteins + % of smaller panel.
        Color intensity reflects overlap fraction. * Biognosys list is study-dependent (Ahadi 2025 depletion-workflow cohort; a conservative lower bound vs. the ~7,000-protein P2 enrichment figure).
      </p>
    </div>
  )
}

function VennDiagram({ proteins, platformIds }) {
  const regions = useMemo(() => {
    const setFor = (pid) => {
      const s = new Set()
      for (const p of proteins) if (p.platforms.includes(pid)) for (const acc of canonFor(p, pid)) s.add(acc)
      return s
    }
    if (platformIds.length === 2) {
      const [a, b] = platformIds
      const A = setFor(a), B = setFor(b)
      let onlyA = 0, onlyB = 0, AB = 0
      for (const x of new Set([...A, ...B])) { const ia = A.has(x), ib = B.has(x); if (ia && ib) AB++; else if (ia) onlyA++; else onlyB++ }
      return { onlyA, onlyB, AB }
    }
    const [a, b, c] = platformIds
    const A = setFor(a), B = setFor(b), C = setFor(c)
    let onlyA = 0, onlyB = 0, onlyC = 0, AB = 0, AC = 0, BC = 0, ABC = 0
    for (const x of new Set([...A, ...B, ...C])) {
      const ia = A.has(x), ib = B.has(x), ic = C.has(x)
      if (ia && ib && ic) ABC++
      else if (ia && ib) AB++
      else if (ia && ic) AC++
      else if (ib && ic) BC++
      else if (ia) onlyA++
      else if (ib) onlyB++
      else onlyC++
    }
    return { onlyA, onlyB, onlyC, AB, AC, BC, ABC }
  }, [proteins, platformIds])

  const fmt = n => n.toLocaleString()
  const ca = PLATFORM_META[platformIds[0]].color
  const cb = PLATFORM_META[platformIds[1]].color
  const cc = platformIds[2] ? PLATFORM_META[platformIds[2]].color : null

  if (platformIds.length === 2) {
    const { onlyA, onlyB, AB } = regions
    return (
      <svg viewBox="0 0 340 200" style={{ width: '100%' }}>
        <circle cx={135} cy={100} r={88} fill={ca} fillOpacity={0.14} stroke={ca} strokeWidth={1.5} />
        <circle cx={205} cy={100} r={88} fill={cb} fillOpacity={0.14} stroke={cb} strokeWidth={1.5} />
        {/* labels inside unique regions */}
        <text x={100} y={91}  textAnchor="middle" fontSize={10} fontWeight={500} fill={ca}>{SHORT_LABELS[platformIds[0]]}</text>
        <text x={100} y={106} textAnchor="middle" fontSize={13} fontWeight={500} fill={ca}>{fmt(onlyA)}</text>
        <text x={240} y={91}  textAnchor="middle" fontSize={10} fontWeight={500} fill={cb}>{SHORT_LABELS[platformIds[1]]}</text>
        <text x={240} y={106} textAnchor="middle" fontSize={13} fontWeight={500} fill={cb}>{fmt(onlyB)}</text>
        <text x={170} y={94}  textAnchor="middle" fontSize={9}  fill="#6f6d67">shared</text>
        <text x={170} y={108} textAnchor="middle" fontSize={13} fontWeight={500} fill="#52504a">{fmt(AB)}</text>
      </svg>
    )
  }

  const { onlyA, onlyB, onlyC, AB, AC, BC, ABC } = regions
  return (
    <svg viewBox="0 0 340 300" style={{ width: '100%' }}>
      <circle cx={170} cy={108} r={90} fill={ca} fillOpacity={0.13} stroke={ca} strokeWidth={1.5} />
      <circle cx={112} cy={208} r={90} fill={cb} fillOpacity={0.13} stroke={cb} strokeWidth={1.5} />
      <circle cx={228} cy={208} r={90} fill={cc} fillOpacity={0.13} stroke={cc} strokeWidth={1.5} />
      {/* unique labels - positioned at centroid of each exclusive region */}
      <text x={170} y={55}  textAnchor="middle" fontSize={10} fontWeight={500} fill={ca}>{SHORT_LABELS[platformIds[0]]}</text>
      <text x={170} y={69}  textAnchor="middle" fontSize={12} fontWeight={500} fill={ca}>{fmt(onlyA)}</text>
      <text x={76}  y={255} textAnchor="middle" fontSize={10} fontWeight={500} fill={cb}>{SHORT_LABELS[platformIds[1]]}</text>
      <text x={76}  y={269} textAnchor="middle" fontSize={12} fontWeight={500} fill={cb}>{fmt(onlyB)}</text>
      <text x={264} y={255} textAnchor="middle" fontSize={10} fontWeight={500} fill={cc}>{SHORT_LABELS[platformIds[2]]}</text>
      <text x={264} y={269} textAnchor="middle" fontSize={12} fontWeight={500} fill={cc}>{fmt(onlyC)}</text>
      {/* pairwise intersection labels */}
      <text x={130} y={158} textAnchor="middle" fontSize={11} fill="#52504a">{fmt(AB)}</text>
      <text x={210} y={158} textAnchor="middle" fontSize={11} fill="#52504a">{fmt(AC)}</text>
      <text x={170} y={248} textAnchor="middle" fontSize={11} fill="#52504a">{fmt(BC)}</text>
      {/* triple intersection */}
      <text x={170} y={195} textAnchor="middle" fontSize={12} fontWeight={500} fill="#52504a">{fmt(ABC)}</text>
    </svg>
  )
}

function VennNote() {
  return (
    <p className="mt-2 text-[10px]" style={{ color: '#6f6d67' }}>
      Unique counts reflect overlap with selected platforms only; a protein may also appear on unselected platforms.
    </p>
  )
}

function VennSection({ proteins }) {
  const [mode, setMode] = useState(2)
  const [selA, setSelA] = useState('olink-explore-ht')
  const [selB, setSelB] = useState('illumina-protein-prep')
  const [selC, setSelC] = useState('seer-proteograph')

  const platformIds = mode === 2 ? [selA, selB] : [selA, selB, selC]

  const selStyle = (pid) => ({
    fontSize: 11, borderRadius: 0, border: `1px solid ${PLATFORM_META[pid].color}40`,
    padding: '4px 8px', color: PLATFORM_META[pid].color,
    background: PLATFORM_META[pid].color + '0d', cursor: 'pointer',
  })

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex border overflow-hidden text-xs" style={{ borderColor: '#e5e4e2' }}>
          {[2, 3].map(n => (
            <button key={n} onClick={() => setMode(n)} className="px-3 py-1.5 cursor-pointer transition"
              style={{ background: mode === n ? '#8B1A1A' : '#ffffff', color: mode === n ? 'white' : '#52504a' }}>
              {n}-platform
            </button>
          ))}
        </div>
        <select value={selA} onChange={e => setSelA(e.target.value)} style={selStyle(selA)}>
          {ALL_PLATFORM_IDS.map(pid => <option key={pid} value={pid}>{PLATFORM_META[pid].label}</option>)}
        </select>
        <select value={selB} onChange={e => setSelB(e.target.value)} style={selStyle(selB)}>
          {ALL_PLATFORM_IDS.map(pid => <option key={pid} value={pid}>{PLATFORM_META[pid].label}</option>)}
        </select>
        {mode === 3 && (
          <select value={selC} onChange={e => setSelC(e.target.value)} style={selStyle(selC)}>
            {ALL_PLATFORM_IDS.map(pid => <option key={pid} value={pid}>{PLATFORM_META[pid].label}</option>)}
          </select>
        )}
      </div>
      <VennDiagram proteins={proteins} platformIds={platformIds} />
      <VennNote />
    </div>
  )
}

// Lookups of proteins that no platform lists (or only a mass spectrometry list) would
// otherwise come back empty or without tissue context; answer them from the Unassayed
// Proteome list and link through to that tab.
const UNASSAYED_SHOWN = 5

function UnassayedMatches({ hits, query, onOpen }) {
  const shown = hits.slice(0, UNASSAYED_SHOWN)
  const scope = hits.some(r => r.status !== STATUS_NONE) ? 'affinity' : 'none'
  return (
    <div style={{ background: '#fafaf9', border: '1px solid #e5e4e2', borderLeft: '3px solid #8B1A1A', padding: '14px 18px' }}>
      <p className="uppercase mb-2" style={{ fontSize: 10, letterSpacing: '0.08em', color: '#8B1A1A', fontWeight: 500 }}>
        In the Unassayed Proteome list
      </p>
      <ul className="space-y-2.5">
        {shown.map(r => (
          <li key={r.uniprot}>
            <p className="text-sm" style={{ color: '#141310', fontWeight: 400 }}>
              <span className="font-mono text-xs mr-2">{r.gene}</span>
              <a href={`https://www.uniprot.org/uniprotkb/${r.uniprot}`} target="_blank" rel="noopener noreferrer"
                className="font-mono text-xs hover:underline mr-2" style={{ color: '#C44D18' }}>{r.uniprot}</a>
              <span style={{ color: '#52504a' }}>{r.protein_name}</span>
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#52504a', fontWeight: 400 }}>
              <span style={{ color: '#141310', fontWeight: 500 }}>{statusLine(r)}.</span>{' '}{detectionLine(r)}.
            </p>
          </li>
        ))}
      </ul>
      <button onClick={() => onOpen?.(query.trim(), scope)} className="text-xs mt-3 hover:underline cursor-pointer" style={{ color: '#8B1A1A', fontWeight: 400 }}>
        {hits.length > UNASSAYED_SHOWN
          ? `View all ${hits.length.toLocaleString()} matches in the Unassayed Proteome tab →`
          : 'View in the Unassayed Proteome tab →'}
      </button>
    </div>
  )
}

function PlatformPill({ platformId, small }) {
  const meta = PLATFORM_META[platformId]
  if (!meta) return null
  return (
    <span
      className={`inline-flex items-center font-medium ${small ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'}`}
      style={{ background: meta.color + '18', color: meta.color, border: `1px solid ${meta.color}30` }}
    >
      {meta.partial ? `${meta.label}*` : meta.label}
    </span>
  )
}

export default function ProteinBrowser({ initialPlatform, onNavigate, onOpenUnassayed }) {
  const [proteins, setProteins] = useState(null)
  const [loadError, setLoadError] = useState(false)
  // Distinct reviewed human proteins (canonical Swiss-Prot accessions), not browsable rows:
  // proteins are listed under several identifier formats (isoforms, MS protein groups,
  // unreviewed accessions) and some collapse to the same canonical protein, so counting rows
  // overcounts. Dedupe by canonical accession to match the Overview KPI's distinct definition.
  const uniqueProteinCount = useMemo(
    () => proteins ? new Set(proteins.flatMap(p => p.canonical || [])).size : null,
    [proteins]
  )
  const [selectedPlatforms, setSelectedPlatforms] = useState(
    initialPlatform ? new Set([initialPlatform]) : new Set(ALL_PLATFORM_IDS)
  )
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [coverageFilter, setCoverageFilter] = useState('all') // 'all' | 'unique' | 'shared'
  const [partialDismissed, setPartialDismissed] = useState(false)
  const [seerDismissed, setSeerDismissed] = useState(false)
  const [showOverlap, setShowOverlap] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchRef = useRef(null)
  // The Unassayed Proteome list is fetched on first use of the search box, not on page load.
  const [unassayed, setUnassayed] = useState(null)
  const unassayedRequested = useRef(false)
  const requestUnassayed = () => {
    if (unassayedRequested.current) return
    unassayedRequested.current = true
    loadUnassayed().then(setUnassayed, () => { unassayedRequested.current = false })
  }
  const unassayedHits = useMemo(
    () => (unassayed && search.trim().length >= 2 ? searchUnassayed(unassayed, search) : []),
    [unassayed, search]
  )

  // Robust load: check the response, cap a stalled request at 30s, and surface
  // a retryable error instead of spinning forever on any fetch/parse failure.
  const loadProteins = useCallback(() => {
    setLoadError(false)
    if (window.__PROTEINS__) { setProteins(window.__PROTEINS__); return }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 30000)
    fetch('/proteins.json', { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(data => setProteins(data))
      .catch(() => setLoadError(true))
      .finally(() => clearTimeout(timer))
  }, [])

  useEffect(() => { loadProteins() }, [loadProteins])

  const togglePlatform = useCallback((pid) => {
    setSelectedPlatforms(prev => {
      const next = new Set(prev)
      if (next.has(pid)) {
        if (next.size > 1) next.delete(pid)
      } else {
        next.add(pid)
      }
      setPage(0)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedPlatforms(new Set(ALL_PLATFORM_IDS))
    setPage(0)
  }, [])

  const filtered = useMemo(() => {
    if (!proteins) return []
    const q = search.trim().toLowerCase()
    const isBlankGene = g => !g || g === '0' || g === '-'
    return proteins
      .filter(p => {
        // Must have at least one selected platform
        if (!p.platforms.some(pid => selectedPlatforms.has(pid))) return false
        // Coverage filter: proteins in exactly one platform, or in all six
        if (coverageFilter === 'unique' && p.platformCount !== 1) return false
        if (coverageFilter === 'shared' && p.platformCount !== ALL_PLATFORM_IDS.length) return false
        // Text search
        if (q) {
          const aliasMatch = p.aliases?.some(a => a.toLowerCase().includes(q))
          if (
            !p.gene?.toLowerCase().includes(q) &&
            !p.name?.toLowerCase().includes(q) &&
            !p.uniprot?.toLowerCase().includes(q) &&
            !aliasMatch
          ) return false
        }
        return true
      })
      .sort((a, b) => {
        const aBlank = isBlankGene(a.gene)
        const bBlank = isBlankGene(b.gene)
        if (aBlank !== bBlank) return aBlank ? 1 : -1
        return (a.gene || '').localeCompare(b.gene || '')
      })
  }, [proteins, selectedPlatforms, search, coverageFilter])

  const downloadCurrentView = useCallback(() => {
    downloadProteinsCSV(filtered, 'apt_protein_coverage.csv')
  }, [filtered])

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE)
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleSearch = (e) => {
    const val = e.target.value
    setSearch(val)
    setPage(0)
    requestUnassayed()
    if (val.trim().length >= 2 && proteins) {
      const q = val.trim().toLowerCase()
      const matches = []
      const seen = new Set()
      for (const p of proteins) {
        if (matches.length >= 8) break
        const gene = p.gene?.toUpperCase()
        const name = p.name
        if (gene && gene.toLowerCase().startsWith(q) && !seen.has(gene)) {
          seen.add(gene)
          matches.push({ label: gene, sub: name, type: 'gene' })
        }
      }
      // Then genes on no platform (from the Unassayed Proteome list, once loaded)
      for (const r of unassayed || []) {
        if (matches.length >= 8) break
        if (r.status === STATUS_NONE && r.gene.toLowerCase().startsWith(q) && !seen.has(r.gene)) {
          seen.add(r.gene)
          matches.push({ label: r.gene, sub: r.protein_name, type: 'unassayed' })
        }
      }
      // Also match mid-string on protein name
      for (const p of proteins) {
        if (matches.length >= 8) break
        const gene = p.gene?.toUpperCase()
        if (gene && seen.has(gene)) continue
        if (p.name?.toLowerCase().includes(q)) {
          if (gene) seen.add(gene)
          matches.push({ label: gene || p.uniprot, sub: p.name, type: 'name' })
        }
      }
      setSuggestions(matches)
      setShowSuggestions(matches.length > 0)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  const handleSuggestionClick = (suggestion) => {
    setSearch(suggestion.label)
    setPage(0)
    setSuggestions([])
    setShowSuggestions(false)
    searchRef.current?.focus()
  }

  const hasPartialSelected = [...selectedPlatforms].some(pid => PLATFORM_META[pid]?.partial)
  const hasSeerSelected = selectedPlatforms.has('seer-proteograph')

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl" style={{ color: '#141310', fontWeight: 500 }}>Protein Coverage Browser</h2>
        <p className="text-sm mt-1" style={{ color: '#52504a', fontWeight: 400 }}>
          {uniqueProteinCount != null ? `${uniqueProteinCount.toLocaleString()} unique proteins` : (loadError ? 'Protein data unavailable' : 'Loading protein data…')} across 6 platforms, matched by UniProt ID.
          Filter by platform to see coverage and overlap.
        </p>
      </div>

      {/* Filters */}
      <div style={{ background: '#ffffff', border: '1px solid #e5e4e2', borderTop: '2px solid #141310', padding: '16px 20px' }} className="space-y-4">
        {/* Platform toggles */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="uppercase" style={{ fontSize: 10, letterSpacing: '0.08em', color: '#6f6d67', fontWeight: 400 }}>
              Filter by Platform
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowOverlap(v => !v)}
                aria-expanded={showOverlap}
                className="text-xs hover:underline"
                style={{ color: '#8B1A1A', fontWeight: 400 }}
              >
                {showOverlap ? 'Hide cross-platform overlap ↑' : 'Show cross-platform overlap →'}
              </button>
              <button
                onClick={selectAll}
                className="text-xs hover:underline"
                style={{ color: '#C44D18', fontWeight: 400 }}
              >
                Show all
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_PLATFORM_IDS.map(pid => {
              const meta = PLATFORM_META[pid]
              const active = selectedPlatforms.has(pid)
              return (
                <button
                  key={pid}
                  onClick={() => togglePlatform(pid)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 transition-all border cursor-pointer"
                  style={{
                    background: active ? meta.color + '15' : '#fafaf9',
                    color: active ? meta.color : '#6f6d67',
                    borderColor: active ? meta.color + '40' : '#e5e4e2',
                    fontWeight: 400,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: active ? meta.color : '#d0cfcc' }}
                  />
                  {meta.label}
                  {meta.partial && <span className="opacity-60">*</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Search + shared toggle row */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              width="19" height="19" viewBox="0 0 24 24" fill="none"
              stroke="#6f6d67" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search by gene name, protein name, or UniProt ID…"
              value={search}
              onChange={handleSearch}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onFocus={() => { requestUnassayed(); if (suggestions.length > 0) setShowSuggestions(true) }}
              className="w-full pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:border-transparent transition"
              style={{ fontSize: 16.5, color: '#141310', background: '#ffffff', border: '1px solid #d0cfcc', fontWeight: 400, '--tw-ring-color': '#8B1A1A' }}
            />
            {/* Autocomplete dropdown */}
            {showSuggestions && (
              <div className="absolute z-20 w-full mt-0.5 bg-white border overflow-hidden"
                style={{ border: '1px solid #d0cfcc', borderTop: '2px solid #8B1A1A', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onMouseDown={() => handleSuggestionClick(s)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-[#fafaf9] transition cursor-pointer"
                    style={{ borderBottom: i < suggestions.length - 1 ? '1px solid #f3f2f0' : 'none' }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 400, color: '#141310' }}>{s.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 400, color: '#6f6d67' }} className="truncate max-w-[55%] text-right ml-3">{s.type === 'unassayed' ? `No platform · ${s.sub}` : s.sub}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="uppercase" style={{ color: '#6f6d67', fontSize: 10, letterSpacing: '0.06em', fontWeight: 500 }}>Coverage</span>
            <div className="inline-flex" role="radiogroup" aria-label="Coverage filter">
              {[
                { id: 'all',    label: 'All proteins' },
                { id: 'unique', label: 'Unique to one platform' },
                { id: 'shared', label: 'Measured by all six' },
              ].map((opt, i) => {
                const active = coverageFilter === opt.id
                return (
                  <button
                    key={opt.id}
                    role="radio"
                    aria-checked={active}
                    onClick={() => { setCoverageFilter(opt.id); setPage(0) }}
                    className="text-xs px-2.5 py-1 border transition-colors cursor-pointer"
                    style={{
                      background: active ? '#8B1A1A' : '#ffffff',
                      color: active ? '#fff' : '#52504a',
                      borderColor: active ? '#8B1A1A' : '#e5e4e2',
                      marginLeft: i === 0 ? 0 : -1,
                      fontWeight: 400,
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Cross-platform overlap (toggled from the filter header) */}
      {showOverlap && proteins && (
        <div style={{ background: '#ffffff', border: '1px solid #e5e4e2', borderTop: '2px solid #141310', padding: '20px' }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="uppercase mb-4" style={{ fontSize: 10, letterSpacing: '0.08em', color: '#6f6d67', fontWeight: 400 }}>
                All-Platform Overlap Matrix
              </h3>
              <OverlapHeatmap proteins={proteins} />
            </div>
            <div>
              <h3 className="uppercase mb-4" style={{ fontSize: 10, letterSpacing: '0.08em', color: '#6f6d67', fontWeight: 400 }}>
                Venn Diagram
              </h3>
              <VennSection proteins={proteins} />
            </div>
          </div>
        </div>
      )}

      {/* Results summary */}
      {!proteins ? (
        loadError ? (
          <div className="py-12 text-center" style={{ color: '#6f6d67' }}>
            <p className="text-sm mb-2" style={{ fontWeight: 400, color: '#8B1A1A' }}>
              Couldn't load the protein dataset.
            </p>
            <p className="text-xs mb-4" style={{ fontWeight: 400 }}>
              This is usually a temporary network issue. Check your connection and try again.
            </p>
            <button
              onClick={loadProteins}
              className="text-xs px-4 py-2 border transition-colors"
              style={{ color: '#8B1A1A', borderColor: '#8B1A1A', background: 'transparent', fontWeight: 400 }}
              onMouseEnter={e => { e.currentTarget.style.background = '#8B1A1A'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8B1A1A' }}
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="py-12 text-center" style={{ color: '#6f6d67' }}>
            <div className="inline-block w-6 h-6 rounded-full border-2 border-t-transparent animate-spin mb-2"
              style={{ borderColor: '#8B1A1A', borderTopColor: 'transparent' }} />
            <p className="text-sm" style={{ fontWeight: 400 }}>Loading protein data…</p>
          </div>
        )
      ) : (
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm" style={{ color: '#52504a', fontWeight: 400 }}>
          <span style={{ color: '#141310', fontWeight: 500 }}>
            {filtered.length.toLocaleString()}
          </span>{' '}
          protein{filtered.length !== 1 ? 's' : ''} matched
          {coverageFilter === 'unique' && ' · unique to one platform'}
          {coverageFilter === 'shared' && ' · measured by all six'}
        </p>
        <div className="flex items-center gap-3 flex-shrink-0">
          {pageCount > 1 && (
            <p className="text-xs" style={{ color: '#6f6d67' }}>
              Page {page + 1} of {pageCount}
            </p>
          )}
          <button
            onClick={downloadCurrentView}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 border transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: '#fafaf9', borderColor: '#8B1A1A40', color: '#8B1A1A', fontWeight: 400 }}
            title="Download the current filtered list as CSV"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8B1A1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download CSV
          </button>
        </div>
      </div>
      )}

      {proteins && unassayedHits.length > 0 && (
        <UnassayedMatches hits={unassayedHits} query={search} onOpen={onOpenUnassayed} />
      )}

      {/* Table */}
      {proteins && <div style={{ background: '#ffffff', border: '1px solid #e5e4e2', borderTop: '2px solid #141310', overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div className="py-16 text-center" style={{ color: '#6f6d67' }}>
            No proteins match your filters.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#fafaf9', borderBottom: '1px solid #e5e4e2' }}>
                    <th className="text-left px-4 py-3 uppercase w-24"
                      style={{ fontSize: 10, letterSpacing: '0.08em', color: '#6f6d67', fontWeight: 400 }}>Gene</th>
                    <th className="text-left px-4 py-3 uppercase"
                      style={{ fontSize: 10, letterSpacing: '0.08em', color: '#6f6d67', fontWeight: 400 }}>Protein Name</th>
                    <th className="text-left px-4 py-3 uppercase w-28"
                      style={{ fontSize: 10, letterSpacing: '0.08em', color: '#6f6d67', fontWeight: 400 }}>UniProt</th>
                    <th className="text-left px-4 py-3 uppercase"
                      style={{ fontSize: 10, letterSpacing: '0.08em', color: '#6f6d67', fontWeight: 400 }}>Platforms</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((p, i) => {
                    const isShared = p.platformCount > 1
                    const platformsToShow = p.platforms.filter(pid => selectedPlatforms.has(pid))
                    return (
                      <tr key={p.uniprot + (p.name || '')}
                        style={{ borderBottom: i < pageItems.length - 1 ? '1px solid #e5e4e2' : 'none' }}
                        className="transition-colors"
                        onMouseEnter={e => e.currentTarget.style.background = '#fafaf9'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td className="px-4 py-2.5 font-mono text-xs" style={{ color: '#141310', fontWeight: 400 }}>
                          {p.gene || '-'}
                        </td>
                        <td className="px-4 py-2.5" style={{ color: '#52504a', fontWeight: 400 }}>
                          <div className="flex items-center gap-2">
                            <span className="leading-snug">{p.name || p.gene || '-'}</span>
                            {p.alamarPanels && (
                              <span className="text-[10px] px-1.5 py-0 font-medium flex-shrink-0"
                                style={{ background: '#7C3AED18', color: '#7C3AED' }}>
                                {p.alamarPanels.join(' + ')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <a
                            href={`https://www.uniprot.org/uniprotkb/${p.uniprot.split('-')[0]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs hover:underline cursor-pointer"
                            style={{ color: '#C44D18' }}
                          >
                            {p.uniprot}
                          </a>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1 items-center">
                            {platformsToShow.map(pid => (
                              <PlatformPill key={pid} platformId={pid} small />
                            ))}
                            {isShared && p.platformCount > platformsToShow.length && (
                              <span className="text-[10px] px-1.5 font-medium"
                                style={{ background: '#f3f2f0', color: '#6f6d67' }}>
                                +{p.platformCount - platformsToShow.length} more
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pageCount > 1 && (
              <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid #e5e4e2' }}>
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="text-sm px-3 py-1.5 border transition disabled:opacity-40 cursor-pointer"
                  style={{ borderColor: '#e5e4e2', color: '#52504a', fontWeight: 400 }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#fafaf9' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  ← Previous
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(pageCount, 7) }, (_, i) => {
                    const idx = pageCount <= 7 ? i : page < 4 ? i : page > pageCount - 4 ? pageCount - 7 + i : page - 3 + i
                    const isActive = idx === page
                    return (
                      <button
                        key={idx}
                        onClick={() => setPage(idx)}
                        className="w-8 h-8 text-xs border transition cursor-pointer"
                        style={{
                          borderColor: isActive ? '#8B1A1A' : '#e5e4e2',
                          background: isActive ? '#8B1A1A' : 'transparent',
                          color: isActive ? 'white' : '#52504a',
                          fontWeight: 400,
                        }}
                        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = '#fafaf9'; e.currentTarget.style.borderColor = '#d0cfcc' } }}
                        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#e5e4e2' } }}
                      >
                        {idx + 1}
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
                  disabled={page === pageCount - 1}
                  className="text-sm px-3 py-1.5 border transition disabled:opacity-40 cursor-pointer"
                  style={{ borderColor: '#e5e4e2', color: '#52504a', fontWeight: 400 }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#fafaf9' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      }

      {/* Biognosys partial data notice (below the table) */}
      {hasPartialSelected && !partialDismissed && (
        <div className="px-4 py-3 text-sm flex items-start gap-2"
          style={{ background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.2)' }}>
          <span style={{ color: '#d97706' }}>⚠</span>
          <p style={{ color: '#92400e', fontWeight: 400 }} className="flex-1">
            <strong style={{ fontWeight: 500 }}>Note (Biognosys TrueDiscovery):</strong> TrueDiscovery is an MS-DIA platform without a fixed panel: detectable proteins are study- and workflow-dependent. The list shown here (3,575 proteins) is from Ahadi, Kirsher et al. 2025 (Communications Chemistry, Supplementary Data 8, MS-HAP Depletion arm), a published, matched-cohort head-to-head comparison. It reflects Biognosys's standard depletion workflow and is a conservative lower bound relative to the ~7,000 protein groups Biognosys reports using its higher-depth P2 enrichment workflow; it is not exhaustive.
          </p>
          <button
            onClick={() => setPartialDismissed(true)}
            className="flex-shrink-0 ml-1 leading-none"
            style={{ color: '#b45309', fontSize: '16px', lineHeight: 1, cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Seer direct-list note (below the table) */}
      {hasSeerSelected && !seerDismissed && (
        <div className="px-4 py-3 text-sm flex items-start gap-2"
          style={{ background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.15)' }}>
          <span style={{ color: '#DC2626', fontSize: 13 }}>ℹ</span>
          <p style={{ color: '#7f1d1d', fontWeight: 400 }} className="flex-1">
            <strong style={{ fontWeight: 500 }}>Seer Proteograph XT:</strong> Protein list received directly from Seer (April 2026), reflecting 10,698 protein groups identified at least twice across two independent plasma studies. As with all MS-DIA platforms, detectable proteins remain partially study-dependent.
          </p>
          <button
            onClick={() => setSeerDismissed(true)}
            className="flex-shrink-0 ml-1 leading-none"
            style={{ color: '#b91c1c', fontSize: '16px', lineHeight: 1, cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Footer note */}
      <p className="text-xs text-center" style={{ color: '#6f6d67' }}>
        * Biognosys TrueDiscovery protein list is from Ahadi, Kirsher et al. 2025 (Communications Chemistry, Supplementary Data 8, MS-HAP Depletion arm) and is study-dependent: a conservative lower bound relative to the ~7,000-protein P2 enrichment figure Biognosys reports for its higher-depth workflow.
        Seer Proteograph XT list received directly from Seer (April 2026; 10,698 protein groups, ≥2 identifications across two independent studies).
        All other platforms represent full published panel contents.
      </p>
    </div>
  )
}
