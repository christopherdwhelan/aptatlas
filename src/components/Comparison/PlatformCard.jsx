import { useState } from 'react'
import PlatformRadar from './PlatformRadar'
import scoring from '../../data/scoring.json'

const TECH_LABELS = {
  'olink-explore-ht':       'PEA · Dual Antibody',
  'illumina-protein-prep':  'Aptamer (SOMAmer)',
  'nulisa':                 'Dual Capture & Release',
  'nomic-omni':             'Sandwich ELISA · Bead',
  'seer-proteograph':       'Nanoparticle · MS-DIA',
  'biognosys-truediscovery':'Depletion · MS-DIA',
}

export default function PlatformCard({ platform, onViewDetails }) {
  const [flipped, setFlipped] = useState(false)
  const [scoreHover, setScoreHover] = useState(false)
  const scores = scoring.scores[platform.id]
  const { evidence_depth: _ed, ...technicalScores } = scores
  const total = Object.values(technicalScores).reduce((a, b) => a + b, 0)

  return (
    <div
      className="bg-white border border-surface-200 overflow-hidden flex flex-col"
      style={{ borderTop: `3px solid ${platform.color}`, borderColor: '#e5e4e2', background: '#ffffff' }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <h3 className="text-sm leading-tight" style={{ color: '#141310', fontWeight: 400 }}>
              {platform.name}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: '#6f6d67', fontWeight: 400 }}>
              {platform.company}
            </p>
          </div>
          <span
            className="text-xs px-2 py-0.5 flex-shrink-0 mt-0.5"
            style={{
              background: platform.platformType === 'ms'
                ? 'rgba(107,91,149,0.1)'
                : 'rgba(139,26,26,0.08)',
              color: platform.platformType === 'ms' ? '#6b5b95' : '#8B1A1A',
              fontWeight: 400,
              fontSize: 10,
              letterSpacing: '0.06em',
              border: '1px solid currentColor',
            }}
          >
            {platform.platformType === 'ms' ? 'MS-DIA' : 'Affinity'}
          </span>
        </div>

        {/* Technology badge */}
        <span
          className="inline-block text-xs px-2 py-0.5 mt-1 border"
          style={{ color: '#52504a', borderColor: '#e5e4e2', background: '#fafaf9', fontWeight: 400 }}
        >
          {TECH_LABELS[platform.id]}
        </span>
      </div>

      {/* Key stats */}
      <div className="px-5 pb-3 grid grid-cols-3 gap-2">
        {[
          { label: 'Proteins', value: platform.proteinsNumeric.toLocaleString() + (platform.id === 'biognosys-truediscovery' ? '*' : '') },
          { label: 'Cost', value: platform.costRange.replace(/ cost$/i, '') },
          { label: 'Score', value: `${total}/45` },
        ].map(stat => (
          <div
            key={stat.label}
            className="px-2 py-2 text-center"
            style={{ background: '#fafaf9', border: '1px solid #e5e4e2' }}
          >
            <p className="text-xs leading-tight" style={{ color: '#141310', fontWeight: 400 }}>
              {stat.value}
            </p>
            <p className="mt-1 uppercase" style={{ fontSize: 10, letterSpacing: '0.06em', color: '#6f6d67', fontWeight: 400 }}>
              {stat.label}
              {stat.label === 'Proteins' && <sup style={{ color: '#8B1A1A' }}>†</sup>}
            </p>
          </div>
        ))}
      </div>

      {/* Targeted panel callout for focused platforms */}
      {(platform.id === 'nomic-omni' || platform.id === 'nulisa') && (
        <div className="mx-5 mb-3 px-3 py-1.5 text-xs flex items-center gap-1.5"
          style={{ background: 'rgba(8,145,178,0.07)', color: '#0369a1' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {platform.id === 'nomic-omni'
            ? 'Targeted panel: not designed for broad discovery'
            : 'Targeted panel: CNS & inflammation only'}
        </div>
      )}

      {/* Panel note for Biognosys */}
      {platform.id === 'biognosys-truediscovery' && (
        <div className="mx-5 mb-3 px-3 py-1.5 text-xs flex items-center gap-1.5"
          style={{ background: 'rgba(107,91,149,0.07)', color: '#5b4b8a' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          * Protein count is study-dependent: varies by MS workflow and sample type
        </div>
      )}

      {/* Readout note for Illumina */}
      {platform.id === 'illumina-protein-prep' && (
        <div className="mx-5 mb-3 px-3 py-1.5 text-xs flex items-center gap-1.5"
          style={{ background: 'rgba(217,119,6,0.07)', color: '#92400e' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Evidence mostly from array-based SomaScan readout; NGS validation still emerging
        </div>
      )}

      {/* Radar chart */}
      <div className="px-2 pb-2 flex-1">
        <PlatformRadar platformId={platform.id} color={platform.color} />
      </div>

      {/* Score bar summary */}
      <div className="px-5 py-2" style={{ borderTop: '1px solid #e5e4e2' }}>
        <div className="flex items-center justify-between mb-1">
          <span
            style={{ position: 'relative', display: 'inline-block' }}
            onMouseEnter={() => setScoreHover(true)}
            onMouseLeave={() => setScoreHover(false)}
          >
            <span
              className="text-xs"
              style={{ color: '#6f6d67', fontWeight: 400, borderBottom: '1px dotted #b8b6b0', cursor: 'default' }}
            >Composite score</span>
            {scoreHover && (
              <span style={{
                position: 'absolute', bottom: '100%', left: 0, marginBottom: 6,
                background: '#1f1e1b', color: '#f5f4f0', fontSize: 11, fontWeight: 400,
                lineHeight: 1.5, padding: '6px 10px', width: 240,
                pointerEvents: 'none', zIndex: 10,
              }}>
                Sum of the nine technical dimension scores (out of 45). Evidence Depth is excluded: it describes confidence in the other scores, not a property of the platform itself.
              </span>
            )}
          </span>
          <span className="text-xs" style={{ color: '#141310', fontWeight: 400 }}>{total}/45</span>
        </div>
        <div className="h-1.5 overflow-hidden" style={{ background: '#f3f2f0' }}>
          <div
            className="h-full"
            style={{
              width: `${(total / 45) * 100}%`,
              background: platform.color,
            }}
          />
        </div>
      </div>

      {/* Action */}
      <div className="px-5 py-3">
        <button
          onClick={() => onViewDetails(platform.id)}
          className="w-full text-sm py-2 border transition-all"
          style={{
            color: platform.color,
            borderColor: platform.color,
            background: 'transparent',
            fontWeight: 400,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = platform.color
            e.currentTarget.style.color = '#fff'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = platform.color
          }}
        >
          View Details →
        </button>
      </div>
    </div>
  )
}
