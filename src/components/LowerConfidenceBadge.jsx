import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

const TIP_WIDTH = 280

// Instant tooltip on hover, focus or tap. Portalled to <body> so overflow-hidden cards
// and the transformed .tab-content can neither clip nor trap it.
export function ConfidenceTip({ note, children, style }) {
  const ref = useRef(null)
  const [tip, setTip] = useState(null)

  const show = () => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    const below = r.bottom + 110 < window.innerHeight
    setTip({
      x: Math.max(8, Math.min(r.left, window.innerWidth - TIP_WIDTH - 8)),
      y: below ? r.bottom + 6 : r.top - 6,
      below,
    })
  }
  const hide = () => setTip(null)
  const open = !!tip

  // A tapped tooltip would otherwise float in place while the page scrolls.
  useEffect(() => {
    if (!open) return
    const close = () => setTip(null)
    window.addEventListener('scroll', close, true)
    return () => window.removeEventListener('scroll', close, true)
  }, [open])

  // A tap fires focus and then click, so click only opens; blur, mouse-out or scroll close it.
  return (
    <span
      ref={ref}
      tabIndex={0}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onClick={e => { e.stopPropagation(); show() }}
      style={{ cursor: 'help', ...style }}
    >
      {children}
      <span className="sr-only" style={{ textTransform: 'none' }}>. {note}</span>
      {tip && createPortal(
        <div role="tooltip" style={{
          position: 'fixed', left: tip.x, top: tip.y, zIndex: 80, width: TIP_WIDTH,
          transform: tip.below ? 'none' : 'translateY(-100%)',
          background: '#141310', color: '#fafaf9', fontSize: 11, fontWeight: 400,
          lineHeight: 1.5, letterSpacing: 0, textTransform: 'none', textAlign: 'left',
          padding: '8px 10px', boxShadow: '0 4px 14px rgba(0,0,0,0.28)', pointerEvents: 'none',
        }}>
          {note}
        </div>, document.body)}
    </span>
  )
}

// Neutral grey-outline pill marking scores as lower confidence.
export default function LowerConfidenceBadge({ note, small = false }) {
  return (
    <ConfidenceTip note={note} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
      fontSize: small ? 9 : 10, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase',
      lineHeight: 1.5, whiteSpace: 'nowrap', color: '#6f6d67', background: '#ffffff',
      border: '1px solid #b8b6b0', padding: small ? '0 5px' : '1px 6px',
    }}>
      <svg width={small ? 9 : 10} height={small ? 9 : 10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
      Lower-confidence scores
    </ConfidenceTip>
  )
}
