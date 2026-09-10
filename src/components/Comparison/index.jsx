import { useState } from 'react'
import ViewToggle from './ViewToggle'
import TableView from './TableView'
import CardView from './CardView'
import platforms from '../../data/platforms.json'

export default function Comparison() {
  const [view, setView] = useState('cards')

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg" style={{ color: '#141310', fontWeight: 400 }}>
            Platform Comparison
          </h2>
          <p className="text-sm mt-0.5" style={{ color: '#52504a', fontWeight: 400 }}>
            Side-by-side comparison across {platforms.length} platforms and 9 scored dimensions.
            {view === 'table' && ' Click any dimension label to sort.'}
          </p>
        </div>
        <ViewToggle view={view} onViewChange={setView} />
      </div>

      {/* Views */}
      {view === 'table'
        ? <TableView platforms={platforms} />
        : <CardView platforms={platforms} />
      }
    </div>
  )
}
