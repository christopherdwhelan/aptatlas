import { useState } from 'react'
import { AnimatedAptIcon } from './AptIcon'
import KpiCard from './KpiCard'
import DetailModal from './Comparison/DetailModal'
import platforms from '../data/platforms.json'
import evidence from '../data/evidence.json'
import allPlatforms from '../data/all_platforms.json'

// Thin-line SVG icons
const Icons = {
  platforms: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="7" height="7" rx="1"/><rect x="9" y="3" width="7" height="7" rx="1"/>
      <rect x="16" y="3" width="6" height="7" rx="1"/><rect x="2" y="12" width="20" height="9" rx="1"/>
    </svg>
  ),
  proteins: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M2 12h4M18 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
    </svg>
  ),
  studies: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
      <line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/>
    </svg>
  ),
  classes: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
  maxProteins: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  ),
  participants: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
}

const KEY_FINDINGS = [
  {
    text: 'No single platform dominates. Platform decisions should be driven by context(s) of use.',
    accent: 'teal',
  },
  {
    text: 'Olink and SomaScan/SomaSeq are the most validated options with the deepest head-to-head evidence base, but show poor cross-platform protein correlation (median Spearman 0.33 for matched assays).',
    accent: 'teal',
  },
  {
    text: 'Mass spectrometry platforms (Seer, Biognosys) offer unbiased discovery and peptide-level resolution, but require significantly higher bioinformatics investment and show higher CVs.',
    accent: 'gold',
  },
  {
    text: 'Nomic nELISA is a disruptive entrant: absolute quant, 1,000+ samples/day at ~$50/sample. This cost structure changes the economics of population studies.',
    accent: 'purple',
  },
  {
    text: 'NULISA fills a specialized niche: attomolar sensitivity and FDA-cleared p-tau217 detection make it the leading choice for Alzheimer\'s and neuroinflammation studies.',
    accent: 'gold',
  },
]

const NEXT_STEPS = [
  'For population-scale proteomics (>100,000 samples): evaluate Olink Explore HT or SomaSeq, with Nomic as a cost-efficient alternative and Seer as a scalable MS-based solution.',
  'For unbiased discovery in large-scale plasma proteomics studies (10–100K samples): consider Seer Proteograph XT.',
  'For targeted neuroscience or immune profiling studies: consider NULISA with p-tau217/Aβ panel.',
  'For tissue analysis (e.g., brain samples): consider Biognosys TrueDiscovery (P2 enrichment) or comparable mass spec methods. Olink and SomaSeq can handle tissue homogenates, but MS is the gold standard.',
  'For systematic PTM discovery (phosphoproteomics, ubiquitinomics, glycoproteomics): none of the evaluated platforms offer dedicated enrichment workflows. Consider Biognosys TrueDiscovery as the closest within-class MS option, or an orthogonal MS platform with IMAC enrichment (e.g., EasyPhos + Spectronaut).',
]

const ACCENT_STYLES = {
  teal:   { dot: '#8B1A1A' },
  gold:   { dot: '#C44D18' },
  purple: { dot: '#A32020' },
}

