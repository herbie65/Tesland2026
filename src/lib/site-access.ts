import { createHash } from 'crypto'

export const SITE_ACCESS_COOKIE_NAME = 'tesland_site_access'

/** Zelfde hash als in API route; Node-runtime (layout, API). */
export function getSiteAccessCookieValue(password: string, secret: string): string {
  const data = password + '\0' + secret
  return createHash('sha256').update(data, 'utf8').digest('base64url')
}

export function isSiteAccessRequired(): boolean {
  const p = process.env.SITE_ACCESS_PASSWORD
  return Boolean(p && p.trim().length > 0)
}
