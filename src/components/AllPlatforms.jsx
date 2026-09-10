import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import catalog from '../data/all_platforms.json'

// ── Maps ─────────────────────────────────────────────────────────────────────

// Catalog rows that map to a full ten-axis score in Platform Comparison, keyed by
// their exact catalog `platform` name → app platform id. These get a "Compare in
// depth" button. NULISA is scored on two integrated panels (Neuro 220 + Inflammation
// 250), so both panel rows map to the one `nulisa` score. The two SomaScan lineage
// rows (11K array, 7K legacy) are integrated content-list-wise but scored in the app
// as SomaSeq (NGS), so they carry a note instead of the button.
const APP_ID_BY_NAME = {
  'Olink Explore HT': 'olink-explore-ht',
  'Illumina SomaSeq Discovery (formerly Illumina Protein Prep)': 'illumina-protein-prep',
  'Alamar NULISAseq Neuro 220 Panel': 'nulisa',
  'Alamar NULISAseq Inflammation Panel 250 (IP250)': 'nulisa',
  'Seer Proteograph (XT / ONE nanoparticle corona enrichment)': 'seer-proteograph',
  'Nomic nELISA / Omni 1000': 'nomic-omni',
  'Biognosys TrueDiscovery (P2 plasma enrichment, HRM DIA service)': 'biognosys-truediscovery',
}
const SOMASCAN_LINEAGE = new Set([
  'SomaScan 11K (v5.0) / Illumina SomaScan Discovery',
  'SomaScan 7K (v4.1)',
])

// "Content list" axis, what KIND of measurement (independent of how well characterised
// it is; that's the Level axis). Renamed from T1/T2/T3 to plain Fixed/Configurable/Open so the
// meaning is legible without a legend. Each carries hover-tooltip text.
const TIER_META = {
  T1: { short: 'Fixed', label: 'Fixed content list',
        rubric: 'Fixed, published per-protein content list, you know in advance exactly which proteins are measured (e.g. Olink, SomaScan, NULISA panels). Directly comparable in the coverage tools.' },
  T2: { short: 'Configurable', label: 'Configurable / narrow panel',
        rubric: 'A user-configurable or narrow panel, comparable per configuration rather than as one fixed catalog. The measured proteins depend on which analytes you select (e.g. Simoa, Olink Target, custom targeted MRM).' },
  T3: { short: 'Open',  label: 'Open discovery (no fixed list)',
        rubric: 'No fixed analyte list, proteins measured are discovered per run (open discovery mass spectrometry or de novo sequencing, e.g. Seer, Biognosys TrueDiscovery).' },
}

// integration_status → chip. Text + color (never hue alone), from the existing palette.
const STATUS_META = {
  'Integrated':                       { label: 'Integrated',        color: '#8B1A1A', bg: 'rgba(139,26,26,0.08)', border: 'rgba(139,26,26,0.25)' },
  'Integration-ready':                { label: 'Integration-ready', color: '#8B1A1A', bg: 'transparent',          border: 'rgba(139,26,26,0.35)' },
  'Targeted panel':                   { label: 'Targeted panel',    color: '#6f6d67', bg: '#f3f2f0',          border: '#e5e4e2' },
  'Profiled / reference':             { label: 'Profiled / reference', color: '#6f6d67', bg: '#f3f2f0',           border: '#e5e4e2' },
  'Emerging, not yet scored':        { label: 'Emerging',          color: '#6f6d67', bg: 'transparent',          border: '#d0cfcc' },
  'Retired':                          { label: 'Retired',           color: '#a3a19d', bg: 'transparent',          border: '#e5e4e2', strike: true },
  'Enabling instrument (not ranked)': { label: 'Enabling',          color: '#6f6d67', bg: '#f3f2f0',              border: '#e5e4e2' },
  'Enabling sample-prep (not ranked)':{ label: 'Enabling',          color: '#6f6d67', bg: '#f3f2f0',              border: '#e5e4e2' },
}

const AVAIL_LABEL = {
  generally_available:        'Generally available',
  early_access:               'Early access',
  superseded_still_orderable: 'Superseded, still orderable',
  superseded_legacy:          'Superseded, legacy',
  superseded_retired:         'Superseded, retired',
  pre_commercial:             'Pre-commercial',
}

// ── Small presentational helpers ─────────────────────────────────────────────

function StatusChip({ status }) {
  const m = STATUS_META[status] || { label: status, color: '#6f6d67', bg: '#f3f2f0', border: '#e5e4e2' }
  return (
    <span
      className="inline-block whitespace-nowrap"
      style={{
        fontSize: 10, letterSpacing: '0.04em', fontWeight: 500, padding: '2px 7px',
        color: m.color, background: m.bg, border: `1px solid ${m.border}`,
        textDecoration: m.strike ? 'line-through' : 'none',
      }}
    >
      {m.label}
    </span>
  )
}

