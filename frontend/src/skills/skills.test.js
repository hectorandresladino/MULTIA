import { describe, it, expect } from 'vitest'
import { SKILLS, getSkillByName, getActiveSkills, buildSystemPromptWithSkills } from './index.js'

describe('Skills system', () => {
  it('should parse all skills', () => {
    expect(SKILLS.length).toBeGreaterThan(0)
    expect(SKILLS.some(s => s.name === 'secure-development')).toBe(true)
    SKILLS.forEach(skill => {
      expect(skill.name).toBeDefined()
      expect(skill.description).toBeDefined()
      expect(skill.body).toBeDefined()
    })
  })

  it('should find skill by name', () => {
    const skill = getSkillByName(SKILLS[0].name)
    expect(skill).toBeDefined()
    expect(skill.name).toBe(SKILLS[0].name)
  })

  it('should return active skills by name', () => {
    const names = SKILLS.slice(0, 2).map(s => s.name)
    const active = getActiveSkills(names)
    expect(active.length).toBe(2)
  })

  it('should build system prompt with skills', () => {
    const base = 'Eres un asistente.'
    const names = SKILLS.slice(0, 1).map(s => s.name)
    const prompt = buildSystemPromptWithSkills(base, names)
    expect(prompt).toContain(base)
    expect(prompt).toContain('Skill: ' + SKILLS[0].name)
    expect(prompt).toContain(SKILLS[0].body)
  })

  it('should return base prompt when no skills selected', () => {
    const base = 'Eres un asistente.'
    const prompt = buildSystemPromptWithSkills(base, [])
    expect(prompt).toBe(base)
  })
})
