import { useState, useMemo } from 'react'
import evidence from '../data/evidence.json'
import platforms from '../data/platforms.json'

const LAST_UPDATED = 'March 2026'

const platformMap = Object.fromEntries(platforms.map(p => [p.id, p]))
const allYears = [...new Set(evidence.map(s => s.year))].sort((a, b) => b - a)

// ── Icons ──────────────────────────────────────────────────────────────────
const ExternalIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
)
const StarIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
)
const FilterIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>
)

// ── Platform chip ──────────────────────────────────────────────────────────
function PlatformChip({ platformId }) {
  const p = platformMap[platformId]
  if (!p) return null
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5"
      style={{ background: `${p.color}18`, color: p.color, fontWeight: 400 }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
      {p.name}
    </span>
  )
}

// ── Study card ─────────────────────────────────────────────────────────────
function StudyCard({ study }) {
  const [expanded, setExpanded] = useState(false)
  const visibleFindings = expanded ? study.keyFindings : study.keyFindings.slice(0, 3)
  const isFoundational = study.platformsCompared.length === 1

  return (
    <div
      className="bg-white overflow-hidden"
      style={{
        border: study.landmark ? undefined : '1px solid #e5e4e2',
        borderColor: study.landmark ? 'rgba(139,26,26,0.3)' : undefined,
        borderLeft: study.landmark ? '4px solid #8B1A1A' : undefined,
        borderTop: study.landmark ? '1px solid rgba(139,26,26,0.3)' : undefined,
        borderRight: study.landmark ? '1px solid rgba(139,26,26,0.3)' : undefined,
        borderBottom: study.landmark ? '1px solid rgba(139,26,26,0.3)' : undefined,
      }}
    >
      <div className="px-5 py-4">
        {/* Top row: citation + badges + link */}
        <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
          <div className="flex items-start gap-2 flex-wrap">
            <h3 className="text-sm leading-snug" style={{ color: '#141310', fontWeight: 400 }}>
              {study.shortCitation}
            </h3>
            {study.landmark && (
              <span
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 flex-shrink-0"
                style={{ background: 'rgba(139,26,26,0.1)', color: '#8B1A1A', fontWeight: 400 }}
              >
                <StarIcon /> Landmark
              </span>
            )}
            {isFoundational && (
              <span
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 flex-shrink-0"
                style={{ background: 'rgba(107,91,149,0.08)', color: '#6b5b95', fontWeight: 400 }}
              >
                Foundational
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
            <span
              className="text-xs px-2 py-0.5"
              style={{ background: '#fafaf9', color: '#52504a', border: '1px solid #e5e4e2', fontWeight: 400 }}
            >
              {study.journal}
            </span>
            <span
              className="text-xs px-2 py-0.5"
              style={{ background: '#fafaf9', color: '#52504a', border: '1px solid #e5e4e2', fontWeight: 400 }}
            >
              {study.year}
            </span>
            {study.url && (
              <a
                href={study.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 border transition-colors hover:bg-[rgba(196,77,24,0.06)]"
                style={{ color: '#C44D18', borderColor: '#C44D18', fontWeight: 400 }}
              >
                Read Paper <ExternalIcon />
              </a>
            )}
          </div>
        </div>

        {/* Sample size */}
        {study.sampleSize && (
          <p className="text-xs mb-2.5" style={{ color: '#6f6d67' }}>
            <span style={{ fontWeight: 400 }}>n =</span> {study.sampleSize}
          </p>
        )}

        {/* Platforms compared */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {study.platformsCompared.map(pid => (
            <PlatformChip key={pid} platformId={pid} />
          ))}
        </div>

        {/* Key findings */}
        <ul className="space-y-1.5">
          {visibleFindings.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: '#52504a', fontWeight: 400 }}>
              <span
                className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: study.landmark ? '#8B1A1A' : '#d0cfcc' }}
              />
              {f}
            </li>
          ))}
        </ul>

        {study.keyFindings.length > 3 && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="mt-2 text-xs hover:underline"
            style={{ color: '#C44D18', fontWeight: 400 }}
          >
            {expanded ? '▲ Show less' : `+${study.keyFindings.length - 3} more findings`}
          </button>
        )}
      </div>

      {/* Subtle bottom strip for landmark studies */}
      {study.landmark && (
        <div
          className="px-5 py-2 flex items-center gap-1.5 text-xs"
          style={{ background: 'rgba(139,26,26,0.04)', borderTop: '1px solid rgba(139,26,26,0.1)', color: '#8B1A1A' }}
        >
          <StarIcon />
          <span style={{ fontWeight: 400 }}>Landmark study</span>
          <span style={{ color: '#6f6d67', fontWeight: 400 }}>: foundational evidence for platform comparison recommendations</span>
        </div>
      )}
    </div>
  )
}

