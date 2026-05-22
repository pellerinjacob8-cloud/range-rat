import { useState } from 'react'
import { RefreshCw, Check, X } from 'lucide-react'

const CLUBS = [
  'Driver', '3-Wood', '5-Wood',
  '4-Iron', '5-Iron', '6-Iron', '7-Iron', '8-Iron', '9-Iron',
  'PW', 'GW', 'SW', 'LW',
]

const SHOT_SHAPES = ['Straight', 'Draw', 'Fade', 'High Draw', 'Low Fade', 'Punch']

const YARDAGES = {
  'Driver': [230, 250, 265, 280],
  '3-Wood': [200, 215, 225],
  '5-Wood': [185, 195, 205],
  '4-Iron': [175, 185, 195],
  '5-Iron': [165, 175, 185],
  '6-Iron': [155, 165, 175],
  '7-Iron': [145, 155, 165],
  '8-Iron': [130, 140, 150],
  '9-Iron': [115, 125, 135],
  'PW':     [100, 110, 120],
  'GW':     [90,  100, 110],
  'SW':     [75,  85,  95],
  'LW':     [60,  70,  80],
}

const pick = arr => arr[Math.floor(Math.random() * arr.length)]

function newShot() {
  const club = pick(CLUBS)
  return { club, yards: pick(YARDAGES[club]), shape: pick(SHOT_SHAPES) }
}

export default function CoursePrep() {
  const [shot, setShot]   = useState(newShot)
  const [stats, setStats] = useState({ hit: 0, skip: 0 })

  const record = (result) => {
    setStats(prev => ({ ...prev, [result]: prev[result] + 1 }))
    setShot(newShot())
  }

  const reset = () => {
    setStats({ hit: 0, skip: 0 })
    setShot(newShot())
  }

  const total  = stats.hit + stats.skip
  const hitPct = total > 0 ? Math.round((stats.hit / total) * 100) : 0

  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">Course Prep</h1>
        <p className="screen-subtitle">Simulate real conditions</p>
      </div>

      <div className="shot-card">
        <div className="shot-label">CURRENT SHOT</div>
        <div className="shot-club">{shot.club}</div>
        <div className="shot-details">
          <span className="shot-yardage">{shot.yards} yds</span>
          <span className="shot-divider">·</span>
          <span className="shot-shape">{shot.shape}</span>
        </div>
      </div>

      <div className="shot-actions">
        <button className="btn-skip" onClick={() => record('skip')}>
          <X size={22} />
          <span>Skip</span>
        </button>
        <button className="btn-hit" onClick={() => record('hit')}>
          <Check size={24} />
          <span>Hit It</span>
        </button>
      </div>

      <div className="stats-row">
        <div className="stat-item">
          <span className="stat-value">{stats.hit}</span>
          <span className="stat-label">Hits</span>
        </div>
        <div className="stat-item stat-item--accent">
          <span className="stat-value">{hitPct}%</span>
          <span className="stat-label">Rate</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.skip}</span>
          <span className="stat-label">Skipped</span>
        </div>
      </div>

      <div className="screen-action">
        <button className="btn-secondary" onClick={reset}>
          <RefreshCw size={15} />
          New Session
        </button>
      </div>
    </div>
  )
}
