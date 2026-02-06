import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { normalizeLicensePlate } from '@/lib/license-plate'

/**
 * GET /api/audit-logs/search?q=WO-2024-0001
 * Zoek een entiteit op nummer/ID/kenteken; retourneer entityType + entityId voor ophalen van audit logs.
 * Ondersteunt: werkordernummer (WO-... of 2024-0001), planning-ID (PLN-...), factuurnummer, creditnummer, kenteken.
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['MANAGEMENT', 'SYSTEM_ADMIN', 'MONTEUR', 'MAGAZIJN'])
    const q = (request.nextUrl.searchParams.get('q') || '').trim()
    if (!q) {
      return NextResponse.json({ success: false, error: 'Geen zoekterm' }, { status: 400 })
    }

    const qUpper = q.toUpperCase()

    // Werkorder op id (uuid of prefix, bijv. 81un18) – zo krijg je logs van dát werkorder
    if (q.length >= 6) {
      const byId = await prisma.workOrder.findFirst({
        where: {
          OR: [
            { id: { equals: q, mode: 'insensitive' } },
            { id: { startsWith: q, mode: 'insensitive' } }
          ]
        },
        select: { id: true, workOrderNumber: true },
        orderBy: { updatedAt: 'desc' }
      })
      if (byId) {
        return NextResponse.json({
          success: true,
          entityType: 'WorkOrder',
          entityId: byId.id,
          label: byId.workOrderNumber ? `${byId.workOrderNumber} (id)` : byId.id
        })
      }
    }

    // Werkorder op werkordernummer (exact of partieel, case-insensitive)
    const woNumber = qUpper.startsWith('WO-') ? qUpper : `WO-${qUpper}`
    const wo = await prisma.workOrder.findFirst({
      where: {
        OR: [
          { workOrderNumber: { equals: q, mode: 'insensitive' } },
          { workOrderNumber: { equals: qUpper, mode: 'insensitive' } },
          { workOrderNumber: { equals: woNumber, mode: 'insensitive' } },
          { workOrderNumber: { contains: q, mode: 'insensitive' } },
          { workOrderNumber: { contains: qUpper, mode: 'insensitive' } }
        ]
      },
      select: { id: true, workOrderNumber: true },
      orderBy: { updatedAt: 'desc' }
    })
    if (wo) {
      return NextResponse.json({
        success: true,
        entityType: 'WorkOrder',
        entityId: wo.id,
        label: wo.workOrderNumber
      })
    }

    // Kenteken: zoek voertuig, dan meest recente werkorder voor dat voertuig
    const plateNorm = normalizeLicensePlate(q)
    const plateRaw = q.trim().toUpperCase().replace(/\s/g, '').replace(/-/g, '')
    if (plateNorm || q.trim().length >= 2) {
      const searchPlates = [q.trim(), plateNorm, plateRaw].filter(Boolean)
      const vehicle = await prisma.vehicle.findFirst({
        where: {
          OR: searchPlates.map((p) => ({ licensePlate: { equals: p, mode: 'insensitive' } }))
        },
        select: { id: true, licensePlate: true }
      })
      if (vehicle) {
        const woByVehicle = await prisma.workOrder.findFirst({
          where: { vehicleId: vehicle.id },
          select: { id: true, workOrderNumber: true },
          orderBy: { updatedAt: 'desc' }
        })
        if (woByVehicle) {
          return NextResponse.json({
            success: true,
            entityType: 'WorkOrder',
            entityId: woByVehicle.id,
            label: `${woByVehicle.workOrderNumber} (${vehicle.licensePlate})`
          })
        }
      }
      // Werkorder op kenteken (denormalized op werkorder)
      const woByPlate = await prisma.workOrder.findFirst({
        where: {
          OR: [
            ...searchPlates.map((p) => ({ licensePlate: { equals: p, mode: 'insensitive' } })),
            ...searchPlates.map((p) => ({ vehiclePlate: { equals: p, mode: 'insensitive' } })),
            { licensePlate: { contains: plateRaw, mode: 'insensitive' } },
            { vehiclePlate: { contains: plateRaw, mode: 'insensitive' } }
          ]
        },
        select: { id: true, workOrderNumber: true, licensePlate: true, vehiclePlate: true },
        orderBy: { updatedAt: 'desc' }
      })
      if (woByPlate) {
        return NextResponse.json({
          success: true,
          entityType: 'WorkOrder',
          entityId: woByPlate.id,
          label: `${woByPlate.workOrderNumber} (${woByPlate.licensePlate || woByPlate.vehiclePlate || ''})`
        })
      }
    }

    // Planning op ID (PLN-...)
    if (qUpper.startsWith('PLN-')) {
      const plan = await prisma.planningItem.findUnique({
        where: { id: q },
        select: { id: true }
      })
      if (plan) {
        return NextResponse.json({
          success: true,
          entityType: 'PlanningItem',
          entityId: plan.id,
          label: plan.id
        })
      }
    }

    // Factuur op factuurnummer
    const inv = await prisma.invoice.findUnique({
      where: { invoiceNumber: q },
      select: { id: true, invoiceNumber: true }
    })
    if (inv) {
      return NextResponse.json({
        success: true,
        entityType: 'Invoice',
        entityId: inv.id,
        label: inv.invoiceNumber
      })
    }

    // Creditfactuur op creditnummer
    const cred = await prisma.creditInvoice.findUnique({
      where: { creditNumber: q },
      select: { id: true, creditNumber: true }
    })
    if (cred) {
      return NextResponse.json({
        success: true,
        entityType: 'CreditInvoice',
        entityId: cred.id,
        label: cred.creditNumber
      })
    }

    return NextResponse.json({ success: false, error: 'Niet gevonden' }, { status: 404 })
  } catch (error: any) {
    console.error('Audit search error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: error.status || 500 })
  }
}
