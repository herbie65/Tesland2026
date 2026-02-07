import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DISPLAY_SETTINGS_KEY = 'displaySettings'

type DisplaySettings = {
  activeWorkOrderId: string | null
  activePayment: { checkoutUrl: string; invoiceNumber?: string } | null
  lastUpdated: string | null
}

// Helper function to get display settings from database
async function getDisplaySettings(): Promise<DisplaySettings> {
  const setting = await prisma.setting.findUnique({
    where: { group: DISPLAY_SETTINGS_KEY },
  })

  if (!setting) {
    return { activeWorkOrderId: null, activePayment: null, lastUpdated: null }
  }

  const data = setting.data as Record<string, unknown>
  return {
    activeWorkOrderId: (data?.activeWorkOrderId as string) ?? null,
    activePayment: (data?.activePayment as DisplaySettings['activePayment']) ?? null,
    lastUpdated: (data?.lastUpdated as string) ?? null,
  }
}

// Helper function to update display settings in database
async function updateDisplaySettings(updates: Partial<DisplaySettings>) {
  const current = await getDisplaySettings()
  const next: DisplaySettings = {
    activeWorkOrderId: updates.activeWorkOrderId !== undefined ? updates.activeWorkOrderId : current.activeWorkOrderId,
    activePayment: updates.activePayment !== undefined ? updates.activePayment : current.activePayment,
    lastUpdated: new Date().toISOString(),
  }
  await prisma.setting.upsert({
    where: { group: DISPLAY_SETTINGS_KEY },
    create: {
      group: DISPLAY_SETTINGS_KEY,
      data: next,
    },
    update: {
      data: next,
    },
  })
}

// GET /api/display/active - Get the active workorder or payment to display
export async function GET(request: NextRequest) {
  try {
    const displaySettings = await getDisplaySettings()

    // Payment view takes precedence when set
    if (displaySettings.activePayment?.checkoutUrl) {
      return NextResponse.json({
        workOrderId: null,
        workOrder: null,
        activePayment: displaySettings.activePayment,
        lastUpdated: displaySettings.lastUpdated,
      })
    }

    const activeWorkOrderId = displaySettings.activeWorkOrderId
    if (!activeWorkOrderId) {
      return NextResponse.json({ workOrderId: null, workOrder: null, activePayment: null }, { status: 200 })
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
      await updateDisplaySettings({ activeWorkOrderId: null })
      return NextResponse.json({ workOrderId: null, workOrder: null }, { status: 200 })
    }

    return NextResponse.json({
      workOrderId: activeWorkOrderId,
      workOrder,
      activePayment: null,
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

// POST /api/display/active - Set the active workorder or payment to display (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MONTEUR'])

    const body = await request.json().catch(() => ({}))
    const { workOrderId, payment } = body

    // Set payment view (betaallink/QR for iPad)
    if (payment && typeof payment.checkoutUrl === 'string') {
      await updateDisplaySettings({
        activeWorkOrderId: null,
        activePayment: {
          checkoutUrl: payment.checkoutUrl,
          invoiceNumber: payment.invoiceNumber ?? undefined,
        },
      })
      console.log(`Display set to payment (Factuur ${payment.invoiceNumber ?? '?'}) by ${user.email}`)
      return NextResponse.json({
        success: true,
        workOrderId: null,
        activePayment: { checkoutUrl: payment.checkoutUrl, invoiceNumber: payment.invoiceNumber },
        lastUpdated: new Date().toISOString(),
      })
    }

    // Clear display
    if (!workOrderId) {
      await updateDisplaySettings({ activeWorkOrderId: null, activePayment: null })
      return NextResponse.json({ success: true, workOrderId: null, activePayment: null })
    }

    // Set work order view
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

    await updateDisplaySettings({ activeWorkOrderId: workOrderId, activePayment: null })

    console.log(`Display activated for work order ${workOrder.workOrderNumber} by ${user.email}`)

    return NextResponse.json({
      success: true,
      workOrderId,
      activePayment: null,
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
