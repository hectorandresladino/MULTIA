import { apiFetch } from './apiClient'

const STORAGE_KEY = 'multia-api-keys'
const WEBLLM_MODULE_URL = 'https://esm.run/@mlc-ai/web-llm@0.2.84'

let webLlmModulePromise = null
let webLlmEngine = null
let webLlmLoadedModel = null
let webLlmLoadingPromise = null
let webLlmQueue = Promise.resolve()

function loadKeys() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function saveKeys(keys) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
  } catch {
    // El navegador puede bloquear localStorage en modo privado.
  }
}

export function getApiKey(providerId) {
  const keys = loadKeys()
  if (keys[providerId]) return keys[providerId]

  const envKeys = {
    openai: import.meta.env.VITE_OPENAI_API_KEY || '',
    anthropic: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
    gemini: import.meta.env.VITE_GEMINI_API_KEY || '',
    groq: import.meta.env.VITE_GROQ_API_KEY || '',
  }

  return envKeys[providerId] || ''
}

export function setApiKey(providerId, key) {
  const keys = loadKeys()
  keys[providerId] = key
  saveKeys(keys)
}

export function clearApiKey(providerId) {
  const keys = loadKeys()
  delete keys[providerId]
  saveKeys(keys)
}

export function getAllApiKeys() {
  return loadKeys()
}

const OLLAMA_BASE_URL = import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const USE_PROXY = import.meta.env.VITE_USE_PROXY === 'true' || Boolean(API_BASE_URL)

function getProxyUrl(provider) {
  if (!USE_PROXY) return null
  return `${API_BASE_URL}/api/proxy/${provider}`
}


function smartFetch(url, options) {
  const value = String(url)
  if (value.startsWith('/api/')) return apiFetch(value, options)
  if (API_BASE_URL && value.startsWith(`${API_BASE_URL}/api/`)) {
    return apiFetch(value.slice(API_BASE_URL.length), options)
  }
  return fetch(value, options)
}

export function selectModelForTask(providerId, currentModel, requestText, modes = {}) {
  if (providerId !== 'webllm') return currentModel
  const text = String(requestText || '').toLowerCase()
  const complex = Boolean(
    modes.projectMode || modes.legalMode || modes.researchMode || modes.websiteAuditMode ||
    /arquitectura|full\s*stack|jur[ií]dic|sentencia|investigaci[oó]n|auditor[ií]a|seguridad|c[oó]digo|base de datos/.test(text) ||
    text.length > 500
  )
  return complex
    ? 'Llama-3.2-3B-Instruct-q4f16_1-MLC'
    : 'Llama-3.2-1B-Instruct-q4f16_1-MLC'
}

export function isProxyMode() {
  return USE_PROXY
}

export const PROVIDERS = {
  webllm: {
    id: 'webllm',
    name: 'IA Web sin clave',
    description: 'Gratis: el modelo se ejecuta en el navegador con WebGPU',
    color: '#22c55e',
    models: [
      {
        id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
        name: 'Llama 3.2 1B (compatible)',
      },
      {
        id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
        name: 'Llama 3.2 3B (mejor razonamiento y código)',
      },
    ],
    defaultModel: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    free: true,
    getKeyUrl: null,
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Opcional: requiere una API key configurada en el servidor',
    color: '#4285f4',
    models: [
      { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash' },
      { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite' },
    ],
    defaultModel: 'gemini-3.5-flash',
    free: true,
    getKeyUrl: 'https://aistudio.google.com/apikey',
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    description: 'Opcional: requiere una API key configurada en el servidor',
    color: '#f55036',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant' },
    ],
    defaultModel: 'llama-3.3-70b-versatile',
    free: true,
    getKeyUrl: 'https://console.groq.com/keys',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'Opcional: requiere una API key configurada en el servidor',
    color: '#10a37f',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4o', name: 'GPT-4o' },
    ],
    defaultModel: 'gpt-4o-mini',
    free: false,
    getKeyUrl: 'https://platform.openai.com/api-keys',
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Opcional: requiere una API key configurada en el servidor',
    color: '#d97757',
    models: [
      { id: 'claude-sonnet-5', name: 'Claude Sonnet 5' },
      { id: 'claude-opus-4-8', name: 'Claude Opus 4.8' },
    ],
    defaultModel: 'claude-sonnet-5',
    free: false,
    getKeyUrl: 'https://console.anthropic.com/settings/keys',
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama / servidor propio',
    description: 'Opcional: usa un servidor Ollama local o dentro de OpenShift',
    color: '#8b5cf6',
    models: [
      { id: 'llama3.2', name: 'Llama 3.2' },
      { id: 'qwen2.5', name: 'Qwen 2.5' },
      { id: 'mistral', name: 'Mistral' },
    ],
    defaultModel: 'llama3.2',
    free: true,
    getKeyUrl: 'https://ollama.com',
  },
  demo: {
    id: 'demo',
    name: 'Demo',
    description: 'Sin IA real: respuestas simuladas para comprobar la interfaz',
    color: '#6b7280',
    models: [{ id: 'demo', name: 'Demo' }],
    defaultModel: 'demo',
    free: true,
    getKeyUrl: null,
  },
}

