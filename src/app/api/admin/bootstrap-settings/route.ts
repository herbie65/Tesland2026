import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['SYSTEM_ADMIN'])
    const body = await request.json()

    const updated: string[] = []

    // Upsert each setting key from the payload
    for (const [key, value] of Object.entries(body)) {
      await prisma.setting.upsert({
        where: { group: key },
        create: { group: key, data: value },
        update: { data: value }
      })
      updated.push(key)
    }

    return NextResponse.json({ success: true, updated })
  } catch (error: any) {
    console.error('[bootstrap-settings] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Bootstrap mislukt' },
      { status: error.status || 500 }
    )
  }
}
