// Catálogo interno de 185 agentes profesionales de MULTIA.
// Todos los agentes están conectados exactamente una vez mediante diez equipos expertos.
export const agentRegistry = [
  { name: 'general-assistant', loader: () => import('./general-assistant/AGENT.md?raw') },
  { name: 'request-interpreter', loader: () => import('./request-interpreter/AGENT.md?raw') },
  { name: 'planner', loader: () => import('./planner/AGENT.md?raw') },
  { name: 'strategic-planner', loader: () => import('./strategic-planner/AGENT.md?raw') },
  { name: 'product-manager', loader: () => import('./product-manager/AGENT.md?raw') },
  { name: 'business-analyst', loader: () => import('./business-analyst/AGENT.md?raw') },
  { name: 'solution-architect', loader: () => import('./solution-architect/AGENT.md?raw') },
  { name: 'systems-thinker', loader: () => import('./systems-thinker/AGENT.md?raw') },
  { name: 'requirements-analyst', loader: () => import('./requirements-analyst/AGENT.md?raw') },
  { name: 'scope-controller', loader: () => import('./scope-controller/AGENT.md?raw') },
  { name: 'priority-manager', loader: () => import('./priority-manager/AGENT.md?raw') },
  { name: 'risk-coordinator', loader: () => import('./risk-coordinator/AGENT.md?raw') },
  { name: 'decision-facilitator', loader: () => import('./decision-facilitator/AGENT.md?raw') },
  { name: 'stakeholder-analyst', loader: () => import('./stakeholder-analyst/AGENT.md?raw') },
  { name: 'feasibility-analyst', loader: () => import('./feasibility-analyst/AGENT.md?raw') },
  { name: 'value-analyst', loader: () => import('./value-analyst/AGENT.md?raw') },
  { name: 'governance-coordinator', loader: () => import('./governance-coordinator/AGENT.md?raw') },
  { name: 'council-secretary', loader: () => import('./council-secretary/AGENT.md?raw') },
  { name: 'legal-coordinator', loader: () => import('./legal-coordinator/AGENT.md?raw') },
  { name: 'colombian-law-analyst', loader: () => import('./colombian-law-analyst/AGENT.md?raw') },
  { name: 'constitutional-law-reviewer', loader: () => import('./constitutional-law-reviewer/AGENT.md?raw') },
  { name: 'civil-law-reviewer', loader: () => import('./civil-law-reviewer/AGENT.md?raw') },
  { name: 'commercial-law-reviewer', loader: () => import('./commercial-law-reviewer/AGENT.md?raw') },
  { name: 'administrative-law-reviewer', loader: () => import('./administrative-law-reviewer/AGENT.md?raw') },
  { name: 'labor-law-reviewer', loader: () => import('./labor-law-reviewer/AGENT.md?raw') },
  { name: 'criminal-law-reviewer', loader: () => import('./criminal-law-reviewer/AGENT.md?raw') },
  { name: 'property-horizontal-law-reviewer', loader: () => import('./property-horizontal-law-reviewer/AGENT.md?raw') },
  { name: 'contract-law-reviewer', loader: () => import('./contract-law-reviewer/AGENT.md?raw') },
  { name: 'consumer-law-reviewer', loader: () => import('./consumer-law-reviewer/AGENT.md?raw') },
  { name: 'data-protection-law-reviewer', loader: () => import('./data-protection-law-reviewer/AGENT.md?raw') },
  { name: 'intellectual-property-reviewer', loader: () => import('./intellectual-property-reviewer/AGENT.md?raw') },
  { name: 'procedural-law-reviewer', loader: () => import('./procedural-law-reviewer/AGENT.md?raw') },
  { name: 'evidence-law-reviewer', loader: () => import('./evidence-law-reviewer/AGENT.md?raw') },
  { name: 'jurisprudence-verifier', loader: () => import('./jurisprudence-verifier/AGENT.md?raw') },
  { name: 'regulation-compliance-reviewer', loader: () => import('./regulation-compliance-reviewer/AGENT.md?raw') },
  { name: 'legal-risk-analyst', loader: () => import('./legal-risk-analyst/AGENT.md?raw') },
  { name: 'legal-drafting-specialist', loader: () => import('./legal-drafting-specialist/AGENT.md?raw') },
  { name: 'legal-counterargument-reviewer', loader: () => import('./legal-counterargument-reviewer/AGENT.md?raw') },
  { name: 'research-coordinator', loader: () => import('./research-coordinator/AGENT.md?raw') },
  { name: 'search-strategist', loader: () => import('./search-strategist/AGENT.md?raw') },
  { name: 'official-source-researcher', loader: () => import('./official-source-researcher/AGENT.md?raw') },
  { name: 'academic-source-researcher', loader: () => import('./academic-source-researcher/AGENT.md?raw') },
  { name: 'technical-document-researcher', loader: () => import('./technical-document-researcher/AGENT.md?raw') },
  { name: 'source-verifier', loader: () => import('./source-verifier/AGENT.md?raw') },
  { name: 'fact-checker', loader: () => import('./fact-checker/AGENT.md?raw') },
  { name: 'citation-auditor', loader: () => import('./citation-auditor/AGENT.md?raw') },
  { name: 'chronology-analyst', loader: () => import('./chronology-analyst/AGENT.md?raw') },
  { name: 'contradiction-analyst', loader: () => import('./contradiction-analyst/AGENT.md?raw') },
  { name: 'evidence-analyst', loader: () => import('./evidence-analyst/AGENT.md?raw') },
  { name: 'statistics-reviewer', loader: () => import('./statistics-reviewer/AGENT.md?raw') },
  { name: 'methodology-reviewer', loader: () => import('./methodology-reviewer/AGENT.md?raw') },
  { name: 'document-analyst', loader: () => import('./document-analyst/AGENT.md?raw') },
  { name: 'comparative-researcher', loader: () => import('./comparative-researcher/AGENT.md?raw') },
  { name: 'policy-researcher', loader: () => import('./policy-researcher/AGENT.md?raw') },
  { name: 'current-information-verifier', loader: () => import('./current-information-verifier/AGENT.md?raw') },
  { name: 'uncertainty-analyst', loader: () => import('./uncertainty-analyst/AGENT.md?raw') },
  { name: 'bibliography-curator', loader: () => import('./bibliography-curator/AGENT.md?raw') },
  { name: 'research-synthesis-editor', loader: () => import('./research-synthesis-editor/AGENT.md?raw') },
  { name: 'software-architecture-coordinator', loader: () => import('./software-architecture-coordinator/AGENT.md?raw') },
  { name: 'backend-architect', loader: () => import('./backend-architect/AGENT.md?raw') },
  { name: 'frontend-developer', loader: () => import('./frontend-developer/AGENT.md?raw') },
  { name: 'fullstack-developer', loader: () => import('./fullstack-developer/AGENT.md?raw') },
  { name: 'api-architect', loader: () => import('./api-architect/AGENT.md?raw') },
  { name: 'database-architect', loader: () => import('./database-architect/AGENT.md?raw') },
  { name: 'integration-architect', loader: () => import('./integration-architect/AGENT.md?raw') },
  { name: 'domain-modeler', loader: () => import('./domain-modeler/AGENT.md?raw') },
  { name: 'microservices-reviewer', loader: () => import('./microservices-reviewer/AGENT.md?raw') },
  { name: 'modular-monolith-reviewer', loader: () => import('./modular-monolith-reviewer/AGENT.md?raw') },
  { name: 'event-driven-architect', loader: () => import('./event-driven-architect/AGENT.md?raw') },
  { name: 'java-developer', loader: () => import('./java-developer/AGENT.md?raw') },
  { name: 'spring-boot-developer', loader: () => import('./spring-boot-developer/AGENT.md?raw') },
  { name: 'javascript-developer', loader: () => import('./javascript-developer/AGENT.md?raw') },
  { name: 'typescript-developer', loader: () => import('./typescript-developer/AGENT.md?raw') },
  { name: 'python-developer', loader: () => import('./python-developer/AGENT.md?raw') },
  { name: 'react-developer', loader: () => import('./react-developer/AGENT.md?raw') },
  { name: 'mobile-app-architect', loader: () => import('./mobile-app-architect/AGENT.md?raw') },
  { name: 'desktop-app-architect', loader: () => import('./desktop-app-architect/AGENT.md?raw') },
  { name: 'code-generator', loader: () => import('./code-generator/AGENT.md?raw') },
  { name: 'repository-structure-reviewer', loader: () => import('./repository-structure-reviewer/AGENT.md?raw') },
  { name: 'implementation-coordinator', loader: () => import('./implementation-coordinator/AGENT.md?raw') },
  { name: 'ux-coordinator', loader: () => import('./ux-coordinator/AGENT.md?raw') },
  { name: 'ui-designer', loader: () => import('./ui-designer/AGENT.md?raw') },
  { name: 'ux-researcher', loader: () => import('./ux-researcher/AGENT.md?raw') },
  { name: 'accessibility-auditor', loader: () => import('./accessibility-auditor/AGENT.md?raw') },
  { name: 'interaction-designer', loader: () => import('./interaction-designer/AGENT.md?raw') },
  { name: 'information-architect', loader: () => import('./information-architect/AGENT.md?raw') },
  { name: 'content-designer', loader: () => import('./content-designer/AGENT.md?raw') },
  { name: 'design-system-specialist', loader: () => import('./design-system-specialist/AGENT.md?raw') },
  { name: 'responsive-design-reviewer', loader: () => import('./responsive-design-reviewer/AGENT.md?raw') },
  { name: 'usability-tester', loader: () => import('./usability-tester/AGENT.md?raw') },
  { name: 'user-journey-analyst', loader: () => import('./user-journey-analyst/AGENT.md?raw') },
  { name: 'visual-consistency-reviewer', loader: () => import('./visual-consistency-reviewer/AGENT.md?raw') },
  { name: 'technical-writer', loader: () => import('./technical-writer/AGENT.md?raw') },
  { name: 'plain-language-editor', loader: () => import('./plain-language-editor/AGENT.md?raw') },
  { name: 'presentation-specialist', loader: () => import('./presentation-specialist/AGENT.md?raw') },
  { name: 'localization-reviewer', loader: () => import('./localization-reviewer/AGENT.md?raw') },
  { name: 'data-ai-coordinator', loader: () => import('./data-ai-coordinator/AGENT.md?raw') },
  { name: 'data-analyst', loader: () => import('./data-analyst/AGENT.md?raw') },
  { name: 'data-scientist', loader: () => import('./data-scientist/AGENT.md?raw') },
  { name: 'ai-engineer', loader: () => import('./ai-engineer/AGENT.md?raw') },
  { name: 'machine-learning-engineer', loader: () => import('./machine-learning-engineer/AGENT.md?raw') },
  { name: 'generative-ai-architect', loader: () => import('./generative-ai-architect/AGENT.md?raw') },
  { name: 'prompt-engineer', loader: () => import('./prompt-engineer/AGENT.md?raw') },
  { name: 'model-evaluation-specialist', loader: () => import('./model-evaluation-specialist/AGENT.md?raw') },
  { name: 'data-engineer', loader: () => import('./data-engineer/AGENT.md?raw') },
  { name: 'analytics-engineer', loader: () => import('./analytics-engineer/AGENT.md?raw') },
  { name: 'database-performance-analyst', loader: () => import('./database-performance-analyst/AGENT.md?raw') },
  { name: 'data-quality-reviewer', loader: () => import('./data-quality-reviewer/AGENT.md?raw') },
  { name: 'data-governance-reviewer', loader: () => import('./data-governance-reviewer/AGENT.md?raw') },
  { name: 'bias-fairness-reviewer', loader: () => import('./bias-fairness-reviewer/AGENT.md?raw') },
  { name: 'ai-safety-reviewer', loader: () => import('./ai-safety-reviewer/AGENT.md?raw') },
  { name: 'knowledge-management-specialist', loader: () => import('./knowledge-management-specialist/AGENT.md?raw') },
  { name: 'visualization-analyst', loader: () => import('./visualization-analyst/AGENT.md?raw') },
  { name: 'forecasting-analyst', loader: () => import('./forecasting-analyst/AGENT.md?raw') },
  { name: 'platform-coordinator', loader: () => import('./platform-coordinator/AGENT.md?raw') },
  { name: 'devops-automator', loader: () => import('./devops-automator/AGENT.md?raw') },
  { name: 'openshift-specialist', loader: () => import('./openshift-specialist/AGENT.md?raw') },
  { name: 'kubernetes-specialist', loader: () => import('./kubernetes-specialist/AGENT.md?raw') },
  { name: 'container-specialist', loader: () => import('./container-specialist/AGENT.md?raw') },
  { name: 'cloud-architect', loader: () => import('./cloud-architect/AGENT.md?raw') },
  { name: 'linux-specialist', loader: () => import('./linux-specialist/AGENT.md?raw') },
  { name: 'network-architect', loader: () => import('./network-architect/AGENT.md?raw') },
  { name: 'storage-specialist', loader: () => import('./storage-specialist/AGENT.md?raw') },
  { name: 'observability-engineer', loader: () => import('./observability-engineer/AGENT.md?raw') },
  { name: 'sre-reviewer', loader: () => import('./sre-reviewer/AGENT.md?raw') },
  { name: 'ci-cd-engineer', loader: () => import('./ci-cd-engineer/AGENT.md?raw') },
  { name: 'gitops-specialist', loader: () => import('./gitops-specialist/AGENT.md?raw') },
  { name: 'release-manager', loader: () => import('./release-manager/AGENT.md?raw') },
  { name: 'configuration-manager', loader: () => import('./configuration-manager/AGENT.md?raw') },
  { name: 'capacity-planner', loader: () => import('./capacity-planner/AGENT.md?raw') },
  { name: 'cost-optimization-reviewer', loader: () => import('./cost-optimization-reviewer/AGENT.md?raw') },
  { name: 'disaster-recovery-planner', loader: () => import('./disaster-recovery-planner/AGENT.md?raw') },
  { name: 'quality-coordinator', loader: () => import('./quality-coordinator/AGENT.md?raw') },
  { name: 'test-writer', loader: () => import('./test-writer/AGENT.md?raw') },
  { name: 'qa-investigator', loader: () => import('./qa-investigator/AGENT.md?raw') },
  { name: 'code-reviewer', loader: () => import('./code-reviewer/AGENT.md?raw') },
  { name: 'debugger', loader: () => import('./debugger/AGENT.md?raw') },
  { name: 'unit-test-specialist', loader: () => import('./unit-test-specialist/AGENT.md?raw') },
  { name: 'integration-test-specialist', loader: () => import('./integration-test-specialist/AGENT.md?raw') },
  { name: 'e2e-test-specialist', loader: () => import('./e2e-test-specialist/AGENT.md?raw') },
  { name: 'performance-reviewer', loader: () => import('./performance-reviewer/AGENT.md?raw') },
  { name: 'reliability-reviewer', loader: () => import('./reliability-reviewer/AGENT.md?raw') },
  { name: 'regression-test-planner', loader: () => import('./regression-test-planner/AGENT.md?raw') },
  { name: 'acceptance-criteria-reviewer', loader: () => import('./acceptance-criteria-reviewer/AGENT.md?raw') },
  { name: 'static-analysis-reviewer', loader: () => import('./static-analysis-reviewer/AGENT.md?raw') },
  { name: 'build-validation-specialist', loader: () => import('./build-validation-specialist/AGENT.md?raw') },
  { name: 'dependency-reviewer', loader: () => import('./dependency-reviewer/AGENT.md?raw') },
  { name: 'defect-triage-analyst', loader: () => import('./defect-triage-analyst/AGENT.md?raw') },
  { name: 'documentation-verifier', loader: () => import('./documentation-verifier/AGENT.md?raw') },
  { name: 'remediation-verifier', loader: () => import('./remediation-verifier/AGENT.md?raw') },
  { name: 'security-coordinator', loader: () => import('./security-coordinator/AGENT.md?raw') },
  { name: 'security-architect', loader: () => import('./security-architect/AGENT.md?raw') },
  { name: 'secure-code-reviewer', loader: () => import('./secure-code-reviewer/AGENT.md?raw') },
  { name: 'identity-access-reviewer', loader: () => import('./identity-access-reviewer/AGENT.md?raw') },
  { name: 'api-security-reviewer', loader: () => import('./api-security-reviewer/AGENT.md?raw') },
  { name: 'input-validation-reviewer', loader: () => import('./input-validation-reviewer/AGENT.md?raw') },
  { name: 'secrets-reviewer', loader: () => import('./secrets-reviewer/AGENT.md?raw') },
  { name: 'dependency-security-reviewer', loader: () => import('./dependency-security-reviewer/AGENT.md?raw') },
  { name: 'cloud-security-reviewer', loader: () => import('./cloud-security-reviewer/AGENT.md?raw') },
  { name: 'container-security-reviewer', loader: () => import('./container-security-reviewer/AGENT.md?raw') },
  { name: 'network-security-reviewer', loader: () => import('./network-security-reviewer/AGENT.md?raw') },
  { name: 'database-security-reviewer', loader: () => import('./database-security-reviewer/AGENT.md?raw') },
  { name: 'privacy-reviewer', loader: () => import('./privacy-reviewer/AGENT.md?raw') },
  { name: 'compliance-reviewer', loader: () => import('./compliance-reviewer/AGENT.md?raw') },
  { name: 'threat-model-reviewer', loader: () => import('./threat-model-reviewer/AGENT.md?raw') },
  { name: 'exposure-reviewer', loader: () => import('./exposure-reviewer/AGENT.md?raw') },
  { name: 'secure-use-analyst', loader: () => import('./secure-use-analyst/AGENT.md?raw') },
  { name: 'incident-readiness-reviewer', loader: () => import('./incident-readiness-reviewer/AGENT.md?raw') },
  { name: 'business-continuity-reviewer', loader: () => import('./business-continuity-reviewer/AGENT.md?raw') },
  { name: 'security-acceptance-verifier', loader: () => import('./security-acceptance-verifier/AGENT.md?raw') },
  { name: 'innovation-coordinator', loader: () => import('./innovation-coordinator/AGENT.md?raw') },
  { name: 'business-strategist', loader: () => import('./business-strategist/AGENT.md?raw') },
  { name: 'financial-analyst', loader: () => import('./financial-analyst/AGENT.md?raw') },
  { name: 'market-analyst', loader: () => import('./market-analyst/AGENT.md?raw') },
  { name: 'operations-analyst', loader: () => import('./operations-analyst/AGENT.md?raw') },
  { name: 'process-improvement-specialist', loader: () => import('./process-improvement-specialist/AGENT.md?raw') },
  { name: 'customer-value-analyst', loader: () => import('./customer-value-analyst/AGENT.md?raw') },
  { name: 'sustainability-analyst', loader: () => import('./sustainability-analyst/AGENT.md?raw') },
  { name: 'ethics-reviewer', loader: () => import('./ethics-reviewer/AGENT.md?raw') },
  { name: 'social-impact-analyst', loader: () => import('./social-impact-analyst/AGENT.md?raw') },
  { name: 'future-scenarios-analyst', loader: () => import('./future-scenarios-analyst/AGENT.md?raw') },
  { name: 'technology-trends-analyst', loader: () => import('./technology-trends-analyst/AGENT.md?raw') },
  { name: 'scalability-visionary', loader: () => import('./scalability-visionary/AGENT.md?raw') },
  { name: 'roadmap-architect', loader: () => import('./roadmap-architect/AGENT.md?raw') },
  { name: 'opportunity-risk-balancer', loader: () => import('./opportunity-risk-balancer/AGENT.md?raw') },
]

