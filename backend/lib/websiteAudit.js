import dns from 'node:dns/promises'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import tls from 'node:tls'

const DEFAULT_PORTS = Object.freeze([
  { port: 80, service: 'HTTP' },
  { port: 443, service: 'HTTPS' },
  { port: 8080, service: 'HTTP alternativo' },
  { port: 8443, service: 'HTTPS alternativo' },
  { port: 3000, service: 'Aplicación web' },
  { port: 8000, service: 'Aplicación web' },
  { port: 22, service: 'SSH' },
  { port: 21, service: 'FTP' },
  { port: 25, service: 'SMTP' },
  { port: 587, service: 'SMTP submission' },
  { port: 993, service: 'IMAPS' },
  { port: 995, service: 'POP3S' },
])

const WEB_URL_PORTS = new Set([80, 443, 3000, 8000, 8080, 8443])

const BLOCKED_SUFFIXES = Object.freeze([
  '.local',
  '.localhost',
  '.internal',
  '.intranet',
  '.lan',
  '.home',
  '.test',
  '.invalid',
  '.example',
])

const SECURITY_HEADERS = Object.freeze([
  ['strict-transport-security', 'HSTS'],
  ['content-security-policy', 'Content-Security-Policy'],
  ['x-content-type-options', 'X-Content-Type-Options'],
  ['referrer-policy', 'Referrer-Policy'],
  ['permissions-policy', 'Permissions-Policy'],
  ['cross-origin-opener-policy', 'Cross-Origin-Opener-Policy'],
])

const NPM_TECH_MAP = Object.freeze({
  jquery: 'jquery',
  bootstrap: 'bootstrap',
  lodash: 'lodash',
  react: 'react',
  vue: 'vue',
  angular: '@angular/core',
})

function auditError(message, status = 400) {
  return Object.assign(new Error(message), { status })
}

function parseIpv4(ip) {
  const parts = String(ip).split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null
  return parts
}

export function isPublicIpv4(ip) {
  const p = parseIpv4(ip)
  if (!p) return false
  const [a, b, c] = p
  if (a === 0 || a === 10 || a === 127) return false
  if (a === 100 && b >= 64 && b <= 127) return false
  if (a === 169 && b === 254) return false
  if (a === 172 && b >= 16 && b <= 31) return false
  if (a === 192 && b === 168) return false
  if (a === 192 && b === 0 && c === 0) return false
  if (a === 192 && b === 0 && c === 2) return false
  if (a === 198 && (b === 18 || b === 19)) return false
  if (a === 198 && b === 51 && c === 100) return false
  if (a === 203 && b === 0 && c === 113) return false
  if (a >= 224) return false
  return true
}

function normalizeHostname(hostname) {
  return String(hostname || '').trim().replace(/\.$/, '').toLowerCase()
}

function validateAuthorization(body = {}) {
  const allowedBasis = new Set(['owner', 'administrator', 'written-permission', 'controlled-lab'])
  if (body.authorizationConfirmed !== true) {
    throw auditError('Debe confirmar que es propietario, administrador autorizado o que cuenta con permiso escrito para evaluar el sitio.')
  }
  if (!allowedBasis.has(String(body.authorizationBasis || ''))) {
    throw auditError('Seleccione una base de autorización válida para la evaluación.')
  }
}

