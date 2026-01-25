import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

// Helper to get user from token
async function getUserFromRequest(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    if (!token) {
      return null
    }
    
    const decoded = verify(token, process.env.JWT_SECRET || 'secret') as { userId: string }
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true }
    })
    
    return user
  } catch (error) {
    return null
  }
}

// GET /api/user-preferences?key=vehicles-columns
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (!key) {
      // Get all preferences for user
      const preferences = await prisma.userPreference.findMany({
        where: { userId: user.id },
        select: { key: true, value: true, updatedAt: true }
      })
      
      return NextResponse.json({ 
        success: true, 
        preferences: preferences.reduce((acc, pref) => {
          acc[pref.key] = pref.value
          return acc
        }, {} as Record<string, any>)
      })
    }

    // Get specific preference
    const preference = await prisma.userPreference.findUnique({
      where: {
        userId_key: {
          userId: user.id,
          key
        }
      }
    })

    return NextResponse.json({
      success: true,
      value: preference?.value || null
    })
  } catch (error: any) {
    console.error('Error fetching user preference:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// POST /api/user-preferences
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { key, value } = body

    if (!key) {
      return NextResponse.json(
        { success: false, error: 'Key is required' },
        { status: 400 }
      )
    }

    // Upsert preference
    const preference = await prisma.userPreference.upsert({
      where: {
        userId_key: {
          userId: user.id,
          key
        }
      },
      update: {
        value,
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        key,
        value
      }
    })

    return NextResponse.json({
      success: true,
      preference
    })
  } catch (error: any) {
    console.error('Error saving user preference:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/user-preferences?key=vehicles-columns
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json(
        { success: false, error: 'Key is required' },
        { status: 400 }
      )
    }

    await prisma.userPreference.delete({
      where: {
        userId_key: {
          userId: user.id,
          key
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting user preference:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
