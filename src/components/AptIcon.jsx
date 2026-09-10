// Shared APT molecule icon - used in Header and Overview hero tile
// viewBox="0 0 28 28": Antibody (top-left), Aptamer (top-right),
//                      Peptide (bottom-left), Nanoparticle (bottom-right)

const Antibody = ({ cx, cy, color }) => (
  <g stroke={color} strokeWidth="2.4" strokeLinecap="round" fill="none">
    <line x1={cx}  y1={cy+4.5} x2={cx}  y2={cy}/>
    <line x1={cx}  y1={cy}     x2={cx-4} y2={cy-4}/>
    <line x1={cx}  y1={cy}     x2={cx+4} y2={cy-4}/>
    <circle cx={cx-4} cy={cy-4} r="1.4" fill={color} stroke="none"/>
    <circle cx={cx+4} cy={cy-4} r="1.4" fill={color} stroke="none"/>
  </g>
)

const Aptamer = ({ cx, cy, color }) => {
  const o = 0.636
  return (
    <g stroke={color} strokeLinecap="round" fill="none">
      <circle cx={cx} cy={cy} r="2.0" strokeWidth="1.5"/>
      <line x1={cx-2.0} y1={cy-0.85} x2={cx-5.2} y2={cy-0.85} strokeWidth="0.85"/>
      <line x1={cx-2.0} y1={cy+0.85} x2={cx-5.2} y2={cy+0.85} strokeWidth="0.85"/>
      <line x1={cx-2.9} y1={cy-0.85} x2={cx-2.9} y2={cy+0.85} strokeWidth="0.75"/>
      <line x1={cx-3.8} y1={cy-0.85} x2={cx-3.8} y2={cy+0.85} strokeWidth="0.75"/>
      <line x1={cx-4.7} y1={cy-0.85} x2={cx-4.7} y2={cy+0.85} strokeWidth="0.75"/>
      <circle cx={cx-5.2} cy={cy} r="1.1" strokeWidth="1.4"/>
      <line x1={cx+1.4+o} y1={cy-1.4+o} x2={cx+3.9+o} y2={cy-3.9+o} strokeWidth="0.85"/>
      <line x1={cx+1.4-o} y1={cy-1.4-o} x2={cx+3.9-o} y2={cy-3.9-o} strokeWidth="0.85"/>
      <line x1={cx+2.65-o} y1={cy-2.65+o} x2={cx+2.65+o} y2={cy-2.65-o} strokeWidth="0.75"/>
      <circle cx={cx+3.9} cy={cy-3.9} r="1.0" strokeWidth="1.4"/>
      <line x1={cx-0.85} y1={cy+2.0} x2={cx-0.85} y2={cy+4.5} strokeWidth="0.85"/>
      <line x1={cx+0.85} y1={cy+2.0} x2={cx+0.85} y2={cy+4.5} strokeWidth="0.85"/>
      <line x1={cx-0.85} y1={cy+2.9} x2={cx+0.85} y2={cy+2.9} strokeWidth="0.75"/>
      <line x1={cx-0.85} y1={cy+3.8} x2={cx+0.85} y2={cy+3.8} strokeWidth="0.75"/>
    </g>
  )
}

const Peptide = ({ cx, cy, color }) => (
  <g strokeLinecap="round">
    <line x1={cx-4.5} y1={cy+2} x2={cx-1.5} y2={cy-2} stroke={color} strokeWidth="1.2"/>
    <line x1={cx-1.5} y1={cy-2} x2={cx+1.5} y2={cy+2} stroke={color} strokeWidth="1.2"/>
    <line x1={cx+1.5} y1={cy+2} x2={cx+4.5} y2={cy-2} stroke={color} strokeWidth="1.2"/>
    <circle cx={cx-4.5} cy={cy+2} r="1.5" fill={color} stroke="none"/>
    <circle cx={cx-1.5} cy={cy-2} r="1.5" fill={color} stroke="none"/>
    <circle cx={cx+1.5} cy={cy+2} r="1.5" fill={color} stroke="none"/>
    <circle cx={cx+4.5} cy={cy-2} r="1.5" fill={color} stroke="none"/>
  </g>
)

const Nanoparticle = ({ cx, cy, color }) => (
  <g fill={color} stroke="none">
    <circle cx={cx+4.2}  cy={cy}      r="1.4"/>
    <circle cx={cx+2.97} cy={cy+2.97} r="1.4"/>
    <circle cx={cx}      cy={cy+4.2}  r="1.4"/>
    <circle cx={cx-2.97} cy={cy+2.97} r="1.4"/>
    <circle cx={cx-4.2}  cy={cy}      r="1.4"/>
    <circle cx={cx-2.97} cy={cy-2.97} r="1.4"/>
    <circle cx={cx}      cy={cy-4.2}  r="1.4"/>
    <circle cx={cx+2.97} cy={cy-2.97} r="1.4"/>
  </g>
)

export default function AptIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <Antibody     cx={7}  cy={7}  color="#E8622A"/>
      <Aptamer      cx={21} cy={7}  color="#e8c4a0"/>
      <Peptide      cx={7}  cy={21} color="#C44D18"/>
      <Nanoparticle cx={21} cy={21} color="#a85c3a"/>
    </svg>
  )
}

// Cycling single-icon version for the Overview hero: fades through the four
// detection modalities in one accent colour, looping. Under prefers-reduced-motion
// it renders a static monochrome 2x2 mark instead of animating (see index.css).
const CYCLE_ICONS = [Antibody, Aptamer, Peptide, Nanoparticle]

export function AnimatedAptIcon({ size = 68, color = '#8B1A1A', duration = 7.5 }) {
  return (
    <div className="apt-cycler-wrap" aria-hidden="true"
      style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <div className="apt-cycler" style={{ position: 'absolute', inset: 0 }}>
        {CYCLE_ICONS.map((Icon, i) => (
          <svg key={i} className="apt-cycler-frame" width={size} height={size} viewBox="0 0 28 28"
            style={{ animation: `aptCycle ${duration}s ease-in-out ${(i * duration) / 4}s infinite` }}>
            <g transform="translate(14 14) scale(2) translate(-14 -14)">
              <Icon cx={14} cy={14} color={color} />
            </g>
          </svg>
        ))}
      </div>
      <svg className="apt-cycler-static" width={size} height={size} viewBox="0 0 28 28"
        style={{ position: 'absolute', inset: 0 }}>
        <Antibody     cx={7}  cy={7}  color={color}/>
        <Aptamer      cx={21} cy={7}  color={color}/>
        <Peptide      cx={7}  cy={21} color={color}/>
        <Nanoparticle cx={21} cy={21} color={color}/>
      </svg>
    </div>
  )
}