const COLOR_MAP = {
  red: '#ef4444', blue: '#3b82f6', green: '#22c55e', yellow: '#eab308',
  purple: '#a855f7', orange: '#f97316', cyan: '#06b6d4', pink: '#ec4899',
}

function parseAgent(content) {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!frontmatterMatch) return { name: 'unknown', displayName: 'Agente', description: '', body: content, tools: [], model: 'inherit', color: '#6b7280', category: 'General' }
  const frontmatter = frontmatterMatch[1]
  const body = frontmatterMatch[2]
  const get = (key) => {
    const match = frontmatter.match(new RegExp(`${key}:\s*(.+)`))
    return match ? match[1].trim() : null
  }
  const name = get('name') || 'unknown'
  const description = get('description') || ''
  const tools = (get('tools') || 'analysis').split(',').map((tool) => tool.trim())
  const model = get('model') || 'inherit'
  const color = COLOR_MAP[get('color') || 'blue'] || '#6b7280'
  const category = get('category') || 'General'
  const titleMatch = body.match(/^#\s+(.+)$/m)
  const displayName = titleMatch ? titleMatch[1].trim() : name
  return { name, displayName, description, body: body.trim(), tools, model, color, category }
}

export let SUBAGENTS = []
export let AGENTS_LOADED = false
export let AGENTS_LOAD_ERROR = null

