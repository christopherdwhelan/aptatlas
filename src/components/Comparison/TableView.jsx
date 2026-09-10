import { useState } from 'react'
import ScoreBar from './ScoreBar'
import DetailPanel from './DetailPanel'
import scoring from '../../data/scoring.json'

// Rows that display raw platform data (not scored)
const DATA_ROWS = [
  { key: 'technology',         label: 'Technology',             type: 'text' },
  { key: 'proteins',           label: 'Proteins Measured',      type: 'text' },
  { key: 'sampleInput',        label: 'Sample Input',           type: 'text' },
  { key: 'sampleTypes',        label: 'Sample Types',           type: 'text' },
  { key: 'quantification',     label: 'Quantification',         type: 'text' },
  { key: 'precision',          label: 'Precision (CV)',         type: 'text' },
  { key: 'costRange',          label: 'Cost Range',             type: 'text' },
  { key: 'evidenceDepth',      label: 'Evidence Depth',         type: 'text' },
]

// Score rows from scoring.json dimensions
const SCORE_DIMENSIONS = scoring.dimensions

function SortIcon({ direction }) {
  if (!direction) return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-30">
      <path d="M12 5v14M5 12l7-7 7 7"/>
    </svg>
  )
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {direction === 'desc'
        ? <path d="M12 19V5M5 12l7 7 7-7"/>
        : <path d="M12 5v14M5 12l7-7 7 7"/>}
    </svg>
  )
}

function ExpandableList({ items, color }) {
  const [open, setOpen] = useState(false)
  const visible = open ? items : items.slice(0, 2)
  return (
    <div>
      <ul className="space-y-1">
        {visible.map((item, i) => (
          <li key={i} className="flex items-start gap-1.5 text-xs leading-snug" style={{ color: '#52504a' }}>
            <span className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
            {item}
          </li>
        ))}
      </ul>
      {items.length > 2 && (
        <button
          onClick={() => setOpen(o => !o)}
          className="mt-1.5 text-xs hover:underline"
          style={{ color: '#8B1A1A', fontWeight: 400 }}
        >
          {open ? '▲ Show less' : `+${items.length - 2} more`}
        </button>
      )}
    </div>
  )
}

