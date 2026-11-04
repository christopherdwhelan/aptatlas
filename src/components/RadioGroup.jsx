import { useEffect, useRef } from 'react'

// A set of role="radio" buttons with the standard keyboard pattern: the group is one Tab
// stop (the checked option, or the first), and arrow keys move to and select another option.
export default function RadioGroup({ label, labelledBy, className, children }) {
  const ref = useRef(null)
  const radios = () => [...ref.current.querySelectorAll('[role="radio"]')]

  useEffect(() => {
    const all = radios()
    const stop = all.find(r => r.getAttribute('aria-checked') === 'true') ?? all[0]
    all.forEach(r => { r.tabIndex = r === stop ? 0 : -1 })
  })

  const onKeyDown = (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (!step) return
    const all = radios()
    const next = all[(all.indexOf(document.activeElement) + step + all.length) % all.length]
    e.preventDefault()
    next.focus()
    if (next.getAttribute('aria-checked') !== 'true') next.click()
  }

  return (
    <div ref={ref} role="radiogroup" aria-label={label} aria-labelledby={labelledBy} className={className} onKeyDown={onKeyDown}>
      {children}
    </div>
  )
}
