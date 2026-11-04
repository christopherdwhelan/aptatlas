import { useState } from 'react'
import { AnimatedAptIcon } from './AptIcon'
import RouteLink from './RouteLink'
import DetailPanel from './Comparison/DetailPanel'
import { ConfidenceTip } from './LowerConfidenceBadge'
import platforms from '../data/platforms.json'
import catalog from '../data/all_platforms.json'
import { isLowerConfidence, platformNote } from '../data/confidence'
import {
  coverage, catalogueCount, assessedCount, maxProteinsOnOnePlatform,
  canonicalProteome, proteinsOnNoPlatform, drugTargetCount, drugTargetsOnAPlatform,
  participantsAny, participantsMulti, approx, atLeastK,
} from '../data/siteStats'

const KEY_FINDINGS = [
  {
    text: 'No single platform dominates. Platform decisions should be driven by context(s) of use.',
    accent: 'teal',
  },
  {
    text: 'Olink and SomaScan/SomaSeq are the most validated options with the deepest head-to-head evidence base, but show modest cross-platform protein correlation (median Spearman 0.33 for matched assays).',
    accent: 'teal',
  },
  {
    text: 'Mass spectrometry platforms (Seer, Biognosys) offer unbiased discovery and peptide-level resolution, but require significantly higher bioinformatics investment and show higher CVs.',
    accent: 'gold',
  },
  {
    text: 'Nomic nELISA is a low-cost entrant with calibrated quantification. Its primary published study profiled 7,392 cell culture samples at 191-plex in under a week. If the platform holds in plasma at scale, it would change the economics of population studies.',
    accent: 'purple',
  },
  {
    text: 'NULISA fills a specialized niche: attomolar limits of detection and blood p-tau217 measurement (research use only), benchmarked against amyloid PET and Simoa, suit Alzheimer\'s and neuroinflammation studies.',
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
  teal:   { dot: 'var(--color-brand-500)' },
  gold:   { dot: '#C44D18' },
  purple: { dot: '#A32020' },
}

const fmt = n => n.toLocaleString('en-US')
const pct = (part, whole) => `${(part / whole) * 100}%`
const ACCENT = 'var(--color-brand-500)'
const UNFILLED = '#e5e4e2'

// One dot per item, with the first `filled` in the accent colour
function UnitDots({ total, filled }) {
  return (
    <div className="flex flex-wrap gap-[3px] mt-2.5" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          style={{ width: 8, height: 8, borderRadius: '50%', background: i < filled ? ACCENT : UNFILLED }}
        />
      ))}
    </div>
  )
}

function ProportionBar({ part, whole }) {
  return (
    <div className="mt-2.5" style={{ height: 8, background: UNFILLED }} aria-hidden="true">
      <div style={{ height: '100%', width: pct(part, whole), background: ACCENT }} />
    </div>
  )
}

function StatCell({ value, children, graphic }) {
  return (
    <div className="bg-white px-5 py-3.5">
      <span className="block tabular-nums leading-none text-[22px]" style={{ color: '#141310', fontWeight: 400, letterSpacing: '-0.01em' }}>
        {value}
      </span>
      <span className="block mt-1.5 text-xs leading-snug" style={{ color: 'var(--color-surface-400)', fontWeight: 400 }}>
        {children}
      </span>
      {graphic}
    </div>
  )
}

const statLink = 'inline-block py-1 underline underline-offset-2 hover:text-brand-500'

