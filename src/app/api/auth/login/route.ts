import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { generateToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body || {}

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { roleRef: true },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (!user.password) {
      return NextResponse.json(
        { success: false, error: 'This account needs to set a password first' },
        { status: 401 }
      )
    }

    // Check password (support legacy plain-text and bcrypt)
    const storedPassword = user.password
    const isHashed = storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2y$')
    const isValidPassword = isHashed
      ? await bcrypt.compare(password, storedPassword)
      : password === storedPassword
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Upgrade legacy plain-text password to bcrypt
    if (!isHashed) {
      const hashedPassword = await bcrypt.hash(password, 10)
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      })
    }

    // Check if account is active
    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Your account has been disabled' },
        { status: 403 }
      )
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // Generate JWT token
    const token = generateToken(user.id)

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        isSystemAdmin: user.isSystemAdmin,
        role: user.roleRef?.name || null,
      },
    })
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
