import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type ICalEvent = {
  uid: string
  summary: string
  description?: string
  location?: string
  start: string
  end: string
  allDay: boolean
}

function parseICalDate(dateStr: string): { date: Date; allDay: boolean } {
  // Handle different iCal date formats
  // VALUE=DATE:20260125 (all-day)
  // 20260125T100000Z (UTC)
  // 20260125T100000 (local)
  // TZID=Europe/Amsterdam:20260125T100000
  
  const cleanStr = dateStr.replace(/^TZID=[^:]+:/, '').replace(/^VALUE=DATE:/, '')
  
  if (cleanStr.length === 8) {
    // All-day event: YYYYMMDD
    const year = parseInt(cleanStr.slice(0, 4))
    const month = parseInt(cleanStr.slice(4, 6)) - 1
    const day = parseInt(cleanStr.slice(6, 8))
    return { date: new Date(year, month, day), allDay: true }
  }
  
  // DateTime: YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
  const isUTC = cleanStr.endsWith('Z')
  const dateTimeStr = cleanStr.replace('Z', '')
  
  const year = parseInt(dateTimeStr.slice(0, 4))
  const month = parseInt(dateTimeStr.slice(4, 6)) - 1
  const day = parseInt(dateTimeStr.slice(6, 8))
  const hour = parseInt(dateTimeStr.slice(9, 11)) || 0
  const minute = parseInt(dateTimeStr.slice(11, 13)) || 0
  const second = parseInt(dateTimeStr.slice(13, 15)) || 0
  
  if (isUTC) {
    return { date: new Date(Date.UTC(year, month, day, hour, minute, second)), allDay: false }
  }
  
  return { date: new Date(year, month, day, hour, minute, second), allDay: false }
}

function unfoldLines(icalText: string): string {
  // iCal uses line folding: long lines are split with CRLF + space/tab
  return icalText.replace(/\r?\n[ \t]/g, '')
}

function parseICalText(icalText: string): ICalEvent[] {
  const events: ICalEvent[] = []
  const unfolded = unfoldLines(icalText)
  const lines = unfolded.split(/\r?\n/)
  
  let currentEvent: Partial<ICalEvent> | null = null
  let inEvent = false
  
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true
      currentEvent = {}
      continue
    }
    
    if (line === 'END:VEVENT') {
      if (currentEvent && currentEvent.uid && currentEvent.start && currentEvent.end) {
        events.push(currentEvent as ICalEvent)
      }
      inEvent = false
      currentEvent = null
      continue
    }
    
    if (!inEvent || !currentEvent) continue
    
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue
    
    const keyPart = line.slice(0, colonIndex)
    const value = line.slice(colonIndex + 1)
    
    // Extract base property name (remove parameters like ;TZID=...)
    const baseProp = keyPart.split(';')[0]
    
    switch (baseProp) {
      case 'UID':
        currentEvent.uid = value
        break
      case 'SUMMARY':
        currentEvent.summary = value.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\\\/g, '\\')
        break
      case 'DESCRIPTION':
        currentEvent.description = value.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\\\/g, '\\')
        break
      case 'LOCATION':
        currentEvent.location = value.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\\\/g, '\\')
        break
      case 'DTSTART':
        const startResult = parseICalDate(keyPart.includes('VALUE=DATE') ? `VALUE=DATE:${value}` : value)
        currentEvent.start = startResult.date.toISOString()
        currentEvent.allDay = startResult.allDay
        break
      case 'DTEND':
        const endResult = parseICalDate(keyPart.includes('VALUE=DATE') ? `VALUE=DATE:${value}` : value)
        currentEvent.end = endResult.date.toISOString()
        break
    }
  }
  
  return events
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request)
    
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 })
    }
    
    // Get user's iCal URL
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { icalUrl: true, displayName: true, color: true }
    })
    
    if (!user || !user.icalUrl) {
      return NextResponse.json({ success: true, events: [] })
    }
    
    // Fetch iCal data
    const response = await fetch(user.icalUrl, {
      headers: {
        'User-Agent': 'Tesland-Calendar/1.0'
      }
    })
    
    if (!response.ok) {
      console.error('Failed to fetch iCal:', response.status, response.statusText)
      return NextResponse.json({ success: false, error: 'Failed to fetch calendar' }, { status: 502 })
    }
    
    const contentType = response.headers.get('content-type') || ''
    const icalText = await response.text()

    // Some providers return HTML (login pages / errors) with 200 OK.
    // Detect and return a helpful error so the UI can surface it.
    if (!icalText.includes('BEGIN:VCALENDAR')) {
      const preview = icalText.slice(0, 200)
      console.error('Invalid iCal feed content', {
        userId,
        contentType,
        preview,
      })
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid iCal feed (not a VCALENDAR). Check the iCal URL.',
          details: { contentType, preview },
        },
        { status: 502 }
      )
    }
    let events = parseICalText(icalText)
    
    // Filter by date range if provided
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      events = events.filter(event => {
        const eventStart = new Date(event.start)
        const eventEnd = new Date(event.end)
        return eventStart < end && eventEnd > start
      })
    }
    
    // Sort by start date
    events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    
    return NextResponse.json({ 
      success: true, 
      events,
      user: {
        name: user.displayName,
        color: user.color
      }
    })
  } catch (error: any) {
    console.error('Error fetching iCal:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
