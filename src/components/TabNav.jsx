import { useRef } from 'react'

const TABS = [
  { id: 'overview',   label: 'Overview' },
  { id: 'platforms',  label: 'All Platforms' },
  { id: 'comparison', label: 'Platform Comparison' },
  { id: 'proteins',   label: 'Protein Coverage' },
  { id: 'chooser',    label: 'Help Me Choose' },
  { id: 'combine',    label: 'Help Me Combine' },
  { id: 'evidence',   label: 'Evidence Base' },
  { id: 'methods',    label: 'Methods' },
  { id: 'reproducibility', label: 'Reproducibility' },
]

export default function TabNav({ activeTab, onTabChange }) {
  const btnRefs = useRef({})

  // WAI-ARIA tabs pattern: arrow keys move (and activate) between tabs; Home/End jump to ends.
  const handleKeyDown = (e, idx) => {
    const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End']
    if (!keys.includes(e.key)) return
    e.preventDefault()
    let next = idx
    if (e.key === 'ArrowRight') next = (idx + 1) % TABS.length
    else if (e.key === 'ArrowLeft') next = (idx - 1 + TABS.length) % TABS.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = TABS.length - 1
    const nextTab = TABS[next]
    onTabChange(nextTab.id)
    btnRefs.current[nextTab.id]?.focus()
  }

  return (
    <nav className="sticky top-0 z-20 px-4 sm:px-6" style={{ background: '#ffffff', borderBottom: '1px solid #e5e4e2' }}>
      <div className="max-w-screen-xl mx-auto">
        <div className="tab-scroll flex overflow-x-auto" role="tablist" aria-label="Sections">
          {TABS.map((tab, i) => {
            const isActive = tab.id === activeTab
            return (
              <button
                key={tab.id}
                ref={el => { btnRefs.current[tab.id] = el }}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls="tabpanel"
                tabIndex={isActive ? 0 : -1}
                onClick={() => onTabChange(tab.id)}
                onKeyDown={e => handleKeyDown(e, i)}
                className="tab-nav-btn relative px-3 sm:px-4 py-3.5 transition-colors flex-shrink-0"
                style={{
                  color: isActive ? '#8B1A1A' : '#6f6d67',
                  fontWeight: isActive ? 400 : 300,
                  fontSize: '12px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {tab.label}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 right-0"
                    style={{ height: '2px', background: '#8B1A1A' }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