export async function loadSubagents() {
  if (AGENTS_LOADED) return SUBAGENTS
  try {
    const loaded = await Promise.all(agentRegistry.map(async (entry) => {
      try {
        const module = await entry.loader()
        return parseAgent(module.default)
      } catch (error) {
        console.error(`No se pudo cargar el agente ${entry.name}:`, error)
        return null
      }
    }))
    SUBAGENTS = loaded.filter(Boolean)
    AGENTS_LOADED = true
    AGENTS_LOAD_ERROR = null
    return SUBAGENTS
  } catch (error) {
    AGENTS_LOAD_ERROR = error.message
    throw error
  }
}

export const AGENT_CATEGORIES = () => [...new Set(SUBAGENTS.map((agent) => agent.category))].sort()
export function getAgentByName(name) { return SUBAGENTS.find((agent) => agent.name === name) }
export function getActiveAgents(selectedNames) {
  if (!selectedNames || selectedNames.length === 0) return []
  return selectedNames.map(getAgentByName).filter(Boolean)
}

export const AGENT_TEAMS = [
  {
    name: 'equipo-direccion',
    label: 'Equipo de Dirección y Decisión',
    description: 'Interpreta la solicitud, define alcance, prioridades, viabilidad, riesgos y criterios de decisión.',
    color: '#a855f7',
    members: ['general-assistant', 'request-interpreter', 'planner', 'strategic-planner', 'product-manager', 'business-analyst', 'solution-architect', 'systems-thinker', 'requirements-analyst', 'scope-controller', 'priority-manager', 'risk-coordinator', 'decision-facilitator', 'stakeholder-analyst', 'feasibility-analyst', 'value-analyst', 'governance-coordinator', 'council-secretary'],
  },
  {
    name: 'equipo-juridico',
    label: 'Equipo Jurídico y de Cumplimiento',
    description: 'Actúa como comité jurídico: identifica el problema, contrasta argumentos, verifica fuentes y emite una conclusión prudente.',
    color: '#7c3aed',
    members: ['legal-coordinator', 'colombian-law-analyst', 'constitutional-law-reviewer', 'civil-law-reviewer', 'commercial-law-reviewer', 'administrative-law-reviewer', 'labor-law-reviewer', 'criminal-law-reviewer', 'property-horizontal-law-reviewer', 'contract-law-reviewer', 'consumer-law-reviewer', 'data-protection-law-reviewer', 'intellectual-property-reviewer', 'procedural-law-reviewer', 'evidence-law-reviewer', 'jurisprudence-verifier', 'regulation-compliance-reviewer', 'legal-risk-analyst', 'legal-drafting-specialist', 'legal-counterargument-reviewer'],
  },
  {
    name: 'equipo-investigacion',
    label: 'Equipo de Investigación y Evidencia',
    description: 'Diseña búsquedas expertas, verifica fuentes, hechos, fechas, citas y nivel de certeza.',
    color: '#06b6d4',
    members: ['research-coordinator', 'search-strategist', 'official-source-researcher', 'academic-source-researcher', 'technical-document-researcher', 'source-verifier', 'fact-checker', 'citation-auditor', 'chronology-analyst', 'contradiction-analyst', 'evidence-analyst', 'statistics-reviewer', 'methodology-reviewer', 'document-analyst', 'comparative-researcher', 'policy-researcher', 'current-information-verifier', 'uncertainty-analyst', 'bibliography-curator', 'research-synthesis-editor'],
  },
  {
    name: 'equipo-software',
    label: 'Equipo de Arquitectura y Construcción de Software',
    description: 'Diseña y materializa soluciones de software mantenibles, probables y desplegables.',
    color: '#3b82f6',
    members: ['software-architecture-coordinator', 'backend-architect', 'frontend-developer', 'fullstack-developer', 'api-architect', 'database-architect', 'integration-architect', 'domain-modeler', 'microservices-reviewer', 'modular-monolith-reviewer', 'event-driven-architect', 'java-developer', 'spring-boot-developer', 'javascript-developer', 'typescript-developer', 'python-developer', 'react-developer', 'mobile-app-architect', 'desktop-app-architect', 'code-generator', 'repository-structure-reviewer', 'implementation-coordinator'],
  },
  {
    name: 'equipo-experiencia',
    label: 'Equipo de Experiencia, Accesibilidad y Comunicación',
    description: 'Garantiza que la solución sea comprensible, usable, inclusiva y bien comunicada.',
    color: '#ec4899',
    members: ['ux-coordinator', 'ui-designer', 'ux-researcher', 'accessibility-auditor', 'interaction-designer', 'information-architect', 'content-designer', 'design-system-specialist', 'responsive-design-reviewer', 'usability-tester', 'user-journey-analyst', 'visual-consistency-reviewer', 'technical-writer', 'plain-language-editor', 'presentation-specialist', 'localization-reviewer'],
  },
  {
    name: 'equipo-datos-ia',
    label: 'Equipo de Datos e Inteligencia Artificial',
    description: 'Analiza datos y diseña IA responsable, medible y útil.',
    color: '#0891b2',
    members: ['data-ai-coordinator', 'data-analyst', 'data-scientist', 'ai-engineer', 'machine-learning-engineer', 'generative-ai-architect', 'prompt-engineer', 'model-evaluation-specialist', 'data-engineer', 'analytics-engineer', 'database-performance-analyst', 'data-quality-reviewer', 'data-governance-reviewer', 'bias-fairness-reviewer', 'ai-safety-reviewer', 'knowledge-management-specialist', 'visualization-analyst', 'forecasting-analyst'],
  },
  {
    name: 'equipo-plataforma',
    label: 'Equipo de Plataforma, OpenShift y Operación',
    description: 'Prepara despliegue, automatización, observabilidad, capacidad y recuperación.',
    color: '#ef4444',
    members: ['platform-coordinator', 'devops-automator', 'openshift-specialist', 'kubernetes-specialist', 'container-specialist', 'cloud-architect', 'linux-specialist', 'network-architect', 'storage-specialist', 'observability-engineer', 'sre-reviewer', 'ci-cd-engineer', 'gitops-specialist', 'release-manager', 'configuration-manager', 'capacity-planner', 'cost-optimization-reviewer', 'disaster-recovery-planner'],
  },
  {
    name: 'equipo-calidad',
    label: 'Equipo de Calidad, Pruebas y Validación',
    description: 'Comprueba código, comportamiento, rendimiento, documentación y criterios de aprobación.',
    color: '#22c55e',
    members: ['quality-coordinator', 'test-writer', 'qa-investigator', 'code-reviewer', 'debugger', 'unit-test-specialist', 'integration-test-specialist', 'e2e-test-specialist', 'performance-reviewer', 'reliability-reviewer', 'regression-test-planner', 'acceptance-criteria-reviewer', 'static-analysis-reviewer', 'build-validation-specialist', 'dependency-reviewer', 'defect-triage-analyst', 'documentation-verifier', 'remediation-verifier'],
  },
  {
    name: 'equipo-seguridad',
    label: 'Equipo de Seguridad, Privacidad y Continuidad',
    description: 'Realiza revisión preventiva sobre el proyecto autorizado y exige corrección de riesgos altos.',
    color: '#f97316',
    members: ['security-coordinator', 'security-architect', 'secure-code-reviewer', 'identity-access-reviewer', 'api-security-reviewer', 'input-validation-reviewer', 'secrets-reviewer', 'dependency-security-reviewer', 'cloud-security-reviewer', 'container-security-reviewer', 'network-security-reviewer', 'database-security-reviewer', 'privacy-reviewer', 'compliance-reviewer', 'threat-model-reviewer', 'exposure-reviewer', 'secure-use-analyst', 'incident-readiness-reviewer', 'business-continuity-reviewer', 'security-acceptance-verifier'],
  },
  {
    name: 'equipo-vision',
    label: 'Equipo de Negocio, Impacto y Visión Futura',
    description: 'Contrasta valor, sostenibilidad, oportunidades, impactos y evolución futura.',
    color: '#eab308',
    members: ['innovation-coordinator', 'business-strategist', 'financial-analyst', 'market-analyst', 'operations-analyst', 'process-improvement-specialist', 'customer-value-analyst', 'sustainability-analyst', 'ethics-reviewer', 'social-impact-analyst', 'future-scenarios-analyst', 'technology-trends-analyst', 'scalability-visionary', 'roadmap-architect', 'opportunity-risk-balancer'],
  },
]

