import { useEffect, useRef, useState } from 'react'

// A scrolling region with a soft fade along its bottom edge while more content lies below.
export default function ScrollFade({ wrapperClassName = '', wrapperStyle, className = '', style, fadeColor = '#ffffff', tabIndex, children }) {
  const ref = useRef(null)
  const [more, setMore] = useState(false)
  const update = () => {
    const el = ref.current
    if (el) setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 4)
  }
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const observer = new ResizeObserver(update)
    observer.observe(el)
    if (el.firstElementChild) observer.observe(el.firstElementChild)
    return () => observer.disconnect()
  }, [])
  return (
    <div className={`relative ${wrapperClassName}`} style={wrapperStyle}>
      <div ref={ref} onScroll={update} className={className} style={style} tabIndex={tabIndex}>
        {children}
      </div>
      {more && (
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{ height: 48, background: `linear-gradient(to bottom, transparent, ${fadeColor})` }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
