import crypto from 'crypto'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { createProxyMiddleware } from 'http-proxy-middleware'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  cleanupExpiredWorkspaces,
  createWorkspace,
  deleteWorkspace,
  listWorkspaceFiles,
  readWorkspaceFile,
  streamWorkspaceArchive,
  writeWorkspaceFiles,
} from './lib/workspaces.js'
import { buildFullStackTemplate } from './lib/templates.js'
import { validateWorkspace } from './lib/validation.js'
import { auditWorkspace } from './lib/securityAudit.js'
import { coarseLocationFromNominatim, validateCoordinates } from './lib/location.js'
import { auditAuthorizedWebsite } from './lib/websiteAudit.js'
import { analyzeAuthorizedArtifact } from './lib/securityOperations.js'
import {
  countActiveAdmins,
  createFeedback,
  createModelRun,
  databaseStatus,
  deleteConversation as deleteStoredConversation,
  getOperationalMetrics,
  initializeDatabase,
  listConversations,
  listUsers,
  recordAuditEvent,
  syncConversations,
  updateUserAdministration,
  getUserById,
} from './lib/database.js'
import {
  authStatus,
  authenticateCredentials,
  bootstrapAdmin,
  createManagedUser,
  endSession,
  ensureBootstrapState,
  requireAuth,
  requireCsrf,
  requireRole,
  resolveSession,
  sanitizeUser,
  startSession,
} from './lib/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.set('trust proxy', 1)
const PORT = Number(process.env.PORT || 3000)
const HOST = process.env.HOST || '0.0.0.0'
const PROXY_REQUESTS_PER_MINUTE = Number(process.env.PROXY_REQUESTS_PER_MINUTE || 30)
const BUILDER_REQUESTS_PER_MINUTE = Number(process.env.BUILDER_REQUESTS_PER_MINUTE || 12)
const DOWNLOAD_TICKET_TTL_MS = Number(process.env.DOWNLOAD_TICKET_TTL_MS || 30 * 60_000)
const LOCATION_REQUESTS_PER_MINUTE = Number(process.env.LOCATION_REQUESTS_PER_MINUTE || 10)
const WEBSITE_AUDIT_REQUESTS_PER_MINUTE = Number(process.env.WEBSITE_AUDIT_REQUESTS_PER_MINUTE || 3)
const WEBSITE_AUDIT_REQUESTS_PER_DAY = Number(process.env.WEBSITE_AUDIT_REQUESTS_PER_DAY || 20)
const SECURITY_ARTIFACT_REQUESTS_PER_MINUTE = Number(process.env.SECURITY_ARTIFACT_REQUESTS_PER_MINUTE || 5)
const SECURITY_ARTIFACT_REQUESTS_PER_DAY = Number(process.env.SECURITY_ARTIFACT_REQUESTS_PER_DAY || 30)
const NOMINATIM_USER_AGENT = process.env.NOMINATIM_USER_AGENT || 'MULTIA/4.0 robust-location-context'
const downloadTickets = new Map()
const reverseLocationCache = new Map()
let lastNominatimRequestAt = 0

initializeDatabase()
ensureBootstrapState()

if (process.env.CORS_ORIGIN) {
  const allowedOrigins = process.env.CORS_ORIGIN
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }
      callback(new Error('Origen no autorizado'))
    },
  }))
}

app.disable('x-powered-by')
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}))
app.use(express.json({ limit: '8mb' }))

function getClientId(req) {
  return req.ip || req.socket.remoteAddress || 'unknown'
}

function createRateLimit(maxPerMinute, message) {
  const usage = new Map()
  const windowMs = 60_000
  setInterval(() => {
    const now = Date.now()
    for (const [clientId, record] of usage.entries()) {
      if (now - record.startedAt >= windowMs) usage.delete(clientId)
    }
  }, windowMs).unref()
  return (req, res, next) => {
    const now = Date.now()
    const clientId = getClientId(req)
    const current = usage.get(clientId)

    if (!current || now - current.startedAt >= windowMs) {
      usage.set(clientId, { startedAt: now, count: 1 })
      next()
      return
    }

    if (current.count >= maxPerMinute) {
      res.status(429).json({ error: { message } })
      return
    }

    current.count += 1
    next()
  }
}

