const decodeHtmlEntities = (input: string) => {
  // Minimal decoding for common Magento content
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
}

export const htmlToPlainText = (value: string) => {
  const raw = String(value || '')
  if (!raw.trim()) return ''

  // Preserve some structure before stripping tags
  let text = raw
    .replace(/\r\n/g, '\n')
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/\s*p\s*>/gi, '\n\n')
    .replace(/<\s*\/\s*div\s*>/gi, '\n')
    .replace(/<\s*\/\s*li\s*>/gi, '\n')
    .replace(/<\s*li\s*>/gi, '- ')

  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, '')

  // Decode entities
  text = decodeHtmlEntities(text)

  // Normalize whitespace
  text = text
    .replace(/\u00A0/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return text
}

const splitParagraphs = (text: string) =>
  text
    .split(/\n{2,}/g)
    .map((p) => p.trim())
    .filter(Boolean)

export const buildProductDescription = (params: {
  description?: string | null
  shortDescription?: string | null
}) => {
  const shortText = params.shortDescription ? htmlToPlainText(params.shortDescription) : ''
  const longText = params.description ? htmlToPlainText(params.description) : ''

  const a = shortText.trim()
  const b = longText.trim()

  if (!a && !b) return null
  if (a && !b) return a
  if (!a && b) return b

  // Dedupe common cases
  if (a === b) return a
  if (b.includes(a)) return b
  if (a.includes(b)) return a

  // Paragraph-level de-duplication (keeps order)
  const seen = new Set<string>()
  const merged: string[] = []
  for (const p of [...splitParagraphs(a), ...splitParagraphs(b)]) {
    const key = p.toLowerCase().replace(/\s+/g, ' ').trim()
    if (!key) continue
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(p)
  }

  return merged.join('\n\n').trim()
}

