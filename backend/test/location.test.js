import test from 'node:test'
import assert from 'node:assert/strict'
import { coarseLocationFromNominatim, validateCoordinates } from '../lib/location.js'

test('validateCoordinates acepta valores globales válidos', () => {
  assert.deepEqual(validateCoordinates('4.711', '-74.0721'), { latitude: 4.711, longitude: -74.0721 })
})

test('validateCoordinates rechaza rangos imposibles', () => {
  assert.throws(() => validateCoordinates(120, 10), /fuera del rango/i)
})

test('coarseLocationFromNominatim elimina calle y número', () => {
  const result = coarseLocationFromNominatim({
    address: {
      house_number: '10',
      road: 'Calle privada',
      city: 'Bogotá',
      state: 'Bogotá D.C.',
      country: 'Colombia',
      country_code: 'co',
    },
  })
  assert.equal(result.city, 'Bogotá')
  assert.equal(result.countryCode, 'CO')
  assert.equal(result.displayName, 'Bogotá, Bogotá D.C., Colombia')
  assert.equal(JSON.stringify(result).includes('Calle privada'), false)
})
