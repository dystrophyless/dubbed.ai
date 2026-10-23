import { describe, expect, it } from 'vitest'
import { filenameProjectTitle, validateProjectTitle } from '../../src/services/project-title'

const sourceFiles = import.meta.glob<string>('../../src/**/*.{ts,tsx}', {
  eager: true,
  query: '?raw',
  import: 'default',
})

function scanUiSource(source: string): string[] {
  const violations: string[] = []
  if (/\bfetch\s*\(|\bnew\s+XMLHttpRequest\s*\(|axios\.(?:get|post|put|patch|delete)\s*\(/.test(source)) {
    violations.push('direct-request')
  }
  if (/from\s*['"][^'"]*services\/(?:mock-[^'"]*|mock-store|indexeddb|mutations)(?:\.[^'"]*)?['"]/.test(source)
    || /import\s*\(\s*['"][^'"]*services\/(?:mock-[^'"]*|mock-store|indexeddb|mutations)/.test(source)) {
    violations.push('direct-adapter-import')
  }
  return violations
}

describe('shared title rules and service facade architecture', () => {
  it('counts grapheme clusters for manual titles and filename stems', () => {
    const combined = 'e\u0301'
    const emoji = '👩🏽‍🎤'
    expect(validateProjectTitle(combined.repeat(100))).toMatchObject({ valid: true })
    expect(validateProjectTitle(emoji.repeat(100))).toMatchObject({ valid: true })
    expect(validateProjectTitle(emoji.repeat(101))).toMatchObject({ valid: false, reason: 'too-long' })
    expect(filenameProjectTitle(`${emoji.repeat(101)}.mp4`)).toBe(emoji.repeat(100))
  })

  it('detects a forbidden UI request and direct mock-adapter import with negative fixtures', () => {
    expect(scanUiSource("await fetch('/api/projects')")).toContain('direct-request')
    expect(scanUiSource("import { createMockProjects } from '../services/mock-projects'")).toContain('direct-adapter-import')
    expect(scanUiSource("import { projects } from '../services'")).toEqual([])
  })

  it('keeps current UI source behind the facade', () => {
    const violations = Object.entries(sourceFiles).flatMap(([file, source]) => {
      if (file.includes('/src/services/')) return []
      const hits = scanUiSource(source)
      return hits.map((hit) => `${file}: ${hit}`)
    })
    expect(violations).toEqual([])
  })
})
