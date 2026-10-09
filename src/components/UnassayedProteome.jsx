import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { loadUnassayed, isDetected, matchesQuery, STATUS_NONE, UNASSAYED_CSV } from '../data/unassayed'

const PAGE_SIZE = 100
const fmt = n => n.toLocaleString()

const DETECTED_5 = 'Detected in tissue (5 or more tissues)'
const DETECTED_1 = 'Detected in tissue (1 to 4 tissues)'
const NOT_DETECTED = 'Not detected in either tissue proteome'

const anyOption = { id: 'all', label: 'Any' }
const DETECTION_FILTER = [
  anyOption,
  { id: 'detected', label: 'Detected in tissue' },
  { id: DETECTED_5, label: 'Detected in 5 or more tissues' },
  { id: DETECTED_1, label: 'Detected in 1 to 4 tissues' },
  { id: NOT_DETECTED, label: 'Not detected in either tissue proteome' },
]
const CLASS_FILTER = [anyOption, ...['GPCR', 'Ion channel', 'Kinase', 'Transporter', 'Transcription factor', 'Enzyme', 'Other'].map(c => ({ id: c, label: c }))]
const LOC_FILTER = [anyOption, ...['Secreted', 'Single-pass TM', 'Multi-pass TM', 'Intracellular/other'].map(l => ({ id: l, label: l }))]
const DRUG_FILTER = [
  anyOption,
  { id: 'druggable', label: 'Approved or clinical-stage target' },
  { id: 'approved', label: 'Approved drug target' },
  { id: 'clinical', label: 'Clinical-stage target only' },
  { id: 'none', label: 'Not a drug target' },
]
const FIFTH_FILTER = [
  anyOption,
  { id: '1', label: '1: 4 or fewer papers' },
  { id: '2', label: '2: 5 to 13 papers' },
  { id: '3', label: '3: 14 to 34 papers' },
  { id: '4', label: '4: 35 to 97 papers' },
  { id: '5', label: '5: 98 or more papers' },
]

const MS_SHORT = { 'Seer Proteograph XT': 'Seer XT', 'Biognosys TrueDiscovery': 'Biognosys' }
const msShort = r => r.ms_catalogues ? r.ms_catalogues.split('; ').map(s => MS_SHORT[s] || s).join(', ') : ''
const drugRank = r => (r.approved_drug_target ? 2 : r.druggable_target ? 1 : 0)
const maxTissues = r => Math.max(r.gtex_tissues_of_32, r.wang_tissues_of_29)

// Sortable columns; `wide` columns show only in the no-affinity-platform view.
const COLUMNS = [
  { key: 'gene', label: 'Gene', type: 'str', min: 92, sticky: true, get: r => r.gene },
  { key: 'name', label: 'Protein name', type: 'str', min: 250, get: r => r.protein_name },
  { key: 'uniprot', label: 'UniProt', type: 'str', min: 96, get: r => r.uniprot },
  { key: 'ms', label: 'MS list', type: 'str', min: 112, wide: true, get: msShort,
    hint: 'Mass spectrometry lists that include the protein: Seer Proteograph XT, Biognosys TrueDiscovery, or both. None means the protein is on no platform catalogue.' },
  { key: 'detection', label: 'Tissue detection', type: 'num', min: 136, get: maxTissues,
    hint: 'Detected in at least one tissue of either tissue proteome. The 5 or more rule uses the larger of the two tissue counts.' },
  { key: 'gtex', label: 'GTEx', type: 'num', min: 66, get: r => r.gtex_tissues_of_32,
    hint: 'Tissues, of 32, with detection in the GTEx tissue proteome (Jiang et al. 2020).' },
  { key: 'wang', label: 'Wang', type: 'num', min: 66, get: r => r.wang_tissues_of_29,
    hint: 'Tissues, of 29, with detection in Wang et al. 2019.' },
  { key: 'loc', label: 'Localization', type: 'str', min: 132, get: r => r.localization,
    hint: 'UniProt subcellular location, in four levels.' },
  { key: 'cls', label: 'Protein class', type: 'str', min: 136, get: r => r.protein_class,
    hint: 'ChEMBL protein class, with UniProt keywords where ChEMBL has none.' },
  { key: 'drug', label: 'Drug target', type: 'num', min: 100, get: drugRank,
    hint: 'Approved: one of the 929 ChEMBL targets of an approved drug. Clinical: one of the other 520 targets in the 1,449 approved or clinical-stage set.' },
  { key: 'papers', label: 'Focused papers', type: 'num', min: 100, get: r => r.focused_papers,
    hint: 'Papers in NCBI gene2pubmed that cite this gene and 100 or fewer genes in total.' },
  { key: 'fifth', label: 'Research fifth', type: 'num', min: 96, get: r => r.research_fifth,
    hint: '1 = 4 or fewer focused papers; 2 = 5 to 13; 3 = 14 to 34; 4 = 35 to 97; 5 = 98 or more.' },
]