// ── Platform filter checkbox ───────────────────────────────────────────────
function PlatformCheckbox({ platform, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group" onClick={onChange}>
      <div
        className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
        style={{
          borderColor: checked ? platform.color : '#d0cfcc',
          background: checked ? platform.color : '#fff',
        }}
      >
        {checked && (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white"
            strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
      </div>
      <span
        className="text-xs leading-tight group-hover:opacity-80 transition-opacity"
        style={{ color: checked ? '#141310' : '#52504a', fontWeight: 400 }}
      >
        {platform.name}
      </span>
    </label>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function EvidenceBase() {
  const [selectedPlatforms, setSelectedPlatforms] = useState(new Set())
  const [selectedYear, setSelectedYear] = useState('all')
  const [landmarkOnly, setLandmarkOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const togglePlatform = (id) => {
    setSelectedPlatforms(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filtered = useMemo(() => {
    return evidence.filter(study => {
      if (landmarkOnly && !study.landmark) return false
      if (selectedYear !== 'all' && study.year !== Number(selectedYear)) return false
      if (selectedPlatforms.size > 0) {
        const hasMatch = study.platformsCompared.some(pid => selectedPlatforms.has(pid))
        if (!hasMatch) return false
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const searchable = [
          study.shortCitation,
          study.fullCitation,
          study.journal,
          ...study.keyFindings,
          study.sampleSize || '',
        ].join(' ').toLowerCase()
        if (!searchable.includes(q)) return false
      }
      return true
    })
  }, [selectedPlatforms, selectedYear, landmarkOnly, searchQuery])

  const activeFilterCount =
    selectedPlatforms.size + (selectedYear !== 'all' ? 1 : 0) + (landmarkOnly ? 1 : 0)

  const clearFilters = () => {
    setSelectedPlatforms(new Set())
    setSelectedYear('all')
    setLandmarkOnly(false)
    setSearchQuery('')
  }

  const landmarkCount = evidence.filter(s => s.landmark).length

  return (
    <div className="space-y-5">
      {/* ── Notice banner ── */}
      <div
        className="px-5 py-4 flex items-start gap-3"
        style={{
          background: 'rgba(139,26,26,0.05)',
          border: '1px solid rgba(139,26,26,0.15)',
          borderLeft: '4px solid #8B1A1A',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B1A1A"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p className="text-xs leading-relaxed" style={{ color: '#52504a', fontWeight: 400 }}>
          <span style={{ color: '#8B1A1A', fontWeight: 400 }}>Curated evidence base</span>
          , updated monthly. Last updated: <span style={{ fontWeight: 400 }}>{LAST_UPDATED}</span>.{' '}
          Evidence depth varies across platforms: newer platforms (Nomic nELISA, NULISA) have
          substantially less published head-to-head data than established platforms (Olink, SomaScan/SomaSeq).
          Studies marked <span style={{ color: '#8B1A1A', fontWeight: 400 }}>Landmark</span> are
          foundational references that directly inform the platform recommendations in this tool.{' '}
          <span style={{ fontWeight: 400, color: '#52504a' }}>Readout note:</span>{' '}
          Studies citing "SomaScan" used the array-based (microarray) readout.
          SomaSeq (Illumina; formerly Illumina Protein Prep) is the NGS-based successor; performance differences between readout methods have been reported.
        </p>
      </div>

      {/* Mobile filter toggle */}
      <div className="flex items-center justify-between lg:hidden">
        <button
          onClick={() => setFiltersOpen(v => !v)}
          className="flex items-center gap-2 text-sm px-4 py-2 border transition-all"
          style={{
            borderColor: activeFilterCount > 0 ? '#8B1A1A' : '#e5e4e2',
            color: activeFilterCount > 0 ? '#8B1A1A' : '#52504a',
            background: activeFilterCount > 0 ? 'rgba(139,26,26,0.05)' : '#ffffff',
            fontWeight: 400,
          }}
        >
          <FilterIcon />
          Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          <span style={{ fontSize: 10 }}>{filtersOpen ? '▲' : '▼'}</span>
        </button>
        <p className="text-sm" style={{ color: '#52504a', fontWeight: 400 }}>
          <span style={{ color: '#141310', fontWeight: 400 }}>{filtered.length}</span>
          {' '}of {evidence.length} studies
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* ── Left sidebar: filters ── */}
        <div
          className={`w-full lg:w-[220px] flex-shrink-0 bg-white p-4 space-y-5 ${filtersOpen ? 'block' : 'hidden'} lg:block`}
          style={{ border: '1px solid #e5e4e2' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <FilterIcon />
              <span
                className="uppercase"
                style={{ fontSize: 10, letterSpacing: '0.08em', color: '#6f6d67', fontWeight: 400 }}
              >
                Filters
              </span>
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs hover:underline"
                style={{ color: '#C44D18', fontWeight: 400 }}
              >
                Clear ({activeFilterCount})
              </button>
            )}
          </div>

          {/* Search */}
          <div>
            <p
              className="uppercase mb-2"
              style={{ fontSize: 10, letterSpacing: '0.08em', color: '#6f6d67', fontWeight: 400 }}
            >
              Search
            </p>
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="#6f6d67" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Author, journal…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 text-xs"
                style={{ border: '1px solid #e5e4e2', background: '#fafaf9', color: '#141310', fontWeight: 400 }}
              />
            </div>
          </div>

          {/* Landmark toggle */}
          <div>
            <p
              className="uppercase mb-2"
              style={{ fontSize: 10, letterSpacing: '0.08em', color: '#6f6d67', fontWeight: 400 }}
            >
              Study Type
            </p>
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  borderColor: landmarkOnly ? '#8B1A1A' : '#d0cfcc',
                  background: landmarkOnly ? '#8B1A1A' : '#fff',
                }}
                onClick={() => setLandmarkOnly(v => !v)}
              >
                {landmarkOnly && (
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white"
                    strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </div>
              <span className="text-xs" style={{ color: landmarkOnly ? '#141310' : '#52504a', fontWeight: 400 }}>
                Landmark only ({landmarkCount})
              </span>
            </label>
          </div>

          {/* Year filter */}
          <div>
            <p
              className="uppercase mb-2"
              style={{ fontSize: 10, letterSpacing: '0.08em', color: '#6f6d67', fontWeight: 400 }}
            >
              Publication Year
            </p>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5"
              style={{ border: '1px solid #e5e4e2', background: '#fafaf9', color: '#141310', fontWeight: 400 }}
            >
              <option value="all">All years</option>
              {allYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Platform filter */}
          <div>
            <p
              className="uppercase mb-2.5"
              style={{ fontSize: 10, letterSpacing: '0.08em', color: '#6f6d67', fontWeight: 400 }}
            >
              Platform
            </p>
            <div className="space-y-2.5">
              {platforms.map(p => (
                <PlatformCheckbox
                  key={p.id}
                  platform={p}
                  checked={selectedPlatforms.has(p.id)}
                  onChange={() => togglePlatform(p.id)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: study list ── */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Results header */}
          <div className="flex items-center justify-between">
            <p className="text-sm hidden lg:block" style={{ color: '#52504a', fontWeight: 400 }}>
              <span style={{ color: '#141310', fontWeight: 400 }}>{filtered.length}</span>
              {' '}of {evidence.length} studies
              {activeFilterCount > 0 && (
                <span> matching filters</span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs" style={{ color: '#8B1A1A', fontWeight: 400 }}>
                <StarIcon />
                {evidence.filter(s => s.landmark).length} Landmark
              </span>
              <span style={{ color: '#d0cfcc' }}>·</span>
              <span className="text-xs" style={{ color: '#6f6d67', fontWeight: 400 }}>
                {evidence.filter(s => s.platformsCompared.length === 1).length} Foundational
              </span>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div
              className="bg-white px-6 py-12 text-center"
              style={{ border: '1px solid #e5e4e2' }}
            >
              <p className="text-sm mb-1" style={{ color: '#141310', fontWeight: 400 }}>No studies match these filters</p>
              <p className="text-xs" style={{ color: '#6f6d67', fontWeight: 400 }}>Try removing a filter or broadening your search</p>
              <button
                onClick={clearFilters}
                className="mt-3 text-xs hover:underline"
                style={{ color: '#C44D18', fontWeight: 400 }}
              >
                Clear all filters
              </button>
            </div>
          ) : (
            filtered.map(study => (
              <StudyCard key={study.id} study={study} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
