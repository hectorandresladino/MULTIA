import { apiJson } from './apiClient'

const MAX_ARTIFACT_BYTES = 1_500_000
const MAX_ROUTE_BYTES = 5_000_000
const ASSET_STORAGE_KEY = 'multia-owned-assets-v1'

function cleanText(value, maxLength = 500) {
  return String(value || '')
    .replace(/[\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function ensureFile(file, maxBytes, label) {
  if (!(file instanceof File)) throw new Error(`Seleccione un ${label} válido.`)
  if (file.size > maxBytes) throw new Error(`El ${label} supera el límite permitido.`)
}

function advisoryList(result) {
  return result.advisories?.results?.flatMap((item) =>
    item.vulnerabilityIds.map((id) => `${item.package}@${item.version}: ${id}`)
  ) || []
}

export function buildArtifactCouncilPrompt(result) {
  const inventory = result.analysis?.inventory?.slice(0, 80).map((item) =>
    `${item.host}: ${item.port}/${item.protocol} ${item.service || ''} ${item.product || ''} ${item.version || ''}`.trim()
  ).join('\n') || 'No aplica'
  const signals = result.analysis?.counts
    ? Object.entries(result.analysis.counts).map(([key, value]) => `${key}: ${value}`).join(', ')
    : 'No aplica'
  const advisories = advisoryList(result).join(', ') || 'Sin coincidencias exactas disponibles'

  return `Analiza este INFORME DE OPERACIONES DE SEGURIDAD AUTORIZADAS con los 185 agentes y el consejo experto.

Reglas obligatorias:
- El análisis se limita a un archivo aportado por el propietario, administrador, persona con permiso escrito o laboratorio controlado.
- No propongas explotación, fuerza bruta, evasión, persistencia, malware, robo de credenciales, seguimiento de personas ni comandos contra sistemas.
- Distingue exposición, señal, hipótesis y vulnerabilidad confirmada.
- Una versión o un puerto declarado en un reporte debe verificarse administrativamente.
- Prioriza inventario, reducción de exposición, parches comprobados, pruebas, continuidad, privacidad y revalidación.

Archivo: ${result.file?.name || ''}
Tipo detectado: ${result.file?.detectedType || ''}
Fecha: ${result.timestamp || ''}
Puntuación preventiva: ${result.score}/100
Resumen: ${JSON.stringify(result.analysis?.summary || {})}
Inventario limitado:\n${inventory}
Señales de registros: ${signals}
Avisos públicos por versión declarada: ${advisories}
Aspectos positivos automáticos: ${result.assessment?.positives?.join(' | ') || 'Ninguno registrado'}
Aspectos negativos o riesgos: ${result.assessment?.negatives?.join(' | ') || 'Ninguno registrado'}
Mejoras automáticas: ${result.assessment?.improvements?.join(' | ') || 'Ninguna registrada'}
Limitaciones: ${result.assessment?.limitations?.join(' | ') || ''}

Entrega: conclusión ejecutiva, activos y evidencias observadas, aspectos positivos, aspectos negativos, riesgos posibles, prioridades, parches que deben verificarse en fuentes oficiales, plan de remediación, pruebas de revalidación, responsables sugeridos y visión futura.`
}

export async function reviewSecurityArtifact(file, payload, { signal } = {}) {
  ensureFile(file, MAX_ARTIFACT_BYTES, 'archivo de evidencia')
  const content = await file.text()
  const data = await apiJson('/api/security/artifact-review', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      fileName: file.name,
      content,
    }),
    signal,
  })
  return { ...data, councilPrompt: buildArtifactCouncilPrompt(data) }
}

function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('El navegador no ofrece ubicación del dispositivo.'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, (error) => {
      const messages = {
        1: 'El permiso de ubicación fue rechazado.',
        2: 'La ubicación del dispositivo no está disponible.',
        3: 'La solicitud de ubicación agotó el tiempo permitido.',
      }
      reject(new Error(messages[error.code] || 'No fue posible obtener la ubicación.'))
    }, {
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 60_000,
      ...options,
    })
  })
}

async function reverseCoarse(latitude, longitude, signal) {
  try {
    return await apiJson(`/api/location/reverse?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`, { signal })
  } catch {
    return null
  }
}

export async function locateThisDevice({ consentConfirmed, signal } = {}) {
  if (!consentConfirmed) throw new Error('Debe confirmar que este es su dispositivo y autorizar la ubicación puntual.')
  const position = await getCurrentPosition()
  const latitude = position.coords.latitude
  const longitude = position.coords.longitude
  const place = await reverseCoarse(latitude, longitude, signal)
  return {
    place,
    accuracyMeters: Math.round(position.coords.accuracy || 0),
    capturedAt: new Date(position.timestamp || Date.now()).toISOString(),
    prompt: buildOwnDevicePrompt({ place, accuracyMeters: Math.round(position.coords.accuracy || 0) }),
  }
}

