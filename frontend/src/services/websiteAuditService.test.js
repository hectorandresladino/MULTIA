import { describe, expect, it } from 'vitest'
import { buildCouncilPrompt } from './websiteAuditService'

describe('websiteAuditService', () => {
  it('genera un informe seguro para el consejo', () => {
    const prompt = buildCouncilPrompt({
      target: { origin: 'https://sitio.example.org' },
      score: 85,
      ports: { open: [{ port: 443, service: 'HTTPS' }] },
      securityHeaders: { present: ['HSTS'], missing: ['Content-Security-Policy'] },
      technologies: [{ name: 'jquery', version: '3.7.1', evidence: 'asset filename' }],
      advisories: { results: [] },
      assessment: { positives: ['HTTPS'], negatives: [], improvements: ['Configurar CSP'], limitations: ['Sin explotación'] },
    })
    expect(prompt).toContain('AUDITORÍA WEB AUTORIZADA')
    expect(prompt).toContain('no propongas explotación')
    expect(prompt).toContain('443/HTTPS')
  })
})
