import { NextRequest, NextResponse } from 'next/server'
import { initiateCall, getCallStatus } from '@/lib/voip'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

/**
 * POST /api/voip/call
 * Initiate a click-to-dial call
 */
export async function POST(request: NextRequest) {
  try {
    // Get current user session
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user from database with VoIP extension
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        voipExtension: true,
        displayName: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { phoneNumber, autoAnswer } = body

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Initiate call
    const result = await initiateCall(
      phoneNumber,
      user.voipExtension || undefined,
      autoAnswer !== false // Default to true
    )

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error: any) {
    console.error('VoIP call error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to initiate call' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/voip/call?callId=xxx
 * Get status of a call
 */
export async function GET(request: NextRequest) {
  try {
    // Get current user session
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const callId = searchParams.get('callId')

    if (!callId) {
      return NextResponse.json(
        { success: false, error: 'Call ID is required' },
        { status: 400 }
      )
    }

    // Get call status
    const status = await getCallStatus(callId)

    return NextResponse.json({
      success: true,
      data: status
    })

  } catch (error: any) {
    console.error('VoIP status error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get call status' },
      { status: 500 }
    )
  }
}
