import { useState, useRef, useEffect } from 'react'
import { Zap, Check, X, ChevronDown } from 'lucide-react'
import { SKILLS } from '../skills'

export default function SkillSelector({ selectedSkills, onToggleSkill }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const activeCount = selectedSkills.length

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors text-sm border ${
          activeCount > 0
            ? 'bg-multia-accent/20 border-multia-accent/40 text-multia-accent'
            : 'bg-white/5 hover:bg-white/10 border-white/10 text-multia-muted'
        }`}
      >
        <Zap size={14} />
        <span className="hidden sm:inline">Skills</span>
        {activeCount > 0 && (
          <span className="bg-multia-accent text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
            {activeCount}
          </span>
        )}
        <ChevronDown size={14} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 w-96 max-w-[calc(100vw-2rem)] bg-multia-sidebar border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-multia-accent" />
              <span className="text-sm font-semibold text-multia-text">Skills disponibles</span>
            </div>
            {activeCount > 0 && (
              <button
                onClick={() => {
                  selectedSkills.forEach(s => onToggleSkill(s))
                }}
                className="text-xs text-multia-muted hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <X size={12} />
                Limpiar
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {SKILLS.map(skill => {
              const isActive = selectedSkills.includes(skill.name)
              return (
                <button
                  key={skill.name}
                  onClick={() => onToggleSkill(skill.name)}
                  className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0 ${
                    isActive ? 'bg-multia-accent/10' : ''
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                    isActive
                      ? 'bg-multia-accent border-multia-accent'
                      : 'border-white/20'
                  }`}>
                    {isActive && <Check size={14} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-multia-text">{skill.name}</span>
                    </div>
                    <p className="text-xs text-multia-muted mt-1 leading-relaxed">
                      {skill.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="px-4 py-2.5 border-t border-white/5 bg-white/5">
            <p className="text-xs text-multia-muted text-center">
              Las skills activas se inyectan en el system prompt
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
