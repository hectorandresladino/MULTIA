import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Settings, Wifi, WifiOff } from 'lucide-react'
import { PROVIDERS, hasApiKey, isProxyMode } from '../services/aiService'

export default function ProviderSelector({ provider, model, onProviderChange, onModelChange }) {
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

  const currentProvider = PROVIDERS[provider]
  const currentServerManaged = isProxyMode() && !['webllm', 'ollama', 'demo'].includes(provider)
  const connected = hasApiKey(provider)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-sm border border-white/10"
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: currentProvider.color }}
        />
        <span className="text-multia-text font-medium">{currentProvider.name}</span>
        <span className="text-multia-muted text-xs hidden sm:inline">
          {currentProvider.models.find(m => m.id === model)?.name || model}
        </span>
        {currentServerManaged ? (
          <Settings size={14} className="text-blue-400" />
        ) : connected ? (
          <Wifi size={14} className="text-green-400" />
        ) : (
          <WifiOff size={14} className="text-yellow-400" />
        )}
        <ChevronDown size={15} className="text-multia-muted" />
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 w-80 bg-multia-sidebar border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
          {Object.values(PROVIDERS).map(p => {
            const isCurrent = p.id === provider
            const isServerManaged = isProxyMode() && !['webllm', 'ollama', 'demo'].includes(p.id)
            const isConnected = hasApiKey(p.id)

            return (
              <div key={p.id} className="border-b border-white/5 last:border-0">
                <button
                  onClick={() => {
                    onProviderChange(p.id)
                    onModelChange(p.defaultModel)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors ${
                    isCurrent ? 'bg-white/5' : ''
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-multia-text">{p.name}</span>
                      {isServerManaged ? (
                        <span className="flex items-center gap-1 text-[10px] text-blue-300">
                          <Settings size={11} /> Servidor
                        </span>
                      ) : isConnected ? (
                        <Wifi size={12} className="text-green-400" />
                      ) : (
                        <WifiOff size={12} className="text-yellow-400" />
                      )}
                    </div>
                    <div className="text-xs text-multia-muted">{p.description}</div>
                  </div>
                  {isCurrent && <Check size={16} className="text-multia-accent" />}
                </button>

                {isCurrent && (
                  <div className="px-4 pb-3 pt-1 space-y-1">
                    {p.models.map(m => (
                      <button
                        key={m.id}
                        onClick={() => onModelChange(m.id)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          model === m.id
                            ? 'bg-multia-accent/20 text-multia-text'
                            : 'hover:bg-white/5 text-multia-muted'
                        }`}
                      >
                        <span>{m.name}</span>
                        {model === m.id && <Check size={14} className="text-multia-accent" />}
                      </button>
                    ))}
                    {!isConnected && !['webllm', 'ollama', 'demo'].includes(p.id) && (
                      <div className="text-xs text-yellow-400/80 px-3 py-1.5 bg-yellow-400/10 rounded-lg mt-2">
                        <Settings size={11} className="inline mr-1" />
                        Sin API key - usa el boton API Keys (llave) arriba para configurar
                      </div>
                    )}
                    {p.id === 'webllm' && (
                      <div className="text-xs text-green-300/90 px-3 py-1.5 bg-green-500/10 rounded-lg mt-2">
                        La primera vez descargará el modelo en el navegador. Requiere WebGPU.
                      </div>
                    )}
                    {p.id === 'ollama' && (
                      <div className="text-xs text-multia-muted px-3 py-1.5 bg-white/5 rounded-lg mt-2">
                        Requiere un servidor Ollama accesible desde el backend.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