function createWindowRateLimit(maxRequests, windowMs, message) {
  const usage = new Map()
  setInterval(() => {
    const now = Date.now()
    for (const [clientId, record] of usage.entries()) {
      if (now - record.startedAt >= windowMs) usage.delete(clientId)
    }
  }, Math.min(windowMs, 60 * 60_000)).unref()
  return (req, res, next) => {
    const now = Date.now()
    const clientId = getClientId(req)
    const current = usage.get(clientId)
    if (!current || now - current.startedAt >= windowMs) {
      usage.set(clientId, { startedAt: now, count: 1 })
      next()
      return
    }
    if (current.count >= maxRequests) {
      res.status(429).json({ error: { message } })
      return
    }
    current.count += 1
    next()
  }
}


const authRateLimit = createRateLimit(10, 'Demasiados intentos de autenticación. Espere un minuto.')

app.get('/api/auth/status', (req, res) => {
  const session = resolveSession(req)
  res.json({
    ...authStatus(),
    authenticated: Boolean(session),
    user: session ? sanitizeUser(session) : null,
    csrfToken: session?.csrfToken || null,
  })
})

app.post('/api/auth/bootstrap', authRateLimit, (req, res, next) => {
  try {
    const user = bootstrapAdmin(req.body || {})
    res.status(201).json(startSession(req, res, user))
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/login', authRateLimit, (req, res, next) => {
  try {
    const user = authenticateCredentials(req.body?.username, req.body?.password)
    res.json(startSession(req, res, user))
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/logout', (req, res) => {
  const session = resolveSession(req)
  if (session) recordAuditEvent({ userId: session.userId, eventType: 'auth.logout' })
  endSession(req, res)
  res.status(204).end()
})

function requireServerKey(environmentVariable, providerName) {
  return (req, res, next) => {
    if (!process.env[environmentVariable]) {
      res.status(503).json({
        error: {
          message: `${providerName} no está configurado en el servidor. Use “IA Web sin clave” o agregue ${environmentVariable} al Secret multia-api-keys.`,
        },
      })
      return
    }
    next()
  }
}

function workspaceToken(req) {
  return req.get('x-workspace-token') || req.query.token || req.body?.token || ''
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

function issueDownloadTicket(workspaceId, token) {
  const ticket = crypto.randomBytes(32).toString('base64url')
  downloadTickets.set(ticket, { workspaceId, token, expiresAt: Date.now() + DOWNLOAD_TICKET_TTL_MS })
  return { ticket, expiresAt: new Date(Date.now() + DOWNLOAD_TICKET_TTL_MS).toISOString() }
}

function consumeDownloadTicket(workspaceId, ticket) {
  const record = downloadTickets.get(String(ticket || ''))
  downloadTickets.delete(String(ticket || ''))
  if (!record || record.workspaceId !== workspaceId || record.expiresAt < Date.now()) {
    throw Object.assign(new Error('El enlace de descarga es inválido, ya fue utilizado o expiró.'), { status: 403 })
  }
  return record.token
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '4.0.0',
    mode: 'webllm-default',
    multiagent: true,
    connectedAgents: 185,
    connectedTeams: 10,
    operationalBuilder: true,
    securityReviewCouncil: true,
    safeImageLocationAnalysis: true,
    authorizedWebsiteAudit: true,
    authorizedArtifactReview: true,
    selfDeviceLocation: true,
    ownRouteLocalAnalysis: true,
    remotePersonTracking: false,
    faceRecognition: false,
    websiteAuditGuardrails: 'authorization-required-fixed-ports-no-exploitation',
    securityOperationsGuardrails: 'uploaded-artifacts-only-no-command-execution-no-person-tracking',
    safeSecurityScope: 'workspace-only',
    workspacePersistence: 'persistent-pvc',
    conversationPersistence: 'sqlite-pvc',
    authentication: authStatus(),
    database: databaseStatus(),
    humanFeedback: true,
    modelRunAudit: true,
    providers: {
      webllm: true,
      openai: Boolean(process.env.OPENAI_API_KEY),
      groq: Boolean(process.env.GROQ_API_KEY),
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
      gemini: Boolean(process.env.GEMINI_API_KEY),
      ollama: Boolean(process.env.OLLAMA_BASE_URL),
    },
  })
})

