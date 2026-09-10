import { useState, useEffect } from 'react'

// Shared page scaffold: a sticky "On this page" rail in the left gutter on wide
// screens, a "Jump to section" dropdown below xl, and scroll-spy that marks the
// section currently in view. Rail links use scrollIntoView (not hash nav) so they
// never disturb the app's hash-based tab routing (#methods, #reproducibility).
export default function SectionLayout({ sections, children }) {
  const [active, setActive] = useState(sections[0]?.id)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const els = sections.map(s => document.getElementById(s.id)).filter(Boolean)
    if (!els.length) return
    const obs = new IntersectionObserver((entries) => {
      const vis = entries.filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (vis[0]) setActive(vis[0].target.id)
    }, { rootMargin: '-64px 0px -70% 0px' })
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [sections])

  const jump = (e, id) => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setOpen(false)
  }

  const railLink = (s, extra) => (
    <a
      key={s.id}
      href={`#${s.id}`}
      onClick={(e) => jump(e, s.id)}
      style={{
        display: 'block', fontSize: 12.5, lineHeight: 1.35, textDecoration: 'none',
        color: active === s.id ? '#8B1A1A' : '#6f6d67',
        fontWeight: active === s.id ? 500 : 400,
        ...extra(s),
      }}
    >
      {s.label}
    </a>
  )

  return (
    <div className="flex justify-center gap-10">
      <nav className="hidden xl:block flex-shrink-0" style={{ width: 176 }} aria-label="On this page">
        <div className="sticky" style={{ top: 64 }}>
          <p className="mb-2" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a3a19d', fontWeight: 500, paddingLeft: 13 }}>On this page</p>
          {sections.map(s => railLink(s, () => ({
            padding: '9px 0 9px 12px',
            borderLeft: `2px solid ${active === s.id ? '#8B1A1A' : 'transparent'}`,
          })))}
        </div>
      </nav>

      <div className="max-w-3xl w-full min-w-0">
        <div className="xl:hidden mb-5">
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="w-full flex items-center justify-between"
            style={{ border: '1px solid #e5e4e2', borderRadius: open ? '6px 6px 0 0' : 6, background: '#fff', padding: '10px 12px', fontSize: 12.5, color: '#141310' }}
          >
            <span>Jump to section</span>
            <span style={{ color: '#6f6d67' }}>{open ? '▴' : '▾'}</span>
          </button>
          {open && (
            <div style={{ border: '1px solid #e5e4e2', borderTop: 'none', borderRadius: '0 0 6px 6px' }}>
              {sections.map(s => railLink(s, () => ({
                padding: '10px 12px',
                borderTop: '1px solid #f3f2f0',
                background: active === s.id ? '#fafaf9' : '#fff',
                boxShadow: active === s.id ? 'inset 2px 0 0 #8B1A1A' : 'none',
              })))}
            </div>
          )}
        </div>
        {children}
      </div>

      <div className="hidden xl:block flex-shrink-0" style={{ width: 176 }} aria-hidden="true" />
    </div>
  )
}
