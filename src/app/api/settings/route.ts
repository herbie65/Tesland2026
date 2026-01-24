import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR'])
    
    const items = await prisma.setting.findMany()
    
    const filtered =
      user.role === 'SYSTEM_ADMIN' ? items : items.filter((item) => item.group !== 'rdwSettings')
    
    return NextResponse.json({ success: true, items: filtered })
  } catch (error: any) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['MANAGEMENT'])
    const body = await request.json()
    const { group, data } = body || {}
    
    if (!group || !data) {
      return NextResponse.json(
        { success: false, error: 'group and data are required' },
        { status: 400 }
      )
    }

    const item = await prisma.setting.upsert({
      where: { group },
      update: { data },
      create: { group, data }
    })
    
    return NextResponse.json({ success: true, item }, { status: 201 })
  } catch (error: any) {
    console.error('Error saving settings:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
