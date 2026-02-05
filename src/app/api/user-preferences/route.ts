import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err))

const normalizeKey = (key: string) => key.trim().slice(0, 128)

// GET /api/user-preferences?key=xxx
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, ['user'])
    const userId = user.id

    const searchParams = request.nextUrl.searchParams
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json(
        { success: false, error: 'Key parameter required' },
        { status: 400 }
      )
    }
    const normalizedKey = normalizeKey(key)

    // Fetch from database
    const preference = await prisma.userPreference.findUnique({
      where: {
        userId_key: {
          userId,
          key: normalizedKey
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
      { success: false, error: getErrorMessage(error) || 'Internal server error' },
      { status: typeof error === 'object' && error !== null && 'status' in error ? Number((error as { status?: unknown }).status) : 500 }
    )
  }
}

// POST /api/user-preferences
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['user'])
    const userId = user.id

    const body = await request.json()
    const { key, value } = body

    if (!key) {
      return NextResponse.json(
        { success: false, error: 'Key required' },
        { status: 400 }
      )
    }
    const normalizedKey = normalizeKey(String(key))

    // Upsert to database
    const preference = await prisma.userPreference.upsert({
      where: {
        userId_key: {
          userId,
          key: normalizedKey
        }
      },
      create: {
        userId,
        key: normalizedKey,
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
      { success: false, error: getErrorMessage(error) || 'Internal server error' },
      { status: typeof error === 'object' && error !== null && 'status' in error ? Number((error as { status?: unknown }).status) : 500 }
    )
  }
}
