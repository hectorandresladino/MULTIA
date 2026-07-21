import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { DatabaseSync } from 'node:sqlite'

const DEFAULT_DB_PATH = process.env.MULTIA_DB_PATH || '/tmp/multia-data/multia.db'
let database = null
let databasePath = null

function nowIso() {
  return new Date().toISOString()
}

function normalizeJson(value, fallback = {}) {
  try {
    return JSON.stringify(value ?? fallback)
  } catch {
    return JSON.stringify(fallback)
  }
}

function parseJson(value, fallback = {}) {
  try {
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

export function initializeDatabase(customPath = DEFAULT_DB_PATH) {
  if (database && databasePath === customPath) return database
  if (database) {
    try { database.close() } catch { /* ignore */ }
  }

  fs.mkdirSync(path.dirname(customPath), { recursive: true })
  database = new DatabaseSync(customPath)
  databasePath = customPath
  database.exec('PRAGMA journal_mode = WAL;')
  database.exec('PRAGMA foreign_keys = ON;')
  database.exec('PRAGMA busy_timeout = 5000;')
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      display_name TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','analyst','user')),
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      csrf_token TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (id, user_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
      content TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      position INTEGER NOT NULL,
      PRIMARY KEY (id, conversation_id, user_id),
      FOREIGN KEY (conversation_id, user_id) REFERENCES conversations(id, user_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      conversation_id TEXT,
      message_id TEXT,
      rating INTEGER NOT NULL CHECK(rating IN (-1,1)),
      comment TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS model_runs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      conversation_id TEXT,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      mode TEXT NOT NULL,
      status TEXT NOT NULL,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      input_chars INTEGER NOT NULL DEFAULT 0,
      output_chars INTEGER NOT NULL DEFAULT 0,
      team_count INTEGER NOT NULL DEFAULT 0,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      event_type TEXT NOT NULL,
      details_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(user_id, conversation_id, position);
    CREATE INDEX IF NOT EXISTS idx_feedback_user_created ON feedback(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_model_runs_user_created ON model_runs(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_events(created_at DESC);
  `)
  return database
}

export function getDatabase() {
  return initializeDatabase()
}

export function closeDatabase() {
  if (database) database.close()
  database = null
  databasePath = null
}

export function countUsers() {
  return Number(getDatabase().prepare('SELECT COUNT(*) AS total FROM users WHERE active = 1').get().total || 0)
}

export function createUser({ username, displayName, passwordSalt, passwordHash, role = 'user' }) {
  const db = getDatabase()
  const id = crypto.randomUUID()
  const timestamp = nowIso()
  db.prepare(`
    INSERT INTO users (id, username, display_name, password_salt, password_hash, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, username, displayName, passwordSalt, passwordHash, role, timestamp, timestamp)
  return getUserById(id)
}

export function getUserByUsername(username) {
  return getDatabase().prepare(`
    SELECT id, username, display_name AS displayName, password_salt AS passwordSalt,
           password_hash AS passwordHash, role, active, created_at AS createdAt
    FROM users WHERE username = ? COLLATE NOCASE
  `).get(username) || null
}

export function getUserById(id) {
  const row = getDatabase().prepare(`
    SELECT id, username, display_name AS displayName, role, active, created_at AS createdAt
    FROM users WHERE id = ?
  `).get(id)
  return row ? { ...row, active: Boolean(row.active) } : null
}

export function listUsers() {
  return getDatabase().prepare(`
    SELECT id, username, display_name AS displayName, role, active, created_at AS createdAt
    FROM users ORDER BY created_at ASC
  `).all().map((row) => ({ ...row, active: Boolean(row.active) }))
}


export function countActiveAdmins() {
  return Number(getDatabase().prepare("SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND active = 1").get().total || 0)
}

export function updateUserAdministration(id, { displayName, role, active }) {
  const current = getUserById(id)
  if (!current) return null
  const nextDisplayName = String(displayName ?? current.displayName).trim().slice(0, 80) || current.displayName
  const nextRole = role ?? current.role
  const nextActive = active === undefined ? current.active : Boolean(active)
  getDatabase().prepare(`
    UPDATE users SET display_name = ?, role = ?, active = ?, updated_at = ? WHERE id = ?
  `).run(nextDisplayName, nextRole, nextActive ? 1 : 0, nowIso(), id)
  if (!nextActive) getDatabase().prepare('DELETE FROM sessions WHERE user_id = ?').run(id)
  return getUserById(id)
}

export function createSession({ tokenHash, userId, csrfToken, expiresAt }) {
  const timestamp = nowIso()
  getDatabase().prepare(`
    INSERT INTO sessions (token_hash, user_id, csrf_token, created_at, last_seen_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(tokenHash, userId, csrfToken, timestamp, timestamp, expiresAt)
}

export function getSession(tokenHash) {
  const row = getDatabase().prepare(`
    SELECT s.token_hash AS tokenHash, s.user_id AS userId, s.csrf_token AS csrfToken,
           s.expires_at AS expiresAt, u.username, u.display_name AS displayName, u.role, u.active
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?
  `).get(tokenHash)
  if (!row) return null
  if (!row.active || Date.parse(row.expiresAt) <= Date.now()) {
    deleteSession(tokenHash)
    return null
  }
  getDatabase().prepare('UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?').run(nowIso(), tokenHash)
  return { ...row, active: Boolean(row.active) }
}

export function deleteSession(tokenHash) {
  getDatabase().prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash)
}

export function deleteExpiredSessions() {
  getDatabase().prepare('DELETE FROM sessions WHERE expires_at <= ?').run(nowIso())
}

export function syncConversations(userId, conversations) {
  const db = getDatabase()
  const upsertConversation = db.prepare(`
    INSERT INTO conversations (id, user_id, title, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id, user_id) DO UPDATE SET title = excluded.title, updated_at = excluded.updated_at
  `)
  const deleteMessages = db.prepare('DELETE FROM messages WHERE conversation_id = ? AND user_id = ?')
  const insertMessage = db.prepare(`
    INSERT INTO messages (id, conversation_id, user_id, role, content, metadata_json, created_at, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  db.exec('BEGIN IMMEDIATE')
  try {
    for (const conversation of conversations) {
      upsertConversation.run(
        conversation.id,
        userId,
        conversation.title,
        conversation.createdAt,
        conversation.updatedAt || nowIso(),
      )
      deleteMessages.run(conversation.id, userId)
      conversation.messages.forEach((message, index) => {
        insertMessage.run(
          message.id,
          conversation.id,
          userId,
          message.role,
          message.content,
          normalizeJson(message.metadata, {}),
          message.timestamp,
          index,
        )
      })
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export function listConversations(userId) {
  const db = getDatabase()
  const conversations = db.prepare(`
    SELECT id, title, created_at AS createdAt, updated_at AS updatedAt
    FROM conversations WHERE user_id = ? ORDER BY updated_at DESC
  `).all(userId)
  const messages = db.prepare(`
    SELECT id, role, content, metadata_json AS metadataJson, created_at AS timestamp
    FROM messages WHERE user_id = ? AND conversation_id = ? ORDER BY position ASC
  `)
  return conversations.map((conversation) => ({
    ...conversation,
    messages: messages.all(userId, conversation.id).map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      metadata: parseJson(message.metadataJson, {}),
    })),
  }))
}

export function deleteConversation(userId, conversationId) {
  getDatabase().prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?').run(conversationId, userId)
}

export function createFeedback({ userId, conversationId, messageId, rating, comment = '' }) {
  const id = crypto.randomUUID()
  getDatabase().prepare(`
    INSERT INTO feedback (id, user_id, conversation_id, message_id, rating, comment, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, conversationId || null, messageId || null, rating, comment, nowIso())
  return { id }
}

export function createModelRun({ userId, conversationId, provider, model, mode, status, durationMs, inputChars, outputChars, teamCount, metadata }) {
  const id = crypto.randomUUID()
  getDatabase().prepare(`
    INSERT INTO model_runs (id, user_id, conversation_id, provider, model, mode, status, duration_ms,
      input_chars, output_chars, team_count, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    conversationId || null,
    provider,
    model,
    mode,
    status,
    Math.max(0, Number(durationMs || 0)),
    Math.max(0, Number(inputChars || 0)),
    Math.max(0, Number(outputChars || 0)),
    Math.max(0, Number(teamCount || 0)),
    normalizeJson(metadata, {}),
    nowIso(),
  )
  return { id }
}

export function recordAuditEvent({ userId = null, eventType, details = {} }) {
  const id = crypto.randomUUID()
  getDatabase().prepare(`
    INSERT INTO audit_events (id, user_id, event_type, details_json, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, userId, eventType, normalizeJson(details, {}), nowIso())
  return { id }
}

export function getOperationalMetrics() {
  const db = getDatabase()
  const scalar = (sql) => Number(db.prepare(sql).get().total || 0)
  const positive = scalar('SELECT COUNT(*) AS total FROM feedback WHERE rating = 1')
  const negative = scalar('SELECT COUNT(*) AS total FROM feedback WHERE rating = -1')
  const totalFeedback = positive + negative
  const recentRuns = db.prepare(`
    SELECT provider, model, mode, status, duration_ms AS durationMs, input_chars AS inputChars,
           output_chars AS outputChars, team_count AS teamCount, created_at AS createdAt
    FROM model_runs ORDER BY created_at DESC LIMIT 25
  `).all()
  return {
    users: scalar('SELECT COUNT(*) AS total FROM users WHERE active = 1'),
    conversations: scalar('SELECT COUNT(*) AS total FROM conversations'),
    messages: scalar('SELECT COUNT(*) AS total FROM messages'),
    feedback: {
      positive,
      negative,
      satisfactionPercent: totalFeedback ? Math.round((positive / totalFeedback) * 100) : null,
    },
    modelRuns: scalar('SELECT COUNT(*) AS total FROM model_runs'),
    auditEvents: scalar('SELECT COUNT(*) AS total FROM audit_events'),
    recentRuns,
  }
}

export function databaseStatus() {
  try {
    const row = getDatabase().prepare('SELECT 1 AS ok').get()
    return { ok: row?.ok === 1, path: databasePath }
  } catch (error) {
    return { ok: false, error: error.message, path: databasePath || DEFAULT_DB_PATH }
  }
}
