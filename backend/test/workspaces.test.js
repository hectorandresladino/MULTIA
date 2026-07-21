import test from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeProjectName, sanitizeRelativePath } from '../lib/workspaces.js'

test('normaliza el nombre del proyecto', () => {
  assert.equal(sanitizeProjectName('  Gestión de Pedidos 2026  '), 'gestion-de-pedidos-2026')
})

test('rechaza recorridos fuera del espacio de trabajo', () => {
  assert.throws(() => sanitizeRelativePath('../../etc/passwd'), /No se permite salir/)
  assert.throws(() => sanitizeRelativePath('/etc/passwd'), /Ruta de archivo inválida/)
})

test('bloquea carpetas reservadas', () => {
  assert.throws(() => sanitizeRelativePath('node_modules/paquete.js'), /reservada/)
  assert.throws(() => sanitizeRelativePath('.git/config'), /reservada/)
})
