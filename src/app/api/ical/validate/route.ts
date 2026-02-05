import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

type ValidateBody = {
  url?: string
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request)

    const body = (await request.json().catch(() => null)) as ValidateBody | null
    const url = body?.url ? String(body.url).trim() : ''
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      return NextResponse.json(
        { success: false, error: 'Valid iCal URL is required' },
        { status: 400 }
      )
    }

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Tesland-Calendar/1.0' }
    })

    const contentType = response.headers.get('content-type') || ''
    const text = await response.text()
    const hasCalendar = text.includes('BEGIN:VCALENDAR')
    const hasEvents = text.includes('BEGIN:VEVENT')

    if (!response.ok || !hasCalendar) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid iCal feed. The URL did not return a VCALENDAR.',
          details: {
            status: response.status,
            contentType,
            preview: text.slice(0, 200)
          }
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      details: {
        status: response.status,
        contentType,
        hasEvents,
        bytes: text.length
      }
    })
  } catch (error: any) {
    console.error('[ical validate] error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to validate iCal URL' },
      { status: 500 }
    )
  }
}

