export default function PlaceholderTab({ title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(139,26,26,0.08)' }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="#8B1A1A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <h2 className="text-lg font-semibold mb-2" style={{ color: '#111111' }}>{title}</h2>
      <p className="text-sm max-w-sm" style={{ color: '#6b7280' }}>{description}</p>
      <span
        className="mt-4 text-xs font-medium px-3 py-1 rounded-full"
        style={{ background: 'rgba(139,26,26,0.08)', color: '#8B1A1A' }}
      >
        Coming in next prompt
      </span>
    </div>
  )
}