export function buildOwnDevicePrompt({ place, accuracyMeters }) {
  const location = [place?.city, place?.state, place?.country].filter(Boolean).join(', ') || 'No determinada'
  return `Analiza esta UBICACIÓN VOLUNTARIA DEL DISPOSITIVO ACTUAL con los 185 agentes.

Límites obligatorios:
- El usuario autorizó una lectura puntual de su propio dispositivo.
- No intentes localizar otro teléfono, inferir un domicilio, seguir una persona ni construir vigilancia continua.
- No solicites IMEI, credenciales, cuentas, número telefónico ni identificadores de terceros.
- Usa solo la ubicación aproximada y recomienda los servicios oficiales del fabricante para un equipo perdido.

Ubicación aproximada: ${location}
Precisión declarada por el navegador: aproximadamente ${Number.isFinite(accuracyMeters) ? accuracyMeters : 'desconocidos'} metros.

Entrega: explicación de la precisión, aspectos positivos, limitaciones y riesgos, recomendaciones de privacidad, procedimiento seguro para proteger un dispositivo propio perdido y mejoras futuras sin seguimiento oculto.`
}

function radians(value) {
  return value * Math.PI / 180
}

function distanceMeters(a, b) {
  const earthRadius = 6_371_000
  const latitudeDelta = radians(b.latitude - a.latitude)
  const longitudeDelta = radians(b.longitude - a.longitude)
  const latitude1 = radians(a.latitude)
  const latitude2 = radians(b.latitude)
  const h = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2
  return 2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(h)))
}

function normalizePoint(latitude, longitude, time = null) {
  const lat = Number(latitude)
  const lon = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
  let timestamp = null
  if (time) {
    const date = new Date(time)
    if (!Number.isNaN(date.getTime())) timestamp = date.toISOString()
  }
  return { latitude: lat, longitude: lon, time: timestamp }
}

function parseGpx(content) {
  const document = new DOMParser().parseFromString(content, 'application/xml')
  if (document.querySelector('parsererror')) throw new Error('El archivo GPX no es válido.')
  return [...document.querySelectorAll('trkpt, rtept, wpt')].map((node) =>
    normalizePoint(node.getAttribute('lat'), node.getAttribute('lon'), node.querySelector('time')?.textContent)
  ).filter(Boolean)
}

function parseGeoJson(content) {
  let payload
  try { payload = JSON.parse(content) } catch { throw new Error('El archivo GeoJSON no contiene JSON válido.') }
  const points = []
  const addCoordinates = (coordinates) => {
    if (!Array.isArray(coordinates)) return
    if (coordinates.length >= 2 && Number.isFinite(Number(coordinates[0])) && Number.isFinite(Number(coordinates[1]))) {
      const point = normalizePoint(coordinates[1], coordinates[0])
      if (point) points.push(point)
      return
    }
    coordinates.forEach(addCoordinates)
  }
  if (payload.type === 'FeatureCollection') payload.features?.forEach((feature) => addCoordinates(feature?.geometry?.coordinates))
  else if (payload.type === 'Feature') addCoordinates(payload.geometry?.coordinates)
  else addCoordinates(payload.coordinates)
  return points
}

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) throw new Error('El CSV no contiene suficientes filas.')
  const delimiter = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(delimiter).map((value) => value.trim().toLowerCase())
  const latIndex = headers.findIndex((value) => ['lat', 'latitude', 'latitud'].includes(value))
  const lonIndex = headers.findIndex((value) => ['lon', 'lng', 'longitude', 'longitud'].includes(value))
  const timeIndex = headers.findIndex((value) => ['time', 'timestamp', 'fecha', 'datetime'].includes(value))
  if (latIndex < 0 || lonIndex < 0) throw new Error('El CSV debe contener columnas lat/latitude y lon/longitude.')
  return lines.slice(1).map((line) => {
    const cells = line.split(delimiter).map((value) => value.trim())
    return normalizePoint(cells[latIndex], cells[lonIndex], timeIndex >= 0 ? cells[timeIndex] : null)
  }).filter(Boolean)
}

export function summarizeRoutePoints(points) {
  if (!Array.isArray(points) || points.length < 2) throw new Error('El trayecto debe contener al menos dos puntos válidos.')
  let totalMeters = 0
  for (let index = 1; index < points.length; index += 1) totalMeters += distanceMeters(points[index - 1], points[index])
  const timed = points.filter((point) => point.time)
  let durationMinutes = null
  if (timed.length >= 2) {
    durationMinutes = Math.max(0, Math.round((new Date(timed.at(-1).time) - new Date(timed[0].time)) / 60_000))
  }
  return {
    points: points.length,
    distanceKm: Math.round(totalMeters / 10) / 100,
    durationMinutes,
    start: points[0],
    end: points.at(-1),
  }
}

