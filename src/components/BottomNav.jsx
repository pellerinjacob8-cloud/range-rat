import { Zap, ClipboardList, Flag, Trophy } from 'lucide-react'

const TABS = [
  { id: 'warmup',     label: 'Warm Up',    Icon: Zap },
  { id: 'routine',    label: 'Routine',    Icon: ClipboardList },
  { id: 'courseprep', label: 'Course Prep', Icon: Flag },
  { id: 'games',      label: 'Games',      Icon: Trophy },
]

export default function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav className="bottom-nav">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={`nav-item${activeTab === id ? ' nav-item--active' : ''}`}
          onClick={() => onTabChange(id)}
          aria-label={label}
        >
          <Icon size={22} strokeWidth={activeTab === id ? 2.5 : 1.75} />
          <span className="nav-label">{label}</span>
        </button>
      ))}
    </nav>
  )
}
