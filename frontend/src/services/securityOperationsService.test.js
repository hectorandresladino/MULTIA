import { describe, expect, it } from 'vitest'
import {
  buildOwnDevicePrompt,
  buildOwnedRoutePrompt,
  SECURITY_OPERATIONS_LIMITS,
  summarizeRoutePoints,
} from './securityOperationsService'

describe('securityOperationsService', () => {
  it('resume un trayecto sin requerir servidores', () => {
    const summary = summarizeRoutePoints([
      { latitude: 4.7, longitude: -74.1, time: '2026-07-19T10:00:00Z' },
      { latitude: 4.71, longitude: -74.09, time: '2026-07-19T10:10:00Z' },
    ])
    expect(summary.points).toBe(2)
    expect(summary.distanceKm).toBeGreaterThan(0)
    expect(summary.durationMinutes).toBe(10)
  })

  it('no incluye coordenadas exactas en el mensaje de trayecto', () => {
    const prompt = buildOwnedRoutePrompt({
      fileName: 'ruta.gpx', points: 2, distanceKm: 1.5, durationMinutes: 10,
      startPlace: { city: 'Bogotá', country: 'Colombia' },
      endPlace: { city: 'Bogotá', country: 'Colombia' },
    })
    expect(prompt).toContain('Bogotá')
    expect(prompt).toContain('no se incluyen coordenadas exactas')
  })

  it('limita la ubicación a este dispositivo', () => {
    const prompt = buildOwnDevicePrompt({ place: { city: 'Yopal', country: 'Colombia' }, accuracyMeters: 100 })
    expect(prompt).toContain('propio dispositivo')
    expect(prompt).toContain('No intentes localizar otro teléfono')
    expect(SECURITY_OPERATIONS_LIMITS.remotePhoneLocation).toBe(false)
  })
})
