import { useState } from 'react'

const FILTERS = [
  {
    id: 'clubGroup',
    label: 'Club Group',
    options: ['All Clubs', 'Short Game', 'Irons', 'Woods', 'Putting'],
  },
  {
    id: 'bucketSize',
    label: 'Bucket Size',
    options: ['Half (50)', 'Full (100)', 'Large (150)'],
  },
  {
    id: 'timeAvailable',
    label: 'Time Available',
    options: ['30 min', '45 min', '60 min', '90 min'],
  },
  {
    id: 'goal',
    label: 'Session Goal',
    options: ['Consistency', 'Distance', 'Accuracy', 'Course Sim'],
  },
]

const DEFAULTS = {
  clubGroup: 'All Clubs',
  bucketSize: 'Full (100)',
  timeAvailable: '45 min',
  goal: 'Consistency',
}

export default function Routine() {
  const [filters, setFilters] = useState(DEFAULTS)

  const setFilter = (id, value) =>
    setFilters(prev => ({ ...prev, [id]: value }))

  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">Practice Routine</h1>
        <p className="screen-subtitle">Build your session</p>
      </div>

      <div className="section">
        {FILTERS.map(({ id, label, options }) => (
          <div key={id} className="filter-row">
            <span className="filter-label">{label}</span>
            <div className="filter-options">
              {options.map(opt => (
                <button
                  key={opt}
                  className={`filter-chip${filters[id] === opt ? ' filter-chip--active' : ''}`}
                  onClick={() => setFilter(id, opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="screen-action">
        <button className="btn-primary">Generate Routine</button>
      </div>

      <div className="empty-state">
        <div className="empty-state-icon">📋</div>
        <p className="empty-state-text">Your routine will appear here</p>
        <p className="empty-state-subtext">Set your filters and tap Generate</p>
      </div>
    </div>
  )
}
