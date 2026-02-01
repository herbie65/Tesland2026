import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { workOrderEvents } from '@/lib/workorder-events'

// POST /api/display/signature - Save customer signature (no auth required for kiosk)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workOrderId, signatureData, customerName, vehiclePinCode } = body

    // Validation
    if (!workOrderId || !signatureData) {
      return NextResponse.json(
        { error: 'Work order ID and signature data are required' },
        { status: 400 }
      )
    }

    // Verify work order exists
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      select: { id: true, workOrderNumber: true, customerSignedAt: true, customerName: true },
    })

    if (!workOrder) {
      return NextResponse.json(
        { error: 'Work order not found' },
        { status: 404 }
      )
    }

    // Check if already signed
    if (workOrder.customerSignedAt) {
      return NextResponse.json(
        { error: 'Work order already signed' },
        { status: 400 }
      )
    }

    // Get client IP (best effort)
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'unknown'

    // Save signature, pincode, and update status
    const updatedWorkOrder = await prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        customerSignature: signatureData,
        customerSignedAt: new Date(),
        customerSignedBy: customerName || 'Klant',
        signatureIpAddress: ipAddress,
        vehiclePinCode: vehiclePinCode || null,
        workOverviewColumn: 'Auto binnen ', // Match the exact column name from settings
        workOrderStatus: 'GOEDGEKEURD', // Customer approved by signing
      },
      select: {
        id: true,
        workOrderNumber: true,
        customerSignedAt: true,
        customerSignedBy: true,
        vehiclePinCode: true,
        workOverviewColumn: true,
        workOrderStatus: true,
      },
    })

    // AUDIT LOG: Customer signature
    await logAudit({
      entityType: 'WorkOrder',
      entityId: workOrderId,
      action: 'CUSTOMER_SIGNATURE',
      userName: customerName || 'Klant',
      userRole: 'CUSTOMER',
      changes: {
        workOverviewColumn: { from: null, to: 'Auto binnen ' },
        status: { from: null, to: 'GOEDGEKEURD' }
      },
      metadata: {
        workOrderNumber: workOrder.workOrderNumber,
        customerName: workOrder.customerName,
        signedVia: 'iPad Display',
        hasPinCode: !!vehiclePinCode,
        ipAddress,
        movedToColumn: 'Auto binnen ',
        statusChanged: 'GOEDGEKEURD'
      },
      description: `${customerName || 'Klant'} heeft werkorder ${workOrder.workOrderNumber} digitaal getekend voor akkoord op iPad. Auto is binnen en goedgekeurd.`,
      request
    })

    console.log(
      `Customer signature saved for work order ${updatedWorkOrder.workOrderNumber} by ${customerName || 'Klant'}${vehiclePinCode ? ' (pincode provided)' : ''}`
    )

    // Push real-time updates via SSE
    workOrderEvents.notifyColumnChange(workOrderId, 'Auto binnen ')
    workOrderEvents.notifyStatusChange(workOrderId, 'GOEDGEKEURD')

    return NextResponse.json({
      success: true,
      workOrder: updatedWorkOrder,
    })
  } catch (error) {
    console.error('Error saving customer signature:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
