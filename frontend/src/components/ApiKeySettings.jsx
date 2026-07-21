import { useState, useRef, useEffect } from 'react'
import { Key, X, Check, ExternalLink, Eye, EyeOff, Trash2 } from 'lucide-react'
import { PROVIDERS, getApiKey, setApiKey, clearApiKey, hasApiKey, isProxyMode } from '../services/aiService'

export default function ApiKeySettings({ onKeyChange }) {
  const proxyMode = isProxyMode()
  const [open, setOpen] = useState(false)
  const [keys, setKeys] = useState({})
  const [showKeys, setShowKeys] = useState({})
  const ref = useRef(null)

  useEffect(() => {
    if (open) {
      const current = {}
      Object.keys(PROVIDERS).forEach(id => {
        if (!['webllm', 'ollama', 'demo'].includes(id)) {
          current[id] = getApiKey(id)
        }
      })
      setKeys(current)
    }
  }, [open])

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSave = (providerId) => {
    setApiKey(providerId, keys[providerId] || '')
    if (onKeyChange) onKeyChange()
  }

  const handleClear = (providerId) => {
    clearApiKey(providerId)
    setKeys(prev => ({ ...prev, [providerId]: '' }))
    if (onKeyChange) onKeyChange()
  }

  const keyProviderIds = Object.keys(PROVIDERS).filter(id => !['webllm', 'ollama', 'demo'].includes(id))
  const connectedCount = keyProviderIds.filter(id => hasApiKey(id)).length

  if (proxyMode) {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm"
        title="IA Web funciona sin clave. Las credenciales externas se administran como Secret en OpenShift."
      >
        <Key size={14} />
        <span className="hidden sm:inline">Sin API key</span>
      </div>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors text-sm border ${
          connectedCount > 0
            ? 'bg-green-500/20 border-green-500/40 text-green-400'
            : 'bg-white/5 hover:bg-white/10 border-white/10 text-multia-muted'
        }`}
        title="Configurar API keys"
      >
        <Key size={14} />
        <span className="hidden sm:inline">API Keys</span>
        {connectedCount > 0 && (
          <span className="bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
            {connectedCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 w-96 max-w-[calc(100vw-2rem)] bg-multia-sidebar border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key size={16} className="text-multia-accent" />
              <span className="text-sm font-semibold text-multia-text">Configurar API Keys</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={16} className="text-multia-muted" />
            </button>
          </div>

          <div className="px-4 py-3 bg-blue-500/10 border-b border-white/5">
            <p className="text-xs text-blue-300 leading-relaxed">
              Estas credenciales son opcionales. La opción “IA Web sin clave” funciona sin configurarlas. Para pruebas locales puede guardar una key en este navegador:
              <br />
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="text-blue-400 underline">Gemini (Gratis)</a>
              {' · '}
              <a href="https://console.groq.com/keys" target="_blank" rel="noopener" className="text-blue-400 underline">Groq (Gratis)</a>
            </p>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {Object.values(PROVIDERS).filter(p => !['webllm', 'ollama', 'demo'].includes(p.id)).map(provider => {
              const isConnected = hasApiKey(provider.id)
              return (
                <div key={provider.id} className="px-4 py-3 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: provider.color }}
                    />
                    <span className="text-sm font-medium text-multia-text flex-1">{provider.name}</span>
                    {provider.free && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-medium">
                        Gratis
                      </span>
                    )}
                    {isConnected && (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <Check size={12} />
                        Conectado
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-multia-muted mb-2">{provider.description}</p>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <input
                        type={showKeys[provider.id] ? 'text' : 'password'}
                        value={keys[provider.id] || ''}
                        onChange={(e) => setKeys(prev => ({ ...prev, [provider.id]: e.target.value }))}
                        placeholder="Pega tu API key aquí..."
                        className="w-full bg-multia-input text-multia-text text-sm px-3 py-2 rounded-lg border border-white/10 focus:border-multia-accent/50 outline-none pr-9"
                      />
                      <button
                        onClick={() => setShowKeys(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-multia-muted hover:text-multia-text transition-colors"
                      >
                        {showKeys[provider.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <button
                      onClick={() => handleSave(provider.id)}
                      disabled={!keys[provider.id]}
                      className="px-3 py-2 bg-multia-accent hover:bg-multia-accent/80 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-white text-xs font-medium transition-all flex-shrink-0"
                    >
                      Guardar
                    </button>
                    {isConnected && (
                      <button
                        onClick={() => handleClear(provider.id)}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition-all flex-shrink-0"
                        title="Eliminar key"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {provider.getKeyUrl && (
                    <a
                      href={provider.getKeyUrl}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-center gap-1 text-xs text-multia-accent hover:text-multia-accent/80 mt-2 transition-colors"
                    >
                      <ExternalLink size={11} />
                      Obtener API key
                    </a>
                  )}
                </div>
              )
            })}
          </div>

          <div className="px-4 py-3 border-t border-white/5 bg-white/5">
            <p className="text-xs text-multia-muted text-center">
              Las keys se guardan solo en tu navegador (localStorage)
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
