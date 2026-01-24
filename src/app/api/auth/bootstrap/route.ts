import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminApp } from '@/lib/firebase-admin'
import { getAuth } from 'firebase-admin/auth'

/**
 * Bootstrap endpoint - Maak jezelf SYSTEM_ADMIN
 * Alleen te gebruiken als er nog geen admin is
 */
export async function POST(request: NextRequest) {
  try {
    // Get token from request
    const header = request.headers.get('authorization') || request.headers.get('Authorization')
    if (!header) {
      return NextResponse.json({ 
        success: false, 
        error: 'No Authorization header. Log in first!' 
      }, { status: 401 })
    }

    const [type, token] = header.split(' ')
    if (type !== 'Bearer' || !token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid Authorization format' 
      }, { status: 401 })
    }

    // Verify Firebase token
    const auth = getAuth(getAdminApp())
    const decoded = await auth.verifyIdToken(token.trim())

    // Check if any admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { isSystemAdmin: true },
    })

    if (existingAdmin) {
      return NextResponse.json({
        success: false,
        error: 'An admin already exists. Bootstrap is disabled for security.',
        existingAdmin: {
          email: existingAdmin.email,
          uid: existingAdmin.uid,
        },
      }, { status: 403 })
    }

    // Create SYSTEM_ADMIN role if it doesn't exist
    const adminRole = await prisma.role.upsert({
      where: { id: 'system-admin' },
      update: {},
      create: {
        id: 'system-admin',
        name: 'SYSTEM_ADMIN',
        isSystemAdmin: true,
        permissions: {},
      },
    })

    // Create current user as admin
    const newAdmin = await prisma.user.upsert({
      where: { uid: decoded.uid },
      update: {
        isSystemAdmin: true,
        roleId: adminRole.id,
      },
      create: {
        uid: decoded.uid,
        email: decoded.email || null,
        displayName: decoded.name || null,
        isSystemAdmin: true,
        roleId: adminRole.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'You are now SYSTEM_ADMIN! 🎉',
      user: {
        uid: newAdmin.uid,
        email: newAdmin.email,
        displayName: newAdmin.displayName,
        isSystemAdmin: newAdmin.isSystemAdmin,
      },
    })
  } catch (error: any) {
    console.error('Bootstrap error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
