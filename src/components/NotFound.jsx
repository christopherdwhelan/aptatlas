import RouteLink from './RouteLink'

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto py-16 text-center">
      <h2 className="text-lg" style={{ color: '#141310', fontWeight: 400 }}>Page not found</h2>
      <p className="text-sm mt-2" style={{ color: '#52504a', fontWeight: 400 }}>
        This address is not part of the atlas. It may have been mistyped, or the page may have moved.
      </p>
      <p className="text-sm mt-4">
        <RouteLink tab="overview" style={{ color: 'var(--color-brand-500)' }}>Go to the Overview</RouteLink>
      </p>
    </div>
  )
}