export function validateAgentConnections() {
  const registryNames = agentRegistry.map((entry) => entry.name)
  const assignedNames = AGENT_TEAMS.flatMap((team) => team.members)
  const counts = assignedNames.reduce((map, name) => map.set(name, (map.get(name) || 0) + 1), new Map())
  const missing = registryNames.filter((name) => !counts.has(name))
  const unknown = assignedNames.filter((name) => !registryNames.includes(name))
  const duplicated = [...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name)
  return { valid: missing.length === 0 && unknown.length === 0 && duplicated.length === 0, totalAgents: registryNames.length, connectedAgents: new Set(assignedNames).size, missing, unknown, duplicated }
}

function buildConnectedTeam(team, selectedNames = []) {
  const selected = new Set(selectedNames)
  const members = team.members.map(getAgentByName).filter(Boolean)
  const prioritized = members.filter((member) => selected.has(member.name)).map((member) => member.name)
  const memberSummary = members.map((member) => `- ${member.displayName}: ${member.description}`).join('\n')
  const priorityText = prioritized.length ? `\nPrioridad indicada por el usuario: ${members.filter((member) => prioritized.includes(member.name)).map((member) => member.displayName).join(', ')}.` : ''
  return {
    name: team.label, teamId: team.name, displayName: team.label, description: team.description,
    body: `# ${team.label}\n\n${team.description}\n\n## Integrantes conectados\n\n${memberSummary}${priorityText}`,
    tools: [...new Set(members.flatMap((member) => member.tools))], model: 'inherit', color: team.color,
    category: 'Consejo conectado', members: members.map((member) => member.name), memberLabels: members.map((member) => member.displayName),
  }
}

