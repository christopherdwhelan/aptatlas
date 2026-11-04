import { goToTab, hrefForTab, isPlainClick } from '../navigation'

// A real link to another page of the site, followed without a full page load.
export default function RouteLink({ tab, children, ...rest }) {
  return (
    <a
      href={hrefForTab(tab)}
      onClick={(e) => {
        if (!isPlainClick(e)) return
        e.preventDefault()
        goToTab(tab)
      }}
      {...rest}
    >
      {children}
    </a>
  )
}
