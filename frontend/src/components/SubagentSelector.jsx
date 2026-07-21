import { useState, useRef, useEffect, useMemo } from 'react'
import { Bot, Check, X, ChevronDown, Cpu, Search, Layers, Sparkles, Loader2, AlertCircle } from 'lucide-react'
import { SUBAGENTS, AGENTS_LOADED, AGENTS_LOAD_ERROR, loadSubagents, AGENT_CATEGORIES } from '../subagents'

export default function SubagentSelector({ selectedAgents, onToggleAgent, agentsReady }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('Todas')
  const [loaded, setLoaded] = useState(agentsReady || AGENTS_LOADED)
  const [loadError, setLoadError] = useState(AGENTS_LOAD_ERROR)
  const ref = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (open && !loaded && !AGENTS_LOADED) {
      loadSubagents()
        .then(() => {
          setLoaded(true)
          setLoadError(null)
        })
        .catch((err) => {
          setLoadError(err.message)
          setLoaded(true)
        })
    }
  }, [open, loaded])

  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus()
    }
  }, [open])

  const activeCount = selectedAgents.length
  const categories = useMemo(() => AGENT_CATEGORIES(), [loaded, open])

  const filteredAgents = useMemo(() => {
    const term = search.toLowerCase().trim()
    return SUBAGENTS.filter(agent => {
      const matchesSearch = !term ||
        agent.name.toLowerCase().includes(term) ||
        agent.displayName.toLowerCase().includes(term) ||
        agent.description.toLowerCase().includes(term) ||
        agent.category.toLowerCase().includes(term) ||
        agent.tools.some(t => t.toLowerCase().includes(term))
      const matchesCategory = activeCategory === 'Todas' || agent.category === activeCategory
      return matchesSearch && matchesCategory
    })
  }, [search, activeCategory, loaded, open])

  const groupedAgents = useMemo(() => {
    const groups = {}
    filteredAgents.forEach(agent => {
      if (!groups[agent.category]) groups[agent.category] = []
      groups[agent.category].push(agent)
    })
    return groups
  }, [filteredAgents])

  const toggleAll = (categoryAgents) => {
    const allSelected = categoryAgents.every(a => selectedAgents.includes(a.name))
    categoryAgents.forEach(agent => {
      const isSelected = selectedAgents.includes(agent.name)
      if (allSelected && isSelected) onToggleAgent(agent.name)
      if (!allSelected && !isSelected) onToggleAgent(agent.name)
    })
  }

  const clearAll = () => {
    selectedAgents.forEach(a => onToggleAgent(a))
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors text-sm border ${
          activeCount > 0
            ? 'bg-purple-500/20 border-purple-500/40 text-purple-400'
            : 'bg-white/5 hover:bg-white/10 border-white/10 text-multia-muted'
        }`}
      >
        <Cpu size={14} />
        <span className="hidden sm:inline">Agentes</span>
        {activeCount > 0 && (
          <span className="bg-purple-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
            {activeCount}
          </span>
        )}
        <ChevronDown size={14} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 w-[420px] max-w-[calc(100vw-2rem)] bg-multia-sidebar border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in flex flex-col max-h-[80vh]">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-purple-400" />
                <span className="text-sm font-semibold text-multia-text">Agentes internos</span>
                <span className="text-xs text-multia-muted bg-white/5 px-1.5 py-0.5 rounded">
                  {SUBAGENTS.length}
                </span>
              </div>
              {activeCount > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-multia-muted hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <X size={12} />
                  Limpiar
                </button>
              )}
            </div>
            <p className="text-xs text-multia-muted mt-1.5">
              En cada consulta, los 185 agentes se conectan automáticamente mediante diez equipos. La selección manual marca prioridades adicionales.
            </p>
          </div>

          {/* Search */}
          <div className="px-4 py-2 border-b border-white/5">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-multia-muted" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar agentes por nombre, descripción, categoría..."
                className="w-full bg-multia-input text-multia-text text-sm pl-9 pr-3 py-2 rounded-lg border border-white/10 focus:border-purple-500/50 outline-none"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="px-4 py-2 border-b border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Layers size={12} className="text-multia-muted" />
              <span className="text-xs text-multia-muted">Categorías</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
              <button
                onClick={() => setActiveCategory('Todas')}
                className={`text-xs px-2 py-1 rounded-full transition-colors ${
                  activeCategory === 'Todas'
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/5 text-multia-muted hover:bg-white/10'
                }`}
              >
                Todas
              </button>
              {categories.map(category => {
                const count = SUBAGENTS.filter(a => a.category === category).length
                return (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`text-xs px-2 py-1 rounded-full transition-colors ${
                      activeCategory === category
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/5 text-multia-muted hover:bg-white/10'
                    }`}
                  >
                    {category} ({count})
                  </button>
                )
              })}
            </div>
          </div>

          {/* Agents list */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {!loaded && !AGENTS_LOADED ? (
              <div className="px-4 py-12 text-center">
                <Loader2 size={32} className="text-multia-accent mx-auto mb-3 animate-spin" />
                <p className="text-sm text-multia-muted">Cargando agentes especializados...</p>
                <p className="text-xs text-multia-muted mt-1">Esto solo sucede una vez por sesión</p>
              </div>
            ) : loadError ? (
              <div className="px-4 py-8 text-center">
                <AlertCircle size={32} className="text-red-400 mx-auto mb-2" />
                <p className="text-sm text-multia-muted">Error cargando agentes</p>
                <p className="text-xs text-red-400 mt-1">{loadError}</p>
              </div>
            ) : filteredAgents.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bot size={32} className="text-multia-muted mx-auto mb-2 opacity-50" />
                <p className="text-sm text-multia-muted">No se encontraron agentes</p>
                <p className="text-xs text-multia-muted mt-1">Prueba con otra búsqueda o categoría</p>
              </div>
            ) : (
              Object.entries(groupedAgents).map(([category, agents]) => (
                <div key={category} className="border-b border-white/5 last:border-0">
                  <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02]">
                    <span className="text-xs font-semibold text-multia-text">{category}</span>
                    <button
                      onClick={() => toggleAll(agents)}
                      className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      {agents.every(a => selectedAgents.includes(a.name)) ? 'Desmarcar' : 'Seleccionar'}
                    </button>
                  </div>
                  {agents.map(agent => {
                    const isActive = selectedAgents.includes(agent.name)
                    return (
                      <button
                        key={agent.name}
                        onClick={() => onToggleAgent(agent.name)}
                        className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0 ${
                          isActive ? 'bg-purple-500/10' : ''
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                          isActive
                            ? 'bg-purple-500 border-purple-500'
                            : 'border-white/20'
                        }`}>
                          {isActive && <Check size={14} className="text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: agent.color }}
                            />
                            <span className="text-sm font-medium text-multia-text">{agent.displayName}</span>
                            <span className="text-xs text-multia-muted bg-white/5 px-1.5 py-0.5 rounded">
                              {agent.model}
                            </span>
                          </div>
                          <p className="text-xs text-multia-muted mt-1 leading-relaxed">
                            {agent.description}
                          </p>
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            {agent.tools.slice(0, 5).map((tool, i) => (
                              <span key={i} className="text-xs text-multia-muted bg-white/5 px-1.5 py-0.5 rounded font-mono">
                                {tool}
                              </span>
                            ))}
                            {agent.tools.length > 5 && (
                              <span className="text-xs text-multia-muted">+{agent.tools.length - 5}</span>
                            )}
                          </div>
                        </div>
                        {isActive && (
                          <Sparkles size={14} className="text-purple-400 flex-shrink-0 mt-0.5" />
                        )}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-white/5 bg-white/5">
            <p className="text-xs text-multia-muted text-center">
              {activeCount > 0
                ? `${activeCount} agente(s) priorizado(s) - catálogo completo conectado en cada consulta`
                : 'Los 185 agentes participan en cada consulta mediante diez equipos'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