export function isProjectBuildRequest(text = '') {
  return /\b(crea|crear|construye|construir|genera|generar|desarrolla|desarrollar|proyecto|aplicaci[oó]n|sistema|full[ -]?stack|frontend|backend|c[oó]digo|zip)\b/i.test(String(text))
}
export function isLegalRequest(text = '') {
  return /\b(ley|legal|jur[ií]dic|abogad|sentencia|tutela|corte|contrato|demanda|denuncia|delito|propiedad horizontal|consejo de administraci[oó]n|reglamento|constituci[oó]n|decreto|resoluci[oó]n|derecho de petici[oó]n)\b/i.test(String(text))
}
export function isResearchRequest(text = '') {
  return /\b(busca|buscar|b[uú]squeda|investiga|investigar|verifica|verificar|fuente|cita|evidencia|estudio|estad[ií]stica|comparar|comparaci[oó]n|actual|reciente|jurisprudencia)\b/i.test(String(text))
}
export function isWebsiteAuditRequest(text = '') {
  return /(?:INFORME DE AUDITOR[IÍ]A WEB AUTORIZADA|auditar(?:ía)?\s+(?:una\s+)?(?:p[aá]gina|sitio|web)|puertos?\s+abiertos?|cabeceras?\s+de\s+seguridad|certificado\s+TLS|versiones?\s+visibles)/i.test(String(text))
}

