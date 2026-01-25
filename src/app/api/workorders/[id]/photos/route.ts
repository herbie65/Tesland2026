import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

type RouteContext = {
  params: { id?: string } | Promise<{ id?: string }>
}

const getIdFromContext = async (context: RouteContext) => {
  const params = await context.params
  return params?.id || ''
}

// GET /api/workorders/[id]/photos - List all photos
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR'])
    const workOrderId = await getIdFromContext(context)
    
    if (!workOrderId) {
      return NextResponse.json({ success: false, error: 'Missing work order ID' }, { status: 400 })
    }

    const photos = await prisma.workOrderPhoto.findMany({
      where: { workOrderId },
      include: {
        uploader: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, items: photos })
  } catch (error: any) {
    console.error('Error fetching photos:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: error.status || 500 })
  }
}

// POST /api/workorders/[id]/photos - Add a new photo
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR'])
    const workOrderId = await getIdFromContext(context)
    
    if (!workOrderId) {
      return NextResponse.json({ success: false, error: 'Missing work order ID' }, { status: 400 })
    }

    const body = await request.json()
    const {
      url,
      filename,
      description,
      type
    } = body

    if (!url) {
      return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 })
    }

    const photo = await prisma.workOrderPhoto.create({
      data: {
        workOrderId,
        url,
        filename: filename || null,
        description: description || null,
        type: type || 'general',
        uploadedBy: user.id
      },
      include: {
        uploader: true
      }
    })

    return NextResponse.json({ success: true, item: photo }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating photo:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: error.status || 500 })
  }
}
