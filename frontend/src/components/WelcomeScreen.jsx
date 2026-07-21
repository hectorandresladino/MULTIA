import { useState, useRef, useEffect } from 'react'
import { Send, Menu, Sparkles, Code, BookOpen, Lightbulb, PenTool, Shield, Bot, CheckCircle, AlertCircle, Cpu, Zap, Hammer, ImagePlus, MapPin, Globe2 } from 'lucide-react'
import ProviderSelector from './ProviderSelector'
import SkillSelector from './SkillSelector'
import SubagentSelector from './SubagentSelector'
import ApiKeySettings from './ApiKeySettings'
import ImageLocationAnalyzer from './ImageLocationAnalyzer'
import WebsiteAuditPanel from './WebsiteAuditPanel'
import SecurityOperationsPanel from './SecurityOperationsPanel'
import { PROVIDERS, hasApiKey, isProxyMode } from '../services/aiService'

export default function WelcomeScreen({ onSendMessage, onToggleSidebar, sidebarOpen, provider, model, onProviderChange, onModelChange, selectedSkills, onToggleSkill, selectedAgents, onToggleAgent, agentsReady }) {
  const [input, setInput] = useState('')
  const [showImageAnalyzer, setShowImageAnalyzer] = useState(false)
  const [showWebsiteAudit, setShowWebsiteAudit] = useState(false)
  const [showSecurityOperations, setShowSecurityOperations] = useState(false)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }, [input])

  const handleSend = () => {
    if (!input.trim()) return
    onSendMessage({
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    })
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const serverManaged = isProxyMode() && !['webllm', 'ollama', 'demo'].includes(provider)
  const connected = hasApiKey(provider)
  const providerName = PROVIDERS[provider]?.name || provider
  const providerStatus = provider === 'webllm'
    ? 'listo sin clave'
    : serverManaged
      ? 'administrado por OpenShift'
      : connected
        ? 'conectado'
        : 'sin API key'

  const suggestions = [
    {
      icon: Hammer,
      title: 'Construir full stack',
      subtitle: 'Consejo, archivos, validación y ZIP',
      prompt: 'Crea una aplicación full stack para gestionar clientes con React, Express, PostgreSQL y despliegue en OpenShift',
    },
    {
      icon: BookOpen,
      title: 'Análisis jurídico',
      subtitle: 'Hechos, argumentos y conclusión prudente',
      prompt: 'Analiza jurídicamente este caso como comité de apoyo: identifica hechos, problema jurídico, argumentos a favor y en contra, fuentes que deben verificarse, riesgos y próximos pasos',
    },
    {
      icon: Lightbulb,
      title: 'Investigación experta',
      subtitle: 'Fuentes, fechas, evidencia e incertidumbre',
      prompt: 'Diseña una investigación experta sobre este tema: estrategia de búsqueda, fuentes primarias, aspectos positivos y negativos, contradicciones, mejoras y visión futura',
    },
    {
      icon: Code,
      title: 'Programar',
      subtitle: 'Genera, explica y revisa código',
      prompt: 'Explica cómo funciona useEffect en React, muestra un ejemplo práctico, señala riesgos, mejoras y alternativas futuras',
    },
    {
      icon: Shield,
      title: 'Revisar seguridad',
      subtitle: 'Prevención, controles y correcciones',
      prompt: 'Revisa este código de forma preventiva, identifica aspectos positivos, riesgos, correcciones y criterios para aprobarlo',
    },
    {
      icon: Bot,
      title: 'Consejo de 185 agentes',
      subtitle: 'Diez equipos y decisión integrada',
      prompt: 'Analiza esta propuesta con los 185 agentes: ventajas, desventajas, mejoras, riesgos, oportunidades y una visión a cinco años',
    },
    {
      icon: MapPin,
      title: 'Analizar lugar en foto',
      subtitle: 'GPS, texto visible y contexto sin reconocer rostros',
      prompt: 'Quiero analizar de forma segura el lugar de una fotografía. No identifiques personas ni deduzcas nacionalidad por apariencia.',
    },
    {
      icon: Globe2,
      title: 'Auditar sitio autorizado',
      subtitle: 'Puertos comunes, TLS, cabeceras y versiones visibles',
      prompt: 'Quiero realizar una auditoría preventiva de un sitio web propio o autorizado. No explotes fallas ni pruebes credenciales.',
    },
    {
      icon: Shield,
      title: 'Centro de seguridad',
      subtitle: 'Evidencias, activos, dispositivo y trayecto propios',
      prompt: 'Quiero analizar de forma preventiva una evidencia de seguridad o un activo propio. No ejecutes comandos, no rastrees terceros y separa hechos, riesgos y mejoras.',
    },
    {
      icon: PenTool,
      title: 'Redactar',
      subtitle: 'Claridad, rigor y documentación',
      prompt: 'Ayúdame a escribir un README profesional, incluye fortalezas, limitaciones, mejoras previstas y hoja de ruta',
    },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        {!sidebarOpen && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Menu size={20} className="text-multia-muted" />
          </button>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <div className="w-7 h-7 rounded-lg bg-multia-accent flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-multia-text">MULTIA</span>
        </div>
        <div className="ml-4 flex items-center gap-2">
          <ApiKeySettings />
          <SkillSelector
            selectedSkills={selectedSkills}
            onToggleSkill={onToggleSkill}
          />
          <SubagentSelector
            selectedAgents={selectedAgents}
            onToggleAgent={onToggleAgent}
            agentsReady={agentsReady}
          />
          <ProviderSelector
            provider={provider}
            model={model}
            onProviderChange={onProviderChange}
            onModelChange={onModelChange}
          />
        </div>
      </div>

      {/* Welcome content */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center px-4 py-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-multia-accent to-orange-600 flex items-center justify-center mb-6 shadow-lg shadow-multia-accent/20">
          <Sparkles size={32} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-multia-text mb-2">¿En qué puedo ayudarte?</h1>
        <p className="text-multia-muted mb-6 text-center max-w-md">
          Asistente con 185 agentes profesionales conectados en diez equipos, consejo experto y constructor de proyectos full stack descargables.
        </p>

        {/* Status bar */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8 w-full max-w-2xl">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border ${
            connected
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
          }`}>
            {connected ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
            {providerName} {providerStatus}
          </div>

          {selectedAgents.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Cpu size={12} />
              {selectedAgents.length} agente(s) priorizado(s)
            </div>
          )}

          {selectedSkills.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <Zap size={12} />
              {selectedSkills.length} skill(s) activa(s)
            </div>
          )}

          {!connected && !serverManaged && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-white/5 border border-white/10 text-multia-muted">
              <AlertCircle size={12} />
              Seleccione “IA Web sin clave” para continuar sin credenciales
            </div>
          )}
        </div>

        {/* Suggestion cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-3xl mb-8">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => {
                onSendMessage({
                  role: 'user',
                  content: s.prompt,
                  timestamp: new Date().toISOString(),
                })
              }}
              className="flex items-start gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 hover:border-multia-accent/30 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-white/5 group-hover:bg-multia-accent/20 flex items-center justify-center transition-colors flex-shrink-0">
                <s.icon size={20} className="text-multia-accent" />
              </div>
              <div>
                <div className="font-medium text-multia-text text-sm">{s.title}</div>
                <div className="text-xs text-multia-muted mt-0.5">{s.subtitle}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Tips */}
        <div className="w-full max-w-2xl bg-white/[0.03] border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb size={14} className="text-multia-accent" />
            <span className="text-xs font-semibold text-multia-text">Consejos rápidos</span>
          </div>
          <ul className="text-xs text-multia-muted space-y-1.5">
            <li>• En cada consulta, MULTIA conecta los 185 agentes mediante diez equipos coordinados</li>
            <li>• El constructor crea archivos reales, valida la estructura y entrega un ZIP temporal</li>
            <li>• La opción IA Web sin clave funciona en el navegador; no requiere guardar credenciales</li>
            <li>• Presiona <strong className="text-multia-text">Stop</strong> para cancelar una deliberación o generación</li>
          </ul>
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-white/5">
        <div className="max-w-3xl mx-auto px-4 py-4">
          {showSecurityOperations && (
            <SecurityOperationsPanel
              onClose={() => setShowSecurityOperations(false)}
              onApply={(promptText) => {
                onSendMessage({
                  role: 'user',
                  content: promptText,
                  timestamp: new Date().toISOString(),
                })
                setShowSecurityOperations(false)
              }}
            />
          )}
          {showWebsiteAudit && (
            <WebsiteAuditPanel
              onClose={() => setShowWebsiteAudit(false)}
              onApply={(promptText) => {
                onSendMessage({
                  role: 'user',
                  content: promptText,
                  timestamp: new Date().toISOString(),
                })
                setShowWebsiteAudit(false)
              }}
            />
          )}
          {showImageAnalyzer && (
            <ImageLocationAnalyzer
              onClose={() => setShowImageAnalyzer(false)}
              onApply={(promptText) => {
                onSendMessage({
                  role: 'user',
                  content: `${promptText}

[La fotografía fue analizada localmente y no se utilizó para reconocimiento facial.]`,
                  timestamp: new Date().toISOString(),
                })
                setShowImageAnalyzer(false)
              }}
            />
          )}
          <div className="relative flex items-end gap-2 bg-multia-input rounded-2xl border border-white/10 focus-within:border-multia-accent/50 transition-colors px-4 py-3">
            <button
              type="button"
              onClick={() => { setShowImageAnalyzer((value) => !value); setShowWebsiteAudit(false); setShowSecurityOperations(false) }}
              className={`p-1.5 rounded-lg transition-colors ${showImageAnalyzer ? 'bg-cyan-500/15 text-cyan-300' : 'text-multia-muted hover:text-multia-text hover:bg-white/10'}`}
              title="Subir fotografía para analizar el lugar y el contexto"
            >
              {showImageAnalyzer ? <MapPin size={18} /> : <ImagePlus size={18} />}
            </button>
            <button
              type="button"
              onClick={() => { setShowWebsiteAudit((value) => !value); setShowImageAnalyzer(false); setShowSecurityOperations(false) }}
              className={`p-1.5 rounded-lg transition-colors ${showWebsiteAudit ? 'bg-emerald-500/15 text-emerald-300' : 'text-multia-muted hover:text-multia-text hover:bg-white/10'}`}
              title="Auditar preventivamente un sitio web autorizado"
            >
              <Globe2 size={18} />
            </button>
            <button
              type="button"
              onClick={() => { setShowSecurityOperations((value) => !value); setShowImageAnalyzer(false); setShowWebsiteAudit(false) }}
              className={`p-1.5 rounded-lg transition-colors ${showSecurityOperations ? 'bg-sky-500/15 text-sky-300' : 'text-multia-muted hover:text-multia-text hover:bg-white/10'}`}
              title="Centro de operaciones de seguridad autorizado"
            >
              <Shield size={18} />
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pide una aplicación full stack o escribe una pregunta..."
              rows={1}
              className="flex-1 bg-transparent text-multia-text placeholder-multia-muted resize-none outline-none text-sm leading-relaxed max-h-[200px]"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="p-2 rounded-xl bg-multia-accent hover:bg-multia-accent/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
            >
              <Send size={18} className="text-white" />
            </button>
          </div>
          <div className="text-center text-xs text-multia-muted mt-2">
            MULTIA puede cometer errores. Verifica información importante.
          </div>
        </div>
      </div>
    </div>
  )
}
