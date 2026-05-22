import { Target, Crosshair, TrendingUp, LayoutGrid } from 'lucide-react'

const GAMES = [
  {
    id: 'closest',
    Icon: Target,
    title: 'Closest to Pin',
    description: 'Pick a target and score points based on proximity. Compete shot by shot.',
    color: '#2E86AB',
  },
  {
    id: 'fairway',
    Icon: Crosshair,
    title: 'Fairway Game',
    description: 'Simulate tee shots — track left rough, fairway, and right rough results.',
    color: '#4CAF50',
  },
  {
    id: 'shotshape',
    Icon: TrendingUp,
    title: 'Shot Shape Challenge',
    description: 'Draw, fade, or straight — hit whatever shape the app calls out.',
    color: '#F59E0B',
  },
  {
    id: 'grid',
    Icon: LayoutGrid,
    title: 'Grid Gaming',
    description: 'Divide the range into zones and score points by hitting each target area.',
    color: '#8B5CF6',
  },
]

export default function Games() {
  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">Games</h1>
        <p className="screen-subtitle">Make practice competitive</p>
      </div>

      <div className="games-grid">
        {GAMES.map(({ id, Icon, title, description, color }) => (
          <div key={id} className="game-card">
            <div
              className="game-icon"
              style={{ background: color + '22', color }}
            >
              <Icon size={22} />
            </div>
            <h3 className="game-title">{title}</h3>
            <p className="game-description">{description}</p>
            <button className="game-btn">Play</button>
          </div>
        ))}
      </div>
    </div>
  )
}
