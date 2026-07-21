import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_PORTS,
  detectTechnologies,
  isPublicIpv4,
  validateAuditTarget,
} from '../lib/websiteAudit.js'

test('bloquea rangos IPv4 privados y reservados', () => {
  for (const ip of ['127.0.0.1', '10.0.0.1', '172.16.0.1', '192.168.1.1', '169.254.169.254', '192.0.2.1']) {
    assert.equal(isPublicIpv4(ip), false, ip)
  }
  assert.equal(isPublicIpv4('8.8.8.8'), true)
})

test('el conjunto preventivo de puertos es fijo y acotado', () => {
  assert.equal(DEFAULT_PORTS.length, 12)
  assert.deepEqual(DEFAULT_PORTS.slice(0, 2).map((item) => item.port), [80, 443])
})

test('detecta tecnologías visibles sin realizar banner grabbing', () => {
  const detected = detectTechnologies(
    { server: 'nginx/1.24.0', 'x-powered-by': 'Express' },
    '<script src="/jquery-3.7.1.min.js"></script><meta name="generator" content="WordPress 6.5.2">',
  )
  assert.ok(detected.some((item) => item.name.toLowerCase() === 'nginx' && item.version === '1.24.0'))
  assert.ok(detected.some((item) => item.name.toLowerCase() === 'jquery' && item.version === '3.7.1'))
  assert.ok(detected.some((item) => item.name.toLowerCase() === 'wordpress'))
})

test('exige autorización expresa antes de resolver el dominio', async () => {
  await assert.rejects(
    validateAuditTarget('https://example.com', { authorizationConfirmed: false, authorizationBasis: 'owner' }),
    /confirmar/i,
  )
})

test('bloquea direcciones IP directas', async () => {
  await assert.rejects(
    validateAuditTarget('https://8.8.8.8', { authorizationConfirmed: true, authorizationBasis: 'owner' }),
    /dominio público/i,
  )
})


test('bloquea puertos no web dentro de la URL', async () => {
  await assert.rejects(
    validateAuditTarget('https://example.com:22', { authorizationConfirmed: true, authorizationBasis: 'owner' }),
    /puertos web permitidos/i,
  )
})