export function getOperationalCouncil(selectedNames = []) {
  const connectionStatus = validateAgentConnections()
  if (!connectionStatus.valid) throw new Error(`Catálogo de agentes incompleto: ${JSON.stringify(connectionStatus)}`)
  return AGENT_TEAMS.map((team) => buildConnectedTeam(team, selectedNames))
}

function modeInstructions({ projectMode = false, legalMode = false, researchMode = false, websiteAuditMode = false } = {}) {
  return `Contexto de la consulta: proyecto=${projectMode ? 'sí' : 'no'}, jurídico=${legalMode ? 'sí' : 'no'}, investigación=${researchMode ? 'sí' : 'no'}, auditoría web autorizada=${websiteAuditMode ? 'sí' : 'no'}.
Todos los agentes participan aunque su conclusión sea que su especialidad no cambia el resultado.
No inventes fuentes ni afirmes haber navegado, ejecutado herramientas o verificado información externa si no está disponible en el contexto.
Si es una auditoría web autorizada, limita el análisis al informe recibido: no propongas explotación, fuerza bruta, evasión, persistencia ni escaneos adicionales; un puerto abierto no prueba una vulnerabilidad.`
}

export function buildAgentSystemPrompt(agent, userMessage, modes = {}) {
  const connectedMembers = Array.isArray(agent.members) && agent.members.length
    ? `\nDebes representar a estos integrantes: ${agent.memberLabels.join(', ')}. Integra una aportación identificable de cada especialidad, sin repetir contenido.`
    : ''
  return `${agent.body}

${modeInstructions(modes)}${connectedMembers}

Tarea del usuario:
"${userMessage}"

Entrega en español y Markdown, máximo 420 palabras, con estas secciones:
1. **Aporte experto del equipo**
2. **Aspectos positivos y oportunidades**
3. **Aspectos negativos, límites y contraargumentos**
4. **Mejoras concretas y prioridades**
5. **Visión futura y escenarios**
6. **Evidencia, supuestos y nivel de certeza**
7. **Conclusión del equipo**`
}

