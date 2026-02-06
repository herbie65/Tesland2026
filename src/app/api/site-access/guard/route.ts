import { NextRequest, NextResponse } from 'next/server'
import {
  getSiteAccessCookieValue,
  isSiteAccessRequired,
  SITE_ACCESS_COOKIE_NAME,
} from '@/lib/site-access'

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
const GUARD_HEADER = 'X-Site-Access-Guard'

/**
 * GET /api/site-access/guard
 * Aanroepen vanuit middleware (Edge) om cookie te laten controleren in Node (runtime env).
 * 200 = toegestaan, 401 = redirect naar gate.
 */
export async function GET(request: NextRequest) {
  const headers = {
    ...NO_CACHE,
    [GUARD_HEADER]: '1',
  }
  try {
    const required = isSiteAccessRequired()
    headers['X-Guard-Required'] = required ? '1' : '0'
    if (!required) {
      return NextResponse.json({ ok: true }, { status: 200, headers })
    }
    const password = process.env.SITE_ACCESS_PASSWORD?.trim()
    const secret = (process.env.JWT_SECRET ?? '').trim()
    if (!password) {
      return NextResponse.json({ ok: false }, { status: 401, headers })
    }
    const cookie = request.cookies.get(SITE_ACCESS_COOKIE_NAME)?.value
    const expected = getSiteAccessCookieValue(password, secret)
    if (cookie && cookie === expected) {
      return NextResponse.json({ ok: true }, { status: 200, headers })
    }
    return NextResponse.json({ ok: false }, { status: 401, headers })
  } catch {
    return NextResponse.json({ ok: false }, { status: 401, headers })
  }
}
