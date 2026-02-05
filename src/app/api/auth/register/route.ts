import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { generateToken } from '@/lib/auth'

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

    const normalizedEmail = String(email).toLowerCase().trim()

    // Check if user already exists (case-insensitive)
    const existing = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        displayName: displayName || null,
        isSystemAdmin: false,
        isActive: true,
      },
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
      },
    }, { status: 201 })
  } catch (error: any) {
    console.error('Register error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
