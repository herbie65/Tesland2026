import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request)
    
    // Alleen medewerkers tonen; klanten (rol CUSTOMER) horen niet in Gebruikers
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { roleRef: null },
          { roleRef: { name: { not: 'CUSTOMER' } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        roleRef: true, // Include role details
      },
    })
    
    // Map displayName to name for frontend compatibility; explicit icalUrl for planning
    const items = users.map(user => {
      const { password: _, ...rest } = user
      return {
        ...rest,
        name: user.displayName || user.email, // Fallback to email if no displayName
        photoUrl: user.photoURL,
        role: user.roleRef?.name || user.role || null, // Use roleRef.name if available, fallback to old role field
        icalUrl: user.icalUrl ?? null, // Expliciet voor planning iCal
      }
    })
    
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request)
    const body = await request.json()
    const { email, password, displayName, roleId, photoURL, photoUrl, phoneNumber, active, color, planningHoursPerDay, workingDays } = body || {}
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'email is required' },
        { status: 400 }
      )
    }
    
    if (!password) {
      return NextResponse.json(
        { success: false, error: 'password is required' },
        { status: 400 }
      )
    }

    const normalizedEmail = String(email).toLowerCase().trim()

    // Check if email already exists (case-insensitive)
    const existing = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } }
    })
    
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash(password, 10)

    const item = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        displayName: displayName || null,
        roleId: roleId || null,
        photoURL: photoUrl || photoURL || null,
        phoneNumber: phoneNumber || null,
        isSystemAdmin: false,
        isActive: active !== undefined ? active : true,
        color: color || null,
        planningHoursPerDay: planningHoursPerDay || null,
        workingDays: workingDays || null,
      },
    })

    // Don't return password in response
    const { password: _, ...userWithoutPassword } = item

    return NextResponse.json({ success: true, item: userWithoutPassword }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating user:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