app.use('/api', requireAuth)
app.use('/api', requireCsrf)

function normalizeConversationPayload(input) {
  if (!Array.isArray(input)) throw Object.assign(new Error('La lista de conversaciones no es válida.'), { status: 400 })
  if (input.length > 250) throw Object.assign(new Error('No se pueden sincronizar más de 250 conversaciones a la vez.'), { status: 413 })
  return input.map((conversation) => {
    const id = String(conversation?.id || '').trim().slice(0, 100)
    if (!id) throw Object.assign(new Error('Cada conversación debe tener identificador.'), { status: 400 })
    const messages = Array.isArray(conversation.messages) ? conversation.messages.slice(0, 500) : []
    return {
      id,
      title: String(conversation.title || 'Nueva conversación').trim().slice(0, 160),
      createdAt: String(conversation.createdAt || new Date().toISOString()),
      updatedAt: String(conversation.updatedAt || new Date().toISOString()),
      messages: messages.map((message, index) => ({
        id: String(message?.id || `${id}-${index}`).slice(0, 140),
        role: ['user', 'assistant', 'system'].includes(message?.role) ? message.role : 'user',
        content: String(message?.content || '').slice(0, 250_000),
        timestamp: String(message?.timestamp || new Date().toISOString()),
        metadata: message?.metadata && typeof message.metadata === 'object' ? message.metadata : {},
      })),
    }
  })
}

app.get('/api/conversations', (req, res) => {
  res.json({ conversations: listConversations(req.user.id) })
})

app.put('/api/conversations/sync', (req, res, next) => {
  try {
    const conversations = normalizeConversationPayload(req.body?.conversations)
    syncConversations(req.user.id, conversations)
    res.json({ synchronized: conversations.length, at: new Date().toISOString() })
  } catch (error) {
    next(error)
  }
})

app.delete('/api/conversations/:id', (req, res) => {
  deleteStoredConversation(req.user.id, String(req.params.id || '').slice(0, 100))
  res.status(204).end()
})

