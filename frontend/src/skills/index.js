import frontendDesign from './frontend-design/SKILL.md?raw'
import webappTesting from './webapp-testing/SKILL.md?raw'
import mcpBuilder from './mcp-builder/SKILL.md?raw'
import codeReviewer from './code-reviewer/SKILL.md?raw'
import docCreator from './doc-creator/SKILL.md?raw'
import dataAnalyst from './data-analyst/SKILL.md?raw'
import apiArchitect from './api-architect/SKILL.md?raw'
import creativeWriter from './creative-writer/SKILL.md?raw'
import secureDevelopment from './secure-development/SKILL.md?raw'

const skillFiles = [
  frontendDesign,
  webappTesting,
  mcpBuilder,
  codeReviewer,
  docCreator,
  dataAnalyst,
  apiArchitect,
  creativeWriter,
  secureDevelopment,
]

function parseSkill(content) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!frontmatterMatch) {
    return { name: 'unknown', description: '', body: content }
  }

  const frontmatter = frontmatterMatch[1]
  const body = frontmatterMatch[2]

  const nameMatch = frontmatter.match(/name:\s*(.+)/)
  const descMatch = frontmatter.match(/description:\s*(.+)/)

  return {
    name: nameMatch ? nameMatch[1].trim() : 'unknown',
    description: descMatch ? descMatch[1].trim() : '',
    body: body.trim(),
  }
}

export const SKILLS = skillFiles.map(parseSkill)

export function getSkillByName(name) {
  return SKILLS.find(s => s.name === name)
}

export function getActiveSkills(selectedNames) {
  if (!selectedNames || selectedNames.length === 0) return []
  return selectedNames.map(getSkillByName).filter(Boolean)
}

export function buildSystemPromptWithSkills(basePrompt, selectedSkillNames) {
  const activeSkills = getActiveSkills(selectedSkillNames)
  if (activeSkills.length === 0) return basePrompt

  const skillsSection = activeSkills.map(s =>
    `## Skill: ${s.name}\n${s.body}`
  ).join('\n\n---\n\n')

  return `${basePrompt}

Tienes las siguientes habilidades (skills) activas. Úsalas cuando sean relevantes para la petición del usuario:

${skillsSection}`
}

export { SKILLS as default }
