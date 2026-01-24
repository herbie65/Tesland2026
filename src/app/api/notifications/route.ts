import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT'])
    const unreadOnly = request.nextUrl.searchParams.get('unread') === 'true'
    
    const now = new Date()
    
    const where: any = {
      OR: [
        { notifyAt: null },
        { notifyAt: { lte: now } }
      ]
    }
    
    if (unreadOnly) {
      where.readBy = {
        not: {
          has: user.id
        }
      }
    }
    
    const items = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT'])
    const body = await request.json()
    const ids = Array.isArray(body?.ids) ? body.ids.map((id: any) => String(id)) : []
    const markAll = Boolean(body?.markAll)

    if (markAll || !ids.length) {
      // Mark all notifications as read
      const notifications = await prisma.notification.findMany({
        where: {
          readBy: {
            not: {
              has: user.id
            }
          }
        }
      })
      
      for (const notification of notifications) {
        await prisma.notification.update({
          where: { id: notification.id },
          data: {
            readBy: {
              push: user.id
            }
          }
        })
      }
      
      return NextResponse.json({ success: true })
    }

    // Mark specific notifications as read
    for (const id of ids) {
      const notification = await prisma.notification.findUnique({
        where: { id }
      })
      
      if (notification) {
        const readBy = notification.readBy || []
        if (!readBy.includes(user.id)) {
          await prisma.notification.update({
            where: { id },
            data: {
              readBy: {
                push: user.id
              }
            }
          })
        }
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error updating notifications:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
