import crypto from 'crypto'
import {
  countUsers,
  createSession,
  createUser,
  deleteExpiredSessions,
  deleteSession,
  getSession,
  getUserByUsername,
  recordAuditEvent,
} from './database.js'

const COOKIE_NAME = 'multia_session'
const SESSION_TTL_HOURS = Math.max(1, Number(process.env.SESSION_TTL_HOURS || 12))
const PASSWORD_ITERATIONS = 310_000
const AUTH_REQUIRED = String(process.env.AUTH_REQUIRED ?? 'true').toLowerCase() !== 'false'
let runtimeBootstrapToken = null

function cleanUsername(value) {
  const username = String(value || '').trim().toLowerCase()
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    throw Object.assign(new Error('El usuario debe tener entre 3 y 40 caracteres: letras, números, punto, guion o guion bajo.'), { status: 400 })
  }
  return username
}

function validatePassword(value) {
  const password = String(value || '')
  if (password.length < 12 || password.length > 200) {
    throw Object.assign(new Error('La contraseña debe tener entre 12 y 200 caracteres.'), { status: 400 })
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw Object.assign(new Error('La contraseña debe incluir mayúscula, minúscula y número.'), { status: 400 })
  }
  return password
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, 64, 'sha512').toString('base64url')
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('base64url')
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''))
  const b = Buffer.from(String(right || ''))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

function parseCookies(header) {
  const result = {}
  String(header || '').split(';').forEach((part) => {
    const index = part.indexOf('=')
    if (index < 1) return
    const key = part.slice(0, index).trim()
    const value = part.slice(index + 1).trim()
    try { result[key] = decodeURIComponent(value) } catch { result[key] = value }
  })
  return result
}

function requestIsSecure(req) {
  return req.secure || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https'
}