app.post('/api/feedback', (req, res, next) => {
  try {
    const rating = Number(req.body?.rating)
    if (![1, -1].includes(rating)) throw Object.assign(new Error('La valoración debe ser positiva o negativa.'), { status: 400 })
    const result = createFeedback({
      userId: req.user.id,
      conversationId: String(req.body?.conversationId || '').slice(0, 100),
      messageId: String(req.body?.messageId || '').slice(0, 140),
      rating,
      comment: String(req.body?.comment || '').slice(0, 1000),
    })
    recordAuditEvent({ userId: req.user.id, eventType: 'feedback.created', details: { rating } })
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
})

app.post('/api/model-runs', (req, res, next) => {
  try {
    const result = createModelRun({
      userId: req.user.id,
      conversationId: String(req.body?.conversationId || '').slice(0, 100),
      provider: String(req.body?.provider || 'unknown').slice(0, 60),
      model: String(req.body?.model || 'unknown').slice(0, 120),
      mode: String(req.body?.mode || 'general').slice(0, 60),
      status: String(req.body?.status || 'completed').slice(0, 40),
      durationMs: req.body?.durationMs,
      inputChars: req.body?.inputChars,
      outputChars: req.body?.outputChars,
      teamCount: req.body?.teamCount,
      metadata: req.body?.metadata,
    })
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
})

app.get('/api/admin/metrics', requireRole('admin', 'analyst'), (req, res) => {
  res.json(getOperationalMetrics())
})

app.get('/api/admin/users', requireRole('admin'), (req, res) => {
  res.json({ users: listUsers() })
})


app.post('/api/admin/users', requireRole('admin'), (req, res, next) => {
  try {
    const user = createManagedUser({
      username: req.body?.username,
      displayName: req.body?.displayName,
      password: req.body?.password,
      role: req.body?.role,
    })
    recordAuditEvent({ userId: req.user.id, eventType: 'admin.user.created', details: { targetUserId: user.id, role: user.role } })
    res.status(201).json({ user: sanitizeUser(user) })
  } catch (error) {
    next(error)
  }
})

app.patch('/api/admin/users/:id', requireRole('admin'), (req, res, next) => {
  try {
    const target = getUserById(String(req.params.id || ''))
    if (!target) throw Object.assign(new Error('El usuario no existe.'), { status: 404 })
    const role = req.body?.role === undefined ? target.role : String(req.body.role)
    const active = req.body?.active === undefined ? target.active : Boolean(req.body.active)
    if (!['admin', 'analyst', 'user'].includes(role)) {
      throw Object.assign(new Error('El rol indicado no es válido.'), { status: 400 })
    }
    if (target.id === req.user.id && (!active || role !== 'admin')) {
      throw Object.assign(new Error('No puede retirar su propio acceso administrativo.'), { status: 400 })
    }
    if (target.role === 'admin' && target.active && (!active || role !== 'admin') && countActiveAdmins() <= 1) {
      throw Object.assign(new Error('MULTIA debe conservar al menos un administrador activo.'), { status: 409 })
    }
    const user = updateUserAdministration(target.id, {
      displayName: req.body?.displayName,
      role,
      active,
    })
    recordAuditEvent({ userId: req.user.id, eventType: 'admin.user.updated', details: { targetUserId: user.id, role: user.role, active: user.active } })
    res.json({ user: sanitizeUser(user), active: user.active })
  } catch (error) {
    next(error)
  }
})

const locationRateLimit = createRateLimit(
  LOCATION_REQUESTS_PER_MINUTE,
  'Se alcanzó el límite temporal del analizador de ubicación. Intente nuevamente en un minuto.',
)

app.get('/api/location/reverse', locationRateLimit, asyncRoute(async (req, res) => {
  const { latitude, longitude } = validateCoordinates(req.query.lat, req.query.lon)
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`
  const cached = reverseLocationCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    res.json(cached.value)
    return
  }

  const elapsed = Date.now() - lastNominatimRequestAt
  if (elapsed < 1_100) {
    await new Promise((resolve) => setTimeout(resolve, 1_100 - elapsed))
  }
  lastNominatimRequestAt = Date.now()

  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('lat', String(latitude))
  url.searchParams.set('lon', String(longitude))
  url.searchParams.set('zoom', '10')
  url.searchParams.set('addressdetails', '1')

  const response = await fetch(url, {
    headers: {
      'User-Agent': NOMINATIM_USER_AGENT,
      'Accept-Language': 'es,en;q=0.8',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) {
    throw Object.assign(new Error('El servicio cartográfico no respondió correctamente.'), { status: 502 })
  }

  const value = coarseLocationFromNominatim(await response.json())
  if (reverseLocationCache.size >= 1000) {
    reverseLocationCache.delete(reverseLocationCache.keys().next().value)
  }
  reverseLocationCache.set(cacheKey, { value, expiresAt: Date.now() + 24 * 60 * 60_000 })
  res.json(value)
}))


const websiteAuditRateLimit = createRateLimit(
  WEBSITE_AUDIT_REQUESTS_PER_MINUTE,
  'Se alcanzó el límite temporal de auditorías web. Espere un minuto antes de evaluar otro sitio.',
)

const websiteAuditDailyLimit = createWindowRateLimit(
  WEBSITE_AUDIT_REQUESTS_PER_DAY,
  24 * 60 * 60_000,
  'Se alcanzó el límite diario de auditorías web autorizadas para este cliente.',
)

app.post('/api/security/website-audit', websiteAuditRateLimit, websiteAuditDailyLimit, asyncRoute(async (req, res) => {
  const result = await auditAuthorizedWebsite(req.body || {})
  recordAuditEvent({ userId: req.user.id, eventType: 'security.website-audit', details: { host: result?.target?.hostname || null } })
  res.json(result)
}))

const securityArtifactRateLimit = createRateLimit(
  SECURITY_ARTIFACT_REQUESTS_PER_MINUTE,
  'Se alcanzó el límite temporal de análisis de evidencias. Espere un minuto antes de revisar otro archivo.',
)

const securityArtifactDailyLimit = createWindowRateLimit(
  SECURITY_ARTIFACT_REQUESTS_PER_DAY,
  24 * 60 * 60_000,
  'Se alcanzó el límite diario de análisis de evidencias autorizadas para este cliente.',
)

app.post('/api/security/artifact-review', securityArtifactRateLimit, securityArtifactDailyLimit, asyncRoute(async (req, res) => {
  const result = await analyzeAuthorizedArtifact(req.body || {})
  recordAuditEvent({ userId: req.user.id, eventType: 'security.artifact-review', details: { type: result?.artifact?.type || null } })
  res.json(result)
}))

const builderRateLimit = createRateLimit(
  BUILDER_REQUESTS_PER_MINUTE,
  'Se alcanzó el límite temporal del constructor. Espere un minuto antes de crear más proyectos.',
)

app.post('/api/builder/create', builderRateLimit, asyncRoute(async (req, res) => {
  const request = String(req.body?.request || '').trim()
  const decisions = String(req.body?.decisions || '').trim()
  const projectName = req.body?.projectName ? String(req.body.projectName) : ''
  if (!request) {
    res.status(400).json({ error: { message: 'La solicitud del proyecto es obligatoria.' } })
    return
  }

  const template = buildFullStackTemplate({ projectName, request, decisions })
  recordAuditEvent({ userId: req.user.id, eventType: 'builder.create', details: { projectName: template.projectName } })
  const workspace = await createWorkspace({
    projectName: template.projectName,
    request,
    decisions,
    files: template.files,
  })
  const validation = await validateWorkspace(workspace.id, workspace.token)
  const securityAudit = await auditWorkspace(workspace.id, workspace.token)
  res.status(201).json({
    ...workspace,
    stack: template.stack,
    fileCount: template.files.length,
    validation,
    securityAudit,
    buildSpec: template.spec,
  })
}))

app.get('/api/workspaces/:id', builderRateLimit, asyncRoute(async (req, res) => {
  res.json(await listWorkspaceFiles(req.params.id, workspaceToken(req)))
}))

app.get('/api/workspaces/:id/file', builderRateLimit, asyncRoute(async (req, res) => {
  res.json(await readWorkspaceFile(req.params.id, workspaceToken(req), req.query.path))
}))

app.put('/api/workspaces/:id/files', builderRateLimit, asyncRoute(async (req, res) => {
  const result = await writeWorkspaceFiles(
    req.params.id,
    workspaceToken(req),
    req.body?.files,
    { overwrite: req.body?.overwrite !== false },
  )
  const token = workspaceToken(req)
  const validation = await validateWorkspace(req.params.id, token)
  const securityAudit = await auditWorkspace(req.params.id, token)
  res.json({ written: result.written, validation, securityAudit })
}))

app.post('/api/workspaces/:id/validate', builderRateLimit, asyncRoute(async (req, res) => {
  const token = workspaceToken(req)
  const validation = await validateWorkspace(req.params.id, token)
  const securityAudit = await auditWorkspace(req.params.id, token)
  res.json({ validation, securityAudit })
}))

app.post('/api/workspaces/:id/security-audit', builderRateLimit, asyncRoute(async (req, res) => {
  res.json(await auditWorkspace(req.params.id, workspaceToken(req)))
}))

app.post('/api/workspaces/:id/archive-ticket', builderRateLimit, asyncRoute(async (req, res) => {
  const token = workspaceToken(req)
  await listWorkspaceFiles(req.params.id, token)
  res.status(201).json(issueDownloadTicket(req.params.id, token))
}))

app.get('/api/workspaces/:id/archive', builderRateLimit, asyncRoute(async (req, res) => {
  const token = consumeDownloadTicket(req.params.id, req.query.ticket)
  const securityAudit = await auditWorkspace(req.params.id, token)
  if (securityAudit.summary.blocked) {
    res.status(409).json({
      error: {
        message: 'La descarga fue bloqueada porque la revisión controlada de seguridad detectó hallazgos críticos o altos.',
      },
      securityAudit,
    })
    return
  }
  await streamWorkspaceArchive(req.params.id, token, res)
}))

app.delete('/api/workspaces/:id', builderRateLimit, asyncRoute(async (req, res) => {
  await deleteWorkspace(req.params.id, workspaceToken(req))
  res.status(204).end()
}))

app.use(
  '/api/proxy',
  createRateLimit(
    PROXY_REQUESTS_PER_MINUTE,
    'Se alcanzó el límite temporal de solicitudes. Intente nuevamente en un minuto.',
  ),
)

app.use(
  '/api/proxy/openai',
  requireServerKey('OPENAI_API_KEY', 'OpenAI'),
  createProxyMiddleware({
    target: 'https://api.openai.com',
    changeOrigin: true,
    pathRewrite: (requestPath) => `/v1${requestPath}`,
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY || ''}` },
  }),
)

app.use(
  '/api/proxy/groq',
  requireServerKey('GROQ_API_KEY', 'Groq'),
  createProxyMiddleware({
    target: 'https://api.groq.com',
    changeOrigin: true,
    pathRewrite: (requestPath) => `/openai/v1${requestPath}`,
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY || ''}` },
  }),
)

app.use(
  '/api/proxy/anthropic',
  requireServerKey('ANTHROPIC_API_KEY', 'Anthropic'),
  createProxyMiddleware({
    target: 'https://api.anthropic.com',
    changeOrigin: true,
    pathRewrite: (requestPath) => `/v1${requestPath}`,
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
  }),
)

app.use('/api/proxy/gemini', async (req, res, next) => {
  if (req.method !== 'POST') {
    next()
    return
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    res.status(503).json({
      error: {
        message: 'Gemini no está configurado en el servidor. Use “IA Web sin clave” o agregue GEMINI_API_KEY al Secret multia-api-keys.',
      },
    })
    return
  }

  const targetPath = req.path.replace(/^\/+/, '')
  const queryParams = new URLSearchParams(req.query).toString()
  const url = queryParams
    ? `https://generativelanguage.googleapis.com/v1beta/${targetPath}?${queryParams}&key=${apiKey}`
    : `https://generativelanguage.googleapis.com/v1beta/${targetPath}?key=${apiKey}`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(120_000),
    })

    res.status(response.status)
    response.headers.forEach((value, key) => {
      const normalizedKey = key.toLowerCase()
      if (!['content-encoding', 'transfer-encoding', 'content-length'].includes(normalizedKey)) {
        res.setHeader(key, value)
      }
    })

    if (!response.body) {
      res.end()
      return
    }

    const { Readable } = await import('stream')
    Readable.fromWeb(response.body).pipe(res)
  } catch (error) {
    res.status(502).json({
      error: { message: `No fue posible comunicarse con Gemini: ${error.message}` },
    })
  }
})

