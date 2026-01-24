import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { generateToken } from '@/lib/auth'

/**
 * Create first admin user - Only works if no users exist yet
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, displayName } = body || {}

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Check if ANY user exists
    const userCount = await prisma.user.count()
    if (userCount > 0) {
      return NextResponse.json(
        { success: false, error: 'Users already exist. Bootstrap is disabled for security.' },
        { status: 403 }
      )
    }

    // Get or create SYSTEM_ADMIN role
    let adminRole = await prisma.role.findUnique({
      where: { name: 'SYSTEM_ADMIN' },
    })
    
    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: {
          name: 'SYSTEM_ADMIN',
          isSystemAdmin: true,
          permissions: {},
          description: 'System Administrator - Full access',
        },
      })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create first admin user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        displayName: displayName || 'Admin',
        isSystemAdmin: true,
        isActive: true,
        roleId: adminRole.id,
      },
    })

    // Generate token
    const token = generateToken(user.id)

    return NextResponse.json({
      success: true,
      message: 'First admin user created! 🎉',
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        isSystemAdmin: true,
      },
    }, { status: 201 })
  } catch (error: any) {
    console.error('Bootstrap error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
