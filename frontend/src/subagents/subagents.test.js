import { describe, it, expect } from 'vitest'
import {
  AGENT_TEAMS, agentRegistry, loadSubagents, SUBAGENTS, getAgentByName, getActiveAgents,
  getOperationalCouncil, validateAgentConnections, buildAgentSystemPrompt, buildSynthesisPrompt,
  isLegalRequest, isResearchRequest, isWebsiteAuditRequest,
} from './index.js'

describe('Sistema de 185 agentes', () => {
  it('mantiene 185 agentes internos con nombres únicos', () => {
    expect(agentRegistry.length).toBe(185)
    const names = agentRegistry.map((entry) => entry.name)
    expect(new Set(names).size).toBe(185)
    expect(names.every((name) => /^[a-z][a-z0-9-]+$/.test(name))).toBe(true)
  })

  it('carga todos los agentes dinámicamente', async () => {
    await loadSubagents()
    expect(SUBAGENTS.length).toBe(185)
    SUBAGENTS.forEach((agent) => {
      expect(agent.name).toBeDefined()
      expect(agent.description).toBeDefined()
      expect(agent.body).toContain('Aspectos positivos')
      expect(agent.body).toContain('pendiente de verificación')
    })
  })

  it('conecta cada agente exactamente una vez en diez equipos', async () => {
    await loadSubagents()
    const status = validateAgentConnections()
    expect(status.valid).toBe(true)
    expect(status.totalAgents).toBe(185)
    expect(status.connectedAgents).toBe(185)
    expect(AGENT_TEAMS.length).toBe(10)
    const council = getOperationalCouncil([])
    expect(council.length).toBe(10)
    const connectedNames = council.flatMap((team) => team.members)
    expect(new Set(connectedNames).size).toBe(185)
    expect(connectedNames.sort()).toEqual(agentRegistry.map((entry) => entry.name).sort())
  })

  it('incluye expertos jurídicos y de investigación', async () => {
    await loadSubagents()
    expect(getAgentByName('colombian-law-analyst')).toBeDefined()
    expect(getAgentByName('jurisprudence-verifier')).toBeDefined()
    expect(getAgentByName('source-verifier')).toBeDefined()
    expect(getAgentByName('current-information-verifier')).toBeDefined()
    expect(getActiveAgents(['planner', 'colombian-law-analyst']).length).toBe(2)
  })

  it('detecta consultas jurídicas y de investigación', () => {
    expect(isLegalRequest('Analiza esta sentencia de propiedad horizontal')).toBe(true)
    expect(isResearchRequest('Busca y verifica fuentes recientes')).toBe(true)
    expect(isWebsiteAuditRequest('INFORME DE AUDITORÍA WEB AUTORIZADA')).toBe(true)
  })

  it('construye prompts con balance y visión futura', async () => {
    await loadSubagents()
    const team = getOperationalCouncil([])[0]
    const prompt = buildAgentSystemPrompt(team, 'analiza el caso', { legalMode: true, researchMode: true })
    expect(prompt).toContain('Aspectos positivos')
    expect(prompt).toContain('Aspectos negativos')
    expect(prompt).toContain('Visión futura')
    team.memberLabels.forEach((name) => expect(prompt).toContain(name))
  })

  it('exige estructura experta en la síntesis', () => {
    const prompt = buildSynthesisPrompt([{ name: 'equipo', result: 'resultado' }], 'pregunta', { legalMode: true, researchMode: true, websiteAuditMode: true })
    expect(prompt).toContain('Dictamen jurídico informativo')
    expect(prompt).toContain('Informe de investigación')
    expect(prompt).toContain('Dictamen preventivo del sitio autorizado')
    expect(prompt).toContain('Aspectos negativos')
    expect(prompt).toContain('Mejoras priorizadas')
  })
})
