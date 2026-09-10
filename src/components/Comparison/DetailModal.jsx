import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import PlatformRadar from './PlatformRadar'
import ScoreBar from './ScoreBar'
import scoring from '../../data/scoring.json'

export default function DetailModal({ platform, onClose }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!platform) return null

  const scores = scoring.scores[platform.id]

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white w-full overflow-y-auto"
        style={{ maxWidth: 720, maxHeight: '90vh', borderTop: `2px solid #141310`, border: '1px solid #e5e4e2', borderTop: `2px solid #141310` }}
      >
        {/* Modal header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4" style={{ borderBottom: '1px solid #e5e4e2' }}>
          <div>
            <h2 className="text-xl" style={{ color: '#141310', fontWeight: 400 }}>{platform.name}</h2>
            <p className="text-sm mt-0.5" style={{ color: '#52504a', fontWeight: 400 }}>{platform.company}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center transition"
            style={{ color: '#52504a' }}
            onMouseEnter={e => e.currentTarget.style.background = '#fafaf9'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: specs */}
          <div className="space-y-4">
            <Section title="Technology">
              <p className="text-sm" style={{ color: '#52504a', fontWeight: 400 }}>{platform.technology}</p>
            </Section>

            <Section title="Proteins Measured">
              <p className="text-sm" style={{ color: '#52504a', fontWeight: 400 }}>{platform.proteins}</p>
              <p className="mt-1.5" style={{ fontSize: 10, color: '#a3a19d', fontWeight: 400, lineHeight: 1.4 }}>
                Counts differ in kind by technology: Olink reports assays; SomaScan reports unique protein targets; Seer and Biognosys report MS protein groups; NULISA reports panel targets. Cross-platform comparisons in this atlas map all content to UniProt identifiers; see Methods.
              </p>
            </Section>

            <Section title="Sample Requirements">
              <div className="space-y-1">
                <p className="text-sm" style={{ color: '#52504a', fontWeight: 400 }}>
                  <span style={{ fontWeight: 400 }}>Input:</span> {platform.sampleInput}
                </p>
                <p className="text-sm" style={{ color: '#52504a', fontWeight: 400 }}>
                  <span style={{ fontWeight: 400 }}>Types:</span> {platform.sampleTypes}
                </p>
              </div>
            </Section>

            <Section title="Cost Range">
              <p className="text-sm" style={{ color: '#141310', fontWeight: 400 }}>{platform.costRange}</p>
            </Section>

            {platform.precision && (
              <Section title="Precision">
                <p className="text-sm" style={{ color: '#52504a', fontWeight: 400 }}>{platform.precision}</p>
              </Section>
            )}

            <Section title="Evidence Depth">
              <p className="text-sm" style={{ color: '#52504a', fontWeight: 400 }}>{platform.evidenceDepth}</p>
            </Section>

            {platform.note && (
              <div
                className="px-3 py-2.5 text-xs leading-relaxed"
                style={{ background: 'rgba(139,26,26,0.06)', color: '#52504a', borderLeft: '3px solid #8B1A1A', fontWeight: 400 }}
              >
                {platform.note}
              </div>
            )}
          </div>

          {/* Right: radar + scores */}
          <div className="space-y-4">
            <Section title="Performance Profile">
              <PlatformRadar platformId={platform.id} color={platform.color} caption />
            </Section>

            <Section title="Dimension Scores">
              <div className="space-y-2">
                {scoring.dimensions.map(d => (
                  <div key={d.id} className="flex items-center justify-between gap-2">
                    <span className="text-xs" style={{ color: '#52504a', minWidth: 90, fontWeight: 400 }}>{d.label}</span>
                    <ScoreBar score={scores[d.id]} color={platform.color} />
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </div>

        {/* Strengths + Limitations */}
        <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Section title="Key Strengths">
            <ul className="space-y-1.5">
              {platform.keyStrengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs" style={{ color: '#52504a', fontWeight: 400 }}>
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: platform.color }} />
                  {s}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Key Limitations">
            <ul className="space-y-1.5">
              {platform.keyLimitations.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs" style={{ color: '#52504a', fontWeight: 400 }}>
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#d97706' }} />
                  {s}
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </div>,
    document.body
  )
}

function Section({ title, children }) {
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6f6d67', marginBottom: 6 }}>
        {title}
      </p>
      {children}
    </div>
  )
}
