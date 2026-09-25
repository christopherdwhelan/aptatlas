import { Fragment, useEffect, useState, useCallback } from 'react'
import KpiCard from './KpiCard'

const Icons = {
  total: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    </svg>
  ),
  day: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  week: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="1"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  globe: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 010 20 15.3 15.3 0 010-20z"/>
    </svg>
  ),
}

// Field values are stored as raw slugs (e.g. "disease_char", "plasma"). This is a
// light readability pass, not the full label maps from HelpMeChoose.jsx / submit-results.js
// duplicated a third time — good enough for a single-admin internal view.
function prettify(slug) {
  if (!slug) return null
  return slug.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())
}

function Bar({ label, count, max }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div className="mb-2.5 last:mb-0">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs" style={{ color: '#141310', fontWeight: 400 }}>{label}</span>
        <span className="text-xs tabular-nums" style={{ color: '#6f6d67' }}>{count}</span>
      </div>
      <div className="h-1.5 w-full" style={{ background: '#f0eee9' }}>
        <div className="h-full" style={{ width: `${pct}%`, background: '#8B1A1A' }} />
      </div>
    </div>
  )
}

function BreakdownPanel({ title, rows, rowKey, format }) {
  const max = rows.length ? Math.max(...rows.map(r => r.count)) : 0
  const fmt = format || (v => prettify(v) || 'Unknown')
  return (
    <div className="bg-white px-4 py-4" style={{ border: '1px solid #e5e4e2' }}>
      <h2 className="text-xs uppercase mb-3" style={{ color: '#6f6d67', fontWeight: 600, letterSpacing: '0.06em' }}>{title}</h2>
      {rows.length === 0
        ? <p className="text-xs" style={{ color: '#6f6d67' }}>No data yet.</p>
        : rows.map(row => (
            <Bar key={row[rowKey] || 'unknown'} label={fmt(row[rowKey])} count={row.count} max={max} />
          ))}
    </div>
  )
}

function LoginForm({ onSubmit, error, loading }) {
  const [password, setPassword] = useState('')
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#fafaf9' }}>
      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(password) }}
        className="w-full max-w-xs bg-white px-6 py-6"
        style={{ border: '1px solid #c8c0b8', borderTop: '2px solid #141310' }}
      >
        <h1 className="text-sm mb-1" style={{ color: '#141310', fontWeight: 600 }}>APT admin</h1>
        <p className="text-xs mb-4" style={{ color: '#6f6d67' }}>Recommendation logs for Help Me Choose and Help Me Combine.</p>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full px-3 py-2 text-sm mb-3 outline-none"
          style={{ border: '1px solid #c8c0b8', color: '#141310' }}
        />
        {error && <p className="text-xs mb-3" style={{ color: '#8B1A1A' }}>{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full px-4 py-2.5 text-sm"
          style={{ background: '#8B1A1A', color: '#fff', fontWeight: 400, opacity: loading || !password ? 0.6 : 1 }}
        >
          {loading ? 'Checking...' : 'Log in'}
        </button>
      </form>
    </div>
  )
}

function formatTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function formatLocation(city, country) {
  if (city && country) return `${city}, ${country}`
  return city || country || 'Unknown'
}

function SectionHeader({ title, exportHref, onClearAll, clearing, total }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm" style={{ color: '#141310', fontWeight: 600 }}>{title}</h2>
      <div className="flex items-center gap-2">
        <a
          href={exportHref}
          className="px-3 py-1.5 text-xs inline-block"
          style={{ border: '1px solid #c8c0b8', color: '#141310', background: '#fff', textDecoration: 'none' }}
        >
          Export CSV
        </a>
        <button
          onClick={onClearAll}
          disabled={clearing || !total}
          className="px-3 py-1.5 text-xs"
          style={{ border: '1px solid #8B1A1A', color: '#8B1A1A', background: '#fff', opacity: clearing || !total ? 0.5 : 1 }}
        >
          {clearing ? 'Clearing...' : 'Clear all'}
        </button>
      </div>
    </div>
  )
}

