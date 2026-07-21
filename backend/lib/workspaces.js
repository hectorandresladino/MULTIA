import crypto from 'crypto'
import fsp from 'fs/promises'
import path from 'path'
import zlib from 'zlib'

const ROOT = process.env.WORKSPACE_ROOT || '/tmp/multia-workspaces'
const TTL_MINUTES = Number(process.env.WORKSPACE_TTL_MINUTES || 120)
const MAX_FILES = Number(process.env.WORKSPACE_MAX_FILES || 300)
const MAX_FILE_BYTES = Number(process.env.WORKSPACE_MAX_FILE_BYTES || 1_500_000)
const MAX_WORKSPACE_BYTES = Number(process.env.WORKSPACE_MAX_BYTES || 25_000_000)
const META_FILE = '.multia-workspace.json'

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function safeCompare(left, right) {
  const a = Buffer.from(String(left || ''))
  const b = Buffer.from(String(right || ''))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export function sanitizeProjectName(value = 'proyecto-multia') {
  const normalized = String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 48)
  return normalized || 'proyecto-multia'
}

function validateId(id) {
  if (!/^[a-f0-9-]{36}$/i.test(String(id || ''))) {
    throw Object.assign(new Error('Identificador de espacio de trabajo inválido.'), { status: 400 })
  }
}

export function sanitizeRelativePath(value) {
  const raw = String(value || '').replace(/\\/g, '/').trim()
  if (!raw || raw.startsWith('/') || raw.includes('\0')) {
    throw Object.assign(new Error('Ruta de archivo inválida.'), { status: 400 })
  }
  const normalized = path.posix.normalize(raw)
  if (normalized === '..' || normalized.startsWith('../')) {
    throw Object.assign(new Error('No se permite salir del espacio de trabajo.'), { status: 400 })
  }
  const segments = normalized.split('/')
  if (segments.some((part) => ['.git', 'node_modules', META_FILE].includes(part))) {
    throw Object.assign(new Error('La ruta solicitada está reservada.'), { status: 400 })
  }
  return normalized
}

async function ensureRoot() {
  await fsp.mkdir(ROOT, { recursive: true })
}

function workspaceDir(id) {
  validateId(id)
  return path.join(ROOT, id)
}

async function readMeta(id) {
  const metaPath = path.join(workspaceDir(id), META_FILE)
  try {
    return JSON.parse(await fsp.readFile(metaPath, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw Object.assign(new Error('El espacio de trabajo no existe o ya expiró.'), { status: 404 })
    }
    throw error
  }
}

export async function authorizeWorkspace(id, token) {
  const meta = await readMeta(id)
  if (!token || !safeCompare(hashToken(token), meta.tokenHash)) {
    throw Object.assign(new Error('Token de espacio de trabajo inválido.'), { status: 403 })
  }
  return { meta, dir: workspaceDir(id) }
}

async function writeMeta(dir, meta) {
  await fsp.writeFile(path.join(dir, META_FILE), JSON.stringify(meta, null, 2), 'utf8')
}

async function currentUsage(dir) {
  let count = 0
  let bytes = 0
  async function walk(folder) {
    const entries = await fsp.readdir(folder, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name === META_FILE) continue
      const full = path.join(folder, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (entry.isFile()) {
        const stat = await fsp.stat(full)
        count += 1
        bytes += stat.size
      }
    }
  }
  await walk(dir)
  return { count, bytes }
}

export async function writeWorkspaceFiles(id, token, files, { overwrite = true } = {}) {
  const { meta, dir } = await authorizeWorkspace(id, token)
  if (!Array.isArray(files) || files.length === 0) {
    throw Object.assign(new Error('Debe suministrar al menos un archivo.'), { status: 400 })
  }
  if (files.length > MAX_FILES) {
    throw Object.assign(new Error(`El lote supera el máximo de ${MAX_FILES} archivos.`), { status: 413 })
  }

  const prepared = files.map((file) => {
    const relativePath = sanitizeRelativePath(file.path)
    const content = String(file.content ?? '')
    const size = Buffer.byteLength(content)
    if (size > MAX_FILE_BYTES) {
      throw Object.assign(new Error(`El archivo ${relativePath} supera el tamaño permitido.`), { status: 413 })
    }
    return { relativePath, content, size }
  })

  const duplicate = prepared.find((file, index) =>
    prepared.findIndex((candidate) => candidate.relativePath === file.relativePath) !== index
  )
  if (duplicate) {
    throw Object.assign(new Error(`La ruta ${duplicate.relativePath} está repetida en el mismo lote.`), { status: 400 })
  }

  const usage = await currentUsage(dir)
  let projectedCount = usage.count
  let projectedBytes = usage.bytes
  for (const file of prepared) {
    const target = path.join(dir, file.relativePath)
    try {
      const stat = await fsp.stat(target)
      if (stat.isFile()) projectedBytes -= stat.size
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      projectedCount += 1
    }
    projectedBytes += file.size
  }
  if (projectedCount > MAX_FILES || projectedBytes > MAX_WORKSPACE_BYTES) {
    throw Object.assign(new Error('El espacio de trabajo supera sus límites de archivos o almacenamiento.'), { status: 413 })
  }

  const written = []
  for (const file of prepared) {
    const target = path.join(dir, file.relativePath)
    await fsp.mkdir(path.dirname(target), { recursive: true })
    if (!overwrite) {
      try {
        await fsp.access(target)
        continue
      } catch {
        // El archivo no existe y puede escribirse.
      }
    }
    await fsp.writeFile(target, file.content, 'utf8')
    written.push(file.relativePath)
  }

  meta.updatedAt = new Date().toISOString()
  meta.fileCount = (await currentUsage(dir)).count
  await writeMeta(dir, meta)
  return { written, meta }
}

export async function createWorkspace({ projectName, request, decisions, files }) {
  await ensureRoot()
  const id = crypto.randomUUID()
  const token = crypto.randomBytes(32).toString('base64url')
  const dir = workspaceDir(id)
  await fsp.mkdir(dir, { recursive: false })
  const now = new Date().toISOString()
  const meta = {
    id,
    projectName: sanitizeProjectName(projectName),
    request: String(request || '').slice(0, 20_000),
    decisions: String(decisions || '').slice(0, 60_000),
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(Date.now() + TTL_MINUTES * 60_000).toISOString(),
    tokenHash: hashToken(token),
    fileCount: 0,
  }
  await writeMeta(dir, meta)
  await writeWorkspaceFiles(id, token, files)
  return { id, token, projectName: meta.projectName, expiresAt: meta.expiresAt }
}

export async function listWorkspaceFiles(id, token) {
  const { meta, dir } = await authorizeWorkspace(id, token)
  const files = []
  async function walk(folder) {
    const entries = await fsp.readdir(folder, { withFileTypes: true })
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name === META_FILE) continue
      const full = path.join(folder, entry.name)
      const relative = path.relative(dir, full).replace(/\\/g, '/')
      if (entry.isDirectory()) await walk(full)
      else if (entry.isFile()) {
        const stat = await fsp.stat(full)
        files.push({ path: relative, size: stat.size })
      }
    }
  }
  await walk(dir)
  return { meta: { ...meta, tokenHash: undefined }, files }
}

