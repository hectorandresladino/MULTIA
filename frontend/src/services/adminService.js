import { apiJson } from './apiClient'

export async function loadUsers() {
  const result = await apiJson('/api/admin/users')
  return result.users || []
}

export async function createUserAccount(payload) {
  return apiJson('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateUserAccount(id, changes) {
  return apiJson(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  })
}