export async function analyzeOwnedRoute(file, { consentConfirmed, signal } = {}) {
  if (!consentConfirmed) throw new Error('Debe confirmar que el trayecto es propio o que tiene autorización para analizarlo.')
  ensureFile(file, MAX_ROUTE_BYTES, 'archivo de trayecto')
  const content = await file.text()
  const lower = file.name.toLowerCase()
  const points = lower.endsWith('.gpx') ? parseGpx(content)
    : lower.endsWith('.csv') ? parseCsv(content)
      : parseGeoJson(content)
  if (points.length > 50_000) throw new Error('El trayecto supera el máximo de 50.000 puntos.')
  const summary = summarizeRoutePoints(points)
  const [startPlace, endPlace] = await Promise.all([
    reverseCoarse(summary.start.latitude, summary.start.longitude, signal),
    reverseCoarse(summary.end.latitude, summary.end.longitude, signal),
  ])
  return {
    fileName: file.name,
    summary: {
      points: summary.points,
      distanceKm: summary.distanceKm,
      durationMinutes: summary.durationMinutes,
      startPlace,
      endPlace,
    },
    prompt: buildOwnedRoutePrompt({
      fileName: file.name,
      points: summary.points,
      distanceKm: summary.distanceKm,
      durationMinutes: summary.durationMinutes,
      startPlace,
      endPlace,
    }),
  }
}

export function buildOwnedRoutePrompt({ fileName, points, distanceKm, durationMinutes, startPlace, endPlace }) {
  const placeText = (place) => [place?.city, place?.state, place?.country].filter(Boolean).join(', ') || 'No determinada'
  return `Analiza este TRAYECTO PROPIO O AUTORIZADO con los 185 agentes.

Límites obligatorios:
- El archivo se procesó localmente y solo se comparte un resumen; no se incluyen coordenadas exactas ni la serie de puntos.
- No identifiques, sigas o infieras rutinas de una persona.
- No reconstruyas domicilios, horarios sensibles ni lugares frecuentes.
- El análisis debe enfocarse en calidad del dato, seguridad personal general, logística autorizada y privacidad.

Archivo: ${cleanText(fileName, 180)}
Puntos procesados: ${points}
Distancia aproximada: ${distanceKm} km
Duración aproximada: ${durationMinutes ?? 'No disponible'} minutos
Zona inicial aproximada: ${placeText(startPlace)}
Zona final aproximada: ${placeText(endPlace)}

Entrega: calidad y limitaciones de la evidencia, aspectos positivos, riesgos de privacidad, posibles errores de GPS, mejoras de captura y almacenamiento, recomendaciones de protección del trayecto y visión futura sin vigilancia de personas.`
}

export function loadOwnedAssets() {
  try {
    const value = JSON.parse(localStorage.getItem(ASSET_STORAGE_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

export function addOwnedAsset(input) {
  const asset = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    name: cleanText(input.name, 100),
    type: cleanText(input.type, 60),
    identifierSuffix: cleanText(input.identifierSuffix, 12),
    notes: cleanText(input.notes, 300),
    createdAt: new Date().toISOString(),
  }
  if (!asset.name || !asset.type) throw new Error('El nombre y el tipo de activo son obligatorios.')
  const assets = [asset, ...loadOwnedAssets()].slice(0, 100)
  localStorage.setItem(ASSET_STORAGE_KEY, JSON.stringify(assets))
  return assets
}

export function removeOwnedAsset(id) {
  const assets = loadOwnedAssets().filter((asset) => asset.id !== id)
  localStorage.setItem(ASSET_STORAGE_KEY, JSON.stringify(assets))
  return assets
}

export function buildAssetInventoryPrompt(assets) {
  const inventory = assets.slice(0, 50).map((asset) =>
    `- ${asset.name} | ${asset.type} | identificador final: ${asset.identifierSuffix || 'no registrado'} | ${asset.notes || 'sin notas'}`
  ).join('\n') || '- Sin activos registrados'
  return `Analiza este INVENTARIO LOCAL DE ACTIVOS PROPIOS con los 185 agentes.

Reglas:
- No intentes ubicar remotamente los activos ni a sus propietarios.
- No solicites identificadores completos, credenciales, IMEI completo o datos personales.
- Prioriza clasificación, propietario responsable, criticidad, actualizaciones, copia de seguridad, cifrado, recuperación y baja segura.

Inventario:\n${inventory}

Entrega: fortalezas, carencias, riesgos, priorización, controles recomendados, plan de mantenimiento, respuesta ante pérdida y visión futura.`
}

export const SECURITY_OPERATIONS_LIMITS = {
  activeScanning: false,
  commandExecution: false,
  thirdPartyTracking: false,
  remotePhoneLocation: false,
  exactRouteSharing: false,
  artifactMaxBytes: MAX_ARTIFACT_BYTES,
  routeMaxBytes: MAX_ROUTE_BYTES,
}
