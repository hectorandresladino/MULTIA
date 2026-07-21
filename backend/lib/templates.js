import { sanitizeProjectName } from './workspaces.js'

const ALLOWED_TYPES = new Set(['string', 'email', 'text', 'number', 'integer', 'boolean', 'date'])

const DOMAIN_PRESETS = [
  {
    pattern: /\b(clientes?|customers?)\b/i,
    singular: 'cliente',
    plural: 'clientes',
    fields: [
      { name: 'name', label: 'Nombre', type: 'string', required: true },
      { name: 'email', label: 'Correo electrónico', type: 'email', required: true },
      { name: 'phone', label: 'Teléfono', type: 'string', required: false },
      { name: 'status', label: 'Estado', type: 'string', required: true },
    ],
  },
  {
    pattern: /\b(productos?|inventario|inventory|products?)\b/i,
    singular: 'producto',
    plural: 'productos',
    fields: [
      { name: 'name', label: 'Nombre', type: 'string', required: true },
      { name: 'description', label: 'Descripción', type: 'text', required: false },
      { name: 'price', label: 'Precio', type: 'number', required: true },
      { name: 'stock', label: 'Existencias', type: 'integer', required: true },
      { name: 'active', label: 'Activo', type: 'boolean', required: false },
    ],
  },
  {
    pattern: /\b(pedidos?|orders?|ventas?)\b/i,
    singular: 'pedido',
    plural: 'pedidos',
    fields: [
      { name: 'customer_name', label: 'Cliente', type: 'string', required: true },
      { name: 'total', label: 'Total', type: 'number', required: true },
      { name: 'status', label: 'Estado', type: 'string', required: true },
      { name: 'notes', label: 'Observaciones', type: 'text', required: false },
    ],
  },
  {
    pattern: /\b(propietarios?|copropietarios?|residentes?|property owners?)\b/i,
    singular: 'propietario',
    plural: 'propietarios',
    fields: [
      { name: 'name', label: 'Nombre completo', type: 'string', required: true },
      { name: 'document_number', label: 'Documento', type: 'string', required: true },
      { name: 'unit', label: 'Unidad privada', type: 'string', required: true },
      { name: 'email', label: 'Correo electrónico', type: 'email', required: false },
      { name: 'phone', label: 'Teléfono', type: 'string', required: false },
    ],
  },
  {
    pattern: /\b(reservas?|bookings?)\b/i,
    singular: 'reserva',
    plural: 'reservas',
    fields: [
      { name: 'person_name', label: 'Solicitante', type: 'string', required: true },
      { name: 'resource_name', label: 'Recurso o zona', type: 'string', required: true },
      { name: 'reservation_date', label: 'Fecha', type: 'date', required: true },
      { name: 'status', label: 'Estado', type: 'string', required: true },
    ],
  },
  {
    pattern: /\b(usuarios?|users?)\b/i,
    singular: 'usuario',
    plural: 'usuarios',
    fields: [
      { name: 'name', label: 'Nombre', type: 'string', required: true },
      { name: 'email', label: 'Correo electrónico', type: 'email', required: true },
      { name: 'role', label: 'Rol', type: 'string', required: true },
      { name: 'active', label: 'Activo', type: 'boolean', required: false },
    ],
  },
]

