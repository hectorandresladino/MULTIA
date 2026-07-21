import { describe, expect, it } from 'vitest'
import { buildLocationResearchPrompt, IMAGE_LOCATION_LIMITS } from './imageLocationService'

describe('imageLocationService', () => {
  it('construye un informe sin exponer coordenadas exactas', () => {
    const prompt = buildLocationResearchPrompt({
      personName: 'Nombre público de ejemplo',
      metadata: { latitude: 4.711, longitude: -74.0721, make: 'Camera', model: 'X', capturedAt: '2026-07-19T12:00:00Z' },
      place: { city: 'Bogotá', state: 'Bogotá D.C.', country: 'Colombia' },
      visibleText: 'Bogotá',
      visualDescription: 'una plaza urbana',
    })
    expect(prompt).toContain('Bogotá')
    expect(prompt).toContain('No identifique rostros')
    expect(prompt).not.toContain('4.711')
    expect(prompt).not.toContain('-74.0721')
  })

  it('declara los límites de privacidad', () => {
    expect(IMAGE_LOCATION_LIMITS.faceRecognition).toBe(false)
    expect(IMAGE_LOCATION_LIMITS.inferSensitiveTraits).toBe(false)
    expect(IMAGE_LOCATION_LIMITS.exactAddress).toBe(false)
  })
})