export function hasApiKey(providerId) {
  if (providerId === 'webllm' || providerId === 'ollama' || providerId === 'demo') {
    return true
  }
  if (USE_PROXY) return true
  return Boolean(getApiKey(providerId))
}

function assertNotAborted(signal) {
  if (signal?.aborted) {
    throw new DOMException('La operación fue cancelada', 'AbortError')
  }
}

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(maximum, Math.max(minimum, parsed))
}

// No existe un modo literalmente ilimitado: cada modelo tiene una ventana finita.
// MULTIA elimina el antiguo tope rígido y continúa por segmentos, dentro de rangos
// seguros para evitar bloquear el navegador o enviar parámetros inválidos.
const WEBLLM_SEGMENT_TOKENS = boundedInteger(import.meta.env.VITE_WEBLLM_SEGMENT_TOKENS, 1536, 256, 2048)
const WEBLLM_MAX_CONTINUATIONS = boundedInteger(import.meta.env.VITE_WEBLLM_MAX_CONTINUATIONS, 8, 1, 12)
const EXTERNAL_MAX_OUTPUT_TOKENS = boundedInteger(import.meta.env.VITE_EXTERNAL_MAX_OUTPUT_TOKENS, 8192, 1024, 32768)

function compactMessagesForBrowser(messages) {
  // Los modelos WebLLM incluidos tienen una ventana finita. Se conserva el sistema,
  // la solicitud reciente y la mayor cantidad posible de historial sin imponer el
  // antiguo recorte de 1.024 tokens de salida.
  const MAX_SYSTEM_CHARS = 7000
  const MAX_MESSAGE_CHARS = 9000
  const MAX_TOTAL_CHARS = 16000

  const compacted = messages.map((message) => ({
    role: message.role,
    content: String(message.content || '').slice(
      0,
      message.role === 'system' ? MAX_SYSTEM_CHARS : MAX_MESSAGE_CHARS,
    ),
  }))

  let total = compacted.reduce((sum, message) => sum + message.content.length, 0)
  while (total > MAX_TOTAL_CHARS && compacted.length > 2) {
    const removeIndex = compacted[0]?.role === 'system' ? 1 : 0
    total -= compacted[removeIndex].content.length
    compacted.splice(removeIndex, 1)
  }

  return compacted
}

async function loadWebLlmModule() {
  if (!webLlmModulePromise) {
    webLlmModulePromise = import(/* @vite-ignore */ WEBLLM_MODULE_URL).catch((error) => {
      webLlmModulePromise = null
      throw new Error(`No se pudo cargar el motor WebLLM: ${error.message}`)
    })
  }
  return webLlmModulePromise
}

async function getWebLlmEngine(model, onChunk, signal) {
  assertNotAborted(signal)

  if (typeof navigator === 'undefined' || !navigator.gpu) {
    throw new Error(
      'Este navegador no tiene WebGPU disponible. Abra la aplicación en una versión reciente de Google Chrome o Microsoft Edge y verifique que la aceleración por hardware esté activa.',
    )
  }

  if (webLlmEngine && webLlmLoadedModel === model) {
    return webLlmEngine
  }

  if (!webLlmLoadingPromise) {
    webLlmLoadingPromise = (async () => {
      const { CreateMLCEngine } = await loadWebLlmModule()
      assertNotAborted(signal)

      const engine = await CreateMLCEngine(model, {
        initProgressCallback: (report) => {
          const progress = Number.isFinite(report?.progress)
            ? Math.round(report.progress * 100)
            : null
          const progressText = progress === null ? '' : ` ${progress}%`
          onChunk(`*Preparando la IA en este navegador...${progressText}*`)
        },
      })

      webLlmEngine = engine
      webLlmLoadedModel = model
      return engine
    })().finally(() => {
      webLlmLoadingPromise = null
    })
  }

  return webLlmLoadingPromise
}