function comparator(col, dir) {
  const s = dir === 'asc' ? 1 : -1
  const tie = (a, b) => a.gene.localeCompare(b.gene)
  if (col.type === 'num') return (a, b) => s * (col.get(a) - col.get(b)) || tie(a, b)
  // Blank text (no MS list) sorts last in either direction.
  return (a, b) => {
    const av = col.get(a), bv = col.get(b)
    if (!av !== !bv) return av ? -1 : 1
    return s * av.localeCompare(bv) || tie(a, b)
  }
}

function csvField(val) {
  const s = val === true ? 'True' : val === false ? 'False' : val == null ? '' : String(val)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// Same columns, names, and True/False booleans as the published CSV.
function downloadCSV(records, columns, filename) {
  const lines = [columns.join(',')]
  for (const r of records) lines.push(columns.map(k => csvField(r[k])).join(','))
  // UTF-8 BOM so Excel reads accented protein names correctly
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

const TH = { fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6f6d67', background: '#ffffff' }
const LABEL = { fontSize: 10, letterSpacing: '0.08em', color: '#6f6d67', fontWeight: 400 }

function SortIcon({ dir }) {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ opacity: dir ? 0.9 : 0.28, marginLeft: 4, verticalAlign: 'middle' }}>
      {dir === 'asc' ? <path d="M12 5v14M5 12l7-7 7 7" />
        : dir === 'desc' ? <path d="M12 19V5M5 12l7 7 7-7" />
        : <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />}
    </svg>
  )
}

// Sortable header cell with an instant tooltip, portalled so the scroll region never clips it.
function HeaderCell({ col, sortCol, sortDir, onSort }) {
  const ref = useRef(null)
  const [tip, setTip] = useState(null)
  const show = () => {
    if (!col.hint || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    setTip({ x: Math.max(8, Math.min(r.left, window.innerWidth - 308)), y: r.bottom + 6 })
  }
  const hide = () => setTip(null)
  const active = sortCol === col.key
  return (
    <th ref={ref}
      onClick={() => onSort(col)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSort(col) } }}
      onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}
      tabIndex={0}
      aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`text-left px-3 py-2.5 sticky top-0 cursor-pointer select-none whitespace-nowrap ${col.sticky ? 'left-0 z-30' : 'z-20'}`}
      style={{ ...TH, minWidth: col.min, borderBottom: '2px solid #141310', boxShadow: '0 1px 0 #141310' }}>
      {col.label}
      <SortIcon dir={active ? sortDir : null} />
      {tip && createPortal(
        <div role="tooltip" style={{
          position: 'fixed', left: tip.x, top: tip.y, zIndex: 60, maxWidth: 300,
          background: '#141310', color: '#fafaf9', fontSize: 11, fontWeight: 300,
          lineHeight: 1.5, letterSpacing: 0, textTransform: 'none', padding: '8px 10px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.28)', pointerEvents: 'none' }}>
          {col.hint} Click to sort.
        </div>, document.body)}
    </th>
  )
}

