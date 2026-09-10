// Renders a 1-5 filled-dot score bar
export default function ScoreBar({ score, max = 5, color = '#8B1A1A', best = false, worst = false }) {
  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-0.5"
      style={{
        background: best ? 'rgba(139,26,26,0.06)' : worst ? 'rgba(196,77,24,0.06)' : 'transparent',
      }}
    >
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className="inline-block transition-all"
          style={{
            width: 6,
            height: 6,
            borderRadius: '1px',
            background: i < score
              ? (best ? '#8B1A1A' : worst ? '#C44D18' : color)
              : '#e5e4e2',
          }}
        />
      ))}
      <span
        className="ml-1 tabular-nums"
        style={{ fontSize: '11px', fontWeight: 400, color: best ? '#8B1A1A' : worst ? '#C44D18' : '#6f6d67' }}
      >
        {score}
      </span>
    </div>
  )
}
