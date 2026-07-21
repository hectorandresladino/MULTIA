import fsp from 'fs/promises'
import path from 'path'
import { transform } from 'esbuild'
import { authorizeWorkspace, listWorkspaceFiles, readWorkspaceFile } from './workspaces.js'

const REQUIRED_FILES = [
  'README.md',
  'Dockerfile',
  'openshift.yaml',
  'backend/package.json',
  'backend/src/server.js',
  'frontend/package.json',
  'frontend/src/App.jsx',
]

function issue(level, file, message) {
  return { level, file, message }
}

async function validateJson(file, content, issues) {
  try {
    JSON.parse(content)
  } catch (error) {
    issues.push(issue('error', file, `JSON inválido: ${error.message}`))
  }
}

async function validateYaml(file, content, issues) {
  if (/\t/.test(content)) {
    issues.push(issue('error', file, 'YAML contiene tabulaciones; utilice espacios.'))
  }
  const documents = content.split(/^---\s*$/m).map((doc) => doc.trim()).filter(Boolean)
  if (documents.length === 0) {
    issues.push(issue('error', file, 'YAML vacío.'))
    return
  }
  documents.forEach((document, index) => {
    if (!/^apiVersion:\s*\S+/m.test(document) || !/^kind:\s*\S+/m.test(document)) {
      issues.push(issue('warning', file, `Documento YAML ${index + 1} no contiene apiVersion y kind reconocibles.`))
    }
  })
}

async function validateCode(file, content, issues) {
  const extension = path.extname(file).toLowerCase()
  const loader = extension === '.tsx' ? 'tsx'
    : extension === '.ts' ? 'ts'
      : extension === '.jsx' ? 'jsx'
        : 'js'
  try {
    await transform(content, { loader, format: 'esm', target: 'es2022', sourcemap: false })
  } catch (error) {
    const detail = error.errors?.[0]?.text || error.message
    issues.push(issue('error', file, `Sintaxis inválida: ${detail}`))
  }
}

export async function validateWorkspace(id, token) {
  const { dir } = await authorizeWorkspace(id, token)
  const { files } = await listWorkspaceFiles(id, token)
  const fileSet = new Set(files.map((file) => file.path))
  const issues = []

  for (const required of REQUIRED_FILES) {
    if (!fileSet.has(required)) issues.push(issue('error', required, 'Archivo obligatorio ausente.'))
  }

  for (const file of files) {
    if (file.size > 1_500_000) {
      issues.push(issue('warning', file.path, 'Archivo grande; puede dificultar el mantenimiento.'))
      continue
    }
    const content = (await readWorkspaceFile(id, token, file.path)).content
    const extension = path.extname(file.path).toLowerCase()
    if (extension === '.json') await validateJson(file.path, content, issues)
    if (['.yaml', '.yml'].includes(extension)) await validateYaml(file.path, content, issues)
    if (['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx'].includes(extension)) {
      await validateCode(file.path, content, issues)
    }
    if (/api[_-]?key\s*[:=]\s*["'][^"']{12,}/i.test(content)) {
      issues.push(issue('error', file.path, 'Posible API key incrustada en el código.'))
    }
    if (content.includes('REPLACE_WITH_GITHUB_REPOSITORY')) {
      issues.push(issue('warning', file.path, 'Existe un valor pendiente de reemplazo.'))
    }
  }

  const backendPackagePath = path.join(dir, 'backend/package.json')
  try {
    const pkg = JSON.parse(await fsp.readFile(backendPackagePath, 'utf8'))
    if (!pkg.scripts?.start) issues.push(issue('error', 'backend/package.json', 'Falta el script start.'))
  } catch {
    // El error JSON ya se informa arriba.
  }

  const errors = issues.filter((item) => item.level === 'error').length
  const warnings = issues.filter((item) => item.level === 'warning').length
  return {
    valid: errors === 0,
    summary: { files: files.length, errors, warnings },
    issues,
    checkedAt: new Date().toISOString(),
  }
}
