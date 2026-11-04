import { useEffect, useRef } from 'react'

const TABBABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Behaviour shared by the slide-out detail panels: focus moves to the close button on open,
// Tab stays inside, Esc closes, the page behind cannot scroll, and focus returns to whatever
// opened the panel. Spread dialogProps on the panel; put closeRef on its close button.
export default function useDialog(onClose, labelId) {
  const panelRef = useRef(null)
  const closeRef = useRef(null)
  // Parents pass a new onClose on each render; the effect must run only on open and close.
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    const opener = document.activeElement
    const handler = (e) => {
      if (e.key === 'Escape') { onCloseRef.current(); return }
      if (e.key !== 'Tab' || !panelRef.current) return
      const items = [...panelRef.current.querySelectorAll(TABBABLE)].filter(el => el.getClientRects().length)
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      const current = document.activeElement
      if (!panelRef.current.contains(current)) { e.preventDefault(); first.focus() }
      else if (e.shiftKey && current === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && current === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
      opener?.focus?.()
    }
  }, [])

  return {
    closeRef,
    dialogProps: { ref: panelRef, role: 'dialog', 'aria-modal': true, 'aria-labelledby': labelId },
  }
}
