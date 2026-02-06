import { NextResponse } from 'next/server'

/**
 * GET /api/site-access/status
 * Geeft aan of site-wachtwoord actief is (zonder wachtwoord te tonen).
 * Handig om op de server te controleren of SITE_ACCESS_PASSWORD is gezet.
 */
export async function GET() {
  const enabled = Boolean(
    process.env.SITE_ACCESS_PASSWORD &&
    process.env.SITE_ACCESS_PASSWORD.trim().length > 0
  )
  return NextResponse.json(
    { enabled },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
  )
}