function setSessionCookie(req, res, rawToken, maxAgeSeconds) {
  const secure = requestIsSecure(req) ? '; Secure' : ''
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(rawToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`)
}

function clearSessionCookie(req, res) {
  setSessionCookie(req, res, '', 0)
}

export function authIsRequired() {
  return AUTH_REQUIRED
}

export function ensureBootstrapState() {
  deleteExpiredSessions()
  if (countUsers() > 0) return { setupRequired: false }

  const username = process.env.MULTIA_ADMIN_USERNAME
  const password = process.env.MULTIA_ADMIN_PASSWORD
  if (username && password) {
    const normalizedUsername = cleanUsername(username)
    const validPassword = validatePassword(password)
    const salt = crypto.randomBytes(24).toString('base64url')
    createUser({
      username: normalizedUsername,
      displayName: process.env.MULTIA_ADMIN_DISPLAY_NAME || 'Administrador MULTIA',
      passwordSalt: salt,
      passwordHash: hashPassword(validPassword, salt),
      role: 'admin',
    })
    console.log(`Administrador inicial creado: ${normalizedUsername}`)
    return { setupRequired: false }
  }

  runtimeBootstrapToken = process.env.MULTIA_BOOTSTRAP_TOKEN || crypto.randomBytes(24).toString('base64url')
  console.log('MULTIA requiere crear el primer administrador.')
  console.log(`Token de instalación de un solo uso: ${runtimeBootstrapToken}`)
  return { setupRequired: true }
}

export function authStatus() {
  return {
    authRequired: AUTH_REQUIRED,
    setupRequired: countUsers() === 0,
  }
}

export function bootstrapAdmin({ bootstrapToken, username, displayName, password }) {
  if (countUsers() > 0) {
    throw Object.assign(new Error('La instalación inicial ya fue completada.'), { status: 409 })
  }
  if (!runtimeBootstrapToken || !safeEqual(bootstrapToken, runtimeBootstrapToken)) {
    throw Object.assign(new Error('El token de instalación no es válido.'), { status: 403 })
  }
  const normalizedUsername = cleanUsername(username)
  const validPassword = validatePassword(password)
  const salt = crypto.randomBytes(24).toString('base64url')
  const user = createUser({
    username: normalizedUsername,
    displayName: String(displayName || normalizedUsername).trim().slice(0, 80),
    passwordSalt: salt,
    passwordHash: hashPassword(validPassword, salt),
    role: 'admin',
  })
  runtimeBootstrapToken = null
  recordAuditEvent({ userId: user.id, eventType: 'auth.bootstrap', details: { username: user.username } })
  return user
}

export function createManagedUser({ username, displayName, password, role = 'user' }) {
  const normalizedUsername = cleanUsername(username)
  const validPassword = validatePassword(password)
  if (!['admin', 'analyst', 'user'].includes(role)) {
    throw Object.assign(new Error('El rol indicado no es válido.'), { status: 400 })
  }
  if (getUserByUsername(normalizedUsername)) {
    throw Object.assign(new Error('Ya existe un usuario con ese nombre.'), { status: 409 })
  }
  const salt = crypto.randomBytes(24).toString('base64url')
  return createUser({
    username: normalizedUsername,
    displayName: String(displayName || normalizedUsername).trim().slice(0, 80),
    passwordSalt: salt,
    passwordHash: hashPassword(validPassword, salt),
    role,
  })
}

export function authenticateCredentials(username, password) {
  const user = getUserByUsername(cleanUsername(username))
  const candidate = String(password || '')
  const placeholderSalt = 'invalid-user-placeholder'
  const candidateHash = hashPassword(candidate, user?.passwordSalt || placeholderSalt)
  if (!user || !user.active || !safeEqual(candidateHash, user.passwordHash)) {
    throw Object.assign(new Error('Usuario o contraseña incorrectos.'), { status: 401 })
  }
  return user
}

export function startSession(req, res, user) {
  const rawToken = crypto.randomBytes(48).toString('base64url')
  const csrfToken = crypto.randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60_000).toISOString()
  createSession({ tokenHash: hashToken(rawToken), userId: user.id, csrfToken, expiresAt })
  setSessionCookie(req, res, rawToken, SESSION_TTL_HOURS * 60 * 60)
  recordAuditEvent({ userId: user.id, eventType: 'auth.login', details: { username: user.username } })
  return { user: sanitizeUser(user), csrfToken, expiresAt }
}

export function endSession(req, res) {
  const rawToken = parseCookies(req.headers.cookie)[COOKIE_NAME]
  if (rawToken) deleteSession(hashToken(rawToken))
  clearSessionCookie(req, res)
}

export function resolveSession(req) {
  const rawToken = parseCookies(req.headers.cookie)[COOKIE_NAME]
  if (!rawToken) return null
  return getSession(hashToken(rawToken))
}

export function sanitizeUser(user) {
  return {
    id: user.id || user.userId,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  }
}

export function requireAuth(req, res, next) {
  if (!AUTH_REQUIRED) {
    req.user = { id: 'guest', username: 'guest', displayName: 'Invitado', role: 'admin' }
    req.session = { csrfToken: '' }
    next()
    return
  }
  const session = resolveSession(req)
  if (!session) {
    res.status(401).json({ error: { message: 'Debe iniciar sesión para utilizar MULTIA.' } })
    return
  }
  req.user = sanitizeUser(session)
  req.session = session
  next()
}

export function requireCsrf(req, res, next) {
  if (!AUTH_REQUIRED || ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next()
    return
  }
  const supplied = String(req.get('x-csrf-token') || '')
  if (!supplied || !safeEqual(supplied, req.session?.csrfToken)) {
    res.status(403).json({ error: { message: 'La validación CSRF falló. Recargue la sesión e intente nuevamente.' } })
    return
  }
  next()
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      res.status(403).json({ error: { message: 'Su rol no tiene permiso para ejecutar esta función.' } })
      return
    }
    next()
  }
}
