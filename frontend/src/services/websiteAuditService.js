import { apiJson } from './apiClient'

function buildCouncilPrompt(result) {
  const openPorts = result.ports?.open?.map((item) => `${item.port}/${item.service}`).join(', ') || 'ninguno dentro del conjunto evaluado'
  const technologies = result.technologies?.map((item) => `${item.name}${item.version ? ` ${item.version}` : ''} (${item.evidence})`).join(', ') || 'no identificadas con certeza'
  const advisorySummary = result.advisories?.results?.flatMap((item) =>
    item.vulnerabilityIds.map((id) => `${item.package}@${item.observedVersion}: ${id}`)
  ).join(', ') || 'sin coincidencias exactas disponibles'

  return `Analiza este INFORME DE AUDITORÍA WEB AUTORIZADA con los 185 agentes y el consejo experto.

Reglas obligatorias:
- La evaluación fue autorizada y ya terminó; no propongas explotación, fuerza bruta, evasión, persistencia ni escaneos adicionales.
- Distingue hechos observados de hipótesis y evita afirmar que un servicio es vulnerable solo porque un puerto está abierto.
- Las versiones visibles pueden ser incompletas o falsas; exige verificación administrativa antes de recomendar un parche.
- Prioriza reducción de exposición, configuración segura, actualización, pruebas y continuidad.

Objetivo evaluado: ${result.target?.origin || ''}
Fecha: ${result.timestamp || ''}
Puntuación preventiva: ${result.score}/100
Estado HTTP: ${result.web?.statusCode || 'sin respuesta'}
Puertos abiertos observados: ${openPorts}
TLS: ${result.tls?.available ? `${result.tls.protocol || 'disponible'}, vence en ${result.tls.daysRemaining ?? 'fecha no calculada'} días` : 'no verificado'}
Cabeceras presentes: ${result.securityHeaders?.present?.join(', ') || 'ninguna visible'}
Cabeceras faltantes: ${result.securityHeaders?.missing?.join(', ') || 'ninguna'}
Tecnologías y versiones visibles: ${technologies}
Avisos públicos asociados a paquetes visibles: ${advisorySummary}
Aspectos positivos: ${result.assessment?.positives?.join(' | ') || 'sin registrar'}
Aspectos negativos: ${result.assessment?.negatives?.join(' | ') || 'sin registrar'}
Mejoras preliminares: ${result.assessment?.improvements?.join(' | ') || 'sin registrar'}
Limitaciones: ${result.assessment?.limitations?.join(' | ') || 'sin registrar'}

Entrega: conclusión ejecutiva, hallazgos confirmados, riesgos posibles, aspectos positivos, aspectos negativos, parches o actualizaciones que deben verificarse, mejoras priorizadas, plan de remediación, criterio de revalidación y visión futura.`
}

export async function auditAuthorizedWebsite(payload, { signal } = {}) {
  const data = await apiJson('/api/security/website-audit', {
    method: 'POST',
    body: JSON.stringify(payload),
    signal,
  })
  return { ...data, councilPrompt: buildCouncilPrompt(data) }
}

export { buildCouncilPrompt }
