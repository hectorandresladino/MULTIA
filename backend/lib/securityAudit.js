import { listWorkspaceFiles, readWorkspaceFile, writeWorkspaceFiles } from './workspaces.js'

const REPORT_FILES = new Set(['SECURITY_FINDINGS.json', 'SECURITY_REPORT.md'])
const TEXT_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.json', '.yaml', '.yml', '.md', '.html', '.css', '.env', '.sql'])

function extensionOf(file) {
  const index = file.lastIndexOf('.')
  return index >= 0 ? file.slice(index).toLowerCase() : ''
}

function lineOf(content, index) {
  return content.slice(0, Math.max(0, index)).split('\n').length
}

function finding({ severity, category, file, line = 1, title, detail, recommendation }) {
  return { severity, category, file, line, title, detail, recommendation }
}

function scanText(file, content, findings) {
  const checks = [
    {
      regex: /\b(?:eval\s*\(|new\s+Function\s*\()/g,
      severity: 'critical', category: 'code-execution', title: 'Ejecución dinámica de código',
      detail: 'El proyecto contiene una construcción que puede ejecutar texto como código.',
      recommendation: 'Elimine eval/new Function y use lógica explícita o un parser seguro.',
    },
    {
      regex: /(?:node:)?child_process|\bexecSync\s*\(|\bspawnSync\s*\(/g,
      severity: 'critical', category: 'command-execution', title: 'Ejecución de comandos del sistema',
      detail: 'El código generado podría invocar procesos del sistema operativo.',
      recommendation: 'Mantenga el constructor sin Bash arbitrario y reemplace esta operación por una API controlada.',
    },
    {
      regex: /(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'][A-Za-z0-9_\-\/+=]{16,}["']/gi,
      severity: 'critical', category: 'secrets', title: 'Posible secreto incrustado',
      detail: 'Se detectó un valor con apariencia de credencial dentro del código o configuración.',
      recommendation: 'Mueva la credencial a un Secret de OpenShift o una variable de entorno.',
    },
    {
      regex: /helmet\s*\(\s*\{[^}]*contentSecurityPolicy\s*:\s*false/gs,
      severity: 'high', category: 'browser-security', title: 'Content Security Policy desactivada',
      detail: 'La política CSP fue desactivada expresamente.',
      recommendation: 'Use Helmet con CSP activa y directivas compatibles con la aplicación.',
    },
    {
      regex: /app\.use\s*\(\s*cors\s*\(\s*\)\s*\)/g,
      severity: 'high', category: 'cors', title: 'CORS abierto para cualquier origen',
      detail: 'La API permite solicitudes desde cualquier origen web.',
      recommendation: 'Permita solamente el origen configurado o solicitudes del mismo origen.',
    },
    {
      regex: /\b(?:privileged\s*:\s*true|allowPrivilegeEscalation\s*:\s*true)\b/g,
      severity: 'critical', category: 'container-security', title: 'Contenedor con privilegios elevados',
      detail: 'La configuración permite privilegios incompatibles con un despliegue seguro.',
      recommendation: 'Use allowPrivilegeEscalation: false, elimine privileged y descarte capabilities.',
    },
    {
      regex: /\b(?:0\.0\.0\.0\/0|\*:\*)\b/g,
      severity: 'medium', category: 'network-exposure', title: 'Exposición de red demasiado amplia',
      detail: 'Se encontró una regla que podría abrir acceso desde cualquier red.',
      recommendation: 'Restrinja la regla al servicio, namespace u origen estrictamente necesario.',
    },
  ]

  for (const check of checks) {
    for (const match of content.matchAll(check.regex)) {
      findings.push(finding({ ...check, file, line: lineOf(content, match.index || 0) }))
    }
  }

  if (/app\.(?:post|put|patch|delete)\s*\(/.test(content)) {
    const hasAuth = /requireAuth|authenticate|authorization|session/i.test(content)
    if (!hasAuth) {
      findings.push(finding({
        severity: 'high', category: 'authorization', file, line: 1,
        title: 'Operaciones de escritura sin autenticación visible',
        detail: 'Se detectaron rutas que modifican información y no se encontró un control de autenticación en el archivo.',
        recommendation: 'Proteja POST, PUT, PATCH y DELETE con autenticación, sesión segura y autorización por rol.',
      }))
    }
  }

  if (file.endsWith('openshift.yaml') || file.endsWith('openshift.yml')) {
    if (!/automountServiceAccountToken\s*:\s*false/.test(content)) {
      findings.push(finding({
        severity: 'medium', category: 'openshift', file, line: 1,
        title: 'Token de ServiceAccount no deshabilitado explícitamente',
        detail: 'El Pod de la aplicación podría recibir un token de Kubernetes que no necesita.',
        recommendation: 'Agregue automountServiceAccountToken: false en los Pods que no llaman la API del clúster.',
      }))
    }
    if (/kind:\s*Route/.test(content) && !/\btls:\s*\n\s+termination:\s*(?:edge|reencrypt|passthrough)/.test(content)) {
      findings.push(finding({
        severity: 'high', category: 'transport-security', file, line: 1,
        title: 'Route sin TLS reconocido',
        detail: 'Se encontró una Route sin una terminación TLS segura.',
        recommendation: 'Configure TLS y redireccione todo el tráfico HTTP a HTTPS.',
      }))
    }
  }
}

function summarize(findings) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
  for (const item of findings) counts[item.severity] = (counts[item.severity] || 0) + 1
  const score = Math.max(0, 100 - counts.critical * 35 - counts.high * 18 - counts.medium * 6 - counts.low * 2)
  return {
    counts,
    score,
    blocked: counts.critical > 0 || counts.high > 0,
    status: counts.critical > 0 || counts.high > 0 ? 'blocked' : counts.medium > 0 ? 'review' : 'approved',
  }
}

function reportMarkdown(result) {
  const lines = [
    '# Informe de seguridad controlado de seguridad',
    '',
    '> Evaluación defensiva con mentalidad de seguridad. Solo inspecciona los archivos del espacio de trabajo; no escanea Internet, no explota servicios, no prueba credenciales y no ejecuta acciones que puedan alterar o eliminar información.',
    '',
    `- **Estado:** ${result.summary.status}`,
    `- **Puntuación:** ${result.summary.score}/100`,
    `- **Críticos:** ${result.summary.counts.critical}`,
    `- **Altos:** ${result.summary.counts.high}`,
    `- **Medios:** ${result.summary.counts.medium}`,
    `- **Bajos:** ${result.summary.counts.low}`,
    `- **Archivos revisados:** ${result.filesScanned}`,
    '',
  ]

  if (result.findings.length === 0) {
    lines.push('## Resultado', '', 'No se detectaron patrones inseguros dentro de las reglas estáticas configuradas.')
  } else {
    lines.push('## Hallazgos', '')
    result.findings.forEach((item, index) => {
      lines.push(
        `### ${index + 1}. [${item.severity.toUpperCase()}] ${item.title}`,
        '',
        `- **Archivo:** \`${item.file}:${item.line}\``,
        `- **Categoría:** ${item.category}`,
        `- **Observación:** ${item.detail}`,
        `- **Corrección recomendada:** ${item.recommendation}`,
        '',
      )
    })
  }

  lines.push(
    '## Límites de seguridad',
    '',
    '- No se realizan conexiones hacia objetivos externos.',
    '- No se generan ni ejecutan código de prueba dañino.',
    '- No se prueban contraseñas, sesiones ni credenciales reales.',
    '- Los hallazgos críticos o altos bloquean la descarga hasta su corrección.',
    '',
  )
  return lines.join('\n')
}

export async function auditWorkspace(id, token, { persist = true } = {}) {
  const listing = await listWorkspaceFiles(id, token)
  const findings = []
  let filesScanned = 0

  for (const file of listing.files) {
    if (REPORT_FILES.has(file.path) || file.size > 1_500_000 || !TEXT_EXTENSIONS.has(extensionOf(file.path))) continue
    const { content } = await readWorkspaceFile(id, token, file.path)
    filesScanned += 1
    scanText(file.path, content, findings)
  }

  const result = {
    mode: 'authorized-security-static-analysis',
    safeScope: 'workspace-only',
    networkAccess: false,
    destructiveActions: false,
    filesScanned,
    findings,
    summary: summarize(findings),
    checkedAt: new Date().toISOString(),
  }

  if (persist) {
    await writeWorkspaceFiles(id, token, [
      { path: 'SECURITY_FINDINGS.json', content: JSON.stringify(result, null, 2) + '\n' },
      { path: 'SECURITY_REPORT.md', content: reportMarkdown(result) + '\n' },
    ])
  }

  return result
}
