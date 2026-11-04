// Renders a 1-5 filled-dot score bar
export default function ScoreBar({ score, max = 5, color = 'var(--color-brand-500)', best = false, worst = false }) {
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
              ? (best ? 'var(--color-brand-500)' : worst ? '#C44D18' : color)
              : '#e5e4e2',
          }}
        />
      ))}
      <span
        className="ml-1 tabular-nums"
        style={{ fontSize: '11px', fontWeight: 400, color: best ? 'var(--color-brand-500)' : worst ? '#C44D18' : 'var(--color-surface-400)' }}
      >
        {score}
      </span>
    </div>
  )
}
