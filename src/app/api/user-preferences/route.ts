import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'

const prisma = new PrismaClient()

// GET /api/user-preferences?key=xxx
export async function GET(request: NextRequest) {
  try {
    // TODO: Get actual user from session
    // For now, use a system user or first user
    const users = await prisma.user.findMany({ take: 1 })
    if (!users.length) {
      return NextResponse.json(
        { success: false, error: 'No users found' },
        { status: 404 }
      )
    }
    const userId = users[0].id

    const searchParams = request.nextUrl.searchParams
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json(
        { success: false, error: 'Key parameter required' },
        { status: 400 }
      )
    }

    // Fetch from database
    const preference = await prisma.userPreference.findUnique({
      where: {
        userId_key: {
          userId,
          key
        }
      }
    })

    return NextResponse.json({
      success: true,
      value: preference?.value || null
    })

  } catch (error) {
    console.error('Error fetching user preference:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// POST /api/user-preferences
export async function POST(request: NextRequest) {
  try {
    // TODO: Get actual user from session
    // For now, use a system user or first user
    const users = await prisma.user.findMany({ take: 1 })
    if (!users.length) {
      return NextResponse.json(
        { success: false, error: 'No users found' },
        { status: 404 }
      )
    }
    const userId = users[0].id

    const body = await request.json()
    const { key, value } = body

    if (!key) {
      return NextResponse.json(
        { success: false, error: 'Key required' },
        { status: 400 }
      )
    }

    // Upsert to database
    const preference = await prisma.userPreference.upsert({
      where: {
        userId_key: {
          userId,
          key
        }
      },
      create: {
        userId,
        key,
        value
      },
      update: {
        value
      }
    })

    return NextResponse.json({
      success: true,
      key: preference.key,
      value: preference.value
    })

  } catch (error) {
    console.error('Error saving user preference:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