const WEIGHT_LABELS = { cost: 'Cost', coverage: 'Coverage', precision: 'Precision', specificity: 'Specificity', sensitivity: 'Sensitivity', throughput: 'Throughput', pqtl: 'pQTL' }
const TOGGLE_LABELS = { absoluteQuant: 'Absolute quant', ptmDetection: 'PTM detection', cnsFocus: 'CNS focus', longitudinal: 'Longitudinal' }

function DetailRow({ row, colSpan = 7, onDelete, deleting }) {
  const weights = row.weights || {}
  const toggles = row.toggles || {}
  return (
    <tr style={{ borderBottom: '1px solid #f0eee9', background: '#fafaf9' }}>
      <td colSpan={colSpan} className="px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <div>
              <p className="text-xs mb-1" style={{ color: '#6f6d67', fontWeight: 500 }}>Priority weights</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(weights).map(([k, v]) => (
                  <span key={k} className="px-1.5 py-0.5 text-xs" style={{ border: '1px solid #e5e4e2', color: '#141310' }}>
                    {WEIGHT_LABELS[k] || k}: {v}/5
                  </span>
                ))}
                {Object.keys(weights).length === 0 && <span className="text-xs" style={{ color: '#6f6d67' }}>None recorded</span>}
              </div>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: '#6f6d67', fontWeight: 500 }}>Toggles</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(toggles).filter(([, v]) => v != null).map(([k, v]) => (
                  <span key={k} className="px-1.5 py-0.5 text-xs" style={{ border: '1px solid #e5e4e2', color: '#141310' }}>
                    {TOGGLE_LABELS[k] || k}: {String(v)}
                  </span>
                ))}
                {Object.values(toggles).every(v => v == null) && <span className="text-xs" style={{ color: '#6f6d67' }}>None selected</span>}
              </div>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: '#6f6d67', fontWeight: 500 }}>Targets and version</p>
              <div className="flex flex-wrap gap-1.5">
                {(row.protein_targets && row.protein_targets.length > 0) && (
                  <span className="px-1.5 py-0.5 text-xs" style={{ border: '1px solid #e5e4e2', color: '#141310' }}>Proteins: {row.protein_targets.join(', ')}</span>
                )}
                {row.pathway_id && (
                  <span className="px-1.5 py-0.5 text-xs" style={{ border: '1px solid #e5e4e2', color: '#141310' }}>Pathway: {row.pathway_id}</span>
                )}
                {row.app_version && (
                  <span className="px-1.5 py-0.5 text-xs" style={{ border: '1px solid #e5e4e2', color: '#141310' }}>Version: {row.app_version}</span>
                )}
                {!(row.protein_targets && row.protein_targets.length) && !row.pathway_id && !row.app_version && (
                  <span className="text-xs" style={{ color: '#6f6d67' }}>None recorded</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="px-2.5 py-1 text-xs flex-shrink-0"
            style={{ border: '1px solid #8B1A1A', color: '#8B1A1A', background: '#fff', opacity: deleting ? 0.5 : 1 }}
          >
            {deleting ? 'Deleting...' : 'Delete this entry'}
          </button>
        </div>
      </td>
    </tr>
  )
}

const AXIS_LABELS = { coverage: 'Coverage', complementarity: 'Complementarity', quality: 'Quality', cost: 'Cost', class_balance: 'Class balance', sample_volume: 'Sample volume', ms_fit: 'MS fit' }
const QDIM_LABELS = { precision: 'Precision', specificity: 'Specificity', sensitivity: 'Sensitivity', quantification_type: 'Quantification', pqtl_accuracy: 'pQTL', throughput: 'Throughput', evidence_depth: 'Evidence depth', sample_flexibility: 'Matrix validation' }
const TIER_LABELS = { 1: 'Leading choice', 2: 'Strong contender', 3: 'Situational', 4: 'Not recommended' }

