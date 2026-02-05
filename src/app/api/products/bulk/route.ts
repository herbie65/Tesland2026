import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err))

type BulkBody =
  | { action: 'setMinQty'; ids: string[]; minQty: number }
  | { action: 'setManageStock'; ids: string[]; manageStock: boolean }
  | { action: 'delete'; ids: string[] }

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['user'])
    const body = (await request.json().catch(() => null)) as BulkBody | null
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 })
    }

    const idsRaw = (body as { ids?: unknown }).ids
    const ids = Array.isArray(idsRaw)
      ? idsRaw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      : []
    if (!ids.length) {
      return NextResponse.json({ success: false, error: 'ids is required' }, { status: 400 })
    }

    if (body.action === 'setMinQty') {
      const minQty = Number(body.minQty)
      if (!Number.isFinite(minQty) || minQty < 0) {
        return NextResponse.json({ success: false, error: 'minQty must be a number >= 0' }, { status: 400 })
      }

      const result = await prisma.productInventory.updateMany({
        where: {
          manageStock: true,
          productId: { in: ids },
        },
        data: { minQty: minQty },
      })

      return NextResponse.json({ success: true, updated: result.count })
    }

    if (body.action === 'setManageStock') {
      const manageStock = Boolean(body.manageStock)
      const result = await prisma.productInventory.updateMany({
        where: {
          productId: { in: ids },
        },
        data: manageStock
          ? {
              manageStock: true,
              // Keep qty/minQty as-is when enabling stock management.
            }
          : {
              manageStock: false,
              qty: 0,
              minQty: 0,
              isInStock: true,
            },
      })
      return NextResponse.json({ success: true, updated: result.count })
    }

    if (body.action === 'delete') {
      const result = await prisma.productCatalog.deleteMany({
        where: { id: { in: ids } }
      })
      return NextResponse.json({ success: true, deleted: result.count })
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
  } catch (error: unknown) {
    const status =
      typeof error === 'object' && error !== null && 'status' in error
        ? Number((error as { status?: unknown }).status)
        : 500
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status })
  }
}