export default function TableView({ platforms }) {
  const [sortDim, setSortDim] = useState(null)
  const [sortDir, setSortDir] = useState('desc')
  const [detailId, setDetailId] = useState(null)

  // Build sorted platform order
  const sorted = [...platforms].sort((a, b) => {
    if (!sortDim) return 0
    const sa = scoring.scores[a.id]?.[sortDim] ?? 0
    const sb = scoring.scores[b.id]?.[sortDim] ?? 0
    return sortDir === 'desc' ? sb - sa : sa - sb
  })

  const handleSort = (dim) => {
    if (sortDim === dim) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortDim(dim)
      setSortDir('desc')
    }
  }

  // Find best/worst score per dimension
  const best = {}
  const worst = {}
  SCORE_DIMENSIONS.forEach(d => {
    const vals = platforms.map(p => scoring.scores[p.id]?.[d.id] ?? 0)
    best[d.id] = Math.max(...vals)
    worst[d.id] = Math.min(...vals)
  })

  return (
    <>
    <div style={{ background: '#ffffff', border: '1px solid #e5e4e2', overflow: 'hidden' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse" style={{ minWidth: 900 }}>
          <thead>
            <tr style={{ background: '#ffffff', borderBottom: '2px solid #141310' }}>
              {/* Row label col */}
              <th className="text-left px-4 py-3 sticky left-0 z-10"
                style={{ fontSize: 10, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6f6d67', background: '#ffffff', minWidth: 160 }}>
                Dimension
              </th>
              {sorted.map(p => (
                <th key={p.id} className="px-3 py-3 text-center" style={{ minWidth: 150 }}>
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ background: p.color }}
                    />
                    <button
                      onClick={() => setDetailId(p.id)}
                      className="text-xs leading-tight hover:underline underline-offset-2 transition"
                      style={{ color: '#141310', fontWeight: 400 }}
                    >
                      {p.name}
                    </button>
                    <span style={{ fontSize: 10, fontWeight: 400, color: '#6f6d67' }}>
                      {p.company.split(' ')[0]}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* ── Data rows ── */}
            {DATA_ROWS.map((row, ri) => (
              <tr
                key={row.key}
                style={{ borderBottom: '1px solid #f3f2f0', background: '#ffffff' }}
              >
                <td
                  className="px-4 py-3 sticky left-0 z-10"
                  style={{ fontSize: 10, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6f6d67', background: '#ffffff' }}
                >
                  {row.label}
                  {row.key === 'proteins' && <sup style={{ color: '#8B1A1A', fontWeight: 400 }}>†</sup>}
                </td>
                {sorted.map(p => (
                  <td key={p.id} className="px-3 py-3 text-center align-top">
                    <span className="text-xs leading-snug" style={{ color: '#52504a', fontWeight: 400 }}>
                      {p[row.key] ?? '-'}
                    </span>
                  </td>
                ))}
              </tr>
            ))}

            {/* ── Section header: Scores ── */}
            <tr style={{ background: 'rgba(139,26,26,0.04)', borderTop: '2px solid rgba(139,26,26,0.12)' }}>
              <td
                colSpan={sorted.length + 1}
                className="px-4 py-2 sticky left-0"
                style={{ color: '#8B1A1A' }}
              >
                <span style={{ fontSize: 10, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Scored Dimensions (click column header to sort)
                </span>
              </td>
            </tr>

            {/* ── Score rows ── */}
            {SCORE_DIMENSIONS.map((dim, ri) => {
              const isSorted = sortDim === dim.id
              return (
                <tr
                  key={dim.id}
                  style={{ borderBottom: '1px solid #f3f2f0', background: '#ffffff' }}
                >
                  <td
                    className="px-4 py-3 sticky left-0 z-10"
                    style={{ background: '#ffffff' }}
                  >
                    <button
                      onClick={() => handleSort(dim.id)}
                      className="flex items-center gap-1.5 group text-left"
                    >
                      <span
                        style={{ fontSize: 10, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.08em', color: isSorted ? '#8B1A1A' : '#6f6d67' }}
                      >
                        {dim.label}
                      </span>
                      <span style={{ color: isSorted ? '#8B1A1A' : '#6f6d67' }}>
                        <SortIcon direction={isSorted ? sortDir : null} />
                      </span>
                    </button>
                    <p className="text-xs mt-0.5" style={{ color: '#6f6d67', fontWeight: 400 }}>{dim.description}</p>
                  </td>
                  {sorted.map(p => {
                    const score = scoring.scores[p.id]?.[dim.id] ?? 0
                    const isBest = score === best[dim.id]
                    const isWorst = score === worst[dim.id]
                    return (
                      <td key={p.id} className="px-3 py-3 text-center">
                        <div className="flex justify-center">
                          <ScoreBar
                            score={score}
                            color={p.color}
                            best={isBest}
                            worst={isWorst && score < best[dim.id]}
                          />
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}

            {/* ── Key Strengths ── */}
            <tr style={{ background: '#ffffff', borderTop: '2px solid #f3f2f0' }}>
              <td
                className="px-4 py-3 sticky left-0 z-10"
                style={{ fontSize: 10, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6f6d67', background: '#ffffff', verticalAlign: 'top' }}
              >
                Key Strengths
              </td>
              {sorted.map(p => (
                <td key={p.id} className="px-3 py-3 align-top">
                  <ExpandableList items={p.keyStrengths} color={p.color} />
                </td>
              ))}
            </tr>

            {/* ── Key Limitations ── */}
            <tr style={{ background: '#fafaf9', borderBottom: '1px solid #f3f2f0' }}>
              <td
                className="px-4 py-3 sticky left-0 z-10"
                style={{ fontSize: 10, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6f6d67', background: '#fafaf9', verticalAlign: 'top' }}
              >
                Key Limitations
              </td>
              {sorted.map(p => (
                <td key={p.id} className="px-3 py-3 align-top">
                  <ExpandableList items={p.keyLimitations} color="#d97706" />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-4 py-3 flex flex-wrap items-center gap-4"
        style={{ background: '#fafaf9', borderTop: '1px solid #e5e4e2' }}>
        <span style={{ fontSize: 10, fontWeight: 400, color: '#6f6d67' }}>Legend:</span>
        <span className="flex items-center gap-1.5 text-xs" style={{ color: '#8B1A1A', fontWeight: 400 }}>
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#8B1A1A' }} />
          Best in class
        </span>
        <span className="flex items-center gap-1.5 text-xs" style={{ color: '#b45309', fontWeight: 400 }}>
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#d97706' }} />
          Lowest in class
        </span>
        <span className="ml-auto text-xs" style={{ color: '#6f6d67', fontWeight: 400 }}>
          Scores are 1–5, combining published evidence and expert assessment (see Methods for per-dimension basis). Click platform names or dimension labels to explore.
        </span>
      </div>

      {/* Proteins Measured footnote */}
      <div className="px-4 py-2.5" style={{ background: '#fafaf9', borderTop: '1px solid #e5e4e2' }}>
        <p style={{ fontSize: 10, color: '#a3a19d', fontWeight: 400, lineHeight: 1.45 }}>
          <span style={{ color: '#8B1A1A' }}>†</span> Counts differ in kind by technology: Olink reports assays; SomaScan reports unique protein targets; Seer and Biognosys report MS protein groups; NULISA reports panel targets. Cross-platform comparisons in this atlas map all content to UniProt identifiers; see Methods.
        </p>
      </div>
    </div>

    {detailId && (
      <DetailPanel platformId={detailId} onClose={() => setDetailId(null)} />
    )}
    </>
  )
}
