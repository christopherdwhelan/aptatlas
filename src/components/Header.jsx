import logoUrl from '../assets/ignition_logo.png'
import AptIcon from './AptIcon'

const VERSION      = '4.0'
const LAST_UPDATED = 'September 7, 2026'

// Pointy-top regular hexagon polygon points, circumradius r=14 (inradius≈12.12)
const hexPts = (cx, cy) =>
  `${cx},${cy-14} ${cx+12.12},${cy-7} ${cx+12.12},${cy+7} ${cx},${cy+14} ${cx-12.12},${cy+7} ${cx-12.12},${cy-7}`

function ScientificBackground() {
  const col = '#c8beb6'
  const sw  = 0.85

  return (
    <svg
      aria-hidden="true"
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none', overflow: 'visible',
      }}
      viewBox="0 0 1280 64"
      preserveAspectRatio="xMidYMid slice"
    >
      <g stroke={col} strokeWidth={sw} fill="none" opacity="0.075">

        {/* ── Aromatic ring cluster (left, 3 fused hexagons) ── */}
        <polygon points={hexPts(85,  32)}/>
        <polygon points={hexPts(109.2, 32)}/>
        {/* bridge hex fused above: cx=97.12, cy=11 (top vertex clips above header - intentional) */}
        <polygon points={hexPts(97.12, 11)}/>

        {/* ── Molecular bond network (left-centre) ── */}
        <circle cx={318} cy={14} r={2.8}/>
        <circle cx={348} cy={24} r={2.8}/>
        <circle cx={352} cy={50} r={2.8}/>
        <circle cx={320} cy={54} r={2.8}/>
        <circle cx={300} cy={36} r={2.8}/>
        <line x1={318} y1={14} x2={348} y2={24}/>
        <line x1={348} y1={24} x2={352} y2={50}/>
        <line x1={352} y1={50} x2={320} y2={54}/>
        <line x1={320} y1={54} x2={300} y2={36}/>
        <line x1={300} y1={36} x2={318} y2={14}/>
        <line x1={318} y1={14} x2={352} y2={50}/>

        {/* ── Mass spectrometry spectrum (centre) ── */}
        {/* baseline */}
        <line x1={588} y1={57} x2={706} y2={57}/>
        {/* peaks - varying heights suggest m/z distribution */}
        <line x1={600} y1={57} x2={600} y2={48}/>
        <line x1={613} y1={57} x2={613} y2={23}/>
        <line x1={626} y1={57} x2={626} y2={34}/>
        <line x1={639} y1={57} x2={639} y2={41}/>
        <line x1={652} y1={57} x2={652} y2={51}/>
        <line x1={665} y1={57} x2={665} y2={18}/>
        <line x1={678} y1={57} x2={678} y2={31}/>
        <line x1={691} y1={57} x2={691} y2={45}/>
        <line x1={704} y1={57} x2={704} y2={53}/>

        {/* ── Antibody Y-shape (right-centre) ── */}
        <line x1={878} y1={64} x2={878} y2={38}/>
        <line x1={878} y1={38} x2={857} y2={13}/>
        <line x1={878} y1={38} x2={899} y2={13}/>
        <circle cx={857} cy={13} r={4}/>
        <circle cx={899} cy={13} r={4}/>
        <circle cx={878} cy={38} r={2.5}/>

        {/* ── Aromatic ring cluster (far right, 5-ring polycyclic) ── */}
        <polygon points={hexPts(1108, 32)}/>
        <polygon points={hexPts(1132.2, 32)}/>
        <polygon points={hexPts(1156.4, 32)}/>
        <polygon points={hexPts(1120.1, 11)}/>
        <polygon points={hexPts(1144.3, 11)}/>

      </g>
    </svg>
  )
}


export default function Header({ onVersionClick }) {
  return (
    <header
      className="px-4 sm:px-6 pt-3 pb-5 relative overflow-hidden"
      style={{ background: 'linear-gradient(to bottom, #080808 90%, rgba(8,8,8,0.0) 100%)' }}
    >
      <ScientificBackground />

      <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-4 relative">
        {/* Left: molecule icon + title + tagline */}
        <div className="flex items-center gap-3 min-w-0">
          <AptIcon size={40} />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl leading-tight truncate text-center sm:text-left" style={{ color: '#ffffff', fontWeight: 400, letterSpacing: '0.08em' }}>
              <span style={{ fontWeight: 500 }}>Atlas</span> of Proteomic Technologies
            </h1>
            <p className="mt-0.5 hidden sm:block" style={{ color: '#b8b6b0', fontSize: '10px', fontWeight: 400, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              A field guide to commercial high-plex proteomics platforms
            </p>
          </div>
        </div>

        {/* Right: logo + byline */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Byline - hidden on mobile */}
          <div className="text-right hidden sm:block">
            <p style={{ fontSize: '12px', fontWeight: 400, color: '#d0cfcc' }}>
              Built by&nbsp;
              <a
                href="https://ignitionscientific.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#ffffff', fontWeight: 400 }}
              >
                Ignition Scientific
              </a>
            </p>
            <p className="mt-0.5" style={{ color: '#b8b6b0', fontSize: '10px', fontWeight: 400, letterSpacing: '0.06em' }}>
              <button
                onClick={onVersionClick}
                title="View version history"
                className="hover:underline focus:outline-none focus:underline"
                style={{ color: '#d8d7d3', fontWeight: 400, fontSize: '10px', cursor: 'pointer' }}
              >
                v{VERSION}
              </button>
              &nbsp;&middot;&nbsp;Last updated: {LAST_UPDATED}
            </p>
          </div>

          {/* Logo */}
          <a href="https://ignitionscientific.com" target="_blank" rel="noopener noreferrer">
            <img
              src={logoUrl}
              alt="Ignition Scientific"
              className="h-10 w-auto"
              style={{ display: 'block', filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.5)) drop-shadow(0 0 2px rgba(255,255,255,0.8))' }}
            />
          </a>
        </div>
      </div>
    </header>
  )
}
