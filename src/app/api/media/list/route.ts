import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import path from 'path'
import { promises as fs } from 'fs'

export const runtime = 'nodejs'

const ALLOWED_CATEGORIES = ['products', 'uploads', 'profile', 'wallpapers']

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['MANAGEMENT', 'MAGAZIJN'])
    const category = request.nextUrl.searchParams.get('category') || 'uploads'
    if (!ALLOWED_CATEGORIES.includes(category)) {
      return NextResponse.json({ success: false, error: 'Invalid category' }, { status: 400 })
    }
    const baseDir = path.join(process.cwd(), 'public', 'media', category)
    let entries: string[] = []
    try {
      entries = await fs.readdir(baseDir)
    } catch {
      entries = []
    }
    const files = await Promise.all(
      entries.map(async (name) => {
        const filePath = path.join(baseDir, name)
        const stat = await fs.stat(filePath)
        if (!stat.isFile()) return null
        return {
          name,
          url: `/media/${category}/${name}`,
          size: stat.size,
          updatedAt: stat.mtime.toISOString()
        }
      })
    )
    const result = files.filter(Boolean)
    return NextResponse.json({ success: true, files: result })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error listing media:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
