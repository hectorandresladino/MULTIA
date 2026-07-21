import { describe, it, expect, vi } from 'vitest'
import { PROVIDERS, hasApiKey, getApiKey, callAI, selectModelForTask } from './aiService.js'

describe('AI Service', () => {
  it('should have all providers configured', () => {
    expect(PROVIDERS.webllm).toBeDefined()
    expect(PROVIDERS.gemini).toBeDefined()
    expect(PROVIDERS.openai).toBeDefined()
    expect(PROVIDERS.anthropic).toBeDefined()
    expect(PROVIDERS.groq).toBeDefined()
    expect(PROVIDERS.ollama).toBeDefined()
    expect(PROVIDERS.demo).toBeDefined()
  })

  it('should mark webllm, ollama and demo as not requiring a key', () => {
    expect(hasApiKey('webllm')).toBe(true)
    expect(hasApiKey('ollama')).toBe(true)
    expect(hasApiKey('demo')).toBe(true)
  })

  it('should not have key for paid providers without config', () => {
    expect(hasApiKey('openai')).toBe(false)
    expect(hasApiKey('anthropic')).toBe(false)
  })

  it('should return empty string for missing keys', () => {
    expect(getApiKey('openai')).toBe('')
    expect(getApiKey('gemini')).toBe('')
  })

  it('should have default models for each provider', () => {
    Object.values(PROVIDERS).forEach(provider => {
      expect(provider.defaultModel).toBeDefined()
      expect(provider.models.length).toBeGreaterThan(0)
    })
  })


  it('should route simple browser tasks to the lightweight model', () => {
    expect(selectModelForTask('webllm', PROVIDERS.webllm.defaultModel, 'Hola, explícame qué es una variable')).toBe(
      'Llama-3.2-1B-Instruct-q4f16_1-MLC'
    )
  })

  it('should route complex browser tasks to the stronger model', () => {
    expect(selectModelForTask('webllm', PROVIDERS.webllm.defaultModel, 'Analiza jurídicamente esta sentencia y presenta contraargumentos')).toBe(
      'Llama-3.2-3B-Instruct-q4f16_1-MLC'
    )
    expect(selectModelForTask('webllm', PROVIDERS.webllm.defaultModel, 'Crea la arquitectura full stack completa', { projectMode: true })).toBe(
      'Llama-3.2-3B-Instruct-q4f16_1-MLC'
    )
  })

  it('should preserve the selected model for external providers', () => {
    expect(selectModelForTask('openai', 'gpt-4o-mini', 'investigación compleja', { researchMode: true })).toBe('gpt-4o-mini')
  })

  it('should stream demo response', async () => {
    const chunks = []
    const result = await callAI('demo', [
      { role: 'user', content: 'hola' }
    ], PROVIDERS.demo.defaultModel, (text) => chunks.push(text))

    expect(result.length).toBeGreaterThan(0)
    expect(chunks.length).toBeGreaterThan(0)
    expect(result).toContain('Hola')
  })
})