function TierChip({ tier }) {
  const m = TIER_META[tier]
  const ref = useRef(null)
  const [tip, setTip] = useState(null)
  if (!m) return null
  const show = () => { if (ref.current) { const r = ref.current.getBoundingClientRect(); setTip({ x: r.left, y: r.bottom + 6 }) } }
  const hide = () => setTip(null)
  return (
    <span ref={ref} tabIndex={0}
      onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}
      className="inline-block whitespace-nowrap cursor-help"
      style={{ fontSize: 10, letterSpacing: '0.04em', fontWeight: 500, padding: '2px 6px', color: '#52504a', background: '#fafaf9', border: '1px dotted #b8b6b1' }}>
      {m.short}
      {tip && createPortal(
        <div role="tooltip" style={{
          position: 'fixed', left: tip.x, top: tip.y, zIndex: 60, maxWidth: 280,
          background: '#141310', color: '#fafaf9', fontSize: 11, fontWeight: 300,
          lineHeight: 1.5, letterSpacing: 0, textTransform: 'none', padding: '8px 10px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.28)', pointerEvents: 'none' }}>
          <strong style={{ fontWeight: 600 }}>{m.label}.</strong> {m.rubric}
        </div>, document.body)}
    </span>
  )
}

// Proportional 0–3 readiness bar (composite index; not a 1–5 dot scale).
// Why a row carries no integration-readiness score. Instruments/prep are a KIND, not a
// rung, so they never read "<100 proteins" (an Astral measures thousands, it just isn't
// a procurable service). Only rows explicitly confirmed sub-100 get that reason.
function notScoredReason(row) {
  if (!row) return 'not scored'
  if (row.entity_type === 'instrument_line')       return 'instrument, not a service'
  if (row.entity_type === 'sample_prep_chemistry') return 'sample prep, not a service'
  const av = String(row.availability_status || '')
  if (av.includes('superseded') || row.integration_status === 'Retired') return 'not scored, superseded'
  if (row.sub100_confirmed)                          return 'not scored, <100 proteins'
  if (String(row.integration_status).startsWith('Targeted')) return 'not scored, targeted panel'
  return 'not scored, emerging'
}

function ReadinessBar({ value, row }) {
  // Already-assessed platforms are the destination, not candidates, so they show
  // "Integrated" (they carry the full ten-axis score in Platform Comparison) and are
  // never placed on the integration-readiness candidate ladder.
  if (value == null && row?.readiness_note === 'integrated') {
    return <span className="text-xs" title="Fully scored on all ten axes in Platform Comparison; not ranked on the readiness ladder"
      style={{ color: '#8B1A1A', fontWeight: 500 }}>
      Integrated{row.combined_with ? ` (combined with ${row.combined_with})` : ''}
    </span>
  }
  if (value == null) return <span className="text-xs" style={{ color: '#a3a19d', fontWeight: 300 }}>{notScoredReason(row)}</span>
  const pct = Math.max(0, Math.min(100, (value / 3) * 100))
  return (
    <div className="flex items-center gap-2" title={`Integration-readiness ${value} of 3`}>
      <div className="h-1.5 flex-1 min-w-[48px] overflow-hidden" style={{ background: '#f3f2f0' }}>
        <div className="h-full" style={{ width: `${pct}%`, background: '#8B1A1A' }} />
      </div>
      <span className="text-xs tabular-nums" style={{ color: '#141310', fontWeight: 400 }}>{value.toFixed(2).replace(/\.?0+$/, '')}</span>
    </div>
  )
}

function AvailCell({ row }) {
  const deployable = row.currently_deployable
  return (
    <span className="inline-flex items-center gap-1 text-xs" style={{ color: deployable ? '#4F6B4A' : '#6f6d67', fontWeight: 300 }}>
      <span aria-hidden>{deployable ? '✓' : '✗'}</span>
      {AVAIL_LABEL[row.availability_status] || row.availability_status}
    </span>
  )
}

// ── Detail panel (catalog-driven; shares DetailPanel's shell, no radar) ───────

// Collect external links for a row from verified fields only (vendor page, citation DOI,
// any URL embedded in the short citation). Deduped by destination; no links invented.
function externalLinks(row, d) {
  const out = []
  const seen = new Set()
  const push = (label, href) => {
    if (!href) return
    const key = href.replace(/\/+$/, '')
    if (seen.has(key)) return
    seen.add(key); out.push({ label, href })
  }
  // DOIs already shown in the Key publications section, so we don't repeat them here.
  const pubDois = new Set((d.publications || []).map(pb => pb.doi).filter(Boolean))
  if (row.availability_source && /^https?:\/\//.test(row.availability_source)) push('Vendor / product page', row.availability_source)
  if (d.key_citation_doi && !pubDois.has(d.key_citation_doi)) push('Key citation (DOI)', `https://doi.org/${d.key_citation_doi}`)
  // pull the first bare URL out of the short-citation string, if present
  const m = (d.key_citation_short || '').match(/https?:\/\/[^\s;,)]+/)
  if (m) push('Reference', m[0])
  return out
}

function Section({ title, children }) {
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6f6d67', marginBottom: 6 }}>{title}</p>
      {children}
    </div>
  )
}
function Spec({ label, value }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-2 border-b last:border-0" style={{ borderColor: '#e5e4e2' }}>
      <span className="text-xs flex-shrink-0" style={{ color: '#6f6d67', fontWeight: 300, width: 132 }}>{label}</span>
      <span className="text-xs leading-relaxed" style={{ color: '#52504a', fontWeight: 300 }}>{value}</span>
    </div>
  )
}