function CombineDetailRow({ row, onDelete, deleting }) {
  const weights = row.weights || {}
  const qWeights = row.q_weights || {}
  return (
    <tr style={{ borderBottom: '1px solid #f0eee9', background: '#fafaf9' }}>
      <td colSpan={8} className="px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <div>
              <p className="text-xs mb-1" style={{ color: '#6f6d67', fontWeight: 500 }}>Axis weights</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(weights).map(([k, v]) => (
                  <span key={k} className="px-1.5 py-0.5 text-xs" style={{ border: '1px solid #e5e4e2', color: '#141310' }}>
                    {AXIS_LABELS[k] || k}: {v}
                  </span>
                ))}
                {Object.keys(weights).length === 0 && <span className="text-xs" style={{ color: '#6f6d67' }}>None recorded</span>}
              </div>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: '#6f6d67', fontWeight: 500 }}>Quality dimensions</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(qWeights).filter(([, v]) => v > 0).map(([k, v]) => (
                  <span key={k} className="px-1.5 py-0.5 text-xs" style={{ border: '1px solid #e5e4e2', color: '#141310' }}>
                    {QDIM_LABELS[k] || k}: {v}
                  </span>
                ))}
                {Object.values(qWeights).every(v => !v) && <span className="text-xs" style={{ color: '#6f6d67' }}>None weighted</span>}
              </div>
            </div>
          </div>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="px-2.5 py-1 text-xs flex-shrink-0"
            style={{ border: '1px solid #8B1A1A', color: '#8B1A1A', background: '#fff', opacity: deleting ? 0.5 : 1 }}
          >
            {deleting ? 'Deleting...' : 'Delete this entry'}
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function Admin() {
  const [authState, setAuthState] = useState('checking') // checking | out | in
  const [loginError, setLoginError] = useState(null)
  const [loginLoading, setLoginLoading] = useState(false)
  const [data, setData] = useState(null)
  const [combineData, setCombineData] = useState(null)
  const [fetchError, setFetchError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedChoose, setExpandedChoose] = useState(null)
  const [expandedCombine, setExpandedCombine] = useState(null)
  const [deletingChooseId, setDeletingChooseId] = useState(null)
  const [deletingCombineId, setDeletingCombineId] = useState(null)
  const [clearingChoose, setClearingChoose] = useState(false)
  const [clearingCombine, setClearingCombine] = useState(false)

  useEffect(() => {
    document.title = 'APT admin'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
  }, [])

  const load = useCallback(async () => {
    setFetchError(null)
    try {
      const [chooseRes, combineRes] = await Promise.all([
        fetch('/api/admin-recommendations'),
        fetch('/api/admin-combine-recommendations'),
      ])
      if (chooseRes.status === 401 || combineRes.status === 401) {
        setAuthState('out')
        return
      }
      if (!chooseRes.ok || !combineRes.ok) {
        throw new Error(`Request failed (${chooseRes.status}/${combineRes.status})`)
      }
      const [chooseJson, combineJson] = await Promise.all([chooseRes.json(), combineRes.json()])
      setData(chooseJson)
      setCombineData(combineJson)
      setAuthState('in')
    } catch (err) {
      // Most likely running under `vite dev` locally, where /api routes don't execute.
      setFetchError('Could not reach the admin API. This only runs on a real Vercel deployment, not local dev.')
      setAuthState('out')
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleLogin = async (password) => {
    setLoginLoading(true)
    setLoginError(null)
    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setLoginError(body.error || 'Login failed.')
        return
      }
      await load()
    } catch {
      setLoginError('Could not reach the admin API. This only runs on a real Vercel deployment, not local dev.')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const handleLogout = async () => {
    await fetch('/api/admin-logout', { method: 'POST' }).catch(() => {})
    setData(null)
    setCombineData(null)
    setAuthState('out')
  }

  if (authState === 'checking') {
    return <div className="min-h-screen" style={{ background: '#fafaf9' }} />
  }

  if (authState === 'out') {
    return <LoginForm onSubmit={handleLogin} error={loginError || fetchError} loading={loginLoading} />
  }

  const { recent, byPlatform, byCountry, byGoal, bySampleType, totals } = data
  const {
    recent: combineRecent, byMode, byCoverageMode, byTopPair, byCountry: combineByCountry, totals: combineTotals,
  } = combineData

  const handleDeleteChoose = async (id) => {
    if (!window.confirm('Delete this entry? This cannot be undone.')) return
    setDeletingChooseId(id)
    try {
      await fetch('/api/admin-delete-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      })
      setExpandedChoose(null)
      await load()
    } finally {
      setDeletingChooseId(null)
    }
  }

  const handleClearAllChoose = async () => {
    if (!window.confirm(`Delete all ${totals.total} Help Me Choose entries? This cannot be undone.`)) return
    setClearingChoose(true)
    try {
      await fetch('/api/admin-delete-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      setExpandedChoose(null)
      await load()
    } finally {
      setClearingChoose(false)
    }
  }

  const handleDeleteCombine = async (id) => {
    if (!window.confirm('Delete this entry? This cannot be undone.')) return
    setDeletingCombineId(id)
    try {
      await fetch('/api/admin-delete-combine-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      })
      setExpandedCombine(null)
      await load()
    } finally {
      setDeletingCombineId(null)
    }
  }

  const handleClearAllCombine = async () => {
    if (!window.confirm(`Delete all ${combineTotals.total} Help Me Combine entries? This cannot be undone.`)) return
    setClearingCombine(true)
    try {
      await fetch('/api/admin-delete-combine-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      setExpandedCombine(null)
      await load()
    } finally {
      setClearingCombine(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#fafaf9' }}>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-base" style={{ color: '#141310', fontWeight: 600 }}>APT admin</h1>
            <p className="text-xs mt-0.5" style={{ color: '#6f6d67' }}>Private. Not linked from the public site.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3 py-1.5 text-xs"
              style={{ border: '1px solid #c8c0b8', color: '#141310', background: '#fff' }}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-xs"
              style={{ border: '1px solid #c8c0b8', color: '#6f6d67', background: '#fff' }}
            >
              Log out
            </button>
          </div>
        </div>

        {/* ══ Help Me Choose ══ */}
        <SectionHeader
          title="Help Me Choose"
          exportHref="/api/admin-export"
          onClearAll={handleClearAllChoose}
          clearing={clearingChoose}
          total={totals.total}
        />

        <div className="flex flex-wrap gap-3 mb-5">
          <KpiCard icon={Icons.total} value={totals.total} label="Total recommendations" accent />
          <KpiCard icon={Icons.day} value={totals.last_24h} label="Last 24 hours" />
          <KpiCard icon={Icons.week} value={totals.last_7d} label="Last 7 days" />
          <KpiCard icon={Icons.globe} value={byCountry.length} label="Distinct countries" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <BreakdownPanel title="By recommended platform" rows={byPlatform} rowKey="top_platform" format={v => v || 'Unknown'} />
          <BreakdownPanel title="By country" rows={byCountry} rowKey="country" format={v => v || 'Unknown'} />
          <BreakdownPanel title="By primary goal" rows={byGoal} rowKey="primary_goal" />
          <BreakdownPanel title="By sample type" rows={bySampleType} rowKey="sample_type" />
        </div>

        <div className="bg-white mb-10" style={{ border: '1px solid #e5e4e2' }}>
          <h2 className="text-xs uppercase px-4 pt-4 pb-3" style={{ color: '#6f6d67', fontWeight: 600, letterSpacing: '0.06em' }}>
            Recent recommendations <span className="normal-case" style={{ fontWeight: 400 }}>(click a row for priorities)</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderTop: '1px solid #e5e4e2', borderBottom: '1px solid #e5e4e2' }}>
                  <th className="text-left px-4 py-2" style={{ color: '#6f6d67', fontWeight: 500 }}>Time</th>
                  <th className="text-left px-4 py-2" style={{ color: '#6f6d67', fontWeight: 500 }}>Location</th>
                  <th className="text-left px-4 py-2" style={{ color: '#6f6d67', fontWeight: 500 }}>Goal</th>
                  <th className="text-left px-4 py-2" style={{ color: '#6f6d67', fontWeight: 500 }}>Sample</th>
                  <th className="text-left px-4 py-2" style={{ color: '#6f6d67', fontWeight: 500 }}>Recommended</th>
                  <th className="text-left px-4 py-2" style={{ color: '#6f6d67', fontWeight: 500 }}>Match</th>
                  <th className="text-left px-4 py-2" style={{ color: '#6f6d67', fontWeight: 500 }}>Tie</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-6 text-center" style={{ color: '#6f6d67' }}>No recommendations logged yet.</td></tr>
                )}
                {recent.map((row, i) => (
                  <Fragment key={i}>
                    <tr
                      onClick={() => setExpandedChoose(expandedChoose === i ? null : i)}
                      className="cursor-pointer"
                      style={{ borderBottom: '1px solid #f0eee9', background: expandedChoose === i ? '#fafaf9' : 'transparent' }}
                    >
                      <td className="px-4 py-2 whitespace-nowrap" style={{ color: '#141310' }}>{formatTime(row.created_at)}</td>
                      <td className="px-4 py-2" style={{ color: '#141310' }}>{formatLocation(row.city, row.country)}</td>
                      <td className="px-4 py-2" style={{ color: '#141310' }}>{prettify(row.primary_goal) || 'Unknown'}</td>
                      <td className="px-4 py-2" style={{ color: '#141310' }}>{prettify(row.sample_type) || 'Unknown'}</td>
                      <td className="px-4 py-2" style={{ color: '#141310' }}>{row.top_platform || 'Unknown'}</td>
                      <td className="px-4 py-2 tabular-nums" style={{ color: '#141310' }}>{row.top_platform_pct != null ? `${row.top_platform_pct}%` : 'Unknown'}</td>
                      <td className="px-4 py-2" style={{ color: '#141310' }}>
                        {row.is_tie ? (row.tied_platforms || []).join(', ') || 'Yes' : 'No'}
                      </td>
                    </tr>
                    {expandedChoose === i && (
                      <DetailRow
                        row={row}
                        colSpan={7}
                        onDelete={() => handleDeleteChoose(row.id)}
                        deleting={deletingChooseId === row.id}
                      />
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ══ Help Me Combine ══ */}
        <SectionHeader
          title="Help Me Combine"
          exportHref="/api/admin-combine-export"
          onClearAll={handleClearAllCombine}
          clearing={clearingCombine}
          total={combineTotals.total}
        />

        <div className="flex flex-wrap gap-3 mb-5">
          <KpiCard icon={Icons.total} value={combineTotals.total} label="Total recommendations" accent />
          <KpiCard icon={Icons.day} value={combineTotals.last_24h} label="Last 24 hours" />
          <KpiCard icon={Icons.week} value={combineTotals.last_7d} label="Last 7 days" />
          <KpiCard icon={Icons.globe} value={combineByCountry.length} label="Distinct countries" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <BreakdownPanel title="By top pair" rows={byTopPair} rowKey="pair_label" format={v => v || 'Unknown'} />
          <BreakdownPanel title="By country" rows={combineByCountry} rowKey="country" format={v => v || 'Unknown'} />
          <BreakdownPanel title="By starting point" rows={byMode} rowKey="mode" format={v => v === 'anchor' ? 'Already have a platform' : v === 'discovery' ? 'Starting from scratch' : prettify(v)} />
          <BreakdownPanel title="By coverage denominator" rows={byCoverageMode} rowKey="coverage_mode" />
        </div>

        <div className="bg-white" style={{ border: '1px solid #e5e4e2' }}>
          <h2 className="text-xs uppercase px-4 pt-4 pb-3" style={{ color: '#6f6d67', fontWeight: 600, letterSpacing: '0.06em' }}>
            Recent recommendations <span className="normal-case" style={{ fontWeight: 400 }}>(click a row for weights)</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderTop: '1px solid #e5e4e2', borderBottom: '1px solid #e5e4e2' }}>
                  <th className="text-left px-4 py-2" style={{ color: '#6f6d67', fontWeight: 500 }}>Time</th>
                  <th className="text-left px-4 py-2" style={{ color: '#6f6d67', fontWeight: 500 }}>Location</th>
                  <th className="text-left px-4 py-2" style={{ color: '#6f6d67', fontWeight: 500 }}>Starting point</th>
                  <th className="text-left px-4 py-2" style={{ color: '#6f6d67', fontWeight: 500 }}>Denominator</th>
                  <th className="text-left px-4 py-2" style={{ color: '#6f6d67', fontWeight: 500 }}>Recommended pair</th>
                  <th className="text-left px-4 py-2" style={{ color: '#6f6d67', fontWeight: 500 }}>Tier</th>
                  <th className="text-left px-4 py-2" style={{ color: '#6f6d67', fontWeight: 500 }}>Match</th>
                  <th className="text-left px-4 py-2" style={{ color: '#6f6d67', fontWeight: 500 }}>Co-leading</th>
                </tr>
              </thead>
              <tbody>
                {combineRecent.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-6 text-center" style={{ color: '#6f6d67' }}>No recommendations logged yet.</td></tr>
                )}
                {combineRecent.map((row, i) => (
                  <Fragment key={i}>
                    <tr
                      onClick={() => setExpandedCombine(expandedCombine === i ? null : i)}
                      className="cursor-pointer"
                      style={{ borderBottom: '1px solid #f0eee9', background: expandedCombine === i ? '#fafaf9' : 'transparent' }}
                    >
                      <td className="px-4 py-2 whitespace-nowrap" style={{ color: '#141310' }}>{formatTime(row.created_at)}</td>
                      <td className="px-4 py-2" style={{ color: '#141310' }}>{formatLocation(row.city, row.country)}</td>
                      <td className="px-4 py-2" style={{ color: '#141310' }}>
                        {row.mode === 'anchor' ? `Have: ${row.anchor_platform || '?'}` : row.mode === 'discovery' ? 'From scratch' : 'Unknown'}
                      </td>
                      <td className="px-4 py-2" style={{ color: '#141310' }}>{prettify(row.coverage_mode) || 'Unknown'}</td>
                      <td className="px-4 py-2" style={{ color: '#141310' }}>
                        {row.top_pair_a && row.top_pair_b ? `${row.top_pair_a} + ${row.top_pair_b}` : 'Unknown'}
                      </td>
                      <td className="px-4 py-2" style={{ color: '#141310' }}>{TIER_LABELS[row.top_pair_tier] || 'Unknown'}</td>
                      <td className="px-4 py-2 tabular-nums" style={{ color: '#141310' }}>{row.composite_pct != null ? `${row.composite_pct}%` : 'Unknown'}</td>
                      <td className="px-4 py-2" style={{ color: '#141310' }}>
                        {row.is_co_leading ? (row.co_leading_pairs || []).join(', ') || 'Yes' : 'No'}
                      </td>
                    </tr>
                    {expandedCombine === i && (
                      <CombineDetailRow
                        row={row}
                        onDelete={() => handleDeleteCombine(row.id)}
                        deleting={deletingCombineId === row.id}
                      />
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
