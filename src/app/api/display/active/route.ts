import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DISPLAY_SETTINGS_KEY = 'displaySettings'

// Helper function to get display settings from database
async function getDisplaySettings() {
  const setting = await prisma.setting.findUnique({
    where: { group: DISPLAY_SETTINGS_KEY },
  })
  
  if (!setting) {
    return { activeWorkOrderId: null, lastUpdated: null }
  }
  
  return setting.data as { activeWorkOrderId: string | null; lastUpdated: string | null }
}

// Helper function to update display settings in database
async function updateDisplaySettings(activeWorkOrderId: string | null) {
  await prisma.setting.upsert({
    where: { group: DISPLAY_SETTINGS_KEY },
    create: {
      group: DISPLAY_SETTINGS_KEY,
      data: {
        activeWorkOrderId,
        lastUpdated: new Date().toISOString(),
      },
    },
    update: {
      data: {
        activeWorkOrderId,
        lastUpdated: new Date().toISOString(),
      },
    },
  })
}

// GET /api/display/active - Get the active workorder to display
export async function GET(request: NextRequest) {
  try {
    // Get active workorder ID from database
    const displaySettings = await getDisplaySettings()
    const activeWorkOrderId = displaySettings.activeWorkOrderId

    if (!activeWorkOrderId) {
      return NextResponse.json({ workOrderId: null }, { status: 200 })
    }

    // Fetch the full work order data
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: activeWorkOrderId },
      include: {
        customer: true,
        vehicle: true,
        assignee: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        partsLines: {
          include: {
            product: true,
            vatRate: true,
          },
        },
        laborLines: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
              },
            },
            vatRate: true,
          },
        },
        photos: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!workOrder) {
      // Work order was deleted, clear the active display in database
      await updateDisplaySettings(null)
      return NextResponse.json({ workOrderId: null }, { status: 200 })
    }

    return NextResponse.json({
      workOrderId: activeWorkOrderId,
      workOrder,
      lastUpdated: displaySettings.lastUpdated,
    })
  } catch (error) {
    console.error('Error fetching active display workorder:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/display/active - Set the active workorder to display (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MONTEUR'])

    const body = await request.json()
    const { workOrderId } = body

    if (!workOrderId) {
      // Clear the display in database
      await updateDisplaySettings(null)
      return NextResponse.json({ success: true, workOrderId: null })
    }

    // Verify work order exists
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      select: { id: true, workOrderNumber: true },
    })

    if (!workOrder) {
      return NextResponse.json(
        { error: 'Work order not found' },
        { status: 404 }
      )
    }

    // Store active workorder ID in database
    await updateDisplaySettings(workOrderId)

    console.log(`Display activated for work order ${workOrder.workOrderNumber} by ${user.email}`)

    return NextResponse.json({
      success: true,
      workOrderId,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Error setting active display workorder:', error)
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