export async function validateAuditTarget(rawTarget, body = {}) {
  validateAuthorization(body)
  let target = String(rawTarget || '').trim()
  if (!target) throw auditError('La URL del sitio es obligatoria.')
  if (target.length > 2048) throw auditError('La URL es demasiado larga.')
  if (!/^https?:\/\//i.test(target)) target = `https://${target}`

  let url
  try {
    url = new URL(target)
  } catch {
    throw auditError('La URL no es válida.')
  }

  if (!['http:', 'https:'].includes(url.protocol)) throw auditError('Solo se permiten sitios HTTP o HTTPS.')
  if (url.username || url.password) throw auditError('No incluya credenciales dentro de la URL.')
  const hostname = normalizeHostname(url.hostname)
  if (!hostname || hostname.length > 253 || hostname.includes('..')) throw auditError('El nombre del sitio no es válido.')
  if (net.isIP(hostname)) throw auditError('Por seguridad, ingrese un nombre de dominio público y no una dirección IP directa.')
  if (!hostname.includes('.')) throw auditError('Debe usar un dominio público completo.')
  if (hostname === 'localhost' || BLOCKED_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    throw auditError('No se permiten dominios locales, internos, de laboratorio reservado o de documentación.')
  }

  const explicitPort = url.port ? Number(url.port) : null
  if (explicitPort && !WEB_URL_PORTS.has(explicitPort)) {
    throw auditError('La URL solo puede usar puertos web permitidos: 80, 443, 3000, 8000, 8080 u 8443.')
  }

  let addresses
  try {
    addresses = await dns.resolve4(hostname)
  } catch {
    throw auditError('No fue posible resolver el dominio a una dirección IPv4 pública.', 422)
  }
  const uniqueAddresses = [...new Set(addresses)]
  if (uniqueAddresses.length === 0 || uniqueAddresses.some((ip) => !isPublicIpv4(ip))) {
    throw auditError('El dominio resuelve a una red privada, reservada o no permitida.')
  }

  url.hash = ''
  return {
    url,
    hostname,
    addresses: uniqueAddresses,
    pinnedAddress: uniqueAddresses[0],
    authorizationBasis: body.authorizationBasis,
  }
}

function connectPort(ip, port, timeoutMs = 900) {
  return new Promise((resolve) => {
    const startedAt = Date.now()
    const socket = net.createConnection({ host: ip, port })
    let completed = false
    const finish = (open, reason = '') => {
      if (completed) return
      completed = true
      socket.destroy()
      resolve({ port, open, latencyMs: Date.now() - startedAt, reason })
    }
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false, 'timeout'))
    socket.once('error', (error) => finish(false, error.code || 'error'))
  })
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length)
  let nextIndex = 0
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++
      results[index] = await mapper(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()))
  return results
}

export async function scanCommonPorts(ip, timeoutMs = 900) {
  const results = await mapWithConcurrency(DEFAULT_PORTS, 4, async (definition) => ({
    ...definition,
    ...(await connectPort(ip, definition.port, timeoutMs)),
  }))
  return {
    tested: results.length,
    open: results.filter((item) => item.open),
    closedOrFiltered: results.filter((item) => !item.open).length,
    policy: 'fixed-common-tcp-ports-only',
  }
}

function normalizeHeaders(headers) {
  const output = {}
  for (const [key, value] of Object.entries(headers || {})) {
    if (value === undefined) continue
    output[key.toLowerCase()] = Array.isArray(value) ? value.join('; ') : String(value)
  }
  return output
}

function fetchPinned(url, ip, { timeoutMs = 6000, maxBytes = 256 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http
    const startedAt = Date.now()
    const request = transport.request({
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || undefined,
      path: `${url.pathname || '/'}${url.search || ''}`,
      method: 'GET',
      headers: {
        Host: url.host,
        'User-Agent': 'MULTIA-Authorized-Web-Audit/1.0',
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.2',
        'Accept-Encoding': 'identity',
        Connection: 'close',
      },
      lookup(_hostname, options, callback) {
        if (options?.all) callback(null, [{ address: ip, family: 4 }])
        else callback(null, ip, 4)
      },
      servername: url.hostname,
      rejectUnauthorized: true,
      timeout: timeoutMs,
      maxHeaderSize: 32 * 1024,
    }, (response) => {
      const chunks = []
      let received = 0
      let truncated = false
      response.on('data', (chunk) => {
        if (received >= maxBytes) {
          truncated = true
          return
        }
        const remaining = maxBytes - received
        const selected = chunk.length > remaining ? chunk.subarray(0, remaining) : chunk
        chunks.push(selected)
        received += selected.length
        if (selected.length < chunk.length) truncated = true
      })
      response.on('end', () => resolve({
        statusCode: response.statusCode || 0,
        headers: normalizeHeaders(response.headers),
        body: Buffer.concat(chunks).toString('utf8'),
        bodyTruncated: truncated,
        durationMs: Date.now() - startedAt,
      }))
    })
    request.once('timeout', () => request.destroy(auditError('El sitio no respondió dentro del tiempo permitido.', 504)))
    request.once('error', reject)
    request.end()
  })
}