export default function Overview({ onNavigateToProteins, onOpenPlatform }) {
  const [selectedPlatform, setSelectedPlatform] = useState(null)

  return (
    <div className="space-y-6">

      {/* ── Hero Banner ── */}
      <div
        className="bg-white overflow-hidden"
        style={{ border: '2px solid var(--color-brand-500)' }}
      >
        <div className="px-6 py-5 flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-8">
          {/* Cycling modality icon */}
          <AnimatedAptIcon size={68} />
          {/* Text */}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <p className="text-base sm:text-lg leading-snug max-w-2xl" style={{ color: '#141310', fontWeight: 400 }}>
              An independent, evidence-based overview of commercial high-plex proteomics platforms, built to inform study design for scientists across industry and academia.
            </p>
          </div>

          {/* CTA */}
          <div className="flex-shrink-0 flex flex-col gap-2 items-stretch">
            <RouteLink
              tab="chooser"
              className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm transition-all"
              style={{
                backgroundColor: 'var(--color-brand-500)',
                backgroundImage: 'none',
                color: '#fff',
                border: '1px solid var(--color-brand-500)',
                whiteSpace: 'nowrap',
                textDecoration: 'none',
                fontWeight: 400,
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#7a1616' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--color-brand-500)' }}
            >
              Get a platform recommendation
            </RouteLink>
            <RouteLink
              tab="combine"
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs transition-colors"
              style={{
                background: 'transparent',
                color: 'var(--color-surface-400)',
                border: '1px solid #e5e4e2',
                whiteSpace: 'nowrap',
                textDecoration: 'none',
                fontWeight: 400,
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-brand-500)'; e.currentTarget.style.borderColor = 'var(--color-brand-500)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-surface-400)'; e.currentTarget.style.borderColor = '#e5e4e2' }}
            >
              Find the best platform pair
            </RouteLink>
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
          <div className="px-7 pt-6 pb-2 flex items-center gap-2" style={{ borderBottom: '1px solid #e5e4e2' }}>
            <span
              className="uppercase"
              style={{ color: 'var(--color-brand-500)', fontSize: '10px', letterSpacing: '0.1em', fontWeight: 400 }}
            >
              Executive Summary
            </span>
          </div>
          <div className="px-7 py-6">
            <h2 className="text-xl mb-3" style={{ color: '#141310', fontWeight: 400 }}>
              State of High-Plex Plasma Proteomics, 2026
            </h2>
            <ul className="space-y-2.5">
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
              style={{ color: 'var(--color-brand-500)', fontSize: '10px', letterSpacing: '0.1em', fontWeight: 400 }}
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
                    style={{ color: 'var(--color-brand-500)', fontWeight: 500 }}
                  >
                    {i + 1}.
                  </span>
                  <span className="text-[13.5px] leading-snug" style={{ color: '#52504a', fontWeight: 400 }}>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── By the numbers ── */}
      <div>
        <div className="bg-white" style={{ border: '1px solid #e5e4e2', borderTop: '2px solid #141310' }}>
          <p
            className="uppercase px-5 pt-3 pb-2"
            style={{ color: 'var(--color-brand-500)', fontSize: '10px', letterSpacing: '0.1em', fontWeight: 400 }}
          >
            By the numbers
          </p>
          <div className="px-5 pt-3 pb-4" style={{ borderTop: '1px solid #e5e4e2' }}>
            <p className="text-[15px] leading-snug" style={{ color: '#141310', fontWeight: 400, letterSpacing: '0.02em' }}>
              <RouteLink tab="proteins" className="tabular-nums text-[28px] leading-none hover:text-brand-500" style={{ fontWeight: 600 }}>{fmt(coverage.proteins)}</RouteLink>
              {' '}of {fmt(canonicalProteome)} reviewed human proteins are on at least one of the six platforms
            </p>
            <div className="relative mt-3.5" style={{ height: 16, background: UNFILLED }} aria-hidden="true">
              <div className="absolute inset-y-0 left-0" style={{ width: pct(coverage.proteins, canonicalProteome), background: ACCENT }} />
              <div className="absolute" style={{ left: pct(maxProteinsOnOnePlatform, canonicalProteome), top: -4, bottom: -4, width: 2, background: '#141310' }} />
            </div>
            <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 mt-2 text-xs" style={{ color: 'var(--color-surface-400)', fontWeight: 400 }}>
              <RouteLink tab="proteins" className={statLink}>{fmt(maxProteinsOnOnePlatform)} on the broadest platform (black line)</RouteLink>
              <RouteLink tab="unassayed" className={statLink}>{fmt(proteinsOnNoPlatform)} on no platform (grey)</RouteLink>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px" style={{ background: '#e5e4e2', borderTop: '1px solid #e5e4e2' }}>
            <StatCell value={assessedCount} graphic={<UnitDots total={catalogueCount} filled={assessedCount} />}>
              <RouteLink tab="comparison" className={statLink}>platforms assessed in depth</RouteLink>, of <RouteLink tab="platforms" className={statLink}>{catalogueCount} catalogued</RouteLink>
            </StatCell>
            <StatCell value={approx(participantsMulti)} graphic={<ProportionBar part={participantsMulti} whole={participantsAny} />}>
              <RouteLink tab="evidence" className={statLink}>participants measured on two or more platforms</RouteLink>, of {atLeastK(participantsAny)} on any
            </StatCell>
            <StatCell value={fmt(drugTargetsOnAPlatform)} graphic={<ProportionBar part={drugTargetsOnAPlatform} whole={drugTargetCount} />}>
              of {fmt(drugTargetCount)} <RouteLink tab="combine" className={statLink}>drug targets on at least one platform</RouteLink>
            </StatCell>
          </div>
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--color-surface-400)', fontWeight: 400 }}>
          <RouteLink tab="reproducibility" className="underline-offset-2 hover:underline" style={{ color: 'inherit' }}>
            Simulation and coverage figures on this site are reproducible from downloadable code and data.
          </RouteLink>
        </p>
      </div>

      <CatalogueSearch onOpenPlatform={onOpenPlatform} />

      {/* ── Platform Cards Quick Grid ── */}
      <div>
        <h3
          className="uppercase tracking-wide mb-3"
          style={{ color: 'var(--color-surface-400)', fontSize: '10px', letterSpacing: '0.1em', fontWeight: 400 }}
        >
          Platform Overview
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {platforms.map(platform => (
            <PlatformMiniCard key={platform.id} platform={platform} onViewProteins={onNavigateToProteins} onSelect={setSelectedPlatform} />
          ))}
        </div>
      </div>

      {selectedPlatform && (
        <DetailPanel platformId={selectedPlatform.id} onClose={() => setSelectedPlatform(null)} />
      )}
    </div>
  )
}

