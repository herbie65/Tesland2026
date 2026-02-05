import { NextRequest, NextResponse } from 'next/server'
import { requireCustomer } from '@/lib/shop-auth'

export async function GET(request: NextRequest) {
  try {
    const session = await requireCustomer(request)
    return NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        displayName: session.user.displayName || null,
        customerId: session.user.customerId || null
      },
      customer: session.customer
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}

