import { Zap, ClipboardList, Flag, Trophy, BarChart2, User, Settings, ChevronRight, Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const GRID_ITEMS = [
  { id: 'routine',    label: 'Practice\nRoutine', icon: ClipboardList },
  { id: 'courseprep', label: 'Course\nPrep',      icon: Flag          },
  { id: 'games',      label: 'Games',             icon: Trophy        },
  { id: 'stats',      label: 'Stats',             icon: BarChart2,    soon: true },
  { id: 'profile',    label: 'Profile',           icon: User,         soon: true },
  { id: 'settings',   label: 'Settings',          icon: Settings,     soon: true },
]

export default function Home({ onNavigate }) {
  const { theme, toggle } = useTheme()

  return (
    <div className="home-screen">
      <div className="home-hero">
        <div className="home-hero-bg-circle home-hero-bg-circle--a" />
        <div className="home-hero-bg-circle home-hero-bg-circle--b" />

        <div className="home-hero-top">
          <div className="home-brand">
            <div className="home-brand-dot" />
            <span className="home-brand-name">RANGE RAT</span>
          </div>
          <button className="home-theme-toggle" onClick={toggle} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <p className="home-tagline">Golf Practice Companion</p>
      </div>

      <div className="home-content">
        <button className="home-featured" onClick={() => onNavigate('warmup')}>
          <div className="home-hero-bg-circle home-featured-circle" />
          <div className="home-featured-icon">
            <Zap size={28} strokeWidth={2.5} />
          </div>
          <div className="home-featured-info">
            <div className="home-featured-label">Warm Up</div>
            <div className="home-featured-desc">Get loose and ready to play</div>
          </div>
          <ChevronRight size={20} className="home-featured-arrow" />
        </button>

        <div className="home-grid">
          {GRID_ITEMS.map(({ id, label, icon: Icon, soon }) => (
            <button
              key={id}
              className={`home-grid-card${soon ? ' home-grid-card--soon' : ''}`}
              onClick={() => !soon && onNavigate(id)}
              aria-disabled={soon}
            >
              <div className="home-grid-icon">
                <Icon size={22} strokeWidth={2} />
              </div>
              <span className="home-grid-label">
                {label.split('\n').map((line, i) => (
                  <span key={i}>{line}{i < label.split('\n').length - 1 && <br />}</span>
                ))}
              </span>
              {soon && <span className="home-grid-soon">Soon</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
