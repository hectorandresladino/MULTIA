import { apiJson, setCsrfToken } from './apiClient'

export async function getAuthStatus() {
  const status = await apiJson('/api/auth/status')
  setCsrfToken(status.csrfToken)
  return status
}

export async function login(username, password) {
  const result = await apiJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  setCsrfToken(result.csrfToken)
  return result
}

export async function bootstrap({ bootstrapToken, username, displayName, password }) {
  const result = await apiJson('/api/auth/bootstrap', {
    method: 'POST',
    body: JSON.stringify({ bootstrapToken, username, displayName, password }),
  })
  setCsrfToken(result.csrfToken)
  return result
}

export async function logout() {
  await apiJson('/api/auth/logout', { method: 'POST', body: JSON.stringify({}) })
  setCsrfToken(null)
}
