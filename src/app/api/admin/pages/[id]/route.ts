import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

const getIdFromRequest = async (
  request: NextRequest,
  context: { params: { id?: string } } | { params: Promise<{ id?: string }> }
) => {
  const params = await context.params
  const directId = params?.id
  if (directId) return directId
  const segments = request.nextUrl.pathname.split('/').filter(Boolean)
  return segments[segments.length - 1] || ''
}

export async function GET(
  request: NextRequest,
  context: { params: { id?: string } } | { params: Promise<{ id?: string }> }
) {
  try {
    await requireRole(request, ['SYSTEM_ADMIN', 'MANAGEMENT'])
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    
    const item = await prisma.page.findUnique({ where: { id } })
    if (!item) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching page:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: { id?: string } } | { params: Promise<{ id?: string }> }
) {
  try {
    const user = await requireRole(request, ['SYSTEM_ADMIN', 'MANAGEMENT'])
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }

    const body = await request.json()
    const isPublish = body.status === 'PUBLISHED'
    const draftTitle = body.draftTitle ?? undefined
    const draftSeo = body.draftSeo ?? undefined
    const draftBlocks = Array.isArray(body.draftBlocks) ? body.draftBlocks : undefined
    const nextStatus = body.status ?? undefined

    const updateData: any = {}
    if (body.slug !== undefined) updateData.slug = body.slug
    if (nextStatus !== undefined) updateData.status = nextStatus
    if (draftTitle !== undefined) updateData.draftTitle = draftTitle
    if (draftSeo !== undefined) updateData.draftSeo = draftSeo
    if (draftBlocks !== undefined) updateData.draftBlocks = draftBlocks

    if (isPublish) {
      if (draftTitle !== undefined) updateData.title = draftTitle
      if (draftSeo !== undefined) updateData.seo = draftSeo
      if (draftBlocks !== undefined) updateData.blocks = draftBlocks
      updateData.publishedAt = new Date()
    }

    const item = await prisma.page.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error updating page:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id?: string } } | { params: Promise<{ id?: string }> }
) {
  try {
    await requireRole(request, ['SYSTEM_ADMIN'])
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    
    await prisma.page.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error deleting page:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
