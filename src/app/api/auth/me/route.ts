import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        isSystemAdmin: user.isSystemAdmin,
        role: user.role || null,
        roleName: user.roleName || null,
        customerId: user.customerId || null,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 401 }
    )
  }
}
