export default function ViewToggle({ view, onViewChange }) {
  return (
    <div
      className="inline-flex rounded-lg p-0.5"
      style={{ background: '#eef1f7' }}
    >
      {[
        {
          id: 'table',
          label: 'Table View',
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="3" y1="15" x2="21" y2="15"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
              <line x1="15" y1="3" x2="15" y2="21"/>
            </svg>
          ),
        },
        {
          id: 'cards',
          label: 'Card View',
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
          ),
        },
      ].map(({ id, label, icon }) => {
        const active = view === id
        return (
          <button
            key={id}
            onClick={() => onViewChange(id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            style={{
              background: active ? '#ffffff' : 'transparent',
              color: active ? '#8B1A1A' : '#52504a',
              boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {icon}
            {label}
          </button>
        )
      })}
    </div>
  )
}
