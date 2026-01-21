import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import path from 'path'
import { promises as fs } from 'fs'

export const runtime = 'nodejs'

const ALLOWED_CATEGORIES = ['products', 'uploads', 'profile', 'wallpapers']

const sanitizeFilename = (name: string) =>
  name.replace(/[^a-zA-Z0-9.\-_]/g, '_')

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['MANAGEMENT', 'MAGAZIJN'])
    const form = await request.formData()
    const file = form.get('file') as File | null
    const category = String(form.get('category') || 'uploads')
    if (!file) {
      return NextResponse.json({ success: false, error: 'file is required' }, { status: 400 })
    }
    if (!ALLOWED_CATEGORIES.includes(category)) {
      return NextResponse.json({ success: false, error: 'Invalid category' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const timestamp = Date.now()
    const safeName = sanitizeFilename(file.name || `upload-${timestamp}`)
    const targetDir = path.join(process.cwd(), 'public', 'media', category)
    await fs.mkdir(targetDir, { recursive: true })
    const fileName = `${timestamp}-${safeName}`
    const targetPath = path.join(targetDir, fileName)
    await fs.writeFile(targetPath, buffer)
    const url = `/media/${category}/${fileName}`
    return NextResponse.json({ success: true, url, path: url })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error uploading file:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
