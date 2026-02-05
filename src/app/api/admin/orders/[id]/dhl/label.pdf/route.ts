import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type RouteContext = {
  params: { id?: string } | Promise<{ id?: string }>
}

const getIdFromRequest = async (request: NextRequest, context: RouteContext) => {
  const params = await context.params
  const directId = params?.id
  if (directId) return directId
  const segments = request.nextUrl.pathname.split('/').filter(Boolean)
  return segments[segments.length - 1] || ''
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT'])
    const id = await getIdFromRequest(request, context)
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })

    const shipment = await prisma.shipment.findFirst({
      where: { orderId: id, carrier: 'DHL' },
      orderBy: { createdAt: 'desc' }
    })
    if (!shipment?.labelPdfBase64) {
      return NextResponse.json({ success: false, error: 'DHL label not found' }, { status: 404 })
    }

    const pdf = Buffer.from(shipment.labelPdfBase64, 'base64')
    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="dhl-label-${id}.pdf"`,
        'Cache-Control': 'private, max-age=0'
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}

