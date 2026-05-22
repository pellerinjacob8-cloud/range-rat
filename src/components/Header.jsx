import { Sun, Moon, ChevronLeft } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function Header({ onHome }) {
  const { theme, toggle } = useTheme()

  return (
    <header className="header">
      <div className="header-left">
        {onHome && (
          <button className="header-back" onClick={onHome} aria-label="Back to home">
            <ChevronLeft size={22} strokeWidth={2.5} />
          </button>
        )}
        <div className="header-logo">
          <div className="header-logo-dot" />
          <span className="header-logo-text">RANGE RAT</span>
        </div>
      </div>
      <button className="theme-toggle" onClick={toggle} aria-label="Toggle theme">
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </header>
  )
}
