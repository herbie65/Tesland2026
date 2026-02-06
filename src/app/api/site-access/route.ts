import { NextRequest, NextResponse } from 'next/server'
import { getSiteAccessCookieValue, SITE_ACCESS_COOKIE_NAME } from '@/lib/site-access'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 dagen

export async function POST(request: NextRequest) {
  const password = process.env.SITE_ACCESS_PASSWORD
  const secret = process.env.JWT_SECRET
  if (!password || !secret) {
    return NextResponse.json({ success: false, error: 'Site access not configured' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const submitted = String(body?.password ?? '').trim()
    if (!submitted) {
      return NextResponse.json({ success: false, error: 'Wachtwoord is verplicht' }, { status: 400 })
    }

    if (submitted !== password) {
      return NextResponse.json({ success: false, error: 'Onjuist wachtwoord' }, { status: 401 })
    }

    const value = getSiteAccessCookieValue(password, secret)
    const res = NextResponse.json({ success: true })
    res.cookies.set(SITE_ACCESS_COOKIE_NAME, value, {
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })
    return res
  } catch {
    return NextResponse.json({ success: false, error: 'Fout bij verwerken' }, { status: 400 })
  }
}
