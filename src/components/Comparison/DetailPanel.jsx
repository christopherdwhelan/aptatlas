import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import PlatformRadar from './PlatformRadar'
import ScoreBar from './ScoreBar'
import scoring from '../../data/scoring.json'
import evidence from '../../data/evidence.json'
import platforms from '../../data/platforms.json'

// ── Icons ──────────────────────────────────────────────────────────────────
const CheckIcon = ({ color }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke={color || '#8B1A1A'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    className="flex-shrink-0 mt-0.5">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const WarnIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className="flex-shrink-0 mt-0.5">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)
const ExternalIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
)
const TagIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
)

// ── Section wrapper ─────────────────────────────────────────────────────────
function Section({ title, children, accent }) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: accent ? undefined : '1px solid #e5e4e2',
        borderLeft: accent ? '4px solid #8B1A1A' : '1px solid #e5e4e2',
        overflow: 'hidden',
      }}
    >
      <div className="px-5 py-3 border-b" style={{ borderColor: '#e5e4e2' }}>
        <p style={{ color: '#8B1A1A', fontSize: 10, letterSpacing: '0.1em', fontWeight: 400, textTransform: 'uppercase' }}>
          {title}
        </p>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

// ── Spec row ────────────────────────────────────────────────────────────────
function SpecRow({ label, value }) {
  return (
    <div className="flex gap-3 py-2 border-b last:border-0" style={{ borderColor: '#e5e4e2' }}>
      <span className="text-xs w-36 flex-shrink-0" style={{ color: '#6f6d67', fontWeight: 400 }}>
        {label}
      </span>
      <span className="text-xs leading-relaxed" style={{ color: '#52504a', fontWeight: 400 }}>{value}</span>
    </div>
  )
}

