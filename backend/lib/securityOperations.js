const MAX_ARTIFACT_BYTES = 1_500_000
const MAX_PACKAGES_FOR_ADVISORIES = 30

const AUTHORIZATION_BASES = new Set([
  'owner',
  'administrator',
  'written-permission',
  'controlled-lab',
])

const SECURITY_HEADERS = [
  'strict-transport-security',
  'content-security-policy',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
  'cross-origin-opener-policy',
]

function reviewError(message, status = 400) {
  return Object.assign(new Error(message), { status })
}

function cleanText(value, maxLength = 300) {
  return String(value || '')
    .replace(/[\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function ensureAuthorized(body = {}) {
  if (body.authorizationConfirmed !== true) {
    throw reviewError('Debe confirmar que el archivo pertenece a un sistema propio, administrado o expresamente autorizado.')
  }
  if (!AUTHORIZATION_BASES.has(String(body.authorizationBasis || ''))) {
    throw reviewError('Seleccione una base de autorización válida.')
  }
}

function ensureContent(body = {}) {
  const content = String(body.content || '')
  if (!content.trim()) throw reviewError('El archivo o contenido de análisis está vacío.')
  const bytes = Buffer.byteLength(content, 'utf8')
  if (bytes > MAX_ARTIFACT_BYTES) throw reviewError('El archivo supera el límite de 1,5 MB para análisis preventivo.')
  return { content, bytes }
}

function decodeXml(value) {
  return String(value || '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function xmlAttribute(fragment, name) {
  const match = String(fragment || '').match(new RegExp(`${name}=["']([^"']*)["']`, 'i'))
  return match ? decodeXml(match[1]) : ''
}

function parseNmapXml(content) {
  if (!/<nmaprun\b/i.test(content)) throw reviewError('El contenido no parece un reporte XML de inventario de puertos.')
  const hosts = []
  const hostMatches = content.match(/<host\b[\s\S]*?<\/host>/gi) || []

  for (const hostBlock of hostMatches.slice(0, 100)) {
    const addressTag = hostBlock.match(/<address\b[^>]*>/i)?.[0] || ''
    const hostnameTag = hostBlock.match(/<hostname\b[^>]*>/i)?.[0] || ''
    const stateTag = hostBlock.match(/<status\b[^>]*>/i)?.[0] || ''
    const ports = []
    const portMatches = hostBlock.match(/<port\b[\s\S]*?<\/port>/gi) || []

    for (const portBlock of portMatches.slice(0, 200)) {
      const open = /<state\b[^>]*state=["']open["']/i.test(portBlock)
      if (!open) continue
      const portTag = portBlock.match(/<port\b[^>]*>/i)?.[0] || ''
      const serviceTag = portBlock.match(/<service\b[^>]*>/i)?.[0] || ''
      ports.push({
        protocol: xmlAttribute(portTag, 'protocol') || 'tcp',
        port: Number(xmlAttribute(portTag, 'portid')) || null,
        service: cleanText(xmlAttribute(serviceTag, 'name'), 80),
        product: cleanText(xmlAttribute(serviceTag, 'product'), 120),
        version: cleanText(xmlAttribute(serviceTag, 'version'), 80),
      })
    }

    hosts.push({
      address: cleanText(xmlAttribute(addressTag, 'addr'), 80),
      hostname: cleanText(xmlAttribute(hostnameTag, 'name'), 160),
      state: cleanText(xmlAttribute(stateTag, 'state'), 40),
      openPorts: ports,
    })
  }

  const openPorts = hosts.flatMap((host) => host.openPorts.map((port) => ({ ...port, host: host.hostname || host.address || 'host' })))
  return {
    artifactType: 'network-inventory-report',
    summary: {
      hosts: hosts.length,
      openPorts: openPorts.length,
      servicesWithVersion: openPorts.filter((item) => item.version).length,
    },
    hosts,
    inventory: openPorts.slice(0, 300),
  }
}

function normalizePackage(name, version, ecosystem) {
  const cleanName = cleanText(name, 180)
  const cleanVersion = cleanText(String(version || '').replace(/^[=~^<>!\s]+/, ''), 80)
  if (!cleanName || !cleanVersion) return null
  return { name: cleanName, version: cleanVersion, ecosystem }
}

function parsePackageLock(content) {
  let payload
  try {
    payload = JSON.parse(content)
  } catch {
    throw reviewError('El archivo package-lock.json no contiene JSON válido.')
  }

  const packages = []
  if (payload.packages && typeof payload.packages === 'object') {
    for (const [path, value] of Object.entries(payload.packages)) {
      if (!path.startsWith('node_modules/') || !value?.version) continue
      const packageName = path.slice('node_modules/'.length)
      const normalized = normalizePackage(packageName, value.version, 'npm')
      if (normalized) packages.push(normalized)
    }
  } else if (payload.dependencies && typeof payload.dependencies === 'object') {
    for (const [name, value] of Object.entries(payload.dependencies)) {
      const normalized = normalizePackage(name, value?.version, 'npm')
      if (normalized) packages.push(normalized)
    }
  }

  return {
    artifactType: 'dependency-manifest',
    summary: { packages: packages.length, ecosystem: 'npm' },
    packages: packages.slice(0, 1000),
  }
}

function parseRequirements(content) {
  const packages = []
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || line.startsWith('-')) continue
    const match = line.match(/^([A-Za-z0-9_.-]+)\s*(?:==|===|~=|>=|<=|>|<)\s*([A-Za-z0-9_.+!-]+)/)
    if (!match) continue
    const normalized = normalizePackage(match[1], match[2], 'PyPI')
    if (normalized) packages.push(normalized)
  }
  return {
    artifactType: 'dependency-manifest',
    summary: { packages: packages.length, ecosystem: 'PyPI' },
    packages: packages.slice(0, 1000),
  }
}

function parseCycloneDx(content) {
  let payload
  try {
    payload = JSON.parse(content)
  } catch {
    throw reviewError('El archivo SBOM no contiene JSON válido.')
  }
  if (!Array.isArray(payload.components)) throw reviewError('El archivo no parece un SBOM CycloneDX con componentes.')
  const packages = payload.components
    .map((component) => normalizePackage(
      component.name,
      component.version,
      String(component.purl || '').startsWith('pkg:npm/') ? 'npm'
        : String(component.purl || '').startsWith('pkg:pypi/') ? 'PyPI'
          : '',
    ))
    .filter((item) => item?.ecosystem)
  return {
    artifactType: 'software-bill-of-materials',
    summary: { packages: packages.length, format: 'CycloneDX' },
    packages: packages.slice(0, 1000),
  }
}

function parseHeadersJson(content) {
  let payload
  try {
    payload = JSON.parse(content)
  } catch {
    throw reviewError('El archivo de cabeceras no contiene JSON válido.')
  }
  const rawHeaders = payload.headers && typeof payload.headers === 'object' ? payload.headers : payload
  if (!rawHeaders || typeof rawHeaders !== 'object' || Array.isArray(rawHeaders)) {
    throw reviewError('El JSON debe contener un objeto de cabeceras HTTP.')
  }
  const headers = Object.fromEntries(Object.entries(rawHeaders).map(([key, value]) => [key.toLowerCase(), cleanText(value, 500)]))
  const present = SECURITY_HEADERS.filter((header) => Boolean(headers[header]))
  const missing = SECURITY_HEADERS.filter((header) => !headers[header])
  return {
    artifactType: 'http-headers-export',
    summary: { headers: Object.keys(headers).length, securityHeadersPresent: present.length, securityHeadersMissing: missing.length },
    headers,
    securityHeaders: { present, missing },
  }
}

function parseSecurityLog(content) {
  const lines = content.split(/\r?\n/).filter(Boolean).slice(0, 20_000)
  const rules = [
    ['failedAuthentication', /failed (?:password|login|authentication)|authentication failure|invalid user|credenciales? inválidas?/i],
    ['accessDenied', /access denied|permission denied|forbidden|unauthorized|status[=: ]+(?:401|403)\b/i],
    ['serverErrors', /status[=: ]+5\d\d\b|\s5\d\d\s|internal server error|uncaught exception|stack trace/i],
    ['rateLimited', /rate limit|too many requests|status[=: ]+429\b|\s429\s/i],
    ['suspiciousInput', /(?:\.\.\/|%2e%2e%2f|<script|union\s+select|\bselect\b.+\bfrom\b|cmd=|powershell|\/etc\/passwd)/i],
  ]
  const counts = Object.fromEntries(rules.map(([name]) => [name, 0]))
  const samples = []
  lines.forEach((line, index) => {
    const hits = rules.filter(([, pattern]) => pattern.test(line)).map(([name]) => name)
    for (const hit of hits) counts[hit] += 1
    if (hits.length && samples.length < 20) {
      const redacted = line
        .replace(/(password|passwd|token|secret|authorization)[=: ]+[^\s,;]+/gi, '$1=[REDACTADO]')
        .replace(/[A-Fa-f0-9]{32,}/g, '[IDENTIFICADOR-REDACTADO]')
      samples.push({ line: index + 1, categories: hits, text: cleanText(redacted, 260) })
    }
  })
  return {
    artifactType: 'security-log-sample',
    summary: { linesReviewed: lines.length, signals: Object.values(counts).reduce((total, value) => total + value, 0) },
    counts,
    samples,
  }
}

function inferArtifactType(fileName, requestedType, content) {
  if (requestedType && requestedType !== 'auto') return requestedType
  const lower = String(fileName || '').toLowerCase()
  if (lower.endsWith('.xml') || /<nmaprun\b/i.test(content)) return 'nmap-xml'
  if (lower.includes('package-lock')) return 'package-lock'
  if (lower.includes('requirements')) return 'requirements'
  if (lower.includes('bom') || lower.includes('cyclonedx')) return 'cyclonedx'
  if (lower.includes('header') && lower.endsWith('.json')) return 'headers-json'
  return 'security-log'
}

async function queryOsv(packages) {
  const selected = packages
    .filter((item) => item?.name && item?.version && ['npm', 'PyPI'].includes(item.ecosystem))
    .slice(0, MAX_PACKAGES_FOR_ADVISORIES)
  if (!selected.length) return { attempted: false, source: 'OSV.dev', results: [] }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 7_000)
  try {
    const response = await fetch('https://api.osv.dev/v1/querybatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'MULTIA-Authorized-Artifact-Review/1.0' },
      body: JSON.stringify({
        queries: selected.map((item) => ({ package: { name: item.name, ecosystem: item.ecosystem }, version: item.version })),
      }),
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`OSV HTTP ${response.status}`)
    const payload = await response.json()
    return {
      attempted: true,
      source: 'OSV.dev',
      results: selected.map((item, index) => ({
        package: item.name,
        version: item.version,
        ecosystem: item.ecosystem,
        vulnerabilityIds: (payload.results?.[index]?.vulns || []).map((item) => item.id).slice(0, 25),
      })),
      truncated: packages.length > selected.length,
    }
  } catch (error) {
    return {
      attempted: true,
      source: 'OSV.dev',
      results: [],
      error: error.name === 'AbortError' ? 'timeout' : cleanText(error.message, 160),
    }
  } finally {
    clearTimeout(timeout)
  }
}

function buildAssessment(analysis, advisories) {
  const positives = []
  const negatives = []
  const improvements = []

  if (analysis.artifactType === 'network-inventory-report') {
    if (analysis.summary.hosts) positives.push(`El reporte permite inventariar ${analysis.summary.hosts} host(s) autorizado(s).`)
    if (analysis.summary.openPorts === 0) positives.push('No se registraron puertos abiertos en el reporte importado.')
    if (analysis.summary.openPorts > 0) {
      negatives.push(`El reporte registra ${analysis.summary.openPorts} puerto(s) abierto(s); esto representa exposición, no una vulnerabilidad demostrada.`)
      improvements.push('Validar necesidad, propietario, autenticación, filtrado y calendario de actualización de cada servicio expuesto.')
    }
    if (analysis.summary.servicesWithVersion > 0) improvements.push('Confirmar administrativamente las versiones: los banners pueden ser incompletos o modificados.')
  }

  if (['dependency-manifest', 'software-bill-of-materials'].includes(analysis.artifactType)) {
    positives.push(`Se obtuvo un inventario de ${analysis.summary.packages} dependencia(s) con versión.`)
    if (!analysis.summary.packages) negatives.push('No se encontraron dependencias con versión fija para verificar.')
    improvements.push('Mantener SBOM, política de actualización, pruebas de regresión y revisión de licencias antes de actualizar.')
  }

  if (analysis.artifactType === 'http-headers-export') {
    if (analysis.securityHeaders.present.length) positives.push(`Se observaron ${analysis.securityHeaders.present.length} cabeceras preventivas.`)
    if (analysis.securityHeaders.missing.length) {
      negatives.push(`No se observaron: ${analysis.securityHeaders.missing.join(', ')}.`)
      improvements.push('Configurar las cabeceras faltantes y probar compatibilidad en un entorno previo a producción.')
    }
  }

  if (analysis.artifactType === 'security-log-sample') {
    if (!analysis.summary.signals) positives.push('La muestra no coincidió con las señales preventivas básicas configuradas.')
    if (analysis.summary.signals) {
      negatives.push(`La muestra contiene ${analysis.summary.signals} coincidencia(s) que requieren revisión humana.`)
      improvements.push('Correlacionar fecha, usuario, origen, activo y resultado; no bloquear ni acusar a una persona basándose solo en patrones de texto.')
    }
  }

  const vulnerabilityCount = advisories.results.reduce((total, item) => total + item.vulnerabilityIds.length, 0)
  if (vulnerabilityCount) {
    negatives.push(`OSV devolvió ${vulnerabilityCount} identificador(es) asociados a versiones declaradas.`)
    improvements.push('Confirmar que la versión esté realmente instalada, revisar el aviso oficial y aplicar una versión corregida con pruebas y plan de reversión.')
  } else if (advisories.attempted && !advisories.error) {
    positives.push('No se encontraron coincidencias OSV para las versiones consultadas; esto no sustituye otras fuentes ni una revisión continua.')
  }

  return {
    positives,
    negatives,
    improvements: [...new Set(improvements)],
    limitations: [
      'El módulo analiza archivos aportados; no ejecuta herramientas, comandos ni pruebas contra sistemas.',
      'No realiza explotación, fuerza bruta, evasión, persistencia, malware ni recuperación de credenciales.',
      'Los resultados automáticos son señales preliminares y requieren validación del responsable técnico.',
      'No se deben usar los resultados para vigilar, identificar o acusar a personas.',
    ],
  }
}

function scoreReview(analysis, advisories) {
  let score = 100
  if (analysis.artifactType === 'network-inventory-report') score -= Math.min(35, analysis.summary.openPorts * 3)
  if (analysis.artifactType === 'http-headers-export') score -= Math.min(35, analysis.summary.securityHeadersMissing * 6)
  if (analysis.artifactType === 'security-log-sample') score -= Math.min(30, analysis.summary.signals * 2)
  const vulnerabilityCount = advisories.results.reduce((total, item) => total + item.vulnerabilityIds.length, 0)
  score -= Math.min(50, vulnerabilityCount * 8)
  return Math.max(0, score)
}

export async function analyzeAuthorizedArtifact(body = {}) {
  ensureAuthorized(body)
  const { content, bytes } = ensureContent(body)
  const fileName = cleanText(body.fileName, 180) || 'evidencia.txt'
  const detectedType = inferArtifactType(fileName, String(body.artifactType || 'auto'), content)

  let analysis
  switch (detectedType) {
    case 'nmap-xml': analysis = parseNmapXml(content); break
    case 'package-lock': analysis = parsePackageLock(content); break
    case 'requirements': analysis = parseRequirements(content); break
    case 'cyclonedx': analysis = parseCycloneDx(content); break
    case 'headers-json': analysis = parseHeadersJson(content); break
    case 'security-log': analysis = parseSecurityLog(content); break
    default: throw reviewError('El tipo de archivo seleccionado no está permitido.')
  }

  const advisories = analysis.packages ? await queryOsv(analysis.packages) : { attempted: false, source: 'OSV.dev', results: [] }
  const assessment = buildAssessment(analysis, advisories)

  return {
    reviewType: 'authorized-artifact-security-review',
    timestamp: new Date().toISOString(),
    file: { name: fileName, bytes, detectedType },
    authorization: { confirmed: true, basis: body.authorizationBasis },
    score: scoreReview(analysis, advisories),
    analysis,
    advisories,
    assessment,
    guardrails: {
      commandExecution: false,
      activeScanning: false,
      exploitation: false,
      bruteForce: false,
      credentialRecovery: false,
      personTracking: false,
      fileStored: false,
    },
  }
}

export const SECURITY_ARTIFACT_LIMITS = {
  maxBytes: MAX_ARTIFACT_BYTES,
  maxAdvisoryPackages: MAX_PACKAGES_FOR_ADVISORIES,
  supportedTypes: ['nmap-xml', 'package-lock', 'requirements', 'cyclonedx', 'headers-json', 'security-log'],
}
