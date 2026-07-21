import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Check,
  Copy,
  Cpu,
  Download,
  FileCode2,
  Hammer,
  ImagePlus,
  MapPin,
  Globe2,
  ShieldCheck,
  Menu,
  RefreshCw,
  Send,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
  User,
  X,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import ProviderSelector from './ProviderSelector'
import SkillSelector from './SkillSelector'
import SubagentSelector from './SubagentSelector'
import ApiKeySettings from './ApiKeySettings'
import ImageLocationAnalyzer from './ImageLocationAnalyzer'
import WebsiteAuditPanel from './WebsiteAuditPanel'
import SecurityOperationsPanel from './SecurityOperationsPanel'
import { callAI, PROVIDERS, hasApiKey, selectModelForTask } from '../services/aiService'
import { recordModelRun, submitFeedback } from '../services/persistenceService'
import { createProjectWorkspace, projectDownloadUrl } from '../services/workspaceService'
import { buildSystemPromptWithSkills } from '../skills'
import {
  buildAgentSystemPrompt,
  buildDebatePrompt,
  buildDecisionPrompt,
  buildSynthesisPrompt,
  loadSubagents,
  getOperationalCouncil,
  isProjectBuildRequest,
  isLegalRequest,
  isResearchRequest,
  isWebsiteAuditRequest,
} from '../subagents'

const VISUAL_PRIVACY_RULES = `Reglas obligatorias para consultas con nombres o fotografías:
- No identifiques personas por el rostro ni compares rostros con perfiles.
- No infieras nacionalidad, etnia, religión, salud, orientación o ideología por apariencia.
- No ayudes a localizar, seguir o vigilar a una persona privada.
- Solo analiza metadatos aportados, texto visible, paisaje, arquitectura, objetos y fuentes públicas legítimas.
- Separa hechos, inferencias y datos pendientes de verificación; evita domicilios y otros datos sensibles.`

const AUTHORIZED_WEB_AUDIT_RULES = `Reglas obligatorias para auditorías web:
- Solo analiza sitios sobre los que el usuario confirmó propiedad, administración autorizada, permiso escrito o laboratorio controlado.
- No propongas explotación, fuerza bruta, evasión, persistencia, malware, robo de credenciales ni escaneos adicionales.
- Un puerto abierto no demuestra una vulnerabilidad; una versión visible puede ser incompleta o falsa.
- Separa hallazgos confirmados, riesgos posibles, limitaciones y pasos de corrección y revalidación.`

const SECURITY_OPERATIONS_RULES = `Reglas obligatorias para operaciones de seguridad:
- Solo analiza archivos, activos, dispositivos y trayectos propios o expresamente autorizados.
- No ejecutes comandos, explotación, fuerza bruta, evasión, malware, recuperación de credenciales ni seguimiento de terceros.
- La ubicación solo puede proceder del permiso voluntario del dispositivo actual; nunca por número telefónico, IMEI, cuenta o identificador ajeno.
- Los trayectos se resumen sin coordenadas exactas ni reconstrucción de rutinas personales.
- Prioriza inventario, prevención, parches verificados, privacidad, continuidad y revalidación.`

function historyWithoutDuplicate(messages, current) {
  const history = messages.map((message) => ({ role: message.role, content: message.content }))
  const last = history[history.length - 1]
  if (last?.role === 'user' && last.content === current.content) return history.slice(0, -1)
  return history
}

function buildRecentConversationContext(messages, current) {
  const recent = historyWithoutDuplicate(messages, current).slice(-6)
  if (recent.length === 0) return current.content
  const transcript = recent
    .map((message) => `${message.role === 'user' ? 'Usuario' : 'MULTIA'}: ${String(message.content || '').slice(0, 1000)}`)
    .join('\n\n')
  return `Contexto reciente de la conversación:
${transcript}

Solicitud actual del usuario:
${current.content}`
}