// ── Main panel ──────────────────────────────────────────────────────────────
export default function DetailPanel({ platformId, onClose }) {
  const platform = platforms.find(p => p.id === platformId)
  const scores = scoring.scores[platformId] || {}
  const relevantStudies = evidence.filter(e => e.platformsCompared.includes(platformId))
  const platformMap = Object.fromEntries(platforms.map(p => [p.id, p]))

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  if (!platform) return null

  // Portal to <body> so the fixed overlay resolves against the viewport,
  // never against a transformed ancestor (e.g. the animated .tab-content).

  const TECH_LABELS = {
    'olink-explore-ht':       'PEA · Dual Antibody · NGS',
    'illumina-protein-prep':  'Aptamer (SOMAmer) · NGS',
    'nulisa':                 'Dual Capture & Release · NGS',
    'nomic-omni':             'Sandwich ELISA · Bead · Flow',
    'seer-proteograph':       'Nanoparticle Enrichment · MS-DIA',
    'biognosys-truediscovery':'Depletion / P2 Enrichment · MS-DIA',
  }

  return createPortal(
    <>
      {/* Backdrop - use onMouseDown so scroll events on the panel don't dismiss */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(3px)' }}
        onMouseDown={onClose}
      />

      {/* Slide-out panel */}
      <div
        className="apt-panel-slide fixed top-0 right-0 bottom-0 z-50 flex flex-col overflow-hidden"
        style={{
          width: 'min(760px, 90vw)',
          background: '#fafaf9',
        }}
        onMouseDown={e => e.stopPropagation()}
        onWheel={e => e.stopPropagation()}
      >
        {/* ── Panel header ── */}
        <div
          className="flex-shrink-0 px-6 py-5 flex items-start justify-between gap-4"
          style={{
            background: '#ffffff',
            borderBottom: `3px solid ${platform.color}`,
          }}
        >
          <div className="flex items-start gap-4">
            {/* Color swatch */}
            <div
              className="w-10 h-10 flex-shrink-0 mt-0.5"
              style={{ background: platform.color, opacity: 0.15 }}
            />
            <div style={{ marginLeft: -44, paddingLeft: 14 }}>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl leading-tight" style={{ color: '#141310', fontWeight: 400 }}>
                  {platform.name}
                </h2>
                <span
                  className="text-xs px-2 py-0.5"
                  style={{
                    background: platform.platformType === 'ms'
                      ? 'rgba(107,91,149,0.1)' : 'rgba(139,26,26,0.08)',
                    color: platform.platformType === 'ms' ? '#6b5b95' : '#8B1A1A',
                    fontWeight: 400,
                    border: '1px solid',
                    borderColor: platform.platformType === 'ms' ? 'rgba(107,91,149,0.25)' : 'rgba(139,26,26,0.2)',
                  }}
                >
                  {platform.platformType === 'ms' ? 'MS-DIA' : 'Affinity'}
                </span>
              </div>
              <p className="text-sm mt-0.5" style={{ color: '#52504a', fontWeight: 400 }}>{platform.company}</p>
              <span
                className="inline-block text-xs mt-1.5 px-2 py-0.5"
                style={{ color: '#52504a', borderColor: '#e5e4e2', background: '#fafaf9', border: '1px solid #e5e4e2', fontWeight: 400 }}
              >
                {TECH_LABELS[platform.id]}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center transition"
            style={{ color: '#52504a', background: '#fafaf9', border: '1px solid #e5e4e2', borderRadius: 2 }}
            onMouseEnter={e => e.currentTarget.style.background = '#f3f2f0'}
            onMouseLeave={e => e.currentTarget.style.background = '#fafaf9'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* 1. Overview */}
          <Section title="Overview">
            <p className="text-sm leading-relaxed" style={{ color: '#52504a', fontWeight: 400 }}>
              {platform.overview}
            </p>
          </Section>

          {/* Radar + Scores side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              style={{ background: '#ffffff', border: '1px solid #e5e4e2', overflow: 'hidden' }}
            >
              <div className="px-5 py-3 border-b" style={{ borderColor: '#e5e4e2' }}>
                <p style={{ color: '#8B1A1A', fontSize: 10, letterSpacing: '0.1em', fontWeight: 400, textTransform: 'uppercase' }}>
                  Performance Profile
                </p>
              </div>
              <div className="px-2 py-3">
                <PlatformRadar platformId={platform.id} color={platform.color} caption />
              </div>
            </div>

            <div
              style={{ background: '#ffffff', border: '1px solid #e5e4e2', overflow: 'hidden' }}
            >
              <div className="px-5 py-3 border-b" style={{ borderColor: '#e5e4e2' }}>
                <p style={{ color: '#8B1A1A', fontSize: 10, letterSpacing: '0.1em', fontWeight: 400, textTransform: 'uppercase' }}>
                  Dimension Scores
                </p>
              </div>
              <div className="px-4 py-3 space-y-2">
                {scoring.dimensions.map(d => (
                  <div key={d.id} className="flex items-center justify-between gap-2">
                    <span className="text-xs" style={{ color: '#52504a', fontWeight: 400 }}>{d.label}</span>
                    <ScoreBar score={scores[d.id]} color={platform.color} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Specifications */}
          <Section title="Specifications">
            <SpecRow label={<>Proteins<sup style={{ color: '#8B1A1A' }}>†</sup></>} value={platform.proteins} />
            <SpecRow label="Technology" value={platform.technology} />
            <SpecRow label="Sample Input" value={platform.sampleInput} />
            <SpecRow label="Sample Types" value={platform.sampleTypes} />
            <SpecRow label="Quantification" value={platform.quantification} />
            {platform.precision && <SpecRow label="Precision (CV)" value={platform.precision} />}
            {platform.sensitivity && <SpecRow label="Sensitivity" value={platform.sensitivity} />}
            {platform.specificity && <SpecRow label="Specificity" value={platform.specificity} />}
            {platform.throughput && <SpecRow label="Throughput" value={platform.throughput} />}
            <SpecRow label="Cost Range" value={platform.costRange} />
            <SpecRow label="Evidence Depth" value={platform.evidenceDepth} />
            {platform.readoutInstruments && (
              <SpecRow label="Readout Instruments" value={platform.readoutInstruments} />
            )}
            <p className="pt-2" style={{ fontSize: 10, color: '#a3a19d', fontWeight: 400, lineHeight: 1.45 }}>
              <span style={{ color: '#8B1A1A' }}>†</span> Counts differ in kind by technology: Olink reports assays; SomaScan reports unique protein targets; Seer and Biognosys report MS protein groups; NULISA reports panel targets. Cross-platform comparisons in this atlas map all content to UniProt identifiers; see Methods.
            </p>
          </Section>

          {/* 3. Strengths & Limitations */}
          <Section title="Strengths & Limitations">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <p className="text-xs mb-2" style={{ color: '#8B1A1A', fontWeight: 500 }}>
                  Key Strengths
                </p>
                <ul className="space-y-2">
                  {platform.keyStrengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: '#52504a', fontWeight: 400 }}>
                      <CheckIcon color={platform.color} />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs mb-2" style={{ color: '#d97706', fontWeight: 500 }}>
                  Key Limitations
                </p>
                <ul className="space-y-2">
                  {platform.keyLimitations.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: '#52504a', fontWeight: 400 }}>
                      <WarnIcon />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>

          {/* 4. Evidence */}
          {relevantStudies.length > 0 && (
            <Section title={`Evidence Base (${relevantStudies.length} studies)`}>
              <div className="space-y-3">
                {relevantStudies.map(study => (
                  <div
                    key={study.id}
                    className="p-3"
                    style={{ background: '#fafaf9', border: '1px solid #e5e4e2' }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-xs" style={{ color: '#141310', fontWeight: 500 }}>
                        {study.shortCitation}
                      </p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className="text-xs px-1.5 py-0.5"
                          style={{ background: '#f3f2f0', color: '#52504a', fontWeight: 400 }}
                        >
                          {study.journal}
                        </span>
                        {study.url && (
                          <a
                            href={study.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs hover:underline"
                            style={{ color: '#8B1A1A', fontWeight: 400 }}
                          >
                            Paper <ExternalIcon />
                          </a>
                        )}
                      </div>
                    </div>
                    {study.sampleSize && (
                      <p className="text-xs mb-1.5" style={{ color: '#6f6d67', fontWeight: 400 }}>
                        n = {study.sampleSize}
                      </p>
                    )}
                    <ul className="space-y-1">
                      {study.keyFindings.slice(0, 3).map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: '#52504a', fontWeight: 400 }}>
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: platform.color }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    {/* Other platforms compared */}
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs" style={{ color: '#6f6d67', fontWeight: 400 }}>Also compared:</span>
                      {study.platformsCompared
                        .filter(pid => pid !== platform.id)
                        .map(pid => {
                          const p = platformMap[pid]
                          return p ? (
                            <span
                              key={pid}
                              className="text-xs px-1.5 py-0.5"
                              style={{ background: `${p.color}18`, color: p.color, fontWeight: 500, border: `1px solid ${p.color}30` }}
                            >
                              {p.name}
                            </span>
                          ) : null
                        })}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* 5. Best For */}
          <Section title="Best For" accent>
            <ul className="space-y-2">
              {(platform.bestFor || []).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm leading-relaxed" style={{ color: '#52504a', fontWeight: 400 }}>
                  <span
                    className="mt-0.5 flex-shrink-0 flex items-center gap-1"
                    style={{ color: '#8B1A1A' }}
                  >
                    <TagIcon />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Section>

          {/* 6. Consider Instead */}
          {platform.considerInstead?.length > 0 && (
            <Section title="Consider Instead">
              <div className="space-y-3">
                {platform.considerInstead.map((item, i) => {
                  const alt = platforms.find(p => p.name === item.platform || p.name.includes(item.platform) || item.platform.includes(p.name.split(" /")[0]))
                  return (
                    <div key={i} className="flex items-start gap-3">
                      {alt && (
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
                          style={{ background: alt.color }}
                        />
                      )}
                      <div>
                        <p className="text-xs" style={{ color: '#141310', fontWeight: 500 }}>
                          {item.platform}
                        </p>
                        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#52504a', fontWeight: 400 }}>
                          {item.reason}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Section>
          )}

          {/* 7. Historical Names */}
          {platform.historicalNames && (
            <Section title="Historical Names & Branding">
              <div
                className="px-4 py-3 text-xs leading-relaxed"
                style={{
                  background: 'rgba(107,91,149,0.04)',
                  borderLeft: '3px solid #6b5b95',
                  color: '#52504a',
                  fontWeight: 400,
                }}
              >
                {platform.historicalNames}
              </div>
            </Section>
          )}

          {/* Bottom padding */}
          <div className="h-4" />
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0.6; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .apt-panel-slide { animation: slideIn 0.22s cubic-bezier(0.22,1,0.36,1); }
        @media (prefers-reduced-motion: reduce) { .apt-panel-slide { animation: none; } }
      `}</style>
    </>,
    document.body
  )
}
