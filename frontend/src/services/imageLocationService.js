import { apiJson } from './apiClient'

import exifr from 'exifr'

const MAX_IMAGE_BYTES = 12 * 1024 * 1024
const OCR_LANGUAGES = 'spa+eng'
const CAPTION_MODEL = 'Xenova/vit-gpt2-image-captioning'
const TRANSFORMERS_ESM_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0'

let ocrWorkerPromise = null
let captionerPromise = null

function ensureImage(file) {
  if (!(file instanceof File)) throw new Error('Seleccione un archivo de imagen válido.')
  if (!file.type.startsWith('image/')) throw new Error('El archivo seleccionado no es una imagen.')
  if (file.size > MAX_IMAGE_BYTES) throw new Error('La imagen supera el límite de 12 MB.')
}

function cleanText(value, maxLength = 1200) {
  return String(value || '')
    .replace(/[\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

async function getOcrWorker(onProgress) {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = import('tesseract.js').then(async ({ createWorker }) => createWorker(OCR_LANGUAGES, 1, {
      logger(message) {
        if (message?.progress != null) {
          onProgress?.({ stage: 'ocr', progress: Math.round(message.progress * 100), message: message.status || 'Leyendo texto visible' })
        }
      },
    }))
  }
  return ocrWorkerPromise
}

async function getCaptioner(onProgress) {
  if (!captionerPromise) {
    captionerPromise = import(/* @vite-ignore */ TRANSFORMERS_ESM_URL).then(async ({ pipeline, env }) => {
      env.allowLocalModels = false
      env.useBrowserCache = true
      onProgress?.({ stage: 'vision', progress: 10, message: 'Preparando el modelo visual local' })
      return pipeline('image-to-text', CAPTION_MODEL, {
        dtype: 'q8',
        device: typeof navigator !== 'undefined' && navigator.gpu ? 'webgpu' : 'wasm',
        progress_callback(info) {
          if (info?.progress != null) {
            onProgress?.({ stage: 'vision', progress: Math.round(info.progress), message: 'Descargando o cargando el modelo visual' })
          }
        },
      })
    })
  }
  return captionerPromise
}

async function readMetadata(file) {
  try {
    const [metadata, gps] = await Promise.all([
      exifr.parse(file, ['Make', 'Model', 'DateTimeOriginal', 'CreateDate', 'GPSAltitude', 'ImageDescription']),
      exifr.gps(file),
    ])
    return {
      make: cleanText(metadata?.Make, 100),
      model: cleanText(metadata?.Model, 100),
      capturedAt: metadata?.DateTimeOriginal || metadata?.CreateDate || null,
      altitude: Number.isFinite(metadata?.GPSAltitude) ? metadata.GPSAltitude : null,
      description: cleanText(metadata?.ImageDescription, 300),
      latitude: Number.isFinite(gps?.latitude) ? gps.latitude : null,
      longitude: Number.isFinite(gps?.longitude) ? gps.longitude : null,
    }
  } catch {
    return { make: '', model: '', capturedAt: null, altitude: null, description: '', latitude: null, longitude: null }
  }
}

async function reverseGeocode(latitude, longitude, signal) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  try {
    return await apiJson(`/api/location/reverse?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`, { signal })
  } catch {
    return null
  }
}

async function readVisibleText(file, onProgress) {
  try {
    const worker = await getOcrWorker(onProgress)
    const result = await worker.recognize(file)
    return cleanText(result?.data?.text, 1600)
  } catch (error) {
    console.warn('OCR no disponible:', error)
    return ''
  }
}

async function captionImage(file, onProgress) {
  let objectUrl = ''
  try {
    const captioner = await getCaptioner(onProgress)
    objectUrl = URL.createObjectURL(file)
    const output = await captioner(objectUrl, { max_new_tokens: 64 })
    const first = Array.isArray(output) ? output[0] : output
    return cleanText(first?.generated_text || first?.caption || '', 500)
  } catch (error) {
    console.warn('Descripción visual local no disponible:', error)
    return ''
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
  }
}

export function buildLocationResearchPrompt({ personName = '', metadata, place, visibleText, visualDescription }) {
  const safeName = cleanText(personName, 160)
  const gpsPresent = Number.isFinite(metadata?.latitude) && Number.isFinite(metadata?.longitude)
  let capturedAt = 'No disponible'
  if (metadata?.capturedAt) {
    const parsedDate = new Date(metadata.capturedAt)
    if (!Number.isNaN(parsedDate.getTime())) capturedAt = parsedDate.toISOString()
  }
  const placeText = place
    ? [place.city, place.state, place.country].filter(Boolean).join(', ')
    : 'No determinada por metadatos'

  return `Analice esta imagen con los 185 agentes y el consejo experto de MULTIA.

## Alcance obligatorio de privacidad
- Analice únicamente el lugar, los objetos, el texto visible y los metadatos aportados.
- No identifique rostros ni intente averiguar quién aparece en la foto.
- No deduzca nacionalidad, etnia, religión, salud, orientación, ideología o procedencia personal por la apariencia.
- No combine un nombre con la foto para localizar a una persona privada.
- No entregue domicilios, teléfonos, documentos de identidad, coordenadas privadas ni otros datos sensibles.
- El nombre opcional solo puede investigarse en fuentes públicas y profesionales, sin afirmar que corresponde a la persona fotografiada.

## Nombre opcional para investigación pública independiente
${safeName || 'No proporcionado'}

## Evidencia técnica extraída localmente
- GPS disponible: ${gpsPresent ? 'Sí' : 'No'}
- Ubicación aproximada por GPS: ${placeText}
- País: ${place?.country || 'No determinado'}
- Región/estado: ${place?.state || 'No determinado'}
- Ciudad/municipio: ${place?.city || 'No determinado'}
- Fecha de captura: ${capturedAt}
- Cámara: ${[metadata?.make, metadata?.model].filter(Boolean).join(' ') || 'No disponible'}
- Texto visible por OCR: ${visibleText || 'No se detectó texto confiable'}
- Descripción visual local: ${visualDescription || metadata?.description || 'No disponible'}

## Resultado requerido
1. Ubicación más probable del lugar, con país y región; ciudad solo cuando exista evidencia suficiente.
2. Evidencias a favor y en contra de cada hipótesis.
3. Aspectos positivos de la evidencia disponible.
4. Limitaciones, riesgos de error y datos faltantes.
5. Nivel de confianza: alto, medio o bajo, explicando la razón.
6. Métodos legales y respetuosos para mejorar la verificación.
7. Visión futura: cómo mejorar el módulo sin reconocimiento facial ni vigilancia de personas.
8. Decisión final del consejo, separando hechos, inferencias y asuntos pendientes de verificar.`
}

export async function analyzeImageLocation(file, { personName = '', onProgress, signal } = {}) {
  ensureImage(file)
  onProgress?.({ stage: 'metadata', progress: 5, message: 'Leyendo metadatos de la imagen' })
  const metadata = await readMetadata(file)
  onProgress?.({ stage: 'metadata', progress: 100, message: 'Metadatos revisados' })

  const [place, visibleText, visualDescription] = await Promise.all([
    reverseGeocode(metadata.latitude, metadata.longitude, signal),
    readVisibleText(file, onProgress),
    captionImage(file, onProgress),
  ])

  onProgress?.({ stage: 'done', progress: 100, message: 'Análisis local terminado' })
  return {
    metadata,
    place,
    visibleText,
    visualDescription,
    prompt: buildLocationResearchPrompt({ personName, metadata, place, visibleText, visualDescription }),
  }
}

export const IMAGE_LOCATION_LIMITS = {
  maxBytes: MAX_IMAGE_BYTES,
  faceRecognition: false,
  inferSensitiveTraits: false,
  exactAddress: false,
}
