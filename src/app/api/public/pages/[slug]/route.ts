import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const getSlugFromRequest = async (
  request: NextRequest,
  context: { params: { slug?: string } } | { params: Promise<{ slug?: string }> }
) => {
  const params = await context.params
  const directSlug = params?.slug
  if (directSlug) return directSlug
  const segments = request.nextUrl.pathname.split('/').filter(Boolean)
  return segments[segments.length - 1] || ''
}

export async function GET(
  request: NextRequest,
  context: { params: { slug?: string } } | { params: Promise<{ slug?: string }> }
) {
  try {
    const slug = await getSlugFromRequest(request, context)
    if (!slug) {
      return NextResponse.json({ success: false, error: 'Missing slug' }, { status: 400 })
    }

    const page = await prisma.page.findUnique({ where: { slug } })
    if (!page || !page.isPublished) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, item: page })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching public page:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}