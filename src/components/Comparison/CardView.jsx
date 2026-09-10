import { useState } from 'react'
import PlatformCard from './PlatformCard'
import DetailPanel from './DetailPanel'

export default function CardView({ platforms }) {
  const [techFilter, setTechFilter] = useState('all')
  const [detailId, setDetailId] = useState(null)

  const filtered = platforms.filter(p =>
    techFilter === 'all' || p.platformType === techFilter
  )

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xs font-medium uppercase tracking-wide mr-1" style={{ color: '#6b7280' }}>
          Filter:
        </span>
        {[
          { id: 'all', label: 'All Platforms' },
          { id: 'affinity', label: 'Affinity-based' },
          { id: 'ms', label: 'Mass Spec (DIA)' },
        ].map(opt => {
          const active = techFilter === opt.id
          return (
            <button
              key={opt.id}
              onClick={() => setTechFilter(opt.id)}
              className="text-xs font-medium px-3 py-1.5 rounded-full border transition-all"
              style={{
                background: active ? '#8B1A1A' : '#fff',
                color: active ? '#fff' : '#6b7280',
                borderColor: active ? '#8B1A1A' : '#e2e8f0',
              }}
            >
              {opt.label}
              <span
                className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs"
                style={{
                  background: active ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                  color: active ? '#fff' : '#9aaabf',
                }}
              >
                {opt.id === 'all' ? platforms.length : platforms.filter(p => p.platformType === opt.id).length}
              </span>
            </button>
          )
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(p => (
          <PlatformCard
            key={p.id}
            platform={p}
            onViewDetails={setDetailId}
          />
        ))}
      </div>

      {/* Proteins Measured footnote */}
      <p className="mt-4" style={{ fontSize: 10, color: '#a3a19d', fontWeight: 400, lineHeight: 1.45 }}>
        <span style={{ color: '#8B1A1A' }}>†</span> Counts differ in kind by technology: Olink reports assays; SomaScan reports unique protein targets; Seer and Biognosys report MS protein groups; NULISA reports panel targets. Cross-platform comparisons in this atlas map all content to UniProt identifiers; see Methods.
      </p>

      {/* Detail panel (portaled to <body>, so it overlays the viewport) */}
      {detailId && (
        <DetailPanel
          platformId={detailId}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  )
}