export default function ChatArea({
  conversation,
  onSendMessage,
  onToggleSidebar,
  sidebarOpen,
  provider,
  model,
  onProviderChange,
  onModelChange,
  onAddMessage,
  onUpdateLastMessage,
  selectedSkills,
  onToggleSkill,
  selectedAgents,
  onToggleAgent,
  agentsReady,
  pendingMessage,
  onPendingMessageConsumed,
}) {
  const [input, setInput] = useState('')
  const [imageUrls, setImageUrls] = useState([])
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState(null)
  const [agentStatus, setAgentStatus] = useState(null)
  const [builderMode, setBuilderMode] = useState(false)
  const [showImageAnalyzer, setShowImageAnalyzer] = useState(false)
  const [showWebsiteAudit, setShowWebsiteAudit] = useState(false)
  const [showSecurityOperations, setShowSecurityOperations] = useState(false)
  const abortRef = useRef(null)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation.messages, isTyping])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }, [input])

  const getActiveProvider = () => {
    if (!hasApiKey(provider)) {
      if (provider !== 'webllm') {
        onProviderChange('webllm')
        onModelChange(PROVIDERS.webllm.defaultModel)
      }
      return 'webllm'
    }
    return provider
  }

  const generateResponse = async (userMessage, convId) => {
    if (isTyping) return
    setIsTyping(true)
    setError(null)

    const activeProvider = getActiveProvider()
    const projectMode = builderMode || isProjectBuildRequest(userMessage.content)
    const legalMode = isLegalRequest(userMessage.content)
    const researchMode = isResearchRequest(userMessage.content)
    const websiteAuditMode = isWebsiteAuditRequest(userMessage.content)
    const modes = { projectMode, legalMode, researchMode, websiteAuditMode }
    const effectiveModel = selectModelForTask(activeProvider, model, userMessage.content, modes)
    let activeAgents
    try {
      if (!agentsReady) await loadSubagents()
      activeAgents = getOperationalCouncil(selectedAgents)
    } catch (loadError) {
      setError(`No fue posible conectar los 185 agentes: ${loadError.message}`)
      setIsTyping(false)
      return
    }

    onAddMessage(convId, {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    })

    if (activeAgents.length > 0) {
      await handleSubagentExecution(convId, activeAgents, userMessage, activeProvider, modes, effectiveModel)
    } else {
      await handleNormalExecution(convId, userMessage, activeProvider, effectiveModel)
    }
  }

  const handleSend = async () => {
    if ((!input.trim() && imageUrls.length === 0) || isTyping) return

    let content = input.trim()
    if (imageUrls.length > 0) {
      const privacyNote = '[La fotografía fue analizada localmente para extraer contexto del lugar. El archivo no se usó para reconocimiento facial.]'
      content = content ? `${content}

${privacyNote}` : privacyNote
    }

    const userMessage = {
      role: 'user',
      content,
      images: imageUrls,
      timestamp: new Date().toISOString(),
    }

    onSendMessage(userMessage)
    setInput('')
    imageUrls.forEach((url) => { if (url.startsWith('blob:')) URL.revokeObjectURL(url) })
    setImageUrls([])
    await generateResponse(userMessage, conversation.id)
  }

  const isAbortError = (err) => err && (err.name === 'AbortError' || err.message?.toLowerCase().includes('abort'))

  useEffect(() => {
    if (pendingMessage && pendingMessage.convId === conversation.id && !isTyping) {
      onPendingMessageConsumed()
      generateResponse(pendingMessage.msg, pendingMessage.convId)
    }
  }, [pendingMessage])

  const handleNormalExecution = async (convId, userMessage, activeProvider, effectiveModel) => {
    const taskText = `${buildRecentConversationContext(conversation.messages, userMessage)}\n\n${VISUAL_PRIVACY_RULES}\n\n${AUTHORIZED_WEB_AUDIT_RULES}`
    const basePrompt = `Eres MULTIA, un asistente útil e inteligente que responde en español por defecto. Usas Markdown para formatear tus respuestas.\n\n${VISUAL_PRIVACY_RULES}\n\n${AUTHORIZED_WEB_AUDIT_RULES}`
    const systemPrompt = buildSystemPromptWithSkills(basePrompt, selectedSkills)
    const messages = [
      { role: 'system', content: systemPrompt },
      ...historyWithoutDuplicate(conversation.messages, userMessage),
      { role: 'user', content: taskText },
    ]

    abortRef.current = new AbortController()
    const startedAt = Date.now()
    let outputText = ''
    let runStatus = 'completed'
    try {
      await callAI(activeProvider, messages, effectiveModel, (fullText) => {
        outputText = fullText
        onUpdateLastMessage(convId, fullText)
      }, abortRef.current.signal)
      onUpdateLastMessage(convId, outputText, { provider: activeProvider, model: effectiveModel, mode: 'general', durationMs: Date.now() - startedAt })
    } catch (err) {
      runStatus = isAbortError(err) ? 'cancelled' : 'error'
      if (isAbortError(err)) onUpdateLastMessage(convId, '*Respuesta detenida por el usuario.*')
      else {
        setError(err.message)
        onUpdateLastMessage(convId, `**Error:** ${err.message}`)
      }
    } finally {
      recordModelRun({
        conversationId: convId, provider: activeProvider, model: effectiveModel, mode: 'general',
        status: runStatus, durationMs: Date.now() - startedAt, inputChars: userMessage.content.length,
        outputChars: outputText.length, teamCount: 0, metadata: { selectedAutomatically: effectiveModel !== model },
      }).catch(() => undefined)
      setIsTyping(false)
      abortRef.current = null
    }
  }

  const handleSubagentExecution = async (convId, activeAgents, userMessage, activeProvider, modes, effectiveModel) => {
    const { projectMode, legalMode, researchMode, websiteAuditMode } = modes
    const taskText = `${buildRecentConversationContext(conversation.messages, userMessage)}\n\n${VISUAL_PRIVACY_RULES}\n\n${AUTHORIZED_WEB_AUDIT_RULES}`
    const controller = new AbortController()
    const startedAt = Date.now()
    let finalOutputText = ''
    let runStatus = 'completed'
    abortRef.current = controller
    setAgentStatus(activeAgents.map((agent) => ({ name: agent.displayName || agent.name, status: 'running', color: agent.color })))
    onUpdateLastMessage(
      convId,
      projectMode
        ? '*Los diez equipos están conectando las aportaciones de los 185 agentes y preparando el proyecto...*'
        : '*Los diez equipos están analizando la consulta con los 185 agentes y el consejo experto...*',
    )

    try {
      const agentPromises = activeAgents.map(async (agent) => {
        const statusName = agent.displayName || agent.name
        const agentMessages = [
          {
            role: 'system',
            content: buildAgentSystemPrompt(agent, taskText, modes),
          },
          { role: 'user', content: taskText },
        ]

        try {
          let result = ''
          await callAI(activeProvider, agentMessages, effectiveModel, (fullText) => {
            result = fullText
            setAgentStatus((previous) => previous.map((state) =>
              state.name === statusName ? { ...state, status: 'streaming' } : state
            ))
          }, controller.signal)
          setAgentStatus((previous) => previous.map((state) =>
            state.name === statusName ? { ...state, status: 'done' } : state
          ))
          return { name: statusName, result, error: null }
        } catch (err) {
          setAgentStatus((previous) => previous.map((state) =>
            state.name === statusName ? { ...state, status: isAbortError(err) ? 'stopped' : 'error' } : state
          ))
          return { name: statusName, result: '', error: err.message }
        }
      })

      const results = await Promise.all(agentPromises)
      const successful = results.filter((result) => result.result.trim())
      const failed = results.filter((result) => !result.result.trim())

      if (controller.signal.aborted) throw new DOMException('Operación cancelada', 'AbortError')
      if (successful.length === 0) {
        throw new Error(`Ningún agente produjo una respuesta válida. ${failed.map((item) => item.name).join(', ')}`)
      }

      let decisionInputs = successful
      if (successful.length > 1) {
        setAgentStatus((previous) => [
          ...previous,
          { name: 'relator-debate', status: 'deciding', color: '#06b6d4' },
        ])
        onUpdateLastMessage(convId, '*El relator está comparando las propuestas y señalando desacuerdos...*')

        let debateText = ''
        await callAI(activeProvider, [
          {
            role: 'system',
            content: 'Eres el relator crítico de MULTIA. Facilitas la interacción entre agentes y detectas contradicciones antes de que el presidente decida.',
          },
          { role: 'user', content: buildDebatePrompt(successful, userMessage.content, modes) },
        ], effectiveModel, (fullText) => {
          debateText = fullText
        }, controller.signal)

        setAgentStatus((previous) => previous.map((state) =>
          state.name === 'relator-debate' ? { ...state, status: 'done' } : state
        ))
        if (debateText.trim()) decisionInputs = [...successful, { name: 'relator-debate', result: debateText }]
      }

      setAgentStatus((previous) => [
        ...previous,
        { name: 'presidente-del-consejo', status: 'deciding', color: '#a855f7' },
      ])
      onUpdateLastMessage(convId, projectMode
        ? '*El presidente del consejo está resolviendo desacuerdos y aprobando la arquitectura...*'
        : '*El presidente del consejo está resolviendo desacuerdos y preparando la respuesta experta...*')

      const synthesisPrompt = projectMode
        ? buildDecisionPrompt(decisionInputs, userMessage.content, modes)
        : buildSynthesisPrompt(decisionInputs, userMessage.content, modes)
      const systemPrompt = buildSystemPromptWithSkills(
        projectMode
          ? 'Eres el presidente técnico y multidisciplinario de MULTIA. Tomas decisiones coherentes y ejecutables para un constructor de software.'
          : 'Eres el presidente del consejo experto de MULTIA. Integras los 185 agentes, contrastas argumentos y declaras la incertidumbre.',
        selectedSkills,
      )

      let decisionText = ''
      await callAI(activeProvider, [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: synthesisPrompt },
      ], effectiveModel, (fullText) => {
        decisionText = fullText
        finalOutputText = fullText
        onUpdateLastMessage(convId, fullText)
      }, controller.signal)

      if (!projectMode) {
        onUpdateLastMessage(convId, decisionText, { provider: activeProvider, model: effectiveModel, mode: legalMode ? 'legal' : researchMode ? 'research' : websiteAuditMode ? 'website-audit' : 'multiagent', durationMs: Date.now() - startedAt, teams: activeAgents.length })
        if (failed.length) setError(`${failed.length} agente(s) no completaron su parte.`)
        return
      }

      setAgentStatus((previous) => [
        ...previous.map((state) => state.name === 'presidente-del-consejo' ? { ...state, status: 'done' } : state),
        { name: 'constructor-operacional', status: 'building', color: '#f97316' },
      ])
      onUpdateLastMessage(convId, `${decisionText}\n\n---\n\n*Materializando la decisión en archivos reales...*`)

      const workspace = await createProjectWorkspace({
        requestText: userMessage.content,
        decisions: decisionText,
        signal: controller.signal,
      })
      const validation = workspace.validation
      const securityAudit = workspace.securityAudit
      const downloadUrl = projectDownloadUrl(workspace)
      const buildSpec = workspace.buildSpec
      const entityName = buildSpec?.entity?.plural || buildSpec?.entity?.singular || 'registros'
      const fieldsSummary = buildSpec?.entity?.fields?.map((field) => `\`${field.name}:${field.type}\``).join(', ') || 'especificación predeterminada'
      const specificationSource = buildSpec?.source === 'council'
        ? 'decisión estructurada aprobada por el consejo'
        : 'inferencia segura basada en la solicitud'
      const validationLabel = validation.valid
        ? `Aprobada: ${validation.summary.files} archivos, sin errores de sintaxis o estructura.`
        : `Requiere revisión: ${validation.summary.errors} error(es) y ${validation.summary.warnings} advertencia(s).`
      const securityBlocked = Boolean(securityAudit?.summary?.blocked)
      const securityCounts = securityAudit?.summary?.counts || {}
      const securityLabel = securityAudit
        ? `${securityAudit.summary.status.toUpperCase()} · puntuación ${securityAudit.summary.score}/100 · críticos ${securityCounts.critical || 0}, altos ${securityCounts.high || 0}, medios ${securityCounts.medium || 0}`
        : 'No disponible'

      setAgentStatus((previous) => previous.map((state) =>
        state.name === 'constructor-operacional' ? { ...state, status: validation.valid && !securityBlocked ? 'done' : 'warning' } : state
      ))

      onUpdateLastMessage(convId, `${decisionText}\n\n---\n\n## Proyecto full stack materializado\n\n` +
        `El consejo tomó las decisiones y el constructor creó **${workspace.fileCount} archivos reales** con la arquitectura **${workspace.stack}**.\n\n` +
        `- **Proyecto:** \`${workspace.projectName}\`\n` +
        `- **Entidad y API:** \`${entityName}\`\n` +
        `- **Campos aplicados:** ${fieldsSummary}\n` +
        `- **Origen de la especificación:** ${specificationSource}\n` +
        `- **Validación automática:** ${validationLabel}\n` +
        `- **Revisión controlada de seguridad:** ${securityLabel}\n` +
        `- **Alcance protegido:** solo archivos del espacio de trabajo; sin revisión de sistemas externos ni acciones que puedan alterar información.\n` +
        `- **Duración del espacio temporal:** hasta ${new Date(workspace.expiresAt).toLocaleString()}\n\n` +
        (securityBlocked
          ? `### Descarga bloqueada por seguridad\n\nRevise \`SECURITY_REPORT.md\` y corrija todos los hallazgos críticos o altos antes de generar el ZIP.`
          : `### [Descargar el proyecto completo en ZIP](${downloadUrl})\n\nEl ZIP incluye frontend, backend, PostgreSQL, Dockerfile, pruebas, \`SECURITY_REPORT.md\`, \`SECURITY_FINDINGS.json\` y \`openshift.yaml\` para Red Hat OpenShift.`))

      finalOutputText = decisionText
      if (failed.length) setError(`${failed.length} agente(s) no completaron su parte; el consejo continuó con los resultados válidos.`)
    } catch (err) {
      runStatus = isAbortError(err) ? 'cancelled' : 'error'
      if (isAbortError(err)) {
        onUpdateLastMessage(convId, '*Ejecución multiagente detenida por el usuario.*')
      } else {
        setError(err.message)
        onUpdateLastMessage(convId, `**Error en la ejecución multiagente:** ${err.message}`)
      }
    } finally {
      const mode = projectMode ? 'project' : legalMode ? 'legal' : researchMode ? 'research' : websiteAuditMode ? 'website-audit' : 'multiagent'
      recordModelRun({
        conversationId: convId, provider: activeProvider, model: effectiveModel, mode,
        status: runStatus, durationMs: Date.now() - startedAt, inputChars: userMessage.content.length,
        outputChars: finalOutputText.length, teamCount: activeAgents.length,
        metadata: { selectedAutomatically: effectiveModel !== model, failedTeams: agentStatus?.filter?.((item) => item.status === 'error').length || 0 },
      }).catch(() => undefined)
      setIsTyping(false)
      setAgentStatus(null)
      abortRef.current = null
    }
  }

  const handleStop = () => abortRef.current?.abort()

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }


  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-multia-bg/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {!sidebarOpen && (
            <button onClick={onToggleSidebar} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
              <Menu size={20} className="text-multia-muted" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-multia-accent flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-multia-text">MULTIA</div>
              <div className="text-xs text-multia-muted">
                {PROVIDERS[provider]?.name} · {PROVIDERS[provider]?.models.find((item) => item.id === model)?.name}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ApiKeySettings />
          <SkillSelector selectedSkills={selectedSkills} onToggleSkill={onToggleSkill} />
          <SubagentSelector selectedAgents={selectedAgents} onToggleAgent={onToggleAgent} agentsReady={agentsReady} />
          <ProviderSelector provider={provider} model={model} onProviderChange={onProviderChange} onModelChange={onModelChange} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {conversation.messages.map((message, index) => <Message key={message.id || index} message={message} conversationId={conversation.id} index={index} />)}
          {isTyping && !agentStatus && <TypingIndicator />}
          {agentStatus && <SubagentStatus agents={agentStatus} />}
          {error && (
            <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-white/5 bg-multia-bg">
        <div className="max-w-3xl mx-auto px-4 py-4">
          {showSecurityOperations && (
            <SecurityOperationsPanel
              onClose={() => setShowSecurityOperations(false)}
              onApply={(promptText) => {
                setInput(promptText)
                setShowSecurityOperations(false)
              }}
            />
          )}

          {showWebsiteAudit && (
            <WebsiteAuditPanel
              onClose={() => setShowWebsiteAudit(false)}
              onApply={(promptText) => {
                setInput(promptText)
                setShowWebsiteAudit(false)
              }}
            />
          )}

          {showImageAnalyzer && (
            <ImageLocationAnalyzer
              onClose={() => setShowImageAnalyzer(false)}
              onApply={(promptText, imageFile) => {
                imageUrls.forEach((url) => { if (url.startsWith('blob:')) URL.revokeObjectURL(url) })
                setInput(promptText)
                setImageUrls(imageFile ? [URL.createObjectURL(imageFile)] : [])
                setShowImageAnalyzer(false)
              }}
            />
          )}

          {imageUrls.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {imageUrls.map((url, index) => (
                <div key={url + index} className="relative group">
                  <img src={url} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-white/10" onError={(event) => { event.currentTarget.style.display = 'none' }} />
                  <button onClick={() => {
                    if (url.startsWith('blob:')) URL.revokeObjectURL(url)
                    setImageUrls((previous) => previous.filter((_, itemIndex) => itemIndex !== index))
                  }} className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <X size={10} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => setBuilderMode((value) => !value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                builderMode
                  ? 'bg-orange-500/15 border-orange-500/40 text-orange-300'
                  : 'bg-white/5 border-white/10 text-multia-muted hover:text-multia-text'
              }`}
              title="Fuerza la deliberación multiagente y la generación de un ZIP"
            >
              <Hammer size={14} />
              Constructor {builderMode ? 'activado' : 'automático'}
            </button>
            <span className="text-xs text-multia-muted">Las solicitudes de proyectos full stack activan automáticamente el consejo operacional.</span>
          </div>

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
              <ShieldCheck size={18} />
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pida una aplicación full stack o escriba una pregunta..."
              rows={1}
              className="flex-1 bg-transparent text-multia-text placeholder-multia-muted resize-none outline-none text-sm leading-relaxed max-h-[200px]"
            />
            {isTyping ? (
              <button onClick={handleStop} className="p-2 rounded-xl bg-red-500/80 hover:bg-red-500 transition-all"><Square size={16} className="text-white" /></button>
            ) : (
              <button onClick={handleSend} disabled={!input.trim() && imageUrls.length === 0} className="p-2 rounded-xl bg-multia-accent hover:bg-multia-accent/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <Send size={18} className="text-white" />
              </button>
            )}
          </div>
          <div className="text-center text-xs text-multia-muted mt-2">MULTIA puede cometer errores. Revise el proyecto y sus decisiones antes de producción.</div>
        </div>
      </div>
    </div>
  )
}

function Message({ message, conversationId, index }) {
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState(message.metadata?.feedback || 0)
  const isUser = message.role === 'user'

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFeedback = async (rating) => {
    setFeedback(rating)
    try {
      await submitFeedback({ conversationId, messageId: message.id || `${conversationId}-${index}`, rating })
    } catch {
      setFeedback(0)
    }
  }

  return (
    <div className={`flex gap-3 mb-6 animate-slide-up ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${isUser ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-multia-accent'}`}>
        {isUser ? <User size={16} className="text-white" /> : <Sparkles size={16} className="text-white" />}
      </div>
      <div className={`flex-1 min-w-0 ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div className={`inline-block rounded-2xl px-4 py-3 ${isUser ? 'bg-blue-600/20 text-multia-text rounded-tr-sm' : 'bg-white/5 text-multia-text rounded-tl-sm'}`}>
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="markdown-content text-sm">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ href, children }) => (
                    <a href={href} className="text-orange-300 underline underline-offset-2" target="_blank" rel="noreferrer">
                      {String(children).toLowerCase().includes('descargar') ? <Download size={14} className="inline mr-1" /> : null}
                      {children}
                    </a>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        {!isUser && (
          <div className="flex items-center gap-3 mt-1.5 ml-1">
            <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-multia-muted hover:text-multia-text transition-colors">
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
            <button onClick={() => handleFeedback(1)} className={`p-1 rounded transition-colors ${feedback === 1 ? 'text-green-400 bg-green-500/10' : 'text-multia-muted hover:text-green-400'}`} title="Respuesta útil"><ThumbsUp size={13} /></button>
            <button onClick={() => handleFeedback(-1)} className={`p-1 rounded transition-colors ${feedback === -1 ? 'text-red-400 bg-red-500/10' : 'text-multia-muted hover:text-red-400'}`} title="Respuesta por mejorar"><ThumbsDown size={13} /></button>
            {message.metadata?.model && <span className="text-[10px] text-multia-muted">{message.metadata.model}{message.metadata.durationMs ? ` · ${(message.metadata.durationMs / 1000).toFixed(1)}s` : ''}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 mb-6 animate-fade-in">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-multia-accent flex items-center justify-center"><Sparkles size={16} className="text-white" /></div>
      <div className="bg-white/5 rounded-2xl rounded-tl-sm px-4 py-4 flex items-center">
        <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
      </div>
    </div>
  )
}

function SubagentStatus({ agents }) {
  const statusConfig = {
    running: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Analizando...', spin: true },
    streaming: { color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Proponiendo...', spin: true },
    deciding: { color: 'text-purple-400', bg: 'bg-purple-400/10', label: 'Tomando decisiones...', spin: true },
    building: { color: 'text-orange-400', bg: 'bg-orange-400/10', label: 'Creando archivos...', spin: true },
    done: { color: 'text-green-400', bg: 'bg-green-400/10', label: 'Completado', spin: false },
    warning: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Revisar', spin: false },
    stopped: { color: 'text-gray-400', bg: 'bg-white/5', label: 'Detenido', spin: false },
    error: { color: 'text-red-400', bg: 'bg-red-400/10', label: 'Error', spin: false },
  }

  return (
    <div className="mb-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-3 text-sm text-multia-muted">
        <Cpu size={16} className="text-purple-400" />
        <span>Consejo multiagente y constructor operacional</span>
      </div>
      <div className="space-y-2">
        {agents.map((agent) => {
          const config = statusConfig[agent.status] || statusConfig.running
          return (
            <div key={agent.name} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl ${config.bg} border border-white/5`}>
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: agent.color }} />
              <span className="text-sm font-medium text-multia-text flex-1 flex items-center gap-2">
                {agent.name === 'constructor-operacional' ? <FileCode2 size={14} /> : null}
                {agent.name}
              </span>
              <span className={`text-xs ${config.color} flex items-center gap-1.5`}>
                {config.spin && <RefreshCw size={12} className="animate-spin" />}
                {config.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
