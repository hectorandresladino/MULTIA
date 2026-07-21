import test from 'node:test'
import assert from 'node:assert/strict'
import { buildFullStackTemplate } from '../lib/templates.js'

function fileContent(result, path) {
  return result.files.find((file) => file.path === path)?.content || ''
}

test('la decisión estructurada del consejo controla dominio, API, base de datos y formulario', () => {
  const decisions = `<MULTIA_BUILD_SPEC>{
    "projectName": "inventario-inteligente",
    "title": "Inventario Inteligente",
    "entity": {
      "singular": "producto",
      "plural": "productos",
      "fields": [
        {"name":"name","label":"Nombre","type":"string","required":true},
        {"name":"sku","label":"SKU","type":"string","required":true},
        {"name":"price","label":"Precio","type":"number","required":true},
        {"name":"stock","label":"Existencias","type":"integer","required":true},
        {"name":"active","label":"Activo","type":"boolean","required":false}
      ]
    },
    "features": ["crud", "validation", "openshift"]
  }</MULTIA_BUILD_SPEC>`

  const result = buildFullStackTemplate({ request: 'Cree un inventario', decisions })

  assert.equal(result.projectName, 'inventario-inteligente')
  assert.equal(result.spec.source, 'council')
  assert.equal(result.spec.entity.plural, 'productos')
  assert.deepEqual(result.spec.entity.fields.map((field) => field.name), ['name', 'sku', 'price', 'stock', 'active'])
  assert.match(fileContent(result, 'backend/src/app.js'), /\/api\/productos/)
  assert.match(fileContent(result, 'database/init.sql'), /sku VARCHAR\(200\) NOT NULL/)
  assert.match(fileContent(result, 'frontend/src/App.jsx'), /Existencias/)
  assert.match(fileContent(result, 'MULTIA_BUILD_SPEC.json'), /"source": "council"/)
})

test('sin bloque estructurado infiere una aplicación de clientes de forma segura', () => {
  const result = buildFullStackTemplate({
    request: 'Crea un sistema full stack para gestionar clientes y sus datos de contacto',
    decisions: 'Use React, Express, PostgreSQL y OpenShift.',
  })

  assert.equal(result.spec.source, 'inferred')
  assert.equal(result.spec.entity.plural, 'clientes')
  assert.ok(result.spec.entity.fields.some((field) => field.name === 'email'))
  assert.match(fileContent(result, 'backend/src/app.js'), /\/api\/clientes/)
  assert.match(fileContent(result, 'openshift.yaml'), /kind: Route/)
})

test('normaliza nombres y campos potencialmente peligrosos antes de generar código', () => {
  const decisions = `<MULTIA_BUILD_SPEC>{
    "projectName": "../../Proyecto Peligroso",
    "entity": {
      "singular": "dato; DROP TABLE x",
      "plural": "datos privados",
      "fields": [
        {"name":"id","label":"Identificador alterado","type":"string","required":true},
        {"name":"../../secret","label":"Secreto","type":"email","required":true}
      ]
    }
  }</MULTIA_BUILD_SPEC>`

  const result = buildFullStackTemplate({ request: 'Proyecto de prueba', decisions })

  assert.equal(result.projectName, 'proyecto-peligroso')
  assert.equal(result.spec.entity.singular, 'dato_drop_table_x')
  assert.equal(result.spec.entity.plural, 'datos_privados')
  assert.deepEqual(result.spec.entity.fields.map((field) => field.name), ['id_1', 'secret'])
  assert.ok(result.files.every((file) => !file.path.includes('..')))
})
