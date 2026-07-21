const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
let csrfToken = null
let unauthorizedHandler = null

export function setCsrfToken(value) {
  csrfToken = value || null
}

export function getCsrfToken() {
  return csrfToken
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === 'function' ? handler : null
}

export async function apiFetch(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase()
  const headers = { ...(options.headers || {}) }
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json'
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken) headers['x-csrf-token'] = csrfToken

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method,
    headers,
    credentials: 'include',
  })

  if (response.status === 401 && unauthorizedHandler) unauthorizedHandler()
  return response
}

export async function apiJson(path, options = {}) {
  const response = await apiFetch(path, options)
  if (!response.ok) {
    let message = `Error ${response.status}`
    try {
      const body = await response.json()
      message = body.error?.message || body.message || message
    } catch {
      // La respuesta puede no contener JSON.
    }
    const error = new Error(message)
    error.status = response.status
    throw error
  }
  if (response.status === 204) return null
  return response.json()
}
