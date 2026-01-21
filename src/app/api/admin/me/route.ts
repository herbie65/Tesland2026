import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    return NextResponse.json({
      success: true,
      user: {
        uid: user.uid,
        role: user.role,
        name: user.name || null,
        email: user.email || null
      }
    })
  } catch (error: any) {
    const status = error.status || 500
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