export default function Overview({ onNavigateToProteins }) {
  const [search, setSearch] = useState('')
  const [techFilter, setTechFilter] = useState('all')
  const [costFilter, setCostFilter] = useState('all')
  const [selectedPlatform, setSelectedPlatform] = useState(null)

  const maxProteins = Math.max(...platforms.map(p => p.proteinsNumeric)).toLocaleString()

  return (
    <div className="space-y-6">

      {/* ── Hero Banner ── */}
      <div
        className="bg-white overflow-hidden"
        style={{ border: '2px solid #8B1A1A' }}
      >
        <div className="px-6 py-5 flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-8">
          {/* Cycling modality icon */}
          <AnimatedAptIcon size={68} />
          {/* Text */}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <p
              className="uppercase mb-3"
              style={{ color: '#8B1A1A', fontSize: '10px', letterSpacing: '0.1em', fontWeight: 400 }}
            >
              Atlas of Proteomic Technologies (APT)
            </p>
            <p className="text-base sm:text-lg leading-snug max-w-2xl" style={{ color: '#141310', fontWeight: 400 }}>
              An independent, evidence-based overview of commercial high-plex proteomics platforms, built to inform study design for scientists across industry and academia.
            </p>
          </div>

          {/* CTA */}
          <div className="flex-shrink-0 flex flex-col gap-2 items-stretch">
            <button
              onClick={() => { window.location.hash = 'chooser' }}
              className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm transition-all"
              style={{
                backgroundColor: '#8B1A1A',
                backgroundImage: 'none',
                color: '#fff',
                border: '1px solid #8B1A1A',
                whiteSpace: 'nowrap',
                fontWeight: 400,
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#7a1616' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#8B1A1A' }}
            >
              Not sure where to start? &bull; Get a platform recommendation →
            </button>
            <button
              onClick={() => { window.location.hash = 'combine' }}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs transition-colors"
              style={{
                background: 'transparent',
                color: '#6f6d67',
                border: '1px solid #e5e4e2',
                whiteSpace: 'nowrap',
                fontWeight: 400,
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#8B1A1A'; e.currentTarget.style.borderColor = '#8B1A1A' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#6f6d67'; e.currentTarget.style.borderColor = '#e5e4e2' }}
            >
              Deploying multiple platforms? Use our Combine tool →
            </button>
          </div>
        </div>
      </div>

      {/* ── Executive Summary + Next Steps ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Executive Summary */}
        <div
          className="lg:col-span-3 bg-white overflow-hidden"
          style={{ borderTop: '2px solid #141310', border: '1px solid #e5e4e2', borderTopWidth: '2px', borderTopColor: '#141310' }}
        >
          <div className="px-6 pt-5 pb-1 flex items-center gap-2" style={{ borderBottom: '1px solid #e5e4e2' }}>
            <span
              className="uppercase"
              style={{ color: '#8B1A1A', fontSize: '10px', letterSpacing: '0.1em', fontWeight: 400 }}
            >
              Executive Summary
            </span>
          </div>
          <div className="px-6 py-5">
            <h2 className="text-lg mb-2" style={{ color: '#141310', fontWeight: 400 }}>
              State of High-Plex Plasma Proteomics, 2026
            </h2>
            <ul className="space-y-2">
              {KEY_FINDINGS.map((item, i) => {
                const style = ACCENT_STYLES[item.accent]
                return (
                  <li key={i} className="flex items-start gap-3 text-[15px] leading-snug" style={{ color: '#52504a', fontWeight: 400 }}>
                    <span
                      className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: style.dot }}
                    />
                    <span>{item.text}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        {/* High-Level Guidance */}
        <div
          className="lg:col-span-2 bg-white overflow-hidden"
          style={{ borderTop: '2px solid #141310', border: '1px solid #e5e4e2', borderTopWidth: '2px', borderTopColor: '#141310' }}
        >
          <div
            className="px-5 pt-5 pb-3"
            style={{ borderBottom: '1px solid #e5e4e2' }}
          >
            <p
              className="uppercase"
              style={{ color: '#8B1A1A', fontSize: '10px', letterSpacing: '0.1em', fontWeight: 400 }}
            >
              High-Level Guidance
            </p>
          </div>
          <div className="px-5 py-4">
            <ul className="space-y-2">
              {NEXT_STEPS.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span
                    className="mt-0.5 flex-shrink-0 text-xs w-4 text-right"
                    style={{ color: '#8B1A1A', fontWeight: 500 }}
                  >
                    {i + 1}.
                  </span>
                  <span className="text-[11px] leading-snug" style={{ color: '#52504a', fontWeight: 400 }}>{step}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 pt-4 text-center" style={{ borderTop: '1px solid #e5e4e2' }}>
              <p className="text-xs" style={{ color: '#6f6d67' }}>
                For deeper dives:{' '}
                <a
                  href="mailto:chris@ignitionscientific.com"
                  className="underline-offset-2 hover:underline"
                  style={{ color: '#C44D18', fontWeight: 400 }}
                >
                  chris@ignitionscientific.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          icon={Icons.classes}
          value={allPlatforms.meta?.n_total ?? platforms.length}
          label="Platforms Catalogued"
        />
        <KpiCard
          icon={Icons.platforms}
          value={platforms.length}
          label="Platforms Surveyed in Depth"
          accent
        />
        <KpiCard
          icon={Icons.maxProteins}
          value={maxProteins}
          label="Max Proteins (single platform)"
        />
        <KpiCard
          icon={Icons.studies}
          value={evidence.filter(e => e.platformsCompared.length > 1).length}
          label="Head-to-Head Studies"
          accent
        />
        <KpiCard
          icon={Icons.participants}
          value="170K+"
          label="Participants in Key Studies"
          accent
        />
        <KpiCard
          icon={Icons.proteins}
          value="15,123"
          label="Unique Proteins (6-platform union)"
        />
      </div>

      {/* ── Search + Filters ── */}
      <div
        className="bg-white px-5 py-4"
        style={{ border: '1px solid #e5e4e2' }}
      >
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              width="15" height="15" viewBox="0 0 24 24"
              fill="none" stroke="#6f6d67" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search platform, technology, or feature…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition"
              style={{
                color: '#141310',
                background: '#fafaf9',
                border: '1px solid #e5e4e2',
                '--tw-ring-color': '#8B1A1A',
                fontWeight: 400,
              }}
            />
          </div>

          {/* Technology filter */}
          <div className="flex items-center gap-2">
            <label
              className="uppercase tracking-wide"
              style={{ color: '#6f6d67', fontSize: '10px', letterSpacing: '0.08em', fontWeight: 400 }}
            >
              Technology
            </label>
            <select
              value={techFilter}
              onChange={e => setTechFilter(e.target.value)}
              className="text-sm px-3 py-2 focus:outline-none focus:ring-2 transition"
              style={{
                color: '#141310',
                background: '#fafaf9',
                border: '1px solid #e5e4e2',
                '--tw-ring-color': '#8B1A1A',
                fontWeight: 400,
              }}
            >
              <option value="all">All Technologies</option>
              <option value="affinity">Affinity-based (PEA / Aptamer / ELISA)</option>
              <option value="ms">Mass Spectrometry (DIA-MS)</option>
            </select>
          </div>

          {/* Cost filter */}
          <div className="flex items-center gap-2">
            <label
              className="uppercase tracking-wide"
              style={{ color: '#6f6d67', fontSize: '10px', letterSpacing: '0.08em', fontWeight: 400 }}
            >
              Cost/Sample
            </label>
            <select
              value={costFilter}
              onChange={e => setCostFilter(e.target.value)}
              className="text-sm px-3 py-2 focus:outline-none focus:ring-2 transition"
              style={{
                color: '#141310',
                background: '#fafaf9',
                border: '1px solid #e5e4e2',
                '--tw-ring-color': '#8B1A1A',
                fontWeight: 400,
              }}
            >
              <option value="all">Any Cost</option>
              <option value="budget">&lt;$100</option>
              <option value="mid">$100–$499</option>
              <option value="premium">&gt;$500</option>
            </select>
          </div>

          {/* Active filter chips */}
          {(search || techFilter !== 'all' || costFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setTechFilter('all'); setCostFilter('all') }}
              className="text-xs px-3 py-1.5 transition hover:bg-surface-50"
              style={{ color: '#52504a', border: '1px solid #e5e4e2', fontWeight: 400 }}
            >
              Clear filters ×
            </button>
          )}
        </div>
      </div>

      {/* ── Platform Cards Quick Grid ── */}
      <div>
        <h3
          className="uppercase tracking-wide mb-3"
          style={{ color: '#6f6d67', fontSize: '10px', letterSpacing: '0.1em', fontWeight: 400 }}
        >
          Platform Overview
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {platforms
            .filter(p => {
              const matchesSearch = !search || [p.name, p.company, p.technology].some(
                f => f.toLowerCase().includes(search.toLowerCase())
              )
              const matchesTech = techFilter === 'all' || p.platformType === techFilter
              const matchesCost = costFilter === 'all' || (() => {
                const lo = p.costRangeNumeric[0]
                if (costFilter === 'budget') return lo < 100
                if (costFilter === 'mid') return lo >= 100 && lo < 500
                if (costFilter === 'premium') return lo >= 500
                return true
              })()
              return matchesSearch && matchesTech && matchesCost
            })
            .map(platform => (
              <PlatformMiniCard key={platform.id} platform={platform} onViewProteins={onNavigateToProteins} onSelect={setSelectedPlatform} />
            ))}

          {/* Emerging premium platforms tile - shown when premium filter is active */}
          {costFilter === 'premium' && (
            <div
              className="bg-white p-5"
              style={{ border: '1px solid #e5e4e2', borderTop: '2px solid #6b5b95' }}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-base leading-tight" style={{ color: '#141310', fontWeight: 400 }}>
                    Other Premium Platforms
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: '#52504a', fontWeight: 400 }}>Various vendors</p>
                </div>
                <span
                  className="text-xs px-2 py-0.5 flex-shrink-0"
                  style={{ border: '1px solid #6b5b95', color: '#6b5b95', fontWeight: 400 }}
                >
                  Emerging
                </span>
              </div>
              <p className="text-xs leading-relaxed mb-3" style={{ color: '#52504a', fontWeight: 400 }}>
                Several high-investment platforms offer orthogonal capabilities not covered by the scored platforms above:
              </p>
              <ul className="space-y-2">
                {[
                  { name: 'Nautilus Proteome Platform', note: 'Single-molecule protein sequencing; early access' },
                  { name: 'Bruker timsTOF / PASEF', note: 'High-throughput MS with ion mobility; >10K proteins' },
                  { name: 'Thermo Orbitrap Astral', note: 'Fastest Orbitrap MS; deep plasma proteome in minutes' },
                  { name: 'Custom LC-MS/MS pipelines', note: 'Lab-built DDA/DIA workflows; highest flexibility' },
                ].map(p => (
                  <li key={p.name} className="flex items-start gap-2 text-xs" style={{ color: '#52504a', fontWeight: 400 }}>
                    <span className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#6b5b95' }}/>
                    <span><strong style={{ fontWeight: 500 }}>{p.name}</strong>: {p.note}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs mt-3" style={{ color: '#6f6d67', fontWeight: 400 }}>
                Not formally scored. Contact us for a custom analysis.
              </p>
            </div>
          )}
        </div>
      </div>

      {selectedPlatform && (
        <DetailModal platform={selectedPlatform} onClose={() => setSelectedPlatform(null)} />
      )}
    </div>
  )
}

function PlatformMiniCard({ platform, onViewProteins, onSelect }) {
  return (
    <div
      onClick={() => onSelect(platform)}
      className="bg-white p-5 transition-colors group cursor-pointer"
      style={{
        border: '1px solid #e5e4e2',
        borderTop: `2px solid ${platform.color}`,
      }}
      onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fafaf9' }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#ffffff' }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="text-base leading-tight" style={{ color: '#141310', fontWeight: 400 }}>
            {platform.name}
          </h3>
          <p className="text-xs mt-0.5" style={{ color: '#52504a', fontWeight: 400 }}>
            {platform.company}
          </p>
        </div>
        <span
          className="text-xs px-2 py-0.5 flex-shrink-0"
          style={{
            border: `1px solid ${platform.platformType === 'ms' ? '#6b5b95' : '#8B1A1A'}`,
            color: platform.platformType === 'ms' ? '#6b5b95' : '#8B1A1A',
            fontWeight: 400,
          }}
        >
          {platform.platformType === 'ms' ? 'MS-DIA' : 'Affinity'}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span style={{ color: '#6f6d67', fontWeight: 400 }}>Proteins</span>
          <span className="text-right" style={{ color: '#141310', fontWeight: 400 }}>{platform.proteins.split(';')[0]}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span style={{ color: '#6f6d67', fontWeight: 400 }}>Sample input</span>
          <span className="text-right" style={{ color: '#141310', fontWeight: 400 }}>{platform.sampleInput}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span style={{ color: '#6f6d67', fontWeight: 400 }}>Cost range</span>
          <span style={{ color: '#141310', fontWeight: 400 }}>{platform.costRange}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span style={{ color: '#6f6d67', fontWeight: 400 }}>Evidence</span>
          <span
            style={{
              color: platform.evidenceDepth.startsWith('High') ? '#8B1A1A' : platform.evidenceDepth.startsWith('Moderate') ? '#d97706' : '#6f6d67',
              fontWeight: 400,
            }}
          >
            {platform.evidenceDepth.split(' ')[0]}
          </span>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={e => { e.stopPropagation(); onSelect(platform) }}
          className="flex-1 text-xs py-1.5 transition"
          style={{
            color: '#52504a',
            border: '1px solid #e5e4e2',
            background: '#fafaf9',
            fontWeight: 400,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f0efed'; e.currentTarget.style.borderColor = '#d1d0ce' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fafaf9'; e.currentTarget.style.borderColor = '#e5e4e2' }}
        >
          More details
        </button>
        {onViewProteins && (
          <button
            onClick={e => { e.stopPropagation(); onViewProteins(platform.id) }}
            className="flex-1 text-xs py-1.5 transition hover:underline"
            style={{
              color: platform.color,
              border: `1px solid ${platform.color}30`,
              background: `${platform.color}08`,
              fontWeight: 400,
            }}
          >
            View protein list →
          </button>
        )}
      </div>
    </div>
  )
}
