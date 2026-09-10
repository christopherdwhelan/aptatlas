import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts'
import scoring from '../../data/scoring.json'

const SHORT_LABELS = {
  proteome_coverage: 'Coverage',
  precision: 'Precision',
  specificity: 'Specificity',
  sensitivity: 'Sensitivity',
  cost_efficiency: 'Cost',
  throughput: 'Throughput',
  quantification_type: 'Quant',
  sample_flexibility: 'Multi-Matrix',
  evidence_depth: 'Evidence',
  pqtl_accuracy: 'pQTL',
}

// Very short, one-sentence descriptions shown in the hover tooltip.
// Full detail lives on the Methods tab.
const SHORT_DESCRIPTIONS = {
  proteome_coverage: 'Number of proteins the platform measures.',
  precision: 'Reproducibility across replicate measurements (CV).',
  specificity: 'Confidence the signal reflects the intended protein.',
  sensitivity: 'Ability to detect low-abundance proteins.',
  cost_efficiency: 'Commercial per-sample price at volume (1,000+ samples); a higher score is a cheaper band.',
  throughput: 'Samples processed per unit time.',
  quantification_type: 'An ordered class of readout type, not a 1-5 quality scale: within-assay relative signal (2) up to calibrated physical concentrations (4).',
  sample_flexibility: 'Range of sample types with published validation.',
  evidence_depth: 'Amount of published head-to-head data.',
  pqtl_accuracy: 'Reliability for genetic (pQTL) studies.',
}

function MetricTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null
  const row = payload[0].payload
  const isLevel = row.id === 'quantification_type'
  return (
    <div style={{
      background: 'rgba(255,255,255,0.82)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      border: '1px solid rgba(213,216,224,0.7)',
      borderRadius: 6,
      padding: '5px 8px',
      maxWidth: 160,
      boxShadow: '0 1px 3px rgba(31,36,48,0.06)',
    }}>
      <div style={{ color: '#1F2430', fontWeight: 600, fontSize: 11, lineHeight: 1.2 }}>{row.dim}</div>
      {row.desc && (
        <div style={{ color: '#6C7280', fontWeight: 400, fontSize: 10, marginTop: 1, lineHeight: 1.3 }}>{row.desc}</div>
      )}
      <div style={{ color: '#1F2430', fontSize: 10, marginTop: 3 }}>{isLevel ? `Level: ${row.value}` : `Score: ${row.value} / 5`}</div>
      <div style={{ color: '#A9A89F', fontSize: 9, marginTop: 1 }}>See Methods for more</div>
    </div>
  )
}

export default function PlatformRadar({ platformId, color, caption = false }) {
  const scores = scoring.scores[platformId]
  const data = scoring.dimensions.map(d => ({
    id: d.id,
    dim: SHORT_LABELS[d.id] || d.shortLabel,
    value: scores[d.id],
    fullMark: 5,
    desc: SHORT_DESCRIPTIONS[d.id],
  }))

  return (
    <>
      <ResponsiveContainer width="100%" height={200}>
        <RadarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
          <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
          <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="dim"
            tick={{ fontSize: 10, fill: '#52504a', fontWeight: 500, fontFamily: "'Myriad Pro', 'Source Sans 3', ui-sans-serif, system-ui, sans-serif" }}
            tickLine={false}
          />
          <Radar
            dataKey="value"
            stroke={color}
            fill={color}
            fillOpacity={0.05}
            strokeWidth={1.5}
            dot={{ r: 2.5, fill: color, strokeWidth: 0 }}
            isAnimationActive={false}
          />
          <Tooltip content={<MetricTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
      {caption && (
        <p style={{ fontSize: 10, color: '#a3a19d', fontWeight: 400, marginTop: 4, lineHeight: 1.4 }}>
          Axes are independent ordinal scales; the enclosed shape is not a summary statistic. Compare platforms spoke by spoke.
        </p>
      )}
    </>
  )
}
