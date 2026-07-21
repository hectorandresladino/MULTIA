import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'multia-platform-'))
process.env.PORT = '0'
process.env.HOST = '127.0.0.1'
process.env.AUTH_REQUIRED = 'true'
process.env.MULTIA_DB_PATH = path.join(tempRoot, 'multia.db')
process.env.WORKSPACE_ROOT = path.join(tempRoot, 'workspaces')
process.env.MULTIA_ADMIN_USERNAME = 'administrador'
process.env.MULTIA_ADMIN_PASSWORD = 'AdminRobusto123'
process.env.MULTIA_ADMIN_DISPLAY_NAME = 'Administrador de pruebas'
process.env.STATIC_DIR = path.join(tempRoot, 'public')
fs.mkdirSync(process.env.STATIC_DIR, { recursive: true })
fs.writeFileSync(path.join(process.env.STATIC_DIR, 'index.html'), '<!doctype html><title>MULTIA</title>')

const { server } = await import('../server.js')
const { closeDatabase } = await import('../lib/database.js')

async function baseUrl() {
  if (!server.listening) await new Promise((resolve) => server.once('listening', resolve))
  return `http://127.0.0.1:${server.address().port}`
}

test('autenticación, CSRF, memoria persistente y métricas operan juntas', async (t) => {
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve))
    closeDatabase()
    fs.rmSync(tempRoot, { recursive: true, force: true })
  })

  const origin = await baseUrl()
  const health = await fetch(`${origin}/api/health`)
  assert.equal(health.status, 200)
  const healthBody = await health.json()
  assert.equal(healthBody.version, '4.0.0')
  assert.equal(healthBody.database.ok, true)

  const login = await fetch(`${origin}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'administrador', password: 'AdminRobusto123' }),
  })
  assert.equal(login.status, 200)
  const cookie = login.headers.get('set-cookie').split(';')[0]
  const session = await login.json()
  assert.equal(session.user.role, 'admin')
  assert.ok(session.csrfToken)

  const blocked = await fetch(`${origin}/api/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ rating: 1 }),
  })
  assert.equal(blocked.status, 403)

  const conversation = {
    id: 'conv-1',
    title: 'Consulta robusta',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      { id: 'msg-1', role: 'user', content: 'Hola', timestamp: new Date().toISOString() },
      { id: 'msg-2', role: 'assistant', content: 'Respuesta', timestamp: new Date().toISOString(), metadata: { model: 'test' } },
    ],
  }
  const sync = await fetch(`${origin}/api/conversations/sync`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookie, 'x-csrf-token': session.csrfToken },
    body: JSON.stringify({ conversations: [conversation] }),
  })
  assert.equal(sync.status, 200)

  const persisted = await fetch(`${origin}/api/conversations`, { headers: { Cookie: cookie } })
  assert.equal(persisted.status, 200)
  const persistedBody = await persisted.json()
  assert.equal(persistedBody.conversations.length, 1)
  assert.equal(persistedBody.conversations[0].messages.length, 2)

  const feedback = await fetch(`${origin}/api/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie, 'x-csrf-token': session.csrfToken },
    body: JSON.stringify({ conversationId: 'conv-1', messageId: 'msg-2', rating: 1 }),
  })
  assert.equal(feedback.status, 201)

  const createdUser = await fetch(`${origin}/api/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie, 'x-csrf-token': session.csrfToken },
    body: JSON.stringify({
      username: 'analista',
      displayName: 'Analista de pruebas',
      password: 'AnalistaSeguro123',
      role: 'analyst',
    }),
  })
  assert.equal(createdUser.status, 201)
  const createdUserBody = await createdUser.json()
  assert.equal(createdUserBody.user.role, 'analyst')

  const users = await fetch(`${origin}/api/admin/users`, { headers: { Cookie: cookie } })
  assert.equal(users.status, 200)
  const usersBody = await users.json()
  assert.equal(usersBody.users.length, 2)

  const suspended = await fetch(`${origin}/api/admin/users/${createdUserBody.user.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie, 'x-csrf-token': session.csrfToken },
    body: JSON.stringify({ active: false }),
  })
  assert.equal(suspended.status, 200)
  assert.equal((await suspended.json()).active, false)

  const selfDemotion = await fetch(`${origin}/api/admin/users/${session.user.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie, 'x-csrf-token': session.csrfToken },
    body: JSON.stringify({ role: 'user' }),
  })
  assert.equal(selfDemotion.status, 400)

  const metrics = await fetch(`${origin}/api/admin/metrics`, { headers: { Cookie: cookie } })
  assert.equal(metrics.status, 200)
  const metricsBody = await metrics.json()
  assert.equal(metricsBody.users, 1)
  assert.equal(metricsBody.conversations, 1)
  assert.equal(metricsBody.messages, 2)
  assert.equal(metricsBody.feedback.positive, 1)
})
