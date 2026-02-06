import { NextRequest, NextResponse } from 'next/server'
import {
  getSiteAccessCookieValue,
  isSiteAccessRequired,
  SITE_ACCESS_COOKIE_NAME,
} from '@/lib/site-access'

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

/**
 * GET /api/guard
 * Site-access check voor middleware (Node runtime = env bij request).
 * 200 = toegestaan, 401 = redirect naar gate.
 */
export async function GET(request: NextRequest) {
  const headers = { ...NO_CACHE }
  try {
    if (!isSiteAccessRequired()) {
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
