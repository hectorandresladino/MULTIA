import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeAuthorizedArtifact, SECURITY_ARTIFACT_LIMITS } from '../lib/securityOperations.js'

const authorization = { authorizationConfirmed: true, authorizationBasis: 'controlled-lab' }

test('rechaza análisis sin autorización', async () => {
  await assert.rejects(
    () => analyzeAuthorizedArtifact({ content: 'x', fileName: 'test.log' }),
    /confirmar/i,
  )
})

test('analiza un reporte XML importado sin ejecutar escaneo', async () => {
  const result = await analyzeAuthorizedArtifact({
    ...authorization,
    fileName: 'inventario.xml',
    artifactType: 'nmap-xml',
    content: '<nmaprun><host><status state="up"/><address addr="192.0.2.10"/><ports><port protocol="tcp" portid="443"><state state="open"/><service name="https" product="nginx" version="1.25.1"/></port></ports></host></nmaprun>',
  })
  assert.equal(result.analysis.summary.hosts, 1)
  assert.equal(result.analysis.summary.openPorts, 1)
  assert.equal(result.guardrails.activeScanning, false)
})

test('analiza una muestra de registros y redacta secretos', async () => {
  const result = await analyzeAuthorizedArtifact({
    ...authorization,
    fileName: 'security.log',
    artifactType: 'security-log',
    content: 'Failed password for admin token=abcd1234\nstatus=403 access denied',
  })
  assert.equal(result.analysis.counts.failedAuthentication, 1)
  assert.match(result.analysis.samples[0].text, /REDACTADO/)
})

test('declara límites preventivos', () => {
  assert.ok(SECURITY_ARTIFACT_LIMITS.maxBytes > 0)
  assert.ok(SECURITY_ARTIFACT_LIMITS.supportedTypes.includes('security-log'))
})