function Stat({ value, label, note }) {
  return (
    <div className="bg-white px-5 py-4" style={{ border: '1px solid #c8c0b8', borderTop: '2px solid #141310' }}>
      <p className="leading-none tabular-nums" style={{ fontSize: 28, fontWeight: 400, color: '#141310', letterSpacing: '-0.01em' }}>
        {value == null ? '…' : fmt(value)}
      </p>
      <p className="uppercase mt-1.5 leading-tight" style={{ fontSize: 10, fontWeight: 400, letterSpacing: '0.06em', color: '#6f6d67' }}>{label}</p>
      {note && <p className="mt-1 text-xs leading-snug" style={{ color: '#52504a', fontWeight: 400 }}>{note}</p>}
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }) {
  const active = value !== 'all'
  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="uppercase" style={LABEL}>{label}</span>
      <select aria-label={label} value={value} onChange={e => onChange(e.target.value)} className="text-xs cursor-pointer w-full"
        style={{ border: `1px solid ${active ? '#8B1A1A' : '#e5e4e2'}`, padding: '6px 8px', background: '#ffffff', color: active ? '#8B1A1A' : '#52504a', fontWeight: 400 }}>
        {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </label>
  )
}

function DetectionCell({ r }) {
  if (!isDetected(r)) return <span className="text-xs" style={{ color: '#6f6d67' }}>Not detected</span>
  const five = r.detection === DETECTED_5
  return (
    <span className="text-[11px] px-1.5 py-0.5 whitespace-nowrap"
      style={{ color: '#141310', background: five ? 'rgba(20,19,16,0.07)' : '#fafaf9', border: '1px solid #e5e4e2' }}>
      {five ? '5 or more tissues' : '1 to 4 tissues'}
    </span>
  )
}

