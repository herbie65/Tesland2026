import { prisma } from '@/lib/prisma'

export type PostcodeLookupSettings = {
  enabled: boolean
  apiBaseUrl: string
  apiKey: string
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

export async function getPostcodeLookupSettingsStrict(): Promise<PostcodeLookupSettings> {
  const setting = await prisma.setting.findUnique({ where: { group: 'postcodelookup' } })
  if (!setting) {
    throw new Error('Postcode lookup settings missing (settings groep "postcodelookup")')
  }
  if (!isObject(setting.data)) {
    throw new Error('Postcode lookup settings invalid: data must be an object')
  }

  const enabled = Boolean(setting.data.enabled)
  const apiBaseUrl = String(setting.data.apiBaseUrl || '')
  const apiKey = String(setting.data.apiKey || '')

  if (enabled) {
    if (!apiBaseUrl.trim()) throw new Error('Postcode lookup settings invalid: apiBaseUrl ontbreekt')
    if (!apiKey.trim()) throw new Error('Postcode lookup settings invalid: apiKey ontbreekt')
  }

  return {
    enabled,
    apiBaseUrl: apiBaseUrl.trim(),
    apiKey: apiKey.trim()
  }
}

