import { NextRequest, NextResponse } from 'next/server'
import { getCallStatus, hangupCall, initiateCall } from '@/lib/voip'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

/**
 * POST /api/voip/call
 * Initiate a click-to-dial call
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(request)

    // Get user from database with VoIP extension
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
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
    const status = typeof error?.status === 'number' ? error.status : 500
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to initiate call' },
      { status }
    )
  }
}

/**
 * GET /api/voip/call?callId=xxx
 * Get status of a call
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request)

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
    const status = typeof error?.status === 'number' ? error.status : 500
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get call status' },
      { status }
    )
  }
}

/**
 * DELETE /api/voip/call?callId=xxx
 * Attempt to hang up / cancel a call.
 */
export async function DELETE(request: NextRequest) {
  try {
    await requireAuth(request)

    const { searchParams } = new URL(request.url)
    const callId = searchParams.get('callId')
    if (!callId) {
      return NextResponse.json(
        { success: false, error: 'Call ID is required' },
        { status: 400 }
      )
    }

    await hangupCall(callId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('VoIP hangup error:', error)
    const status = typeof error?.status === 'number' ? error.status : 500
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to hang up call' },
      { status }
    )
  }
}
