import { NextRequest } from 'next/server'
import { workOrderEvents } from '@/lib/workorder-events'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/workorders/stream
 * Server-Sent Events endpoint for real-time work order updates
 * Auth: Pass token as query parameter since EventSource cannot send custom headers
 */
export async function GET(request: NextRequest) {
  try {
    // Get token from query parameter for EventSource compatibility
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing token' }),
        { status: 401 }
      )
    }

    // Verify JWT token manually
    const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
    let decoded: any
    try {
      const jwt = await import('jsonwebtoken')
      decoded = jwt.verify(token, JWT_SECRET)
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401 }
      )
    }

    // Verify user exists and has required role
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, isActive: true }
    })

    if (!user || !user.isActive) {
      return new Response(
        JSON.stringify({ error: 'User not found or inactive' }),
        { status: 403 }
      )
    }

    // Allow all active users (no role restriction for SSE)
    // SSE is used for UI updates which all users need
    console.log(`SSE connected: ${user.id} (role: ${user.role || 'none'})`)

    // Create a readable stream for SSE
    const encoder = new TextEncoder()
    
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        const message = `data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`
        controller.enqueue(encoder.encode(message))

        // Listen for work order changes
        const handleChange = (event: any) => {
          try {
            console.log('📨 Sending SSE to client:', event.workOrderId, event.changeType)
            const data = `data: ${JSON.stringify({ type: 'workorder-update', ...event })}\n\n`
            controller.enqueue(encoder.encode(data))
          } catch (err) {
            console.error('Error sending SSE event:', err)
          }
        }

        workOrderEvents.on('workorder-changed', handleChange)
        console.log(`🎧 SSE listener registered for user ${user.id}`)

        // Send keepalive every 30 seconds
        const keepaliveInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': keepalive\n\n'))
          } catch (err) {
            console.error('Keepalive failed:', err)
            clearInterval(keepaliveInterval)
          }
        }, 30000)

        // Cleanup on close
        request.signal.addEventListener('abort', () => {
          console.log(`🔌 SSE connection closed for user ${user.id}`)
          clearInterval(keepaliveInterval)
          workOrderEvents.off('workorder-changed', handleChange)
          controller.close()
        })
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    })
  } catch (error: any) {
    console.error('SSE stream error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: error.status || 500 }
    )
  }
}
