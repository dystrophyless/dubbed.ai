export const PROJECT_TITLE_LIMIT = 100

function graphemeSegmenter(): Intl.Segmenter {
  if (typeof Intl.Segmenter !== 'function') {
    throw new Error('This browser does not support visible-character title counting.')
  }
  return new Intl.Segmenter(undefined, { granularity: 'grapheme' })
}

export function visibleCharacters(value: string): string[] {
  return [...graphemeSegmenter().segment(value)].map((part) => part.segment)
}

export function countVisibleCharacters(value: string): number {
  return visibleCharacters(value).length
}

export function validateProjectTitle(value: string): { valid: true; value: string } | { valid: false; reason: 'empty' | 'too-long'; count: number } {
  const normalized = value.trim()
  const count = countVisibleCharacters(normalized)
  if (count === 0) return { valid: false, reason: 'empty', count }
  if (count > PROJECT_TITLE_LIMIT) return { valid: false, reason: 'too-long', count }
  return { valid: true, value: normalized }
}

export function filenameProjectTitle(fileName: string): string {
  const lastSeparator = Math.max(fileName.lastIndexOf('/'), fileName.lastIndexOf('\\'))
  const baseName = fileName.slice(lastSeparator + 1)
  const extensionStart = baseName.lastIndexOf('.')
  const stem = extensionStart > 0 ? baseName.slice(0, extensionStart) : baseName
  return visibleCharacters(stem).slice(0, PROJECT_TITLE_LIMIT).join('')
}