function inspectTls(hostname, ip, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const socket = tls.connect({
      host: ip,
      port: 443,
      servername: hostname,
      rejectUnauthorized: false,
      timeout: timeoutMs,
    })
    const finish = (value) => {
      socket.destroy()
      resolve(value)
    }
    socket.once('secureConnect', () => {
      const certificate = socket.getPeerCertificate()
      const validTo = certificate?.valid_to ? new Date(certificate.valid_to) : null
      const daysRemaining = validTo && Number.isFinite(validTo.getTime())
        ? Math.floor((validTo.getTime() - Date.now()) / 86_400_000)
        : null
      finish({
        available: true,
        authorized: socket.authorized,
        authorizationError: socket.authorizationError || '',
        protocol: socket.getProtocol() || '',
        cipher: socket.getCipher()?.standardName || socket.getCipher()?.name || '',
        issuer: certificate?.issuer?.O || certificate?.issuer?.CN || '',
        subject: certificate?.subject?.CN || '',
        validFrom: certificate?.valid_from || '',
        validTo: certificate?.valid_to || '',
        daysRemaining,
      })
    })
    socket.once('timeout', () => finish({ available: false, error: 'timeout' }))
    socket.once('error', (error) => finish({ available: false, error: error.code || error.message }))
  })
}

function extractVersion(text) {
  const match = String(text || '').match(/(?:^|[\s/_-])v?(\d+\.\d+(?:\.\d+)?(?:[-+._a-z0-9]*)?)/i)
  return match?.[1] || ''
}

function addTechnology(list, technology) {
  if (!technology?.name) return
  const key = `${technology.name.toLowerCase()}@${technology.version || ''}`
  if (!list.some((item) => `${item.name.toLowerCase()}@${item.version || ''}` === key)) list.push(technology)
}