function compactAgentResult(result, maxChars = 1500) {
  const text = String(result || '').trim()
  return text.length <= maxChars ? text : `${text.slice(0, maxChars)}\n[Resultado condensado para deliberación]`
}

export function buildDebatePrompt(subagentResults, userMessage, modes = {}) {
  const resultsText = subagentResults.map((result) => `### ${result.name}\n${compactAgentResult(result.result, 420)}`).join('\n\n')
  return `Eres el relator crítico del consejo de MULTIA. ${modeInstructions(modes)}

Solicitud:
"${userMessage}"

${resultsText}

Compara coincidencias y contradicciones. Expón la mejor posición favorable y la mejor posición desfavorable. Señala afirmaciones sin fuente, vacíos documentales, riesgos, dependencias y mejoras. Si hay asunto jurídico, estructura hechos, problema jurídico, fuentes requeridas, argumentos y conclusión provisional. No redactes aún la decisión final. Máximo 900 palabras.`
}

export function buildDecisionPrompt(subagentResults, userMessage, modes = {}) {
  const resultsText = subagentResults.map((result) => `### Propuesta de ${result.name}\n${compactAgentResult(result.result, result.name === 'relator-debate' ? 2500 : 320)}`).join('\n\n---\n\n')
  return `Actúas como presidente del consejo experto de MULTIA. ${modeInstructions(modes)}

Solicitud original:
"${userMessage}"

${resultsText}

Entrega una DECISIÓN DEL CONSEJO con objetivo, alcance, arquitectura, datos y API, interfaz, pruebas, seguridad, OpenShift, aspectos positivos, aspectos negativos, mejoras, visión futura, riesgos y criterio de aprobación. Ningún hallazgo crítico o alto puede quedar abierto.

Al final agrega exactamente este bloque JSON:
<MULTIA_BUILD_SPEC>
{
  "projectName": "nombre-corto-en-minusculas",
  "title": "Título visible de la aplicación",
  "entity": {
    "singular": "cliente",
    "plural": "clientes",
    "fields": [
      { "name": "name", "label": "Nombre", "type": "string", "required": true },
      { "name": "email", "label": "Correo", "type": "email", "required": true }
    ]
  },
  "features": ["crud", "authentication", "csrf", "rate-limit", "security-review", "healthcheck", "validation", "openshift"]
}
</MULTIA_BUILD_SPEC>

Tipos: string, email, text, number, integer, boolean y date. Usa entre 2 y 8 campos.`
}