async function runWebLlm(messages, model, onChunk, signal) {
  const engine = await getWebLlmEngine(model, onChunk, signal)
  assertNotAborted(signal)

  const abortHandler = () => {
    try {
      engine.interruptGenerate?.()
    } catch {
      // No todos los motores exponen interruptGenerate.
    }
  }

  signal?.addEventListener('abort', abortHandler, { once: true })

  try {
    let requestMessages = compactMessagesForBrowser(messages)
    let fullText = ''

    for (let round = 0; round < WEBLLM_MAX_CONTINUATIONS; round += 1) {
      let segment = ''
      let finishReason = null
      const chunks = await engine.chat.completions.create({
        messages: requestMessages,
        temperature: 0.65,
        max_tokens: WEBLLM_SEGMENT_TOKENS,
        stream: true,
        stream_options: { include_usage: true },
      })

      for await (const chunk of chunks) {
        assertNotAborted(signal)
        finishReason = chunk.choices?.[0]?.finish_reason || finishReason
        const text = chunk.choices?.[0]?.delta?.content || ''
        if (text) {
          segment += text
          onChunk(fullText + segment)
        }
      }

      fullText += segment
      if (finishReason !== 'length' || !segment.trim()) break

      requestMessages = compactMessagesForBrowser([
        ...requestMessages,
        { role: 'assistant', content: segment },
        {
          role: 'user',
          content: 'Continúa exactamente desde el punto anterior, sin repetir, hasta completar la respuesta o el archivo pendiente.',
        },
      ])
    }

    return fullText
  } finally {
    signal?.removeEventListener('abort', abortHandler)
  }
}

async function callWebLlm(messages, model, onChunk, signal) {
  const task = () => runWebLlm(messages, model, onChunk, signal)
  const result = webLlmQueue.then(task, task)
  webLlmQueue = result.catch(() => undefined)
  return result
}