function titleFromSlug(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function removeDiacritics(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function sanitizeIdentifier(value, fallback = 'field') {
  const cleaned = removeDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^[0-9]+/, '')
    .slice(0, 42)
  return cleaned || fallback
}

function humanize(value) {
  const text = String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Campo'
}

function escapeHtmlText(value) {
  return String(value || '').replace(/[<>]/g, '').trim()
}

function json(value) {
  return JSON.stringify(value)
}

function extractCouncilSpec(decisions = '') {
  const text = String(decisions || '')
  const tagged = text.match(/<MULTIA_BUILD_SPEC>\s*([\s\S]*?)\s*<\/MULTIA_BUILD_SPEC>/i)?.[1]
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i)?.[1]
  const candidate = tagged || fenced
  if (!candidate) return null
  try {
    const parsed = JSON.parse(candidate)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function inferPreset(text) {
  return DOMAIN_PRESETS.find((preset) => preset.pattern.test(text)) || {
    singular: 'registro',
    plural: 'registros',
    fields: [
      { name: 'name', label: 'Nombre', type: 'string', required: true },
      { name: 'description', label: 'Descripción', type: 'text', required: false },
      { name: 'status', label: 'Estado', type: 'string', required: true },
    ],
  }
}

function normalizeFields(rawFields, fallbackFields) {
  const source = Array.isArray(rawFields) && rawFields.length >= 2 ? rawFields : fallbackFields
  const fields = []
  const used = new Set(['id', 'created_at', 'updated_at'])

  for (const [index, raw] of source.slice(0, 8).entries()) {
    const item = raw && typeof raw === 'object' ? raw : { name: raw }
    let name = sanitizeIdentifier(item.name || item.label, `field_${index + 1}`)
    if (used.has(name)) name = `${name}_${index + 1}`
    used.add(name)
    const type = ALLOWED_TYPES.has(String(item.type || '').toLowerCase())
      ? String(item.type).toLowerCase()
      : 'string'
    fields.push({
      name,
      label: escapeHtmlText(item.label || humanize(name)).slice(0, 80),
      type,
      required: Boolean(item.required),
    })
  }

  if (fields.length < 2) return normalizeFields(fallbackFields, fallbackFields)
  return fields
}

function buildSpec({ projectName, request, decisions }) {
  const council = extractCouncilSpec(decisions)
  const combinedText = `${request || ''}\n${decisions || ''}`
  const preset = inferPreset(combinedText)
  const entityRaw = council?.entity && typeof council.entity === 'object' ? council.entity : {}
  const singular = sanitizeIdentifier(entityRaw.singular || preset.singular, 'registro')
  const plural = sanitizeIdentifier(entityRaw.plural || preset.plural || `${singular}s`, `${singular}s`)
  const inferredName = projectName || council?.projectName || inferProjectName(request)
  const slug = sanitizeProjectName(inferredName)
  const title = escapeHtmlText(council?.title || titleFromSlug(slug)).slice(0, 100) || titleFromSlug(slug)
  const fields = normalizeFields(entityRaw.fields, preset.fields)

  return {
    projectName: slug,
    title,
    entity: { singular, plural, fields },
    features: Array.isArray(council?.features)
      ? council.features.map((item) => String(item).slice(0, 40)).slice(0, 12)
      : ['crud', 'authentication', 'csrf', 'rate-limit', 'security-audit', 'healthcheck', 'validation', 'openshift'],
    source: council ? 'council' : 'inferred',
  }
}

function sqlType(field) {
  switch (field.type) {
    case 'text': return 'TEXT'
    case 'number': return 'NUMERIC(14,2)'
    case 'integer': return 'INTEGER'
    case 'boolean': return 'BOOLEAN'
    case 'date': return 'DATE'
    case 'email':
    case 'string':
    default: return 'VARCHAR(200)'
  }
}

function sqlDefault(field) {
  if (field.required) return ' NOT NULL'
  if (field.type === 'boolean') return ' NOT NULL DEFAULT FALSE'
  return ''
}

function buildDatabaseSource(tableName, fields, databaseName, databaseUser) {
  const columns = fields.map((field) => `      ${field.name} ${sqlType(field)}${sqlDefault(field)}`).join(',\n')
  return `import pg from 'pg'\n\nconst { Pool } = pg\n\nexport const pool = new Pool({\n  host: process.env.PGHOST || 'localhost',\n  port: Number(process.env.PGPORT || 5432),\n  database: process.env.PGDATABASE || ${json(databaseName)},\n  user: process.env.PGUSER || ${json(databaseUser)},\n  password: process.env.PGPASSWORD || '',\n  max: Number(process.env.PGPOOL_MAX || 5),\n  idleTimeoutMillis: 30_000,\n  connectionTimeoutMillis: 5_000,\n})\n\nexport async function initializeDatabase() {\n  await pool.query(\`\n    CREATE TABLE IF NOT EXISTS ${tableName} (\n      id BIGSERIAL PRIMARY KEY,\n${columns},\n      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\n    )\n  \`)\n}\n`
}

function buildValidationSource(fields) {
  return `export const FIELD_RULES = ${JSON.stringify(fields, null, 2)}\n\nfunction isEmpty(value) {\n  return value === undefined || value === null || value === ''\n}\n\nexport function normalizeInputData(input = {}, { partial = false } = {}) {\n  const data = {}\n  const errors = []\n\n  for (const rule of FIELD_RULES) {\n    const supplied = Object.prototype.hasOwnProperty.call(input, rule.name)\n    if (partial && !supplied) continue\n    const value = input[rule.name]\n\n    if (isEmpty(value)) {\n      if (rule.required && (!partial || supplied)) errors.push(rule.label + ' es obligatorio.')\n      else if (supplied && rule.type !== 'boolean') data[rule.name] = null\n      continue\n    }\n\n    if (rule.type === 'boolean') {\n      data[rule.name] = value === true || value === 'true' || value === 1 || value === '1'\n      continue\n    }\n\n    if (rule.type === 'number' || rule.type === 'integer') {\n      const numeric = Number(value)\n      if (!Number.isFinite(numeric)) {\n        errors.push(rule.label + ' debe ser numérico.')\n        continue\n      }\n      data[rule.name] = rule.type === 'integer' ? Math.trunc(numeric) : numeric\n      continue\n    }\n\n    const text = String(value).trim()\n    if (rule.type === 'email' && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(text)) {\n      errors.push(rule.label + ' no tiene un formato válido.')\n      continue\n    }\n    if (rule.type === 'date' && !/^\\d{4}-\\d{2}-\\d{2}$/.test(text)) {\n      errors.push(rule.label + ' debe usar el formato AAAA-MM-DD.')\n      continue\n    }\n    data[rule.name] = text.slice(0, rule.type === 'text' ? 4000 : 200)\n  }\n\n  return { data, errors }\n}\n`
}

function buildAppSource(tableName, routeName, singular) {
  return `import crypto from 'crypto'\nimport cors from 'cors'\nimport express from 'express'\nimport helmet from 'helmet'\nimport path from 'path'\nimport { fileURLToPath } from 'url'\nimport { pool } from './db.js'\nimport { normalizeInputData } from './validation.js'\n\nconst __dirname = path.dirname(fileURLToPath(import.meta.url))\nexport const app = express()\nconst TABLE = ${json(tableName)}\nconst ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'\nconst ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ''\nconst SESSION_SECRET = process.env.SESSION_SECRET || ''\nconst SESSION_TTL_MS = 60 * 60 * 1000\n\nif (process.env.NODE_ENV === 'production' && (!ADMIN_PASSWORD || SESSION_SECRET.length < 32)) {\n  throw new Error('ADMIN_PASSWORD y SESSION_SECRET deben configurarse mediante Secrets de OpenShift.')\n}\n\napp.disable('x-powered-by')\napp.use(helmet())\nif (process.env.CORS_ORIGIN) {\n  const allowed = process.env.CORS_ORIGIN.split(',').map((item) => item.trim()).filter(Boolean)\n  app.use(cors({ origin: allowed, credentials: true }))\n}\napp.use(express.json({ limit: '256kb' }))\n\nfunction rateLimit(max, windowMs) {\n  const clients = new Map()\n  return (req, res, next) => {\n    const key = String(req.headers['x-forwarded-for'] || req.ip || 'unknown').split(',')[0].trim()\n    const now = Date.now()\n    const current = clients.get(key)\n    if (!current || now - current.startedAt > windowMs) {\n      clients.set(key, { startedAt: now, count: 1 })\n      next()\n      return\n    }\n    if (current.count >= max) {\n      res.status(429).json({ message: 'Demasiadas solicitudes. Intente nuevamente más tarde.' })\n      return\n    }\n    current.count += 1\n    next()\n  }\n}\n\nfunction parseCookies(header = '') {\n  return Object.fromEntries(String(header).split(';').map((item) => item.trim()).filter(Boolean).map((item) => {\n    const index = item.indexOf('=')\n    return index < 0 ? [item, ''] : [item.slice(0, index), decodeURIComponent(item.slice(index + 1))]\n  }))\n}\n\nfunction encode(value) {\n  return Buffer.from(JSON.stringify(value)).toString('base64url')\n}\n\nfunction signature(encodedSession) {\n  return crypto.createHmac('sha256', SESSION_SECRET || 'development-only-secret').update(encodedSession).digest('base64url')\n}\n\nfunction issueSession() {\n  const session = { sub: ADMIN_USERNAME, exp: Date.now() + SESSION_TTL_MS, csrf: crypto.randomBytes(24).toString('base64url') }\n  const encodedSession = encode(session)\n  return { token: encodedSession + '.' + signature(encodedSession), session }\n}\n\nfunction readSession(req) {\n  const token = parseCookies(req.headers.cookie).multia_session\n  if (!token) return null\n  const [encodedSession, suppliedSignature] = token.split('.')\n  if (!encodedSession || !suppliedSignature) return null\n  const expected = signature(encodedSession)\n  const left = Buffer.from(suppliedSignature)\n  const right = Buffer.from(expected)\n  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null\n  try {\n    const session = JSON.parse(Buffer.from(encodedSession, 'base64url').toString('utf8'))\n    if (session.sub !== ADMIN_USERNAME || Number(session.exp) < Date.now()) return null\n    return session\n  } catch {\n    return null\n  }\n}\n\nfunction requireAuth(req, res, next) {\n  const session = readSession(req)\n  if (!session) return res.status(401).json({ message: 'Autenticación requerida.' })\n  if (req.get('x-csrf-token') !== session.csrf) return res.status(403).json({ message: 'Token CSRF inválido.' })\n  req.session = session\n  next()\n}\n\nfunction safeEqualText(left, right) {\n  const a = crypto.createHash('sha256').update(String(left)).digest()\n  const b = crypto.createHash('sha256').update(String(right)).digest()\n  return crypto.timingSafeEqual(a, b)\n}\n\nconst loginLimit = rateLimit(8, 15 * 60 * 1000)\nconst writeLimit = rateLimit(60, 60 * 1000)\n\napp.get('/api/health', async (req, res) => {\n  try {\n    await pool.query('SELECT 1')\n    res.json({ status: 'ok', database: 'connected' })\n  } catch {\n    res.status(503).json({ status: 'degraded', database: 'unavailable' })\n  }\n})\n\napp.post('/api/auth/login', loginLimit, (req, res) => {\n  const usernameOk = safeEqualText(req.body?.username, ADMIN_USERNAME)\n  const passwordOk = ADMIN_PASSWORD && safeEqualText(req.body?.password, ADMIN_PASSWORD)\n  if (!usernameOk || !passwordOk) return res.status(401).json({ message: 'Credenciales inválidas.' })\n  const { token, session } = issueSession()\n  res.cookie('multia_session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: SESSION_TTL_MS, path: '/' })\n  res.json({ authenticated: true, csrfToken: session.csrf, username: ADMIN_USERNAME })\n})\n\napp.get('/api/auth/session', (req, res) => {\n  const session = readSession(req)\n  res.json(session ? { authenticated: true, csrfToken: session.csrf, username: session.sub } : { authenticated: false })\n})\n\napp.post('/api/auth/logout', (req, res) => {\n  res.clearCookie('multia_session', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' })\n  res.status(204).end()\n})\n\napp.get('/api/${routeName}', async (req, res, next) => {\n  try {\n    const result = await pool.query('SELECT * FROM ' + TABLE + ' ORDER BY id DESC LIMIT 500')\n    res.json(result.rows)\n  } catch (error) { next(error) }\n})\n\napp.post('/api/${routeName}', writeLimit, requireAuth, async (req, res, next) => {\n  try {\n    const { data, errors } = normalizeInputData(req.body)\n    if (errors.length) return res.status(400).json({ message: errors.join(' '), errors })\n    const columns = Object.keys(data)\n    if (!columns.length) return res.status(400).json({ message: 'No se recibieron datos válidos.' })\n    const placeholders = columns.map((_, index) => '$' + (index + 1))\n    const values = columns.map((column) => data[column])\n    const query = 'INSERT INTO ' + TABLE + ' (' + columns.join(', ') + ') VALUES (' + placeholders.join(', ') + ') RETURNING *'\n    const result = await pool.query(query, values)\n    res.status(201).json(result.rows[0])\n  } catch (error) { next(error) }\n})\n\napp.put('/api/${routeName}/:id', writeLimit, requireAuth, async (req, res, next) => {\n  try {\n    if (!/^\\d+$/.test(req.params.id)) return res.status(400).json({ message: 'Identificador inválido.' })\n    const { data, errors } = normalizeInputData(req.body, { partial: true })\n    if (errors.length) return res.status(400).json({ message: errors.join(' '), errors })\n    const columns = Object.keys(data)\n    if (!columns.length) return res.status(400).json({ message: 'No se recibieron cambios válidos.' })\n    const assignments = columns.map((column, index) => column + '=$' + (index + 1))\n    const values = columns.map((column) => data[column])\n    values.push(req.params.id)\n    const query = 'UPDATE ' + TABLE + ' SET ' + assignments.join(', ') + ', updated_at=NOW() WHERE id=$' + values.length + ' RETURNING *'\n    const result = await pool.query(query, values)\n    if (!result.rows[0]) return res.status(404).json({ message: ${json(humanize(singular))} + ' no encontrado.' })\n    res.json(result.rows[0])\n  } catch (error) { next(error) }\n})\n\napp.delete('/api/${routeName}/:id', writeLimit, requireAuth, async (req, res, next) => {\n  try {\n    if (!/^\\d+$/.test(req.params.id)) return res.status(400).json({ message: 'Identificador inválido.' })\n    const result = await pool.query('DELETE FROM ' + TABLE + ' WHERE id=$1 RETURNING id', [req.params.id])\n    if (!result.rows[0]) return res.status(404).json({ message: ${json(humanize(singular))} + ' no encontrado.' })\n    res.status(204).end()\n  } catch (error) { next(error) }\n})\n\nconst publicDir = process.env.STATIC_DIR || path.join(__dirname, '../../public')\napp.use(express.static(publicDir, { dotfiles: 'deny', etag: true, maxAge: '1h' }))\napp.get('/{*path}', (req, res, next) => {\n  if (req.path.startsWith('/api/')) return next()\n  res.sendFile(path.join(publicDir, 'index.html'))\n})\n\napp.use((error, req, res, next) => {\n  console.error(error)\n  res.status(500).json({ message: 'Error interno del servidor.' })\n})\n`
}

function formInitialValue(field) {
  if (field.type === 'boolean') return false
  return ''
}

function buildFrontendSource({ title, requestText, entity }) {
  const fieldDefinitions = entity.fields.map((field) => ({ ...field }))
  const emptyForm = Object.fromEntries(entity.fields.map((field) => [field.name, formInitialValue(field)]))
  const route = entity.plural
  const intro = escapeHtmlText(requestText).slice(0, 300) || `Administración de ${humanize(entity.plural).toLowerCase()}.`

  return `import { useEffect, useState } from 'react'\n\nconst fields = ${JSON.stringify(fieldDefinitions, null, 2)}\nconst emptyForm = ${JSON.stringify(emptyForm, null, 2)}\nconst endpoint = '/api/${route}'\n\nfunction inputFor(field, form, setForm) {\n  const value = form[field.name]\n  const common = { id: field.name, name: field.name, required: field.required, 'aria-label': field.label, maxLength: field.type === 'text' ? 4000 : 200 }\n  if (field.type === 'text') return <textarea {...common} placeholder={field.label} value={value ?? ''} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })} />\n  if (field.type === 'boolean') return <label className="checkbox"><input {...common} type="checkbox" checked={Boolean(value)} onChange={(event) => setForm({ ...form, [field.name]: event.target.checked })} /><span>{field.label}</span></label>\n  const inputType = field.type === 'email' ? 'email' : field.type === 'date' ? 'date' : ['number', 'integer'].includes(field.type) ? 'number' : 'text'\n  return <input {...common} type={inputType} step={field.type === 'number' ? '0.01' : undefined} placeholder={field.label} value={value ?? ''} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })} />\n}\n\nexport default function App() {\n  const [records, setRecords] = useState([])\n  const [form, setForm] = useState(emptyForm)\n  const [login, setLogin] = useState({ username: 'admin', password: '' })\n  const [session, setSession] = useState({ authenticated: false, csrfToken: '' })\n  const [loading, setLoading] = useState(true)\n  const [error, setError] = useState('')\n\n  async function loadRecords() {\n    setLoading(true)\n    setError('')\n    try {\n      const response = await fetch(endpoint, { credentials: 'same-origin' })\n      if (!response.ok) throw new Error('No fue posible consultar la información.')\n      setRecords(await response.json())\n    } catch (err) { setError(err.message) } finally { setLoading(false) }\n  }\n\n  async function loadSession() {\n    const response = await fetch('/api/auth/session', { credentials: 'same-origin' })\n    if (response.ok) setSession(await response.json())\n  }\n\n  useEffect(() => { loadRecords(); loadSession() }, [])\n\n  async function authenticate(event) {\n    event.preventDefault()\n    setError('')\n    const response = await fetch('/api/auth/login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(login) })\n    const body = await response.json().catch(() => ({}))\n    if (!response.ok) { setError(body.message || 'No fue posible iniciar sesión.'); return }\n    setSession(body)\n    setLogin((current) => ({ ...current, password: '' }))\n  }\n\n  async function logout() {\n    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })\n    setSession({ authenticated: false, csrfToken: '' })\n  }\n\n  async function submit(event) {\n    event.preventDefault()\n    setError('')\n    try {\n      const response = await fetch(endpoint, {\n        method: 'POST', credentials: 'same-origin',\n        headers: { 'Content-Type': 'application/json', 'x-csrf-token': session.csrfToken },\n        body: JSON.stringify(form),\n      })\n      const body = await response.json().catch(() => ({}))\n      if (!response.ok) throw new Error(body.message || 'No fue posible guardar.')\n      setForm(emptyForm)\n      await loadRecords()\n    } catch (err) { setError(err.message) }\n  }\n\n  async function remove(id) {\n    try {\n      const response = await fetch(endpoint + '/' + id, { method: 'DELETE', credentials: 'same-origin', headers: { 'x-csrf-token': session.csrfToken } })\n      if (!response.ok && response.status !== 204) {\n        const body = await response.json().catch(() => ({}))\n        throw new Error(body.message || 'No fue posible eliminar.')\n      }\n      await loadRecords()\n    } catch (err) { setError(err.message) }\n  }\n\n  return (\n    <main className="page">\n      <section className="hero"><span className="eyebrow">Proyecto seguro creado por el consejo MULTIA</span><h1>${escapeHtmlText(title)}</h1><p>${intro}</p></section>\n      <section className="panel auth">\n        {session.authenticated ? <div className="sectionTitle"><p>Sesión administrativa activa.</p><button className="secondary" onClick={logout}>Cerrar sesión</button></div> : (\n          <form onSubmit={authenticate} className="form"><h2>Acceso administrativo</h2><input aria-label="Usuario" value={login.username} onChange={(event) => setLogin({ ...login, username: event.target.value })} autoComplete="username" /><input aria-label="Contraseña" type="password" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} autoComplete="current-password" /><button type="submit">Ingresar</button></form>\n        )}\n      </section>\n      {session.authenticated && <section className="panel"><h2>Crear ${humanize(entity.singular).toLowerCase()}</h2><form onSubmit={submit} className="form">{fields.map((field) => <div key={field.name} className="field"><label htmlFor={field.name}>{field.label}{field.required ? ' *' : ''}</label>{inputFor(field, form, setForm)}</div>)}<button type="submit">Guardar</button></form></section>}\n      <section className="panel"><div className="sectionTitle"><h2>${humanize(entity.plural)}</h2><button className="secondary" onClick={loadRecords}>Actualizar</button></div>{error && <p className="error">{error}</p>}{loading ? <p>Cargando…</p> : records.length === 0 ? <p>No hay registros todavía.</p> : <div className="grid">{records.map((record) => <article key={record.id} className="card"><dl>{fields.map((field) => <div key={field.name}><dt>{field.label}</dt><dd>{field.type === 'boolean' ? (record[field.name] ? 'Sí' : 'No') : String(record[field.name] ?? '—')}</dd></div>)}</dl>{session.authenticated && <button className="danger" onClick={() => remove(record.id)}>Eliminar</button>}</article>)}</div>}</section>\n    </main>\n  )\n}\n`
}

function buildCssSource() {
  return `:root { font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #162033; background: #f3f6fb; }\n* { box-sizing: border-box; }\nbody { margin: 0; min-width: 320px; min-height: 100vh; }\nbutton, input, textarea { font: inherit; }\n.page { width: min(1040px, calc(100% - 32px)); margin: 0 auto; padding: 56px 0 80px; }\n.hero { padding: 36px; border-radius: 24px; background: linear-gradient(135deg, #162033, #304a75); color: white; box-shadow: 0 18px 55px rgba(22,32,51,.18); }\n.hero h1 { margin: 8px 0 12px; font-size: clamp(2rem, 6vw, 4rem); }\n.hero p { max-width: 740px; line-height: 1.7; opacity: .9; }\n.eyebrow { text-transform: uppercase; letter-spacing: .12em; font-size: .75rem; opacity: .75; }\n.panel { margin-top: 24px; padding: 28px; border-radius: 20px; background: white; box-shadow: 0 10px 35px rgba(22,32,51,.08); }\n.form { display: grid; gap: 14px; }\n.field { display: grid; gap: 6px; }\n.field label { font-weight: 650; font-size: .88rem; }\ninput, textarea { width: 100%; border: 1px solid #d6deea; border-radius: 12px; padding: 13px 14px; background: #fbfcff; }\ntextarea { min-height: 100px; resize: vertical; }\n.checkbox { display: flex !important; align-items: center; gap: 10px; }\n.checkbox input { width: 18px; height: 18px; }\nbutton { border: 0; border-radius: 12px; padding: 12px 18px; background: #305bd6; color: white; cursor: pointer; }\nbutton:hover { filter: brightness(.95); }\n.secondary { background: #e7ecf7; color: #25334f; }\n.danger { background: #fce7e7; color: #a22626; }\n.sectionTitle, .card { display: flex; align-items: center; justify-content: space-between; gap: 18px; }\n.grid { display: grid; gap: 12px; }\n.card { border: 1px solid #e4e9f2; border-radius: 14px; padding: 18px; align-items: flex-end; }\ndl { margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); gap: 14px 24px; flex: 1; width: 100%; }\ndt { color: #65728a; font-size: .75rem; text-transform: uppercase; letter-spacing: .06em; }\ndd { margin: 4px 0 0; font-weight: 650; word-break: break-word; }\n.error { padding: 12px; border-radius: 10px; background: #fff0f0; color: #a22626; }\n@media (max-width: 640px) { .page { padding-top: 20px; } .hero, .panel { padding: 22px; } .card { align-items: stretch; flex-direction: column; } }\n`
}

function buildOpenShiftYaml({ slug }) {
  return `apiVersion: v1\nkind: PersistentVolumeClaim\nmetadata:\n  name: ${slug}-postgresql-pvc\nspec:\n  accessModes: [ReadWriteOnce]\n  resources:\n    requests:\n      storage: 1Gi\n---\napiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: ${slug}-postgresql\nspec:\n  replicas: 1\n  selector:\n    matchLabels:\n      app: ${slug}-postgresql\n  template:\n    metadata:\n      labels:\n        app: ${slug}-postgresql\n    spec:\n      automountServiceAccountToken: false\n      containers:\n        - name: postgresql\n          image: quay.io/sclorg/postgresql-15-c9s:latest\n          ports:\n            - name: postgresql\n              containerPort: 5432\n          env:\n            - name: POSTGRESQL_DATABASE\n              valueFrom: { secretKeyRef: { name: ${slug}-db-secret, key: database-name } }\n            - name: POSTGRESQL_USER\n              valueFrom: { secretKeyRef: { name: ${slug}-db-secret, key: database-user } }\n            - name: POSTGRESQL_PASSWORD\n              valueFrom: { secretKeyRef: { name: ${slug}-db-secret, key: database-password } }\n          volumeMounts:\n            - name: data\n              mountPath: /var/lib/pgsql/data\n          readinessProbe:\n            tcpSocket: { port: postgresql }\n            initialDelaySeconds: 10\n            periodSeconds: 10\n          resources:\n            requests: { cpu: 100m, memory: 256Mi }\n            limits: { cpu: 500m, memory: 768Mi }\n          securityContext:\n            allowPrivilegeEscalation: false\n            capabilities: { drop: [ALL] }\n            seccompProfile: { type: RuntimeDefault }\n      volumes:\n        - name: data\n          persistentVolumeClaim:\n            claimName: ${slug}-postgresql-pvc\n---\napiVersion: v1\nkind: Service\nmetadata:\n  name: ${slug}-postgresql\nspec:\n  selector: { app: ${slug}-postgresql }\n  ports:\n    - name: postgresql\n      port: 5432\n      targetPort: postgresql\n---\napiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: ${slug}-postgresql-ingress\nspec:\n  podSelector:\n    matchLabels: { app: ${slug}-postgresql }\n  policyTypes: [Ingress]\n  ingress:\n    - from:\n        - podSelector:\n            matchLabels: { app: ${slug}-app }\n      ports:\n        - protocol: TCP\n          port: 5432\n---\napiVersion: image.openshift.io/v1\nkind: ImageStream\nmetadata:\n  name: ${slug}-image\n---\napiVersion: build.openshift.io/v1\nkind: BuildConfig\nmetadata:\n  name: ${slug}-build\nspec:\n  source:\n    type: Binary\n  strategy:\n    type: Docker\n    dockerStrategy:\n      dockerfilePath: Dockerfile\n  output:\n    to:\n      kind: ImageStreamTag\n      name: ${slug}-image:latest\n  resources:\n    requests: { cpu: 100m, memory: 256Mi }\n    limits: { cpu: 750m, memory: 1Gi }\n---\napiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: ${slug}-app\n  annotations:\n    image.openshift.io/triggers: '[{"from":{"kind":"ImageStreamTag","name":"${slug}-image:latest"},"fieldPath":"spec.template.spec.containers[?(@.name==\\"app\\")].image"}]'\nspec:\n  replicas: 1\n  selector:\n    matchLabels: { app: ${slug}-app }\n  template:\n    metadata:\n      labels: { app: ${slug}-app }\n    spec:\n      automountServiceAccountToken: false\n      containers:\n        - name: app\n          image: ${slug}-image:latest\n          ports:\n            - name: http\n              containerPort: 3000\n          env:\n            - { name: NODE_ENV, value: production }\n            - { name: PORT, value: '3000' }\n            - { name: HOST, value: 0.0.0.0 }\n            - { name: PGHOST, value: ${slug}-postgresql }\n            - { name: PGPORT, value: '5432' }\n            - name: PGDATABASE\n              valueFrom: { secretKeyRef: { name: ${slug}-db-secret, key: database-name } }\n            - name: PGUSER\n              valueFrom: { secretKeyRef: { name: ${slug}-db-secret, key: database-user } }\n            - name: PGPASSWORD\n              valueFrom: { secretKeyRef: { name: ${slug}-db-secret, key: database-password } }\n            - name: ADMIN_USERNAME\n              valueFrom: { secretKeyRef: { name: ${slug}-app-secret, key: admin-username } }\n            - name: ADMIN_PASSWORD\n              valueFrom: { secretKeyRef: { name: ${slug}-app-secret, key: admin-password } }\n            - name: SESSION_SECRET\n              valueFrom: { secretKeyRef: { name: ${slug}-app-secret, key: session-secret } }\n          startupProbe:\n            httpGet: { path: /api/health, port: http }\n            periodSeconds: 5\n            failureThreshold: 36\n          readinessProbe:\n            httpGet: { path: /api/health, port: http }\n            periodSeconds: 10\n          livenessProbe:\n            httpGet: { path: /api/health, port: http }\n            periodSeconds: 20\n          resources:\n            requests: { cpu: 100m, memory: 192Mi }\n            limits: { cpu: 500m, memory: 512Mi }\n          securityContext:\n            allowPrivilegeEscalation: false\n            capabilities: { drop: [ALL] }\n            seccompProfile: { type: RuntimeDefault }\n---\napiVersion: v1\nkind: Service\nmetadata:\n  name: ${slug}-service\nspec:\n  selector: { app: ${slug}-app }\n  ports:\n    - name: http\n      port: 3000\n      targetPort: http\n---\napiVersion: route.openshift.io/v1\nkind: Route\nmetadata:\n  name: ${slug}-route\nspec:\n  to: { kind: Service, name: ${slug}-service }\n  port: { targetPort: http }\n  tls:\n    termination: edge\n    insecureEdgeTerminationPolicy: Redirect\n`
}

export function inferProjectName(request = '') {
  const quoted = String(request).match(/["“”']([^"“”']{3,48})["“”']/)?.[1]
  const named = String(request).match(/(?:llamad[oa]|nombre|denominad[oa])\s+([\p{L}\p{N}][\p{L}\p{N} _-]{2,45})/iu)?.[1]
  const candidate = quoted || named || String(request).split(/[.!?\n]/)[0].slice(0, 42)
  return sanitizeProjectName(candidate || 'proyecto-multia')
}

export function buildFullStackTemplate({ projectName, request, decisions }) {
  const spec = buildSpec({ projectName, request, decisions })
  const slug = spec.projectName
  const databaseName = `${slug.replace(/-/g, '_').slice(0, 42)}_db`
  const databaseUser = `${slug.replace(/-/g, '_').slice(0, 32)}_user`
  const requestText = String(request || '').slice(0, 12_000)
  const decisionsText = String(decisions || '').slice(0, 30_000)
  const tableName = sanitizeIdentifier(spec.entity.plural, 'records')
  const routeName = spec.entity.plural.replace(/_/g, '-')
  const sqlColumns = spec.entity.fields.map((field) => `  ${field.name} ${sqlType(field)}${sqlDefault(field)}`).join(',\n')

  const files = [
    {
      path: 'README.md',
      content: `# ${spec.title}\n\nProyecto full stack generado por MULTIA mediante deliberación y decisión multiagente.\n\n## Especificación aplicada\n\n- Entidad: **${humanize(spec.entity.singular)}**\n- Colección y API: **${routeName}**\n- Campos: ${spec.entity.fields.map((field) => `\`${field.name}:${field.type}\``).join(', ')}\n- Origen de la especificación: **${spec.source === 'council' ? 'bloque aprobado por el consejo' : 'inferencia segura de la solicitud'}**\n\n## Solicitud original\n\n${requestText || 'Aplicación full stack.'}\n\n## Decisiones del consejo\n\n${decisionsText || 'Arquitectura React + Express + PostgreSQL compatible con OpenShift.'}\n\n## Ejecutar localmente\n\n1. Inicie PostgreSQL y cree una base de datos.\n2. Copie \`backend/.env.example\` como \`backend/.env\` y ajuste sus datos.\n3. Ejecute \`npm install\` dentro de \`backend\` y \`frontend\`.\n4. En una terminal: \`npm --prefix backend run dev\`.\n5. En otra terminal: \`npm --prefix frontend run dev\`.\n\n## Desplegar en OpenShift Developer Sandbox\n\n\`\`\`bash\noc apply -f openshift.yaml\noc start-build ${slug}-build --from-dir=. --follow\noc get pods\noc get route ${slug}-route\n\`\`\`\n\nEl BuildConfig utiliza carga binaria. Los secretos no se incluyen en el ZIP. Créelos con los comandos de INSTRUCCIONES_OPENSHIFT.md antes de aplicar el YAML.\n`,
    },
    { path: '.gitignore', content: `node_modules/\ndist/\n.env\n*.log\n.DS_Store\n` },
    {
      path: 'package.json',
      content: JSON.stringify({
        name: slug,
        private: true,
        version: '1.0.0',
        scripts: {
          'install:all': 'npm --prefix backend install && npm --prefix frontend install',
          'dev:backend': 'npm --prefix backend run dev',
          'dev:frontend': 'npm --prefix frontend run dev',
          test: 'npm --prefix backend test && npm --prefix frontend test',
          build: 'npm --prefix frontend run build',
        },
      }, null, 2) + '\n',
    },
    {
      path: 'Dockerfile',
      content: `FROM node:22-bookworm-slim AS frontend-build\nWORKDIR /app\nCOPY frontend/package*.json ./frontend/\nRUN npm --prefix frontend install\nCOPY frontend ./frontend\nRUN npm --prefix frontend run build\n\nFROM node:22-bookworm-slim AS runtime\nWORKDIR /opt/app\nCOPY backend/package*.json ./backend/\nRUN npm --prefix backend install --omit=dev\nCOPY backend ./backend\nCOPY --from=frontend-build /app/frontend/dist ./public\nRUN chgrp -R 0 /opt/app && chmod -R g=u /opt/app\nENV NODE_ENV=production\nENV PORT=3000\nENV STATIC_DIR=/opt/app/public\nEXPOSE 3000\nUSER 1001\nCMD ["node", "backend/src/server.js"]\n`,
    },
    { path: '.dockerignore', content: `.git\n**/node_modules\n**/dist\n**/.env\n*.zip\n` },
    {
      path: 'backend/package.json',
      content: JSON.stringify({
        name: `${slug}-backend`,
        private: true,
        version: '1.0.0',
        type: 'module',
        scripts: { start: 'node src/server.js', dev: 'node --watch src/server.js', test: 'node --test' },
        dependencies: { cors: '^2.8.6', express: '^5.2.1', helmet: '^8.1.0', pg: '^8.16.3' },
      }, null, 2) + '\n',
    },
    { path: 'backend/.env.example', content: `PORT=3000\nPGHOST=localhost\nPGPORT=5432\nPGDATABASE=${databaseName}\nPGUSER=${databaseUser}\nPGPASSWORD=\nADMIN_USERNAME=admin\nADMIN_PASSWORD=\nSESSION_SECRET=\n` },
    { path: 'backend/src/db.js', content: buildDatabaseSource(tableName, spec.entity.fields, databaseName, databaseUser) },
    { path: 'backend/src/validation.js', content: buildValidationSource(spec.entity.fields) },
    { path: 'backend/src/app.js', content: buildAppSource(tableName, routeName, spec.entity.singular) },
    {
      path: 'backend/src/server.js',
      content: `import { app } from './app.js'\nimport { initializeDatabase } from './db.js'\n\nconst port = Number(process.env.PORT || 3000)\nconst host = process.env.HOST || '0.0.0.0'\n\nasync function start() {\n  let lastError\n  for (let attempt = 1; attempt <= 12; attempt += 1) {\n    try {\n      await initializeDatabase()\n      lastError = null\n      break\n    } catch (error) {\n      lastError = error\n      console.log('Esperando PostgreSQL, intento ' + attempt + '/12: ' + error.message)\n      await new Promise((resolve) => setTimeout(resolve, 5000))\n    }\n  }\n  if (lastError) throw lastError\n  app.listen(port, host, () => console.log(${json(spec.title)} + ' disponible en http://' + host + ':' + port))\n}\n\nstart().catch((error) => {\n  console.error(error)\n  process.exit(1)\n})\n`,
    },
    {
      path: 'backend/test/validation.test.js',
      content: `import test from 'node:test'\nimport assert from 'node:assert/strict'\nimport { FIELD_RULES, normalizeInputData } from '../src/validation.js'\n\ntest('la especificación contiene campos válidos', () => {\n  assert.ok(FIELD_RULES.length >= 2)\n  assert.equal(new Set(FIELD_RULES.map((field) => field.name)).size, FIELD_RULES.length)\n})\n\ntest('rechaza un cuerpo vacío cuando existen campos obligatorios', () => {\n  const result = normalizeInputData({})\n  assert.ok(result.errors.length >= 1)\n})\n\ntest('rechaza vaciar un campo obligatorio durante una actualización', () => {\n  const required = FIELD_RULES.find((field) => field.required)\n  const result = normalizeInputData({ [required.name]: '' }, { partial: true })\n  assert.ok(result.errors.length >= 1)\n})\n`,
    },
    {
      path: 'frontend/package.json',
      content: JSON.stringify({
        name: `${slug}-frontend`,
        private: true,
        version: '1.0.0',
        type: 'module',
        scripts: { dev: 'vite', build: 'vite build', test: 'vitest run --passWithNoTests' },
        dependencies: { react: '^18.3.1', 'react-dom': '^18.3.1' },
        devDependencies: { '@vitejs/plugin-react': '^4.3.1', vite: '^5.4.0', vitest: '^2.1.0' },
      }, null, 2) + '\n',
    },
    { path: 'frontend/index.html', content: `<!doctype html>\n<html lang="es">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <meta name="description" content="${escapeHtmlText(spec.title)}" />\n  <title>${escapeHtmlText(spec.title)}</title>\n</head>\n<body>\n  <div id="root"></div>\n  <script type="module" src="/src/main.jsx"></script>\n</body>\n</html>\n` },
    { path: 'frontend/vite.config.js', content: `import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\n\nexport default defineConfig({\n  plugins: [react()],\n  server: { port: 5173, host: true, proxy: { '/api': 'http://localhost:3000' } },\n})\n` },
    { path: 'frontend/src/main.jsx', content: `import React from 'react'\nimport ReactDOM from 'react-dom/client'\nimport App from './App.jsx'\nimport './index.css'\n\nReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)\n` },
    { path: 'frontend/src/App.jsx', content: buildFrontendSource({ title: spec.title, requestText, entity: spec.entity }) },
    { path: 'frontend/src/index.css', content: buildCssSource() },
    { path: 'database/init.sql', content: `CREATE TABLE IF NOT EXISTS ${tableName} (\n  id BIGSERIAL PRIMARY KEY,\n${sqlColumns},\n  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\n);\n` },
    { path: 'openshift.yaml', content: buildOpenShiftYaml({ slug }) },
    { path: 'MULTIA_BUILD_SPEC.json', content: JSON.stringify(spec, null, 2) + '\n' },
    { path: 'INSTRUCCIONES_OPENSHIFT.md', content: `# Despliegue seguro en Red Hat OpenShift Developer Sandbox\n\nPrimero cree los secretos fuera del YAML:\n\n\`\`\`bash\noc create secret generic ${slug}-db-secret \\\n  --from-literal=database-name=${databaseName} \\\n  --from-literal=database-user=${databaseUser} \\\n  --from-literal=database-password="$(openssl rand -base64 24)"\n\noc create secret generic ${slug}-app-secret \\\n  --from-literal=admin-username=admin \\\n  --from-literal=admin-password="$(openssl rand -base64 24)" \\\n  --from-literal=session-secret="$(openssl rand -base64 48)"\n\noc apply -f openshift.yaml\noc start-build ${slug}-build --from-dir=. --follow\noc get pods -w\noc get route ${slug}-route -o jsonpath='https://{.spec.host}{"\\n"}'\n\`\`\`\n\nGuarde la contraseña administrativa en un gestor seguro. No la publique en GitHub. El YAML usa usuarios no privilegiados, TLS, NetworkPolicy, ServiceAccount token deshabilitado y Secrets externos.\n` },
  ]

  return {
    files,
    projectName: slug,
    stack: 'React + Express + PostgreSQL + OpenShift',
    spec,
  }
}
