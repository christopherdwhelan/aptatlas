import { useEffect, useRef } from 'react'
import { hrefForTab, isPlainClick } from '../navigation'

const TABS = [
  { id: 'overview',   label: 'Overview' },
  { id: 'platforms',  label: 'All Platforms' },
  { id: 'comparison', label: 'Platform Comparison' },
  { id: 'proteins',   label: 'Protein Coverage' },
  { id: 'unassayed',  label: 'Unassayed Proteome' },
  { id: 'chooser',    label: 'Help Me Choose' },
  { id: 'combine',    label: 'Help Me Combine' },
  { id: 'evidence',   label: 'Evidence Base' },
  { id: 'methods',    label: 'Methods' },
  { id: 'reproducibility', label: 'Reproducibility' },
]

export default function TabNav({ activeTab, onTabChange }) {
  const btnRefs = useRef({})

  // Keep the active tab in view when the row is wider than the screen. Scrolls only the row,
  // never the page.
  useEffect(() => {
    const tab = btnRefs.current[activeTab]
    const row = tab?.parentElement
    if (!row) return
    const t = tab.getBoundingClientRect()
    const r = row.getBoundingClientRect()
    row.scrollLeft += t.left - r.left - (r.width - t.width) / 2
  }, [activeTab])

  // WAI-ARIA tabs pattern: arrow keys move (and activate) between tabs; Home/End jump to ends.
  const handleKeyDown = (e, idx) => {
    // These are links, which Enter already follows; Space keeps working as it did on the old buttons.
    if (e.key === ' ') {
      e.preventDefault()
      onTabChange(TABS[idx].id)
      return
    }
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

  // On the 404 page no tab is active, so the first one takes keyboard focus.
  const hasActive = TABS.some(t => t.id === activeTab)

  return (
    <nav className="sticky top-0 z-20 px-4 sm:px-6" style={{ background: '#ffffff', borderBottom: '1px solid #e5e4e2' }}>
      <div className="max-w-screen-xl mx-auto">
        <div className="tab-scroll flex justify-between overflow-x-auto" role="tablist" aria-label="Sections">
          {TABS.map((tab, i) => {
            const isActive = tab.id === activeTab
            return (
              <a
                key={tab.id}
                href={hrefForTab(tab.id)}
                ref={el => { btnRefs.current[tab.id] = el }}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls="tabpanel"
                tabIndex={isActive || (!hasActive && i === 0) ? 0 : -1}
                onClick={(e) => {
                  if (!isPlainClick(e)) return
                  e.preventDefault()
                  onTabChange(tab.id)
                }}
                onKeyDown={e => handleKeyDown(e, i)}
                className="tab-nav-btn relative px-2.5 py-3.5 transition-colors flex-shrink-0"
                style={{
                  color: isActive ? 'var(--color-brand-500)' : 'var(--color-surface-400)',
                  fontWeight: isActive ? 400 : 300,
                  fontSize: '11px',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                }}
              >
                {tab.label}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 right-0"
                    style={{ height: '2px', background: 'var(--color-brand-500)' }}
                  />
                )}
              </a>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
