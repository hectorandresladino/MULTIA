import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorkspace, deleteWorkspace, writeWorkspaceFiles } from '../lib/workspaces.js'
import { auditWorkspace } from '../lib/securityAudit.js'

const safeFiles = [
  { path: 'README.md', content: '# Seguro\n' },
  { path: 'Dockerfile', content: 'FROM node:22\nUSER 1001\n' },
  { path: 'openshift.yaml', content: 'apiVersion: route.openshift.io/v1\nkind: Route\nspec:\n  tls:\n    termination: edge\n---\napiVersion: apps/v1\nkind: Deployment\nspec:\n  template:\n    spec:\n      automountServiceAccountToken: false\n' },
  { path: 'backend/package.json', content: '{"scripts":{"start":"node src/server.js"}}' },
  { path: 'backend/src/server.js', content: 'const ok = true\n' },
  { path: 'frontend/package.json', content: '{}' },
  { path: 'frontend/src/App.jsx', content: 'export default function App(){ return <main>OK</main> }\n' },
]

test('aprueba un espacio sin patrones críticos o altos', async () => {
  const workspace = await createWorkspace({ projectName: 'seguro', request: 'test', decisions: '', files: safeFiles })
  try {
    const result = await auditWorkspace(workspace.id, workspace.token)
    assert.equal(result.summary.blocked, false)
    assert.equal(result.networkAccess, false)
  } finally {
    await deleteWorkspace(workspace.id, workspace.token)
  }
})

test('bloquea CORS abierto y operaciones sin autenticación', async () => {
  const workspace = await createWorkspace({ projectName: 'inseguro', request: 'test', decisions: '', files: safeFiles })
  try {
    await writeWorkspaceFiles(workspace.id, workspace.token, [{
      path: 'backend/src/server.js',
      content: "app.use(cors())\napp.post('/api/items', async (req, res) => res.end())\n",
    }])
    const result = await auditWorkspace(workspace.id, workspace.token, { persist: false })
    assert.equal(result.summary.blocked, true)
    assert.ok(result.findings.some((item) => item.category === 'cors'))
    assert.ok(result.findings.some((item) => item.category === 'authorization'))
  } finally {
    await deleteWorkspace(workspace.id, workspace.token)
  }
})