export function detectTechnologies(headers = {}, html = '') {
  const technologies = []
  const server = headers.server || ''
  if (server) {
    const name = server.split(/[\s/]/)[0]
    addTechnology(technologies, { name, version: extractVersion(server), evidence: 'HTTP Server header', confidence: 'medium' })
  }
  const poweredBy = headers['x-powered-by'] || ''
  if (poweredBy) {
    const name = poweredBy.split(/[\s/]/)[0]
    addTechnology(technologies, { name, version: extractVersion(poweredBy), evidence: 'X-Powered-By header', confidence: 'medium' })
  }
  const aspNetVersion = headers['x-aspnet-version'] || ''
  if (aspNetVersion) addTechnology(technologies, { name: 'ASP.NET', version: aspNetVersion, evidence: 'X-AspNet-Version header', confidence: 'high' })

  const generator = String(html).match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i)
    || String(html).match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']generator["']/i)
  if (generator?.[1]) {
    const value = generator[1].trim()
    addTechnology(technologies, { name: value.split(/[\s/]/)[0], version: extractVersion(value), evidence: 'meta generator', confidence: 'high' })
  }

  const patterns = [
    ['jquery', /(?:jquery[.-])([0-9]+\.[0-9]+(?:\.[0-9]+)?)[^"']*\.js/i],
    ['bootstrap', /(?:bootstrap[.-])([0-9]+\.[0-9]+(?:\.[0-9]+)?)[^"']*\.(?:js|css)/i],
    ['lodash', /(?:lodash[.-])([0-9]+\.[0-9]+(?:\.[0-9]+)?)[^"']*\.js/i],
    ['vue', /(?:vue(?:\.global|\.runtime)?[.-])([0-9]+\.[0-9]+(?:\.[0-9]+)?)[^"']*\.js/i],
    ['angular', /(?:angular[.-])([0-9]+\.[0-9]+(?:\.[0-9]+)?)[^"']*\.js/i],
    ['react', /(?:react(?:-dom)?[.-])([0-9]+\.[0-9]+(?:\.[0-9]+)?)[^"']*\.js/i],
  ]
  for (const [name, pattern] of patterns) {
    const match = String(html).match(pattern)
    if (match?.[1]) addTechnology(technologies, { name, version: match[1], evidence: 'asset filename', confidence: 'medium' })
  }
  return technologies.slice(0, 12)
}

function analyzeHeaders(headers, protocol) {
  const present = []
  const missing = []
  for (const [key, label] of SECURITY_HEADERS) {
    if (headers[key]) present.push(label)
    else missing.push(label)
  }
  const cookies = headers['set-cookie'] || ''
  const cookieReview = cookies
    ? {
        observed: true,
        secure: /;\s*secure\b/i.test(cookies),
        httpOnly: /;\s*httponly\b/i.test(cookies),
        sameSite: /;\s*samesite=/i.test(cookies),
      }
    : { observed: false, secure: null, httpOnly: null, sameSite: null }
  return {
    present,
    missing,
    usesHttps: protocol === 'https:',
    versionDisclosure: Boolean(headers.server || headers['x-powered-by'] || headers['x-aspnet-version']),
    cookies: cookieReview,
  }
}

async function queryOsv(technologies, signal) {
  const queries = technologies
    .filter((item) => item.version && NPM_TECH_MAP[item.name.toLowerCase()])
    .slice(0, 8)
    .map((item) => ({
      technology: item,
      query: { package: { name: NPM_TECH_MAP[item.name.toLowerCase()], ecosystem: 'npm' }, version: item.version },
    }))
  if (queries.length === 0) return { attempted: false, results: [], source: 'OSV.dev' }

  try {
    const response = await fetch('https://api.osv.dev/v1/querybatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'MULTIA-Authorized-Web-Audit/1.0' },
      body: JSON.stringify({ queries: queries.map((item) => item.query) }),
      signal,
    })
    if (!response.ok) throw new Error(`OSV HTTP ${response.status}`)
    const payload = await response.json()
    return {
      attempted: true,
      source: 'OSV.dev',
      results: queries.map((item, index) => ({
        package: item.query.package.name,
        observedVersion: item.query.version,
        vulnerabilityIds: (payload.results?.[index]?.vulns || []).map((vulnerability) => vulnerability.id).slice(0, 20),
      })),
    }
  } catch (error) {
    return { attempted: true, source: 'OSV.dev', results: [], error: error.name === 'AbortError' ? 'timeout' : error.message }
  }
}

function scoreAudit({ url, ports, tlsInfo, headerReview, advisories }) {
  let score = 100
  if (url.protocol !== 'https:') score -= 25
  if (!tlsInfo.available && url.protocol === 'https:') score -= 20
  if (tlsInfo.daysRemaining !== null && tlsInfo.daysRemaining < 30) score -= 15
  score -= Math.min(30, headerReview.missing.length * 5)
  if (headerReview.versionDisclosure) score -= 5
  const riskyPorts = ports.open.filter((item) => ![80, 443].includes(item.port))
  score -= Math.min(25, riskyPorts.length * 5)
  const knownVulnerabilities = advisories.results.reduce((total, item) => total + item.vulnerabilityIds.length, 0)
  score -= Math.min(35, knownVulnerabilities * 7)
  return Math.max(0, Math.min(100, score))
}

function buildAssessment({ url, ports, tlsInfo, headerReview, technologies, advisories }) {
  const positives = []
  const negatives = []
  const improvements = []
  if (url.protocol === 'https:') positives.push('El sitio fue evaluado mediante HTTPS.')
  else negatives.push('La URL evaluada utiliza HTTP sin cifrado.')
  if (tlsInfo.available && tlsInfo.authorized) positives.push('El certificado TLS fue aceptado y pudo verificarse.')
  if (tlsInfo.available && !tlsInfo.authorized) {
    negatives.push(`El certificado TLS no pudo validarse correctamente${tlsInfo.authorizationError ? `: ${tlsInfo.authorizationError}` : '.'}`)
    improvements.push('Corregir la cadena, el nombre o la vigencia del certificado TLS y repetir la validación.')
  }
  if (tlsInfo.daysRemaining !== null && tlsInfo.daysRemaining < 30) {
    negatives.push(`El certificado TLS vence aproximadamente en ${tlsInfo.daysRemaining} días.`)
    improvements.push('Renovar y probar el certificado TLS antes de su vencimiento.')
  }
  if (headerReview.present.length) positives.push(`Se observaron ${headerReview.present.length} cabeceras de seguridad recomendadas.`)
  if (headerReview.missing.length) {
    negatives.push(`Faltan o no fueron visibles: ${headerReview.missing.join(', ')}.`)
    improvements.push(`Configurar y validar las cabeceras faltantes: ${headerReview.missing.join(', ')}.`)
  }
  if (headerReview.versionDisclosure) {
    negatives.push('El sitio publica información de tecnología o versión en cabeceras HTTP.')
    improvements.push('Reducir la divulgación de versiones en Server, X-Powered-By y cabeceras equivalentes.')
  }
  const nonWebPorts = ports.open.filter((item) => ![80, 443].includes(item.port))
  if (nonWebPorts.length === 0) positives.push('No se observaron puertos adicionales dentro del conjunto preventivo evaluado.')
  else {
    negatives.push(`Se observaron puertos adicionales: ${nonWebPorts.map((item) => `${item.port}/${item.service}`).join(', ')}.`)
    improvements.push('Confirmar que cada puerto adicional sea necesario, esté actualizado, autenticado y restringido por red.')
  }
  const vulnerabilities = advisories.results.flatMap((item) => item.vulnerabilityIds.map((id) => `${item.package}@${item.observedVersion}: ${id}`))
  if (vulnerabilities.length) {
    negatives.push(`OSV devolvió ${vulnerabilities.length} identificadores asociados a versiones visibles de paquetes.`)
    improvements.push('Confirmar la versión real instalada y aplicar la actualización recomendada por el proveedor para cada aviso aplicable.')
  } else if (advisories.attempted && !advisories.error) {
    positives.push('No se encontraron avisos OSV para las versiones exactas de paquetes compatibles que fueron visibles.')
  }
  if (technologies.some((item) => item.version)) improvements.push('Mantener un inventario interno de componentes y un calendario de parches; la versión visible en una página puede ser incompleta o engañosa.')

  return {
    positives,
    negatives,
    improvements: [...new Set(improvements)],
    limitations: [
      'La evaluación usa conexiones no intrusivas y un conjunto fijo de puertos TCP comunes.',
      'No realiza explotación, autenticación, fuerza bruta, enumeración profunda, UDP ni escaneo de rutas.',
      'Las cabeceras y nombres de archivos pueden ocultar o falsear una versión; todo hallazgo requiere confirmación administrativa.',
      'Un puerto que no respondió puede estar cerrado, filtrado o temporalmente inaccesible.',
    ],
  }
}

export async function auditAuthorizedWebsite(body = {}) {
  const target = await validateAuditTarget(body.target, body)
  const controller = new AbortController()
  const overallTimeout = setTimeout(() => controller.abort(), 14_000)

  try {
    const [ports, tlsInfo, webResult] = await Promise.all([
      scanCommonPorts(target.pinnedAddress),
      inspectTls(target.hostname, target.pinnedAddress),
      fetchPinned(target.url, target.pinnedAddress).catch((error) => ({
        statusCode: 0,
        headers: {},
        body: '',
        bodyTruncated: false,
        durationMs: 0,
        error: error.code || error.message,
      })),
    ])

    const technologies = detectTechnologies(webResult.headers, webResult.body)
    const headerReview = analyzeHeaders(webResult.headers, target.url.protocol)
    const advisories = await queryOsv(technologies, controller.signal)
    const assessment = buildAssessment({
      url: target.url,
      ports,
      tlsInfo,
      headerReview,
      technologies,
      advisories,
    })
    const score = scoreAudit({
      url: target.url,
      ports,
      tlsInfo,
      headerReview,
      advisories,
    })

    return {
      auditType: 'authorized-preventive-web-review',
      target: {
        origin: target.url.origin,
        hostname: target.hostname,
        path: target.url.pathname || '/',
        resolvedPublicAddresses: target.addresses.length,
      },
      authorization: {
        confirmed: true,
        basis: target.authorizationBasis,
      },
      timestamp: new Date().toISOString(),
      score,
      web: {
        statusCode: webResult.statusCode,
        durationMs: webResult.durationMs,
        bodyTruncated: webResult.bodyTruncated,
        error: webResult.error || '',
        redirectLocation: webResult.headers.location ? (() => {
          try {
            const redirect = new URL(webResult.headers.location, target.url)
            return redirect.hostname === target.hostname ? redirect.pathname : `[otro dominio: ${redirect.hostname}]`
          } catch {
            return '[ubicación no válida]'
          }
        })() : '',
      },
      ports,
      tls: tlsInfo,
      securityHeaders: headerReview,
      technologies,
      advisories,
      assessment,
      guardrails: {
        exploitation: false,
        bruteForce: false,
        customPorts: false,
        udp: false,
        internalNetworksBlocked: true,
        rawIpTargetsBlocked: true,
        redirectsNotFollowed: true,
        bannerGrabbing: false,
      },
    }
  } finally {
    clearTimeout(overallTimeout)
  }
}

export { DEFAULT_PORTS }