export async function readWorkspaceFile(id, token, filePath) {
  const { dir } = await authorizeWorkspace(id, token)
  const relative = sanitizeRelativePath(filePath)
  const target = path.join(dir, relative)
  try {
    const stat = await fsp.stat(target)
    if (!stat.isFile()) throw new Error('No es un archivo')
    return { path: relative, content: await fsp.readFile(target, 'utf8'), size: stat.size }
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw Object.assign(new Error('Archivo no encontrado.'), { status: 404 })
    }
    throw error
  }
}

export async function deleteWorkspace(id, token) {
  const { dir } = await authorizeWorkspace(id, token)
  await fsp.rm(dir, { recursive: true, force: true })
}

function makeCrcTable() {
  const table = new Uint32Array(256)
  for (let number = 0; number < 256; number += 1) {
    let value = number
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1)
    }
    table[number] = value >>> 0
  }
  return table
}

const CRC_TABLE = makeCrcTable()

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear())
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const day = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { time, day }
}

async function collectArchiveFiles(dir) {
  const files = []
  async function walk(folder) {
    const entries = await fsp.readdir(folder, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name === META_FILE || entry.name === '.git' || entry.name === 'node_modules') continue
      const full = path.join(folder, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (entry.isFile()) {
        files.push({
          name: path.relative(dir, full).replace(/\\/g, '/'),
          content: await fsp.readFile(full),
          stat: await fsp.stat(full),
        })
      }
    }
  }
  await walk(dir)
  return files.sort((a, b) => a.name.localeCompare(b.name))
}

async function createZipBuffer(dir) {
  const files = await collectArchiveFiles(dir)
  const localParts = []
  const centralParts = []
  let offset = 0

  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8')
    const compressed = zlib.deflateRawSync(file.content, { level: 9 })
    const checksum = crc32(file.content)
    const { time, day } = dosDateTime(file.stat.mtime)

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6)
    local.writeUInt16LE(8, 8)
    local.writeUInt16LE(time, 10)
    local.writeUInt16LE(day, 12)
    local.writeUInt32LE(checksum, 14)
    local.writeUInt32LE(compressed.length, 18)
    local.writeUInt32LE(file.content.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28)
    localParts.push(local, name, compressed)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(0x0314, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(8, 10)
    central.writeUInt16LE(time, 12)
    central.writeUInt16LE(day, 14)
    central.writeUInt32LE(checksum, 16)
    central.writeUInt32LE(compressed.length, 20)
    central.writeUInt32LE(file.content.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt16LE(0, 30)
    central.writeUInt16LE(0, 32)
    central.writeUInt16LE(0, 34)
    central.writeUInt16LE(0, 36)
    central.writeUInt32LE(0, 38)
    central.writeUInt32LE(offset, 42)
    centralParts.push(central, name)

    offset += local.length + name.length + compressed.length
  }

  const centralDirectory = Buffer.concat(centralParts)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(centralDirectory.length, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20)

  return Buffer.concat([...localParts, centralDirectory, end])
}

export async function streamWorkspaceArchive(id, token, response) {
  const { meta, dir } = await authorizeWorkspace(id, token)
  const fileName = `${sanitizeProjectName(meta.projectName)}.zip`
  const archive = await createZipBuffer(dir)
  response.setHeader('Content-Type', 'application/zip')
  response.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
  response.setHeader('Content-Length', archive.length)
  response.end(archive)
}

export async function cleanupExpiredWorkspaces() {
  await ensureRoot()
  const entries = await fsp.readdir(ROOT, { withFileTypes: true })
  let removed = 0
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    try {
      const meta = JSON.parse(await fsp.readFile(path.join(ROOT, entry.name, META_FILE), 'utf8'))
      if (Date.parse(meta.expiresAt) <= Date.now()) {
        await fsp.rm(path.join(ROOT, entry.name), { recursive: true, force: true })
        removed += 1
      }
    } catch {
      const stat = await fsp.stat(path.join(ROOT, entry.name))
      if (Date.now() - stat.mtimeMs > TTL_MINUTES * 60_000) {
        await fsp.rm(path.join(ROOT, entry.name), { recursive: true, force: true })
        removed += 1
      }
    }
  }
  return removed
}

export function getWorkspaceRoot() {
  return ROOT
}