export default function UnassayedProteome({ initialSearch = '', initialScope = 'none' }) {
  const [rows, setRows] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [scope, setScope] = useState(initialScope) // 'none' | 'affinity'
  const [search, setSearch] = useState(initialSearch)
  const [detection, setDetection] = useState('all')
  const [cls, setCls] = useState('all')
  const [loc, setLoc] = useState('all')
  const [drug, setDrug] = useState('all')
  const [fifth, setFifth] = useState('all')
  const [hideOlf, setHideOlf] = useState(false)
  const [sortCol, setSortCol] = useState('gene')
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(0)
  const scrollRef = useRef(null)

  // Lazy load: the list is fetched when this tab opens (shared with Protein Coverage lookups).
  useEffect(() => {
    let live = true
    loadUnassayed().then(d => { if (live) setRows(d) }, () => { if (live) setLoadError(true) })
    return () => { live = false }
  }, [attempt])

  const retry = () => { setLoadError(false); setAttempt(a => a + 1) }

  const stats = useMemo(() => {
    if (!rows) return null
    const none = rows.filter(r => r.status === STATUS_NONE)
    const notDetected = none.filter(r => !isDetected(r))
    return {
      total: rows.length,
      none: none.length,
      msOnly: rows.length - none.length,
      detected: none.length - notDetected.length,
      notDetected: notDetected.length,
      olfNotDetected: notDetected.filter(r => r.olfactory_or_taste_receptor).length,
    }
  }, [rows])

  const scopeRows = useMemo(
    () => (rows ? (scope === 'none' ? rows.filter(r => r.status === STATUS_NONE) : rows) : []),
    [rows, scope]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = scopeRows.filter(r => {
      if (q && !matchesQuery(r, q)) return false
      if (detection === 'detected' && !isDetected(r)) return false
      if (detection !== 'all' && detection !== 'detected' && r.detection !== detection) return false
      if (cls !== 'all' && r.protein_class !== cls) return false
      if (loc !== 'all' && r.localization !== loc) return false
      if (drug === 'druggable' && !r.druggable_target) return false
      if (drug === 'approved' && !r.approved_drug_target) return false
      if (drug === 'clinical' && !(r.druggable_target && !r.approved_drug_target)) return false
      if (drug === 'none' && r.druggable_target) return false
      if (fifth !== 'all' && r.research_fifth !== Number(fifth)) return false
      if (hideOlf && r.olfactory_or_taste_receptor) return false
      return true
    })
    const col = COLUMNS.find(c => c.key === sortCol) || COLUMNS[0]
    return list.sort(comparator(col, sortDir))
  }, [scopeRows, search, detection, cls, loc, drug, fifth, hideOlf, sortCol, sortDir])

  const wide = scope === 'affinity'
  const columns = COLUMNS.filter(c => wide || !c.wide)
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE)
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const filtersActive = search.trim() !== '' || [detection, cls, loc, drug, fifth].some(v => v !== 'all') || hideOlf

  // Any change to what is listed returns to the first page.
  const reset = setter => value => { setter(value); setPage(0) }
  const goToPage = p => { setPage(p); if (scrollRef.current) scrollRef.current.scrollTop = 0 }

  const changeScope = id => {
    setScope(id)
    setPage(0)
    if (id === 'none' && sortCol === 'ms') { setSortCol('gene'); setSortDir('asc') }
  }

  const clickSort = col => {
    if (sortCol === col.key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col.key); setSortDir(col.type === 'str' ? 'asc' : 'desc') }
    setPage(0)
  }

  const clearFilters = () => {
    setSearch(''); setDetection('all'); setCls('all'); setLoc('all'); setDrug('all'); setFifth('all'); setHideOlf(false); setPage(0)
  }

  const download = () => {
    const name = `apt_unassayed_${wide ? 'no_affinity_platform' : 'no_platform'}${filtersActive ? '_filtered' : ''}.csv`
    downloadCSV(filtered, Object.keys(rows[0]), name)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl" style={{ color: '#141310', fontWeight: 500 }}>Unassayed Proteome</h2>
        <p className="text-sm mt-1 leading-relaxed" style={{ color: '#52504a', fontWeight: 400, maxWidth: '82ch' }}>
          These human proteins are not on the catalogue of any of the six platforms in APT. Each has an
          entry in UniProtKB/Swiss-Prot, the section of the UniProt database that UniProt&rsquo;s curators
          review manually. For each one we show whether two tissue proteomes that used no commercial platform detected it.
          Proteins detected in tissue can be measured in principle; they are not yet on a catalogue.
        </p>
      </div>

      {/* Header strip: the no-platform set */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat value={stats?.none} label="On no platform" />
        <Stat value={stats?.detected} label="Detected in tissue" />
        <Stat value={stats?.notDetected} label="Not detected"
          note={stats ? `${fmt(stats.olfNotDetected)} of them olfactory or taste receptors` : null} />
      </div>

      {/* Caveat (always visible) */}
      <div className="px-5 py-4" style={{ background: 'rgba(215,119,6,0.05)', borderLeft: '4px solid #d97706' }}>
        <p className="text-sm leading-relaxed" style={{ color: '#52504a', fontWeight: 400 }}>
          Not detected means not detected in the GTEx or Wang tissue proteomes. It does not mean the protein
          is absent from the body or cannot be measured. The list changes when vendors add assays, and it is
          regenerated with each APT release.
        </p>
      </div>

      {/* Controls */}
      <div style={{ background: '#ffffff', border: '1px solid #e5e4e2', borderTop: '2px solid #141310', padding: '16px 20px' }} className="space-y-4">
        <div>
          <span className="uppercase block mb-2" style={LABEL}>Show proteins on</span>
          <div className="inline-flex flex-wrap" role="radiogroup" aria-label="Which proteins to list">
            {[
              { id: 'none', label: `No platform${stats ? ` (${fmt(stats.none)})` : ''}` },
              { id: 'affinity', label: `No affinity platform${stats ? ` (${fmt(stats.total)})` : ''}` },
            ].map((opt, i) => {
              const active = scope === opt.id
              return (
                <button key={opt.id} role="radio" aria-checked={active} onClick={() => changeScope(opt.id)}
                  className="text-xs px-3 py-1.5 border transition-colors cursor-pointer"
                  style={{
                    background: active ? '#8B1A1A' : '#ffffff',
                    color: active ? '#ffffff' : '#52504a',
                    borderColor: active ? '#8B1A1A' : '#e5e4e2',
                    marginLeft: i === 0 ? 0 : -1,
                    fontWeight: 400,
                  }}>
                  {opt.label}
                </button>
              )
            })}
          </div>
          <p className="text-xs mt-2" style={{ color: '#6f6d67', fontWeight: 400 }}>
            {wide
              ? `Adds the ${stats ? `${fmt(stats.msOnly)} ` : ''}proteins that are on a mass spectrometry list (Seer Proteograph XT or Biognosys TrueDiscovery) but on none of the four affinity catalogues (Olink Explore HT, SomaSeq, Alamar NULISA, Nomic nELISA).`
              : 'Proteins on none of the six platform catalogues.'}
          </p>
        </div>

        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            width="19" height="19" viewBox="0 0 24 24" fill="none"
            stroke="#6f6d67" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            aria-label="Search unassayed proteins"
            placeholder="Search by gene, UniProt accession, or protein name…"
            value={search}
            onChange={e => reset(setSearch)(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:border-transparent transition"
            style={{ fontSize: 16, color: '#141310', background: '#ffffff', border: '1px solid #d0cfcc', fontWeight: 400, '--tw-ring-color': '#8B1A1A' }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <FilterSelect label="Tissue detection" value={detection} onChange={reset(setDetection)} options={DETECTION_FILTER} />
          <FilterSelect label="Protein class" value={cls} onChange={reset(setCls)} options={CLASS_FILTER} />
          <FilterSelect label="Localization" value={loc} onChange={reset(setLoc)} options={LOC_FILTER} />
          <FilterSelect label="Drug target" value={drug} onChange={reset(setDrug)} options={DRUG_FILTER} />
          <FilterSelect label="Research fifth" value={fifth} onChange={reset(setFifth)} options={FIFTH_FILTER} />
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: '#52504a', fontWeight: 400 }}>
            <input type="checkbox" checked={hideOlf} onChange={e => reset(setHideOlf)(e.target.checked)} style={{ accentColor: '#8B1A1A' }} />
            Hide olfactory and taste receptors
          </label>
          {filtersActive && (
            <button onClick={clearFilters} className="text-xs hover:underline cursor-pointer" style={{ color: '#8B1A1A', fontWeight: 400 }}>
              Clear search and filters
            </button>
          )}
        </div>
      </div>

      {!rows ? (
        loadError ? (
          <div className="py-12 text-center" style={{ color: '#6f6d67' }}>
            <p className="text-sm mb-2" style={{ fontWeight: 400, color: '#8B1A1A' }}>Couldn't load the protein list.</p>
            <p className="text-xs mb-4" style={{ fontWeight: 400 }}>This is usually a temporary network issue. Check your connection and try again.</p>
            <button onClick={retry} className="text-xs px-4 py-2 border transition-colors cursor-pointer"
              style={{ color: '#8B1A1A', borderColor: '#8B1A1A', background: 'transparent', fontWeight: 400 }}>
              Retry
            </button>
          </div>
        ) : (
          <div className="py-12 text-center" style={{ color: '#6f6d67' }}>
            <div className="inline-block w-6 h-6 rounded-full border-2 border-t-transparent animate-spin mb-2"
              style={{ borderColor: '#8B1A1A', borderTopColor: 'transparent' }} />
            <p className="text-sm" style={{ fontWeight: 400 }}>Loading the protein list…</p>
          </div>
        )
      ) : (
        <>
          {/* Results summary */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm" style={{ color: '#52504a', fontWeight: 400 }}>
              <span style={{ color: '#141310', fontWeight: 500 }}>{fmt(filtered.length)}</span>
              {' '}of {fmt(scopeRows.length)} proteins
            </p>
            <div className="flex items-center gap-3 flex-shrink-0">
              {pageCount > 1 && (
                <p className="text-xs" style={{ color: '#6f6d67' }}>Page {page + 1} of {pageCount}</p>
              )}
              <button
                onClick={download}
                disabled={filtered.length === 0}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 border transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: '#fafaf9', borderColor: '#8B1A1A40', color: '#8B1A1A', fontWeight: 400 }}
                title="Download the proteins matching the current view as CSV"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8B1A1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download CSV
              </button>
            </div>
          </div>

          {/* Table: bounded scroll region so the header row and gene column stay in view */}
          <div style={{ background: '#ffffff', border: '1px solid #e5e4e2' }}>
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-sm" style={{ color: '#6f6d67' }}>No proteins match the current search and filters.</div>
            ) : (
              <>
                <div ref={scrollRef} className="overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                  <table className="w-full text-sm border-collapse" style={{ minWidth: wide ? 1320 : 1200 }}>
                    <thead>
                      <tr>
                        {columns.map(c => (
                          <HeaderCell key={c.key} col={c} sortCol={sortCol} sortDir={sortDir} onSort={clickSort} />
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map(r => (
                        <tr key={r.uniprot} style={{ borderBottom: '1px solid #f3f2f0' }}>
                          <td className="px-3 py-2 sticky left-0 z-10 align-top font-mono text-xs" style={{ background: '#ffffff', color: '#141310' }}>{r.gene}</td>
                          <td className="px-3 py-2 align-top text-xs leading-snug" style={{ color: '#52504a' }}>{r.protein_name}</td>
                          <td className="px-3 py-2 align-top">
                            <a href={`https://www.uniprot.org/uniprotkb/${r.uniprot}`} target="_blank" rel="noopener noreferrer"
                              className="font-mono text-xs hover:underline" style={{ color: '#C44D18' }}>
                              {r.uniprot}
                            </a>
                          </td>
                          {wide && (
                            <td className="px-3 py-2 align-top text-xs" style={{ color: r.ms_catalogues ? '#52504a' : '#6f6d67' }}>
                              {r.ms_catalogues ? msShort(r) : 'None'}
                            </td>
                          )}
                          <td className="px-3 py-2 align-top"><DetectionCell r={r} /></td>
                          <td className="px-3 py-2 align-top text-xs tabular-nums" style={{ color: r.gtex_tissues_of_32 ? '#141310' : '#6f6d67' }}>{r.gtex_tissues_of_32}</td>
                          <td className="px-3 py-2 align-top text-xs tabular-nums" style={{ color: r.wang_tissues_of_29 ? '#141310' : '#6f6d67' }}>{r.wang_tissues_of_29}</td>
                          <td className="px-3 py-2 align-top text-xs" style={{ color: '#52504a' }}>{r.localization}</td>
                          <td className="px-3 py-2 align-top text-xs" style={{ color: '#52504a' }}>
                            {r.protein_class}
                            {r.olfactory_or_taste_receptor && (
                              <span className="block mt-0.5 text-[10px]" style={{ color: '#6f6d67' }}>Olfactory or taste receptor</span>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top text-xs" style={{ color: r.druggable_target ? '#141310' : '#6f6d67' }}>
                            {r.approved_drug_target ? 'Approved' : r.druggable_target ? 'Clinical' : '-'}
                          </td>
                          <td className="px-3 py-2 align-top text-xs tabular-nums" style={{ color: '#52504a' }}>{fmt(r.focused_papers)}</td>
                          <td className="px-3 py-2 align-top text-xs tabular-nums" style={{ color: '#52504a' }}>{r.research_fifth}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {pageCount > 1 && (
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid #e5e4e2' }}>
                    <button
                      onClick={() => goToPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                      className="text-sm px-3 py-1.5 border transition disabled:opacity-40 cursor-pointer"
                      style={{ borderColor: '#e5e4e2', color: '#52504a', fontWeight: 400 }}
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
                            onClick={() => goToPage(idx)}
                            className="w-8 h-8 text-xs border transition cursor-pointer"
                            style={{
                              borderColor: isActive ? '#8B1A1A' : '#e5e4e2',
                              background: isActive ? '#8B1A1A' : 'transparent',
                              color: isActive ? 'white' : '#52504a',
                              fontWeight: 400,
                            }}
                          >
                            {idx + 1}
                          </button>
                        )
                      })}
                    </div>
                    <button
                      onClick={() => goToPage(Math.min(pageCount - 1, page + 1))}
                      disabled={page === pageCount - 1}
                      className="text-sm px-3 py-1.5 border transition disabled:opacity-40 cursor-pointer"
                      style={{ borderColor: '#e5e4e2', color: '#52504a', fontWeight: 400 }}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Sources and definitions */}
      <div style={{ background: '#fafaf9', border: '1px solid #e5e4e2', borderLeft: '3px solid #8B1A1A', padding: '16px 20px' }}>
        <p style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8B1A1A', marginBottom: 10 }}>Sources and definitions</p>
        <p className="text-xs leading-relaxed" style={{ color: '#52504a', fontWeight: 400, marginBottom: 12, maxWidth: '82ch' }}>
          The list starts from every human protein in UniProtKB/Swiss-Prot (entries reviewed manually by
          UniProt&rsquo;s curators) and removes every protein on at least one platform catalogue, counted by
          canonical accession as in Protein Coverage. It is regenerated
          from the same coverage sets with each APT release.{' '}
          <a href={UNASSAYED_CSV} download className="hover:underline" style={{ color: '#C44D18' }}>
            Download the full list (CSV{stats ? `, ${fmt(stats.total)} proteins` : ''})
          </a>.
        </p>
        <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 14, rowGap: 8, margin: 0 }}>
          {[
            ['Tissue detection', 'Detected in at least one tissue of either tissue proteome. The 5 or more rule uses the larger of the two tissue counts (GTEx, 32 tissues; Wang, 29 tissues).'],
            ['Localization', 'UniProt subcellular location in four levels: secreted, single-pass transmembrane (TM), multi-pass TM, and intracellular or other.'],
            ['Protein class', 'ChEMBL protein class, with UniProt keywords where ChEMBL has no class. Olfactory and taste receptors are GPCRs with the UniProt keyword Olfaction or Taste.'],
            ['Drug target', 'One of the 1,449 ChEMBL targets of an approved or clinical-stage drug, the drug-target set used in Help Me Combine. Approved: one of the 929 targets of an approved drug.'],
            ['Research fifth', 'From focused papers: papers in NCBI gene2pubmed that cite the gene and 100 or fewer genes in total. 1 = 4 or fewer papers; 2 = 5 to 13; 3 = 14 to 34; 4 = 35 to 97; 5 = 98 or more.'],
          ].map(([term, desc]) => (
            <div key={term} style={{ display: 'contents' }}>
              <dt className="text-xs" style={{ color: '#141310', fontWeight: 500 }}>{term}</dt>
              <dd className="text-xs leading-relaxed" style={{ color: '#52504a', fontWeight: 400, margin: 0 }}>{desc}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 mb-1.5" style={{ ...LABEL, textTransform: 'uppercase' }}>Sources</p>
        <ul className="text-xs leading-relaxed space-y-1" style={{ color: '#52504a', fontWeight: 400 }}>
          <li>
            <a href="https://www.uniprot.org" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: '#C44D18' }}>UniProt</a>
            {' '}(UniProtKB/Swiss-Prot): accessions, gene names and recommended names (retrieved 9 October 2026), subcellular location, and keywords.
          </li>
          <li>
            <a href="https://www.ebi.ac.uk/chembl/" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: '#C44D18' }}>ChEMBL</a>
            : protein classes and approved or clinical-stage drug targets.
          </li>
          <li>
            <a href="https://ftp.ncbi.nlm.nih.gov/gene/DATA/" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: '#C44D18' }}>NCBI gene2pubmed</a>
            : focused papers per gene.
          </li>
          <li>
            GTEx tissue proteome: Jiang L, et al. A quantitative proteome map of the human body. <em>Cell</em> 183, 269-283 (2020).{' '}
            <a href="https://doi.org/10.1016/j.cell.2020.08.036" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: '#C44D18' }}>doi:10.1016/j.cell.2020.08.036</a>
          </li>
          <li>
            Wang D, et al. A deep proteome and transcriptome abundance atlas of 29 healthy human tissues. <em>Mol Syst Biol</em> 15, e8503 (2019).{' '}
            <a href="https://doi.org/10.15252/msb.20188503" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: '#C44D18' }}>doi:10.15252/msb.20188503</a>
          </li>
        </ul>
      </div>
    </div>
  )
}
