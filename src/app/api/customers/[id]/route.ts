import { NextRequest, NextResponse } from 'next/server'
import { FirebaseAdminService } from '@/lib/firebase-admin-service'

type RouteContext = {
  params: { id: string } | Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params
    const item = await FirebaseAdminService.getCollectionItem('customers', params.id)
    if (!item) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    console.error('Error fetching customer:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const body = await request.json()
    const params = await context.params
    const updated = await FirebaseAdminService.updateCollectionItem(
      'customers',
      params.id,
      body
    )
    return NextResponse.json({ success: true, item: updated })
  } catch (error: any) {
    console.error('Error updating customer:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params
    await FirebaseAdminService.deleteCollectionItem('customers', params.id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting customer:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