async function callOpenAICompatible(baseUrl, apiKey, messages, model, onChunk, signal) {
  const headers = { 'Content-Type': 'application/json' }
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`

  const response = await smartFetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      stream: true,
      max_tokens: EXTERNAL_MAX_OUTPUT_TOKENS,
    }),
    signal,
  })

  if (!response.ok) {
    let errorMessage = `Error ${response.status}`
    try {
      const errorBody = await response.json()
      errorMessage = errorBody.error?.message || errorBody.message || errorMessage
    } catch {
      // El proveedor puede responder sin JSON.
    }
    throw new Error(errorMessage)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        try {
          const json = JSON.parse(line.slice(6))
          const chunk = json.choices?.[0]?.delta?.content || ''
          if (chunk) {
            fullText += chunk
            onChunk(fullText)
          }
        } catch {
          // Ignorar fragmentos SSE incompletos.
        }
      }
    }
  }

  return fullText
}

async function callOpenAI(messages, model, onChunk, signal) {
  const proxyUrl = getProxyUrl('openai')
  return callOpenAICompatible(
    proxyUrl || 'https://api.openai.com/v1',
    proxyUrl ? '' : getApiKey('openai'),
    messages,
    model,
    onChunk,
    signal,
  )
}

async function callGroq(messages, model, onChunk, signal) {
  const proxyUrl = getProxyUrl('groq')
  return callOpenAICompatible(
    proxyUrl || 'https://api.groq.com/openai/v1',
    proxyUrl ? '' : getApiKey('groq'),
    messages,
    model,
    onChunk,
    signal,
  )
}

async function callAnthropic(messages, model, onChunk, signal) {
  const systemPrompt = messages.find((message) => message.role === 'system')?.content || ''
  const chatMessages = messages.filter((message) => message.role !== 'system')
  const proxyUrl = getProxyUrl('anthropic')

  const response = await smartFetch(proxyUrl || 'https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(proxyUrl ? {} : { 'x-api-key': getApiKey('anthropic') }),
      'anthropic-version': '2023-06-01',
      ...(proxyUrl ? {} : { 'anthropic-dangerous-direct-browser-access': 'true' }),
    },
    body: JSON.stringify({
      model,
      max_tokens: EXTERNAL_MAX_OUTPUT_TOKENS,
      system: systemPrompt || undefined,
      messages: chatMessages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      stream: true,
    }),
    signal,
  })

  if (!response.ok) {
    let errorMessage = `Error ${response.status}`
    try {
      const errorBody = await response.json()
      errorMessage = errorBody.error?.message || errorBody.message || errorMessage
    } catch {
      // El proveedor puede responder sin JSON.
    }
    throw new Error(errorMessage)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const json = JSON.parse(line.slice(6))
          if (json.type === 'content_block_delta' && json.delta?.text) {
            fullText += json.delta.text
            onChunk(fullText)
          }
        } catch {
          // Ignorar fragmentos SSE incompletos.
        }
      }
    }
  }

  return fullText
}

async function callGemini(messages, model, onChunk, signal) {
  const systemPrompt = messages.find((message) => message.role === 'system')?.content || ''
  const contents = messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }))

  const proxyUrl = getProxyUrl('gemini')
  const url = proxyUrl
    ? `${proxyUrl}/models/${model}:streamGenerateContent?alt=sse`
    : `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${getApiKey('gemini')}`

  const body = {
    contents,
    generationConfig: {
      maxOutputTokens: EXTERNAL_MAX_OUTPUT_TOKENS,
      temperature: 0.7,
    },
  }

  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] }
  }

  const response = await smartFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    let errorMessage = `Error ${response.status}`
    try {
      const errorBody = await response.json()
      errorMessage = errorBody.error?.message || errorBody.message || errorMessage
    } catch {
      // El proveedor puede responder sin JSON.
    }
    throw new Error(errorMessage)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const json = JSON.parse(line.slice(6))
          const chunk = json.candidates?.[0]?.content?.parts?.[0]?.text || ''
          if (chunk) {
            fullText += chunk
            onChunk(fullText)
          }
        } catch {
          // Ignorar fragmentos SSE incompletos.
        }
      }
    }
  }

  return fullText
}

async function callOllama(messages, model, onChunk, signal) {
  const proxyUrl = getProxyUrl('ollama')
  const response = await smartFetch(
    proxyUrl ? `${proxyUrl}/api/chat` : `${OLLAMA_BASE_URL}/api/chat`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        stream: true,
      }),
      signal,
    },
  )

  if (!response.ok) {
    let detail = ''
    try {
      const body = await response.json()
      detail = body.error?.message || body.error || body.message || ''
    } catch {
      // Ollama puede responder sin JSON.
    }
    throw new Error(
      detail || `No se pudo conectar con Ollama en ${OLLAMA_BASE_URL}. Configure OLLAMA_BASE_URL si el servidor está dentro de OpenShift.`,
    )
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const json = JSON.parse(line)
        const chunk = json.message?.content || ''
        if (chunk) {
          fullText += chunk
          onChunk(fullText)
        }
      } catch {
        // Ignorar fragmentos JSON incompletos.
      }
    }
  }

  return fullText
}

function generateDemoResponse(userInput) {
  const input = String(userInput || '').toLowerCase()

  if (input.includes('hola') || input.includes('buenas') || input.includes('saludos')) {
    return '¡Hola! Este es el modo de demostración. Seleccione “IA Web sin clave” para utilizar un modelo real en el navegador.'
  }

  return 'Este es el modo de demostración y no consulta un modelo de inteligencia artificial. Seleccione “IA Web sin clave” para usar la IA real sin API key.'
}

async function callDemo(messages, onChunk) {
  const demoText = generateDemoResponse(messages[messages.length - 1]?.content || '')
  let fullText = ''

  for (const [index, word] of demoText.split(' ').entries()) {
    await new Promise((resolve) => setTimeout(resolve, 25))
    fullText += `${index > 0 ? ' ' : ''}${word}`
    onChunk(fullText)
  }

  return fullText
}

export async function callAI(providerId, messages, model, onChunk, signal) {
  if (!PROVIDERS[providerId]) {
    throw new Error(`Proveedor desconocido: ${providerId}`)
  }

  if (!hasApiKey(providerId)) {
    const providerName = PROVIDERS[providerId].name
    throw new Error(
      `${providerName} no está configurado. Use “IA Web sin clave” o configure la credencial en el Secret multia-api-keys de OpenShift.`,
    )
  }

  switch (providerId) {
    case 'webllm':
      return callWebLlm(messages, model, onChunk, signal)
    case 'openai':
      return callOpenAI(messages, model, onChunk, signal)
    case 'groq':
      return callGroq(messages, model, onChunk, signal)
    case 'anthropic':
      return callAnthropic(messages, model, onChunk, signal)
    case 'gemini':
      return callGemini(messages, model, onChunk, signal)
    case 'ollama':
      return callOllama(messages, model, onChunk, signal)
    case 'demo':
      return callDemo(messages, onChunk)
    default:
      throw new Error(`Proveedor no implementado: ${providerId}`)
  }
}
