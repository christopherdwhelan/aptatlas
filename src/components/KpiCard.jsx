export default function KpiCard({ icon, value, label, accent = false }) {
  return (
    <div className="bg-white px-5 py-4 flex items-start gap-4 flex-1 min-w-0" style={{ border: '1px solid #c8c0b8', borderTop: '2px solid #141310' }}>
      {/* Icon */}
      <div
        className="w-10 h-10 flex items-center justify-center flex-shrink-0"
        style={{ background: accent ? 'rgba(139,26,26,0.06)' : '#fafaf9' }}
      >
        <span style={{ color: accent ? '#8B1A1A' : '#6f6d67' }}>
          {icon}
        </span>
      </div>
      {/* Content */}
      <div className="min-w-0" style={{ paddingTop: '3px' }}>
        <p
          className="leading-none"
          style={{ fontSize: '28px', fontWeight: 400, color: '#141310', letterSpacing: '-0.01em' }}
        >
          {value}
        </p>
        <p
          className="uppercase mt-1 leading-tight"
          style={{ fontSize: '10px', fontWeight: 400, letterSpacing: '0.06em', color: '#6f6d67' }}
        >
          {label}
        </p>
      </div>
    </div>
  )
}