app.use(
  '/api/proxy/ollama',
  createProxyMiddleware({
    target: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    changeOrigin: true,
  }),
)

const publicDir = process.env.STATIC_DIR || path.join(__dirname, '..', 'public')
app.use(express.static(publicDir, { maxAge: '1h', etag: true }))

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'))
})

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error)
    return
  }
  const status = Number(error.status || 500)
  if (status >= 500) console.error(error)
  res.status(status).json({
    error: { message: error.message || 'Error interno del servidor' },
  })
})

cleanupExpiredWorkspaces().catch((error) => console.error('No se pudo limpiar workspaces:', error))
setInterval(() => {
  const now = Date.now()
  for (const [ticket, record] of downloadTickets.entries()) {
    if (record.expiresAt < now) downloadTickets.delete(ticket)
  }
  cleanupExpiredWorkspaces().catch((error) => console.error('No se pudo limpiar workspaces:', error))
}, 15 * 60_000).unref()

const server = app.listen(PORT, HOST, () => {
  console.log(`MULTIA 4.0 running on http://${HOST}:${PORT}`)
  console.log('Default AI provider: WebLLM (no API key required)')
  console.log('Operational multiagent builder: enabled')
  console.log('Controlled security review: enabled (workspace-only)')
  console.log('Authorized preventive website audit: enabled')
  console.log('Authorized security evidence center: enabled (no command execution)')
  console.log('Authentication, persistent conversations and human feedback: enabled')
})

function shutdown(signal) {
  console.log(`${signal} recibido. Cerrando MULTIA de forma ordenada...`)
  server.close(() => {
    console.log('Servidor cerrado correctamente.')
    process.exit(0)
  })
  setTimeout(() => {
    console.error('Cierre forzado tras 10 segundos de espera.')
    process.exit(1)
  }, 10_000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

export { app, server }