export function buildSynthesisPrompt(subagentResults, userMessage, modes = {}) {
  const resultsText = subagentResults.map((result) => `### ${result.name}\n${compactAgentResult(result.result, result.name === 'relator-debate' ? 2500 : 280)}`).join('\n\n---\n\n')
  const legalSection = modes.legalMode ? `
Incluye además un **Dictamen jurídico informativo** con: hechos conocidos, hechos faltantes, problema jurídico, fuentes primarias necesarias, argumentos a favor, argumentos en contra, conclusión provisional, riesgos y próximos pasos. No inventes normas ni sentencias.` : ''
  const researchSection = modes.researchMode ? `
Incluye además un **Informe de investigación** con: estrategia de búsqueda, hechos verificados, hechos pendientes, fuentes primarias requeridas, contradicciones, fecha de corte y nivel de confianza. No inventes citas ni enlaces.` : ''
  const websiteAuditSection = modes.websiteAuditMode ? `
Incluye además un **Dictamen preventivo del sitio autorizado** con: alcance autorizado, hallazgos confirmados, riesgos posibles, puertos observados sin asumir vulnerabilidad, versiones visibles y su confiabilidad, avisos públicos que requieren confirmación, aspectos positivos, aspectos negativos, parches o configuraciones por verificar, plan de remediación, criterio de revalidación y limitaciones. No incluyas técnicas de explotación.` : ''
  return `Eres el presidente del consejo experto de MULTIA. ${modeInstructions(modes)}

Petición original:
"${userMessage}"

Resultados de los diez equipos:

${resultsText}

Resuelve contradicciones y entrega una respuesta experta, clara y honesta. Usa estas secciones obligatorias:
1. **Conclusión ejecutiva**
2. **Análisis experto integrado**
3. **Aspectos positivos y oportunidades**
4. **Aspectos negativos, riesgos y contraargumentos**
5. **Mejoras priorizadas**
6. **Visión futura y escenarios**
7. **Evidencia, fuentes necesarias y nivel de certeza**
8. **Decisión del consejo y próximos pasos**${legalSection}${researchSection}${websiteAuditSection}

No repitas aportes, no presentes como verificado lo que no tenga evidencia y no ocultes incertidumbre.`
}
