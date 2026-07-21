import { apiJson } from './apiClient'

async function request(path, options = {}) {
  return apiJson(path, options)
}

export async function createProjectWorkspace({ requestText, decisions, projectName, signal }) {
  const workspace = await request('/api/builder/create', {
    method: 'POST',
    body: JSON.stringify({ request: requestText, decisions, projectName }),
    signal,
  })
  if (!workspace.securityAudit?.summary?.blocked) {
    workspace.download = await request(`/api/workspaces/${workspace.id}/archive-ticket`, {
      method: 'POST',
      headers: { 'x-workspace-token': workspace.token },
      body: JSON.stringify({}),
      signal,
    })
  }
  return workspace
}

export async function writeProjectFiles(workspace, files, signal) {
  return request(`/api/workspaces/${workspace.id}/files`, {
    method: 'PUT',
    headers: { 'x-workspace-token': workspace.token },
    body: JSON.stringify({ files, overwrite: true }),
    signal,
  })
}

export async function validateProjectWorkspace(workspace, signal) {
  return request(`/api/workspaces/${workspace.id}/validate`, {
    method: 'POST',
    headers: { 'x-workspace-token': workspace.token },
    body: JSON.stringify({}),
    signal,
  })
}

export function projectDownloadUrl(workspace) {
  const ticket = encodeURIComponent(workspace.download?.ticket || '')
  return `/api/workspaces/${workspace.id}/archive?ticket=${ticket}`
}
