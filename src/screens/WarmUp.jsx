import { useState } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'

const DURATIONS = [
  { minutes: 15, label: 'Quick',    description: 'Core movements only' },
  { minutes: 30, label: 'Standard', description: 'Full body routine' },
  { minutes: 45, label: 'Full Prep', description: 'Complete game prep' },
]

const CHECKLIST = [
  'Dynamic Stretching',
  'Putting Green',
  'Chipping Area',
  'Short Irons (PW–9i)',
  'Mid Irons (8i–6i)',
  'Long Irons & Hybrids',
  'Fairway Woods',
  'Driver',
]

function formatArrival(teeTime) {
  if (!teeTime) return null
  const [h, m] = teeTime.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return null
  const total = h * 60 + m - 10
  if (total < 0) return null
  const ah = Math.floor(total / 60) % 24
  const am = total % 60
  const period = ah >= 12 ? 'PM' : 'AM'
  const displayH = ah % 12 || 12
  return `${displayH}:${String(am).padStart(2, '0')} ${period}`
}

export default function WarmUp({ onHome }) {
  const [selected, setSelected] = useState(null)
  const [checked, setChecked] = useState(new Set())
  const [teeTime, setTeeTime] = useState('')

  const isComplete = checked.size === CHECKLIST.length
  const arrival = formatArrival(teeTime)

  const toggleCheck = (item) => {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(item) ? next.delete(item) : next.add(item)
      return next
    })
  }

  const handleComplete = () => {
    const session = {
      date: new Date().toISOString().split('T')[0],
      teeTime: teeTime || null,
      duration: selected,
      drills: [...checked],
      completedAt: new Date().toISOString(),
    }
    const existing = JSON.parse(localStorage.getItem('rr-warmup-sessions') || '[]')
    existing.push(session)
    localStorage.setItem('rr-warmup-sessions', JSON.stringify(existing))
    onHome?.()
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">Warm Up</h1>
        <p className="screen-subtitle">Set your session length</p>
      </div>

      <div className="section">
        <div className="tee-time-row">
          <label className="filter-label" htmlFor="tee-time-input">Tee Time</label>
          <input
            id="tee-time-input"
            type="time"
            className="tee-time-input"
            value={teeTime}
            onChange={e => setTeeTime(e.target.value)}
          />
        </div>
        {arrival && (
          <p className="tee-time-arrival">Range arrival: {arrival}</p>
        )}
      </div>

      <div className="duration-grid">
        {DURATIONS.map(({ minutes, label, description }) => (
          <button
            key={minutes}
            className={`duration-card${selected === minutes ? ' duration-card--active' : ''}`}
            onClick={() => setSelected(minutes)}
          >
            <span className="duration-minutes">{minutes}</span>
            <span className="duration-unit">MIN</span>
            <span className="duration-label">{label}</span>
            <span className="duration-desc">{description}</span>
          </button>
        ))}
      </div>

      <div className="section">
        <div className="section-header">
          <h2 className="section-title">Checklist</h2>
          <span className="section-badge">{checked.size}/{CHECKLIST.length}</span>
        </div>
        <div className="checklist">
          {CHECKLIST.map((item) => (
            <button
              key={item}
              className={`checklist-item${checked.has(item) ? ' checklist-item--checked' : ''}`}
              onClick={() => toggleCheck(item)}
            >
              {checked.has(item)
                ? <CheckCircle2 size={20} />
                : <Circle size={20} />}
              <span>{item}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="screen-action">
        {isComplete && (
          <button className="btn-primary" onClick={handleComplete}>
            Complete Warm Up
          </button>
        )}
        <button className="btn-secondary" onClick={() => onHome?.()}>
          Quit Warm Up
        </button>
      </div>
    </div>
  )
}
