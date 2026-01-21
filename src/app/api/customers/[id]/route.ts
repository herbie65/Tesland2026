import { NextRequest, NextResponse } from 'next/server'
import { FirebaseAdminService } from '@/lib/firebase-admin-service'

type RouteContext = {
  params: { id: string }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const item = await FirebaseAdminService.getCollectionItem('customers', context.params.id)
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
    const updated = await FirebaseAdminService.updateCollectionItem(
      'customers',
      context.params.id,
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
    await FirebaseAdminService.deleteCollectionItem('customers', context.params.id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting customer:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