// Finds any platform in the full catalogue and opens its detail panel in All Platforms.
function CatalogueSearch({ onOpenPlatform }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const q = query.trim().toLowerCase()
  const matches = q
    ? catalog.platforms.filter(p => [p.platform, p.vendor].some(f => f?.toLowerCase().includes(q)))
    : []
  return (
    <div
      className="relative bg-white px-5 py-4"
      style={{ border: '1px solid #e5e4e2' }}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false) }}
    >
      <svg
        className="absolute left-8 top-1/2 -translate-y-1/2 pointer-events-none"
        width="15" height="15" viewBox="0 0 24 24"
        fill="none" stroke="var(--color-surface-400)" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        type="text"
        aria-label="Search the platform catalogue"
        placeholder={`Search all ${catalogueCount} platforms by name or vendor…`}
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => {
          if (e.key === 'Enter' && matches[0]) onOpenPlatform(matches[0].platform)
          if (e.key === 'Escape') setOpen(false)
        }}
        className="w-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition"
        style={{ color: '#141310', background: '#fafaf9', border: '1px solid #e5e4e2', '--tw-ring-color': 'var(--color-brand-500)', fontWeight: 400 }}
      />
      {open && q && (
        <div
          className="absolute left-5 right-5 z-20 max-h-72 overflow-y-auto bg-white"
          style={{ top: 'calc(100% - 12px)', border: '1px solid #e5e4e2', boxShadow: '0 4px 12px rgba(20,19,16,0.08)' }}
        >
          {matches.map(p => (
            <button
              key={p.platform}
              onClick={() => onOpenPlatform(p.platform)}
              className="block w-full text-left px-4 py-2 text-sm transition-colors hover:bg-[#fafaf9]"
              style={{ color: '#141310', fontWeight: 400 }}
            >
              {p.platform}
              <span className="ml-2 text-xs" style={{ color: 'var(--color-surface-400)' }}>{p.vendor}</span>
            </button>
          ))}
          {matches.length === 0 && (
            <p className="px-4 py-2 text-sm" style={{ color: 'var(--color-surface-400)', fontWeight: 400 }}>No platform matches “{query.trim()}”.</p>
          )}
        </div>
      )}
    </div>
  )
}

function PlatformMiniCard({ platform, onViewProteins, onSelect }) {
  const evidenceLabel = platform.evidenceDepth.split(' ')[0]
  const evidenceColor = platform.evidenceDepth.startsWith('High') ? 'var(--color-brand-500)' : platform.evidenceDepth.startsWith('Moderate') ? 'var(--color-amber-text)' : 'var(--color-surface-400)'
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
            border: `1px solid ${platform.platformType === 'ms' ? '#6b5b95' : 'var(--color-brand-500)'}`,
            color: platform.platformType === 'ms' ? '#6b5b95' : 'var(--color-brand-500)',
            fontWeight: 400,
          }}
        >
          {platform.platformType === 'ms' ? 'MS-DIA' : 'Affinity'}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span style={{ color: 'var(--color-surface-400)', fontWeight: 400 }}>Proteins</span>
          <span className="text-right" style={{ color: '#141310', fontWeight: 400 }}>{platform.proteins.split(';')[0]}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span style={{ color: 'var(--color-surface-400)', fontWeight: 400 }}>Sample input</span>
          <span className="text-right" style={{ color: '#141310', fontWeight: 400 }}>{platform.sampleInput}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span style={{ color: 'var(--color-surface-400)', fontWeight: 400 }}>Cost range</span>
          <span style={{ color: '#141310', fontWeight: 400 }}>{platform.costRange}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span style={{ color: 'var(--color-surface-400)', fontWeight: 400 }}>Evidence</span>
          {isLowerConfidence(platform.id) ? (
            <ConfidenceTip note={platformNote(platform.id)} style={{ color: evidenceColor, fontWeight: 400, borderBottom: '1px dotted #b8b6b0' }}>
              {evidenceLabel}
            </ConfidenceTip>
          ) : (
            <span style={{ color: evidenceColor, fontWeight: 400 }}>{evidenceLabel}</span>
          )}
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
              color: platform.textColor,
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
