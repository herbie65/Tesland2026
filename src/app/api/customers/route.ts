import { NextRequest, NextResponse } from 'next/server'
import { FirebaseAdminService } from '@/lib/firebase-admin-service'

export async function GET() {
  try {
    const items = await FirebaseAdminService.listCollection('customers')
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('Error fetching customers:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, company, address } = body || {}

    if (!name) {
      return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 })
    }

    const payload = {
      name,
      email: email || null,
      phone: phone || null,
      company: company || null,
      address: address || null
    }

    const created = await FirebaseAdminService.createCollectionItem('customers', payload)
    return NextResponse.json({ success: true, item: created }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating customer:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
