import { NextRequest, NextResponse } from 'next/server'

const SUPPORTED_LOCALES = ['nl', 'en', 'de', 'fr'] as const
const LOCALE_COOKIE = 'tesland_locale'
const PATHNAME_HEADER = 'x-pathname'

const LOCALE_BY_COUNTRY: Record<string, (typeof SUPPORTED_LOCALES)[number]> = {
  NL: 'nl',
  BE: 'nl',
  DE: 'de',
  AT: 'de',
  CH: 'de',
  FR: 'fr',
  LU: 'fr',
  CA: 'fr',
  GB: 'en',
  IE: 'en',
  US: 'en'
}

const EXCLUDED_PREFIXES = [
  '/api',
  '/admin',
  '/_next',
  '/favicon',
  '/robots',
  '/sitemap',
  '/assets',
  '/media'
]

const getLocaleFromAcceptLanguage = (header: string | null) => {
  if (!header) return null
  const entries = header.split(',').map((part) => part.trim().split(';')[0])
  for (const entry of entries) {
    const code = entry.toLowerCase()
    if (code.startsWith('nl')) return 'nl'
    if (code.startsWith('de')) return 'de'
    if (code.startsWith('fr')) return 'fr'
    if (code.startsWith('en')) return 'en'
  }
  return null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(PATHNAME_HEADER, pathname)

  const nextOpts = { request: { headers: requestHeaders } }

  // Gate-pagina: geen locale-redirect
  if (pathname.startsWith('/site-access')) {
    return NextResponse.next(nextOpts)
  }

  // Alleen /api overslaan voor guard (guard + login API); rest van de site beveiligen
  if (!pathname.startsWith('/api')) {
    try {
      const guardUrl = new URL('/api/guard', request.url)
      const guardRes = await fetch(guardUrl.toString(), {
        headers: { cookie: request.headers.get('cookie') ?? '' },
        cache: 'no-store',
      })
      if (guardRes.status === 401) {
        const url = request.nextUrl.clone()
        url.pathname = '/site-access'
        url.searchParams.set('next', pathname)
        return NextResponse.redirect(url)
      }
    } catch {
      // Bij netwerkfout doorlaten (bijv. dev zonder server)
    }
  }

  if (EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next(nextOpts)
  }

  const segments = pathname.split('/').filter(Boolean)
  if (segments.length > 0 && SUPPORTED_LOCALES.includes(segments[0] as any)) {
    const response = NextResponse.next(nextOpts)
    response.cookies.set(LOCALE_COOKIE, segments[0], { path: '/', maxAge: 60 * 60 * 24 * 365 })
    return response
  }

  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value
  const country =
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('x-vercel-ip-country-region') ||
    ''
  const byCountry = LOCALE_BY_COUNTRY[country.toUpperCase()]
  const byHeader = getLocaleFromAcceptLanguage(request.headers.get('accept-language'))
  const locale =
    (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale as any)
      ? (cookieLocale as (typeof SUPPORTED_LOCALES)[number])
      : null) ||
    byCountry ||
    byHeader ||
    'nl'

  const url = request.nextUrl.clone()
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`
  const response = NextResponse.redirect(url)
  response.cookies.set(LOCALE_COOKIE, locale, { path: '/', maxAge: 60 * 60 * 24 * 365 })
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
