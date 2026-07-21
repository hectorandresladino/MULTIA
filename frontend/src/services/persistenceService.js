import { apiJson } from './apiClient'

export async function loadServerConversations() {
  const result = await apiJson('/api/conversations')
  return result.conversations || []
}

export async function syncServerConversations(conversations) {
  return apiJson('/api/conversations/sync', {
    method: 'PUT',
    body: JSON.stringify({ conversations }),
  })
}

export async function deleteServerConversation(id) {
  return apiJson(`/api/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function submitFeedback({ conversationId, messageId, rating, comment = '' }) {
  return apiJson('/api/feedback', {
    method: 'POST',
    body: JSON.stringify({ conversationId, messageId, rating, comment }),
  })
}

export async function recordModelRun(run) {
  return apiJson('/api/model-runs', {
    method: 'POST',
    body: JSON.stringify(run),
  })
}

export async function loadOperationalMetrics() {
  return apiJson('/api/admin/metrics')
}