function DetailPanel({ row, onClose, onCompareInDepth }) {
  const closeRef = useRef(null)
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    const prevFocus = document.activeElement
    closeRef.current?.focus()
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
      if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus()
    }
  }, [onClose])

  if (!row) return null
  const d = row.detail || {}
  const appId = APP_ID_BY_NAME[row.platform]
  const isLineage = SOMASCAN_LINEAGE.has(row.platform)
  const headingId = 'allplatforms-detail-heading'

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(3px)' }} onMouseDown={onClose} />
      <div
        className="apt-panel-slide fixed top-0 right-0 bottom-0 z-50 flex flex-col overflow-hidden"
        style={{ width: 'min(720px, 92vw)', background: '#fafaf9' }}
        role="dialog" aria-modal="true" aria-labelledby={headingId}
        onMouseDown={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-5 flex items-start justify-between gap-4" style={{ background: '#ffffff', borderBottom: '2px solid #141310' }}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <TierChip tier={row.integration_tier} />
              <StatusChip status={row.integration_status} />
            </div>
            <h2 id={headingId} className="text-lg leading-tight" style={{ color: '#141310', fontWeight: 600 }}>{row.platform}</h2>
            {row.vendor && <p className="text-sm mt-0.5" style={{ color: '#52504a', fontWeight: 300 }}>{row.vendor}</p>}
          </div>
          <button
            ref={closeRef}
            onClick={onClose} aria-label="Close"
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center"
            style={{ color: '#52504a', background: '#fafaf9', border: '1px solid #e5e4e2' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f3f2f0'}
            onMouseLeave={e => e.currentTarget.style.background = '#fafaf9'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {d.overview && (
            <div style={{ background: '#ffffff', border: '1px solid #e5e4e2', borderLeft: '3px solid #8B1A1A', padding: '14px 18px' }}>
              <p style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8B1A1A', marginBottom: 8 }}>
                About {row.platform.split(/[(/]/)[0].trim()}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: '#3a3833', fontWeight: 300 }}>{d.overview.about}</p>
              {d.overview.best_for && (
                <p className="text-xs leading-relaxed mt-3" style={{ color: '#52504a', fontWeight: 400 }}>
                  <span style={{ color: '#8B1A1A', fontWeight: 500 }}>Best for: </span>{d.overview.best_for}
                </p>
              )}
              {(d.overview.strengths?.length || d.overview.limitations?.length) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-3" style={{ borderTop: '1px solid #f3f2f0' }}>
                  {d.overview.strengths?.length > 0 && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6f6d67', marginBottom: 4 }}>Strengths</p>
                      <ul className="text-xs leading-relaxed" style={{ color: '#52504a', fontWeight: 300, listStyle: 'none', padding: 0, margin: 0 }}>
                        {d.overview.strengths.map((s, i) => (
                          <li key={i} className="flex gap-1.5 mt-1"><span aria-hidden style={{ color: '#4F6B4A' }}>+</span><span>{s}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {d.overview.limitations?.length > 0 && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6f6d67', marginBottom: 4 }}>Limitations</p>
                      <ul className="text-xs leading-relaxed" style={{ color: '#52504a', fontWeight: 300, listStyle: 'none', padding: 0, margin: 0 }}>
                        {d.overview.limitations.map((s, i) => (
                          <li key={i} className="flex gap-1.5 mt-1"><span aria-hidden style={{ color: '#a3a19d' }}>–</span><span>{s}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {row.apt_readiness_rank_v1 != null && (
            <div style={{ background: '#ffffff', border: '1px solid #e5e4e2', padding: '12px 16px' }}>
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6f6d67' }}>Integration-readiness</span>
                <span className="text-xs" style={{ color: '#6f6d67', fontWeight: 300 }}>maturity {row.maturity_score} · validation {row.validation_score} · {TIER_META[row.integration_tier]?.short || row.integration_tier}</span>
              </div>
              <ReadinessBar value={row.apt_readiness_rank_v1} row={row} />
            </div>
          )}

          {(appId || isLineage) && (
            <div style={{ background: 'rgba(139,26,26,0.05)', borderLeft: '3px solid #8B1A1A', padding: '10px 14px' }}>
              {appId ? (
                <>
                  <button onClick={() => onCompareInDepth?.(appId)} className="text-sm hover:underline" style={{ color: '#8B1A1A', fontWeight: 400, cursor: 'pointer' }}>
                    Compare in depth in Platform Comparison →
                  </button>
                  {appId === 'nulisa' && (
                    <p className="text-xs mt-1.5" style={{ color: '#52504a', fontWeight: 300 }}>
                      In Platform Comparison, NULISA is scored on its combined integrated content: the Neuro 220 and Inflammation 250 panels.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs" style={{ color: '#52504a', fontWeight: 300 }}>Scored as SomaSeq (NGS) in Platform Comparison; this row documents the SomaScan lineage.</p>
              )}
            </div>
          )}

          <div style={{ background: '#ffffff', border: '1px solid #e5e4e2', padding: '4px 16px' }}>
            <Spec label="Chemistry" value={d.chemistry} />
            <Spec label="Plex / depth" value={d.plex_or_depth} />
            <Spec label="Matrix" value={d.matrix} />
            <Spec label="Sample volume" value={d.sample_volume} />
            <Spec label="Throughput" value={d.throughput} />
            <Spec label="Cost tier" value={d.cost_tier} />
            <Spec label="Quantitation" value={d.quantitation_type} />
            <Spec label="Proteoform / PTM" value={d.proteoform_ptm} />
            <Spec label="CSF performance" value={d.csf_performance} />
            <Spec label="Runs on" value={row.runs_on} />
            <Spec label="Replaced by" value={row.replaced_by} />
            <Spec label="Availability" value={AVAIL_LABEL[row.availability_status] || row.availability_status} />
          </div>

          {d.assessment_scope_note && (
            <Section title="Assessment scope">
              <p className="text-xs leading-relaxed" style={{ color: '#52504a', fontWeight: 300 }}>{d.assessment_scope_note}</p>
            </Section>
          )}
          {d.analytical_validation && (
            <Section title="Analytical validation">
              <p className="text-xs leading-relaxed" style={{ color: '#52504a', fontWeight: 300 }}>{d.analytical_validation}</p>
            </Section>
          )}
          {(row.validation_basis || row.verification_grade) && (
            <Section title="Evidence basis">
              <p className="text-xs leading-relaxed" style={{ color: '#52504a', fontWeight: 300 }}>
                {row.validation_basis || 'Not independently scored.'}
                {row.verification_grade ? ` (verification: ${row.verification_grade})` : ''}
              </p>
            </Section>
          )}
          {Array.isArray(d.publications) && d.publications.length > 0 ? (
            <Section title={d.publications.length > 1 ? 'Key publications' : 'Key publication'}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {d.publications.map((pub, i) => (
                  <li key={i} className="text-xs leading-relaxed" style={{ color: '#52504a', fontWeight: 300, paddingBottom: 6 }}>
                    {pub.label && <span>{pub.label}</span>}
                    {pub.doi && (
                      <>
                        {pub.label ? ' · ' : ''}
                        <a href={`https://doi.org/${pub.doi}`} target="_blank" rel="noopener noreferrer"
                          onClick={(e) => { e.stopPropagation(); const w = window.open(`https://doi.org/${pub.doi}`, '_blank', 'noopener,noreferrer'); if (w) e.preventDefault() }}
                          className="hover:underline break-all" style={{ color: '#8B1A1A', cursor: 'pointer' }}>
                          doi:{pub.doi}<span aria-hidden style={{ marginLeft: 2 }}>↗</span>
                        </a>
                      </>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-xs mt-1" style={{ color: '#a3a19d', fontWeight: 300 }}>
                Independently verified where a DOI is shown. Vendor or preprint sources are labelled as such.
              </p>
            </Section>
          ) : (d.key_citation_short || d.key_citation_doi) && (
            <Section title="Key publication">
              <p className="text-xs leading-relaxed" style={{ color: '#52504a', fontWeight: 300 }}>
                {d.key_citation_short}
                {d.key_citation_doi && (
                  <>{' '}<a href={`https://doi.org/${d.key_citation_doi}`} target="_blank" rel="noopener noreferrer" onClick={(e) => { e.stopPropagation(); const w = window.open(`https://doi.org/${d.key_citation_doi}`, '_blank', 'noopener,noreferrer'); if (w) e.preventDefault() }} className="hover:underline" style={{ color: '#8B1A1A', cursor: 'pointer' }}>doi:{d.key_citation_doi}</a></>
                )}
              </p>
            </Section>
          )}
          {externalLinks(row, d).length > 0 && (
            <Section title="External links">
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {externalLinks(row, d).map((lnk, i) => (
                  <li key={i} className="flex items-baseline gap-2 py-1">
                    <span className="text-xs flex-shrink-0" style={{ color: '#6f6d67', fontWeight: 300, width: 132 }}>{lnk.label}</span>
                    <a href={lnk.href} target="_blank" rel="noopener noreferrer"
                      onClick={(e) => { e.stopPropagation(); const w = window.open(lnk.href, '_blank', 'noopener,noreferrer'); if (w) e.preventDefault() }}
                      className="text-xs hover:underline break-all" style={{ color: '#8B1A1A', fontWeight: 300, cursor: 'pointer' }}>
                      {lnk.href.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      <span aria-hidden style={{ marginLeft: 3 }}>↗</span>
                    </a>
                  </li>
                ))}
              </ul>
              <p className="text-xs mt-1.5" style={{ color: '#a3a19d', fontWeight: 300 }}>Links open in a new tab; verify current specifications with the vendor.</p>
            </Section>
          )}
          <div className="h-2" />
        </div>
      </div>

      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0.6; } to { transform: translateX(0); opacity: 1; } }
        .apt-panel-slide { animation: slideIn 0.22s cubic-bezier(0.22,1,0.36,1); }
        @media (prefers-reduced-motion: reduce) { .apt-panel-slide { animation: none; } }
      `}</style>
    </>,
    document.body
  )
}

// ── Level model (the honesty axis, now a sortable column) ────────────────────

// Evaluation level: a single first-class axis so the flat table stays legible.
// APT-assessed (full ten-axis) → Preliminary (readiness-only) → Targeted panels
// → Emerging (unscored) → Enabling (instruments / sample-prep, never ranked).
const LEVEL_META = {
  'APT-assessed': { order: 0, label: 'APT-assessed', color: '#8B1A1A', bg: 'rgba(139,26,26,0.08)', border: 'rgba(139,26,26,0.25)',
    rubric: 'Full ten-axis Platform Comparison score.' },
  'Preliminary':  { order: 1, label: 'Emerging',      color: '#8B1A1A', bg: 'transparent',           border: 'rgba(139,26,26,0.35)',
    rubric: 'Integration-readiness score only, may be integrated into a future APT version.' },
  'Targeted':     { order: 2, label: 'Targeted',      color: '#6f6d67', bg: '#f3f2f0',              border: '#e5e4e2',
    rubric: 'Targeted or configurable panel with no fixed large content list; not eligible for the integrated tier. Not ranked.' },
  'Emerging':     { order: 3, label: 'Early',         color: '#6f6d67', bg: 'transparent',          border: '#d0cfcc',
    rubric: 'Early technology, pre-commercial or awaiting independent validation. Carries a low readiness score.' },
  'Enabling':     { order: 4, label: 'Enabling',      color: '#6f6d67', bg: '#f3f2f0',              border: '#e5e4e2',
    rubric: 'Instrument or sample-prep chemistry that services run on; never ranked.' },
  'Retired':      { order: 5, label: 'Retired',       color: '#a3a19d', bg: 'transparent',          border: '#e5e4e2', strike: true,
    rubric: 'Discontinued or superseded by a newer product. Kept for reference; not scored or ranked.' },
}
function levelOf(p) {
  if (String(p.integration_status) === 'Retired' || p.availability_status === 'superseded_retired') return 'Retired'
  if (p.entity_type === 'instrument_line' || p.entity_type === 'sample_prep_chemistry') return 'Enabling'
  if (p.score_status === 'APT-assessed') return 'APT-assessed'
  if (String(p.integration_status).startsWith('Targeted')) return 'Targeted'
  if (String(p.integration_status).startsWith('Emerging')) return 'Emerging'
  if (p.score_status === 'preliminary') return 'Preliminary'
  return 'Emerging'
}

function LevelChip({ level, combinedWith }) {
  const m = LEVEL_META[level] || LEVEL_META['Emerging']
  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      <span className="inline-block whitespace-nowrap" style={{
        fontSize: 10, letterSpacing: '0.04em', fontWeight: 500, padding: '2px 7px',
        color: m.color, background: m.bg, border: `1px solid ${m.border}`,
        textDecoration: m.strike ? 'line-through' : 'none' }}>
        {m.label}
      </span>
      {combinedWith && (
        <span className="inline-block whitespace-nowrap" title={`Assessed jointly with ${combinedWith}`} style={{
          fontSize: 8.5, letterSpacing: '0.02em', fontWeight: 400, padding: '1px 5px',
          color: '#6f6d67', background: '#f3f2f0', border: '1px dotted #c8c6c1' }}>
          +&nbsp;{combinedWith}
        </span>
      )}
    </span>
  )
}

// Clickable platform name with a pointer cursor + instant "Click to learn more" tooltip.
function PlatformName({ row, onOpen }) {
  const ref = useRef(null)
  const [tip, setTip] = useState(null)
  const show = () => { if (ref.current) { const r = ref.current.getBoundingClientRect(); setTip({ x: r.left, y: r.bottom + 6 }) } }
  const hide = () => setTip(null)
  const [hover, setHover] = useState(false)
  return (
    <>
      <button ref={ref} onClick={() => onOpen(row)}
        onMouseEnter={() => { setHover(true); show() }} onMouseLeave={() => { setHover(false); hide() }}
        onFocus={show} onBlur={hide}
        className="text-left underline-offset-2"
        style={{ color: hover ? '#8B1A1A' : '#141310', fontWeight: 400, cursor: 'pointer',
          textDecoration: hover ? 'underline' : 'none' }}>
        {row.platform}
      </button>
      {tip && createPortal(
        <div role="tooltip" style={{
          position: 'fixed', left: tip.x, top: tip.y, zIndex: 60, whiteSpace: 'nowrap',
          background: '#141310', color: '#fafaf9', fontSize: 11, fontWeight: 300,
          letterSpacing: 0, textTransform: 'none', padding: '6px 9px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.28)', pointerEvents: 'none' }}>
          Click to learn more
        </div>, document.body)}
    </>
  )
}

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

// ── Sortable columns ─────────────────────────────────────────────────────────

const TH = { fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6f6d67', background: '#ffffff' }

// col: field key; get: value accessor; type drives the comparator; sortable toggles the header
const COLUMNS = [
  { key: 'platform',   label: 'Platform',     type: 'str',   sortable: true,  min: 210, sticky: true,
    hint: 'The commercial platform, assay, service, instrument, or sample-prep chemistry. Click a name for the full profile.' },
  { key: 'vendor',     label: 'Vendor',       type: 'str',   sortable: true,  min: 120,
    hint: 'The company or academic group that provides the platform.' },
  { key: 'level',      label: 'Level',        type: 'level', sortable: true,  min: 108, get: levelOf,
    hint: 'How far the platform is through evaluation: APT-assessed (full ten-axis score), Emerging (readiness score only, may integrate in future), Targeted (configurable or small panel, not integration-eligible), Early (pre-commercial, low readiness score), Enabling (instrument/sample-prep, never ranked), or Retired (discontinued/superseded, kept for reference).' },
  { key: 'tier',       label: 'Content list', type: 'str',   sortable: true,  min: 96,  get: p => p.integration_tier,
    hint: 'What KIND of measurement: Fixed (published per-protein list), Configurable (you choose the analytes; comparable per configuration), or Open (discovery, no fixed list). Independent of how well characterised the platform is.' },
  { key: 'readiness',  label: 'Readiness for APT', type: 'num', sortable: true, min: 150, get: p => p.apt_readiness_rank_v1,
    hint: 'Integration-readiness (0 to 3): how ready a candidate platform is to be folded into the APT deep comparison, from maturity, validation depth, and content-list type. Already-assessed platforms show "Integrated" and are not ranked here.' },
  { key: 'chemistry',  label: 'Chemistry',    type: 'str',   sortable: false, min: 200, get: p => p.detail?.chemistry,
    hint: 'The measurement principle: how the platform detects and quantifies proteins.' },
  { key: 'plex',       label: 'Plex / depth', type: 'str',   sortable: false, min: 150, get: p => p.detail?.plex_or_depth,
    hint: 'How many proteins the platform measures, with the unit stated (assays, unique proteins, protein groups, or aptamer measurements).' },
  { key: 'matrix',     label: 'Matrix',       type: 'str',   sortable: false, min: 120, get: p => p.detail?.matrix,
    hint: 'The validated sample types, for example plasma, serum, CSF, tissue, or cell lysate.' },
  { key: 'avail',      label: 'Availability', type: 'str',   sortable: true,  min: 150, get: p => p.availability_status,
    hint: 'Current commercial availability, verified against vendor sources: generally available, early access, superseded, retired, or pre-commercial.' },
]

function comparator(colKey, dir) {
  const s = dir === 'asc' ? 1 : -1
  const tie = (a, b) => a.platform.localeCompare(b.platform)
  if (colKey === 'readiness') {
    // Rankable rows carry a position on the readiness scale and move WITH the sort
    // direction: Integrated platforms sit at the top of the scale (fully folded in), so
    // desc puts them first and asc puts them last, alongside the scored candidates.
    // Non-applicable rows (emerging, targeted, enabling) have no readiness concept, so
    // they always sink to the bottom in either direction and are never read as "worst".
    const rankable = (r) => r.readiness_note === 'integrated' || r.apt_readiness_rank_v1 != null
    const val = (r) => r.readiness_note === 'integrated' ? Infinity : r.apt_readiness_rank_v1
    return (a, b) => {
      const ra = rankable(a), rb = rankable(b)
      if (ra !== rb) return ra ? -1 : 1            // non-applicable always last, direction-independent
      if (!ra) return tie(a, b)
      const av = val(a), bv = val(b)
      if (av === bv) return tie(a, b)              // handles Integrated vs Integrated (Inf-Inf)
      return s * (av - bv) || tie(a, b)
    }
  }
  if (colKey === 'level') {
    return (a, b) => s * (LEVEL_META[levelOf(a)].order - LEVEL_META[levelOf(b)].order) || tie(a, b)
  }
  const col = COLUMNS.find(c => c.key === colKey)
  const get = col?.get || (p => p[colKey])
  return (a, b) => s * String(get(a) ?? '').localeCompare(String(get(b) ?? '')) || tie(a, b)
}

// ── Main tab: one sortable table, level-aware ────────────────────────────────

// Sortable header cell with an INSTANT custom tooltip (native title has a ~1s delay).
// Tooltip is positioned via a portal so it is never clipped by the scroll container.
function HeaderCell({ col, sortCol, sortDir, onClick }) {
  const ref = useRef(null)
  const [tip, setTip] = useState(null)
  const show = () => {
    if (!col.hint || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    setTip({ x: r.left, y: r.bottom + 6 })
  }
  const hide = () => setTip(null)
  const title = [col.hint, col.sortable ? 'Click to sort.' : null].filter(Boolean).join(' ')
  return (
    <th ref={ref}
      onClick={() => onClick(col.key)}
      onKeyDown={e => { if (col.sortable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick(col.key) } }}
      onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}
      tabIndex={(col.sortable || col.hint) ? 0 : undefined}
      aria-sort={col.sortable ? (sortCol === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
      className={`text-left px-3 py-2.5 sticky top-0 ${col.sticky ? 'left-0 z-30' : 'z-20'} ${col.sortable ? 'cursor-pointer select-none' : ''}`}
      style={{ ...TH, minWidth: col.min, borderBottom: '2px solid #141310', boxShadow: '0 1px 0 #141310' }}>
      {col.label}
      {col.sortable && <SortIcon dir={sortCol === col.key ? sortDir : null} />}
      {tip && createPortal(
        <div role="tooltip" style={{
          position: 'fixed', left: tip.x, top: tip.y, zIndex: 60, maxWidth: 300,
          background: '#141310', color: '#fafaf9', fontSize: 11, fontWeight: 300,
          lineHeight: 1.5, letterSpacing: 0, textTransform: 'none', padding: '8px 10px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.28)', pointerEvents: 'none' }}>
          {title}
        </div>, document.body)}
    </th>
  )
}

export default function AllPlatforms({ onCompareInDepth }) {
  const [detailRow, setDetailRow] = useState(null)
  const [sortCol, setSortCol] = useState('readiness')
  const [sortDir, setSortDir] = useState('desc')
  const [grouped, setGrouped] = useState(false)
  const [deployableOnly, setDeployableOnly] = useState(false)
  const { meta, platforms } = catalog

  const clickHeader = (key) => {
    const col = COLUMNS.find(c => c.key === key)
    if (!col?.sortable) return
    if (sortCol === key) setSortDir(d => (d === 'desc' ? 'asc' : 'desc'))
    else { setSortCol(key); setSortDir(key === 'platform' || key === 'vendor' ? 'asc' : 'desc') }
  }

  // Filtered + sorted. In grouped mode, rows are ordered by level then the active sort
  // within each level. Readiness is inherently a cross-level ordering, so sorting by it
  // overrides grouping and applies globally (otherwise "not scored" rows would appear
  // inside their level group instead of at the bottom of the whole table).
  const view = useMemo(() => {
    let rows = platforms
    if (deployableOnly) rows = rows.filter(p => p.currently_deployable)
    const active = comparator(sortCol, sortDir)
    if (!grouped || sortCol === 'readiness') return [{ level: null, rows: [...rows].sort(active) }]
    const byLevel = {}
    for (const p of rows) { const L = levelOf(p); (byLevel[L] ||= []).push(p) }
    return Object.keys(byLevel)
      .sort((a, b) => LEVEL_META[a].order - LEVEL_META[b].order)
      .map(L => ({ level: L, rows: byLevel[L].sort(active) }))
  }, [platforms, deployableOnly, sortCol, sortDir, grouped])

  const nShown = view.reduce((n, g) => n + g.rows.length, 0)

  return (
    <div className="max-w-screen-xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg" style={{ color: '#141310', fontWeight: 600 }}>All Platforms</h2>
        <p className="text-sm mt-0.5" style={{ color: '#52504a', fontWeight: 300 }}>
          As of September 2026, the Atlas of Proteomic Technologies (APT) has collated evidence for
          {' '}{meta.n_total} protein measurement platforms. Six of these platforms are sufficiently
          documented in the peer-reviewed literature to enable full evaluation and cross-platform
          comparisons. Another {meta.n_preliminary} are emerging technologies that may be integrated
          into future APT versions. A further {meta.n_emerging} are early technologies not yet
          ready for comprehensive assessment. Targeted panels (configurable or small assays not eligible
          for the integrated tier) and enabling hardware (for example, the Orbitrap Astral) are not
          directly scored as part of APT, but are presented here for completeness.
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: '#52504a', fontWeight: 300 }}>
            <input type="checkbox" checked={grouped} onChange={e => setGrouped(e.target.checked)} style={{ accentColor: '#8B1A1A' }} />
            Group by level
          </label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: '#52504a', fontWeight: 300 }}>
            <input type="checkbox" checked={deployableOnly} onChange={e => setDeployableOnly(e.target.checked)} style={{ accentColor: '#8B1A1A' }} />
            Currently deployable only
          </label>
        </div>
        {/* Mobile sort control */}
        <div className="sm:hidden flex items-center gap-2">
          <select value={sortCol} onChange={e => setSortCol(e.target.value)}
            className="text-xs" style={{ border: '1px solid #e5e4e2', padding: '4px 8px', background: '#fff', color: '#52504a' }}>
            {COLUMNS.filter(c => c.sortable).map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <button onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
            className="text-xs" style={{ border: '1px solid #e5e4e2', padding: '4px 8px', background: '#fff', color: '#8B1A1A' }}>
            {sortDir === 'desc' ? '↓' : '↑'}
          </button>
        </div>
        <span className="text-xs tabular-nums" style={{ color: '#a3a19d', fontWeight: 300 }}>{nShown} of {meta.n_total} shown</span>
      </div>

      {/* Desktop: one sortable table. The wrapper is a bounded scroll region so the
          header row can freeze (position: sticky top-0) while the body scrolls under it,
          and the first column stays frozen horizontally. */}
      <div className="hidden sm:block overflow-auto" style={{ border: '1px solid #e5e4e2', maxHeight: 'calc(100vh - 220px)' }}>
        <table className="w-full text-sm border-collapse" style={{ minWidth: 1120 }}>
          <thead>
            <tr>
              {COLUMNS.map(c => (
                <HeaderCell key={c.key} col={c} sortCol={sortCol} sortDir={sortDir} onClick={clickHeader} />
              ))}
            </tr>
          </thead>
          <tbody>
            {view.map(group => (
              <FragmentGroup key={group.level ?? 'flat'} group={group} onOpen={setDetailRow} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards in the same computed order */}
      <div className="sm:hidden space-y-4">
        {view.map(group => (
          <div key={group.level ?? 'flat'} className="space-y-2">
            {group.level && <GroupHeaderMobile level={group.level} count={group.rows.length} />}
            {group.rows.map(r => (
              <button key={r.platform} onClick={() => setDetailRow(r)} className="w-full text-left" style={{ background: '#ffffff', border: '1px solid #e5e4e2', padding: '12px 14px' }}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-sm" style={{ color: '#141310', fontWeight: 400 }}>{r.platform}</span>
                  <LevelChip level={levelOf(r)} combinedWith={r.combined_with} />
                </div>
                {r.vendor && <p className="text-xs" style={{ color: '#6f6d67', fontWeight: 300 }}>{r.vendor}</p>}
                {r.runs_on && <p className="text-xs mt-0.5" style={{ color: '#a3a19d', fontWeight: 300 }}>runs on → {r.runs_on}</p>}
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  <TierChip tier={r.integration_tier} />
                  <AvailCell row={r} />
                </div>
                <div className="mt-2"><ReadinessBar value={r.apt_readiness_rank_v1} row={r} /></div>
                {r.detail?.chemistry && <p className="text-xs mt-2 leading-snug" style={{ color: '#52504a', fontWeight: 300 }}>{r.detail.chemistry}</p>}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* How to read this — legend, placed below the table */}
      <div style={{ background: '#fafaf9', border: '1px solid #e5e4e2', borderLeft: '3px solid #8B1A1A', padding: '16px 20px', marginTop: 4 }}>
        <p style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8B1A1A', marginBottom: 10 }}>How to read this table</p>
        <p className="text-xs leading-relaxed" style={{ color: '#52504a', fontWeight: 300, marginBottom: 12, maxWidth: '78ch' }}>
          Every column is sortable. The <strong style={{ fontWeight: 500 }}>Level</strong> column captures how far a
          platform has progressed through APT&rsquo;s evaluation, and <strong style={{ fontWeight: 500 }}>Readiness for APT</strong> scores
          how ready a candidate is to enter the full comparison. Readiness reflects integration-readiness, not scientific quality,
          and the score is shown as a proportional bar, so platforms sharing a value are genuinely comparable at that stage.
        </p>
        <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 14, rowGap: 8, margin: 0 }}>
          {[
            ['APT-assessed', LEVEL_META['APT-assessed'], 'Fully evaluated on all ten axes in Platform Comparison. Shown as \u201cIntegrated\u201d and held off the readiness ladder, since they are the destination.'],
            ['Emerging', LEVEL_META['Preliminary'], 'Carries an integration-readiness score (0 to 3) but is not yet in the deep comparison. Candidates for a future APT version.'],
            ['Targeted', LEVEL_META['Targeted'], 'Targeted or configurable panel with no fixed large content list (many measure fewer than 100 proteins); not eligible for the integrated tier. Presented for completeness, not ranked.'],
            ['Early', LEVEL_META['Emerging'], 'Pre-commercial or awaiting independent validation. Carries a low readiness score, and many share the same value, which honestly reflects how little separates them.'],
            ['Enabling', LEVEL_META['Enabling'], 'Instruments and sample-prep chemistries that services run on (for example the Orbitrap Astral). Never ranked against those services.'],
            ['Retired', LEVEL_META['Retired'], 'Discontinued or superseded by a newer product (for example SomaScan 7K, Olink Explore 3072). Kept for reference, not scored or ranked.'],
          ].map(([name, m, desc]) => (
            <div key={name} style={{ display: 'contents' }}>
              <dt style={{ paddingTop: 1 }}>
                <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.03em', padding: '2px 7px', color: m.color, background: m.bg, border: `1px solid ${m.border}`, whiteSpace: 'nowrap', textDecoration: m.strike ? 'line-through' : 'none' }}>{name}</span>
              </dt>
              <dd className="text-xs leading-relaxed" style={{ color: '#52504a', fontWeight: 300, margin: 0 }}>{desc}</dd>
            </div>
          ))}
        </dl>
      </div>

      {detailRow && (
        <DetailPanel row={detailRow} onClose={() => setDetailRow(null)} onCompareInDepth={(id) => { setDetailRow(null); onCompareInDepth?.(id) }} />
      )}
    </div>
  )
}

// Desktop group: an optional level subheader row spanning the table, then the rows.
function FragmentGroup({ group, onOpen }) {
  const m = group.level ? LEVEL_META[group.level] : null
  return (
    <>
      {group.level && (
        <tr>
          <td colSpan={COLUMNS.length} style={{ background: '#fafaf9', borderTop: '1px solid #e5e4e2', borderBottom: '1px solid #e5e4e2', borderLeft: '3px solid #8B1A1A', padding: '7px 12px' }}>
            <span className="text-xs" style={{ color: '#141310', fontWeight: 600, letterSpacing: '0.02em' }}>{m.label}</span>
            <span className="text-xs ml-3" style={{ color: '#6f6d67', fontWeight: 300 }}>{m.rubric}</span>
            <span className="text-xs ml-3 tabular-nums" style={{ color: '#a3a19d', fontWeight: 400 }}>{group.rows.length}</span>
          </td>
        </tr>
      )}
      {group.rows.map(r => (
        <tr key={r.platform} style={{ borderBottom: '1px solid #f3f2f0', background: '#ffffff' }}>
          <td className="px-3 py-2.5 sticky left-0 z-10 align-top" style={{ background: '#ffffff' }}>
            <PlatformName row={r} onOpen={onOpen} />
            {r.runs_on && <p className="text-xs mt-0.5" style={{ color: '#a3a19d', fontWeight: 300 }}>runs on → {r.runs_on}</p>}
          </td>
          <td className="px-3 py-2.5 align-top text-xs" style={{ color: '#52504a', fontWeight: 300 }}>{r.vendor || '-'}</td>
          <td className="px-3 py-2.5 align-top"><LevelChip level={levelOf(r)} combinedWith={r.combined_with} /></td>
          <td className="px-3 py-2.5 align-top"><TierChip tier={r.integration_tier} /></td>
          <td className="px-3 py-2.5 align-top"><ReadinessBar value={r.apt_readiness_rank_v1} row={r} /></td>
          <td className="px-3 py-2.5 align-top text-xs leading-snug" style={{ color: '#52504a', fontWeight: 300 }}>{r.detail?.chemistry || '-'}</td>
          <td className="px-3 py-2.5 align-top text-xs leading-snug" style={{ color: '#52504a', fontWeight: 300 }}>{r.detail?.plex_or_depth || '-'}</td>
          <td className="px-3 py-2.5 align-top text-xs leading-snug" style={{ color: '#52504a', fontWeight: 300 }}>{r.detail?.matrix || '-'}</td>
          <td className="px-3 py-2.5 align-top"><AvailCell row={r} /></td>
        </tr>
      ))}
    </>
  )
}

function GroupHeaderMobile({ level, count }) {
  const m = LEVEL_META[level]
  return (
    <div style={{ background: '#fafaf9', border: '1px solid #e5e4e2', borderLeft: '3px solid #8B1A1A', padding: '7px 12px' }}>
      <span className="text-xs" style={{ color: '#141310', fontWeight: 600 }}>{m.label}</span>
      <span className="text-xs ml-2 tabular-nums" style={{ color: '#a3a19d', fontWeight: 400 }}>{count}</span>
    </div>
  )
}
