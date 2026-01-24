import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { getAuth } from 'firebase-admin/auth'

export async function GET(request: NextRequest) {
  try {
    const header = request.headers.get('authorization') || request.headers.get('Authorization')
    if (!header) {
      return NextResponse.json({ 
        success: false, 
        error: 'No Authorization header' 
      }, { status: 401 })
    }

    const [type, token] = header.split(' ')
    if (type !== 'Bearer' || !token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid Authorization format' 
      }, { status: 401 })
    }

    const auth = getAuth(getAdminApp())
    const decoded = await auth.verifyIdToken(token.trim())

    return NextResponse.json({
      success: true,
      user: {
        uid: decoded.uid,
        email: decoded.email,
        name: decoded.name,
        email_verified: decoded.email_verified,
      },
    })
  } catch (error: any) {
    console.error('Error in whoami:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
