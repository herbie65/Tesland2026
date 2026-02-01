import { NextRequest } from 'next/server'

// Server-Sent Events endpoint for real-time display updates
// GET /api/display/events - SSE stream for display updates
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const data = `data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`
      controller.enqueue(encoder.encode(data))

      // Keep-alive ping every 30 seconds
      const pingInterval = setInterval(() => {
        try {
          const ping = `data: ${JSON.stringify({ type: 'ping', timestamp: Date.now() })}\n\n`
          controller.enqueue(encoder.encode(ping))
        } catch (error) {
          console.error('Error sending ping:', error)
          clearInterval(pingInterval)
        }
      }, 30000)

      // Listen for display updates (in a real implementation, this would be a pub/sub system)
      // For now, we'll just keep the connection open
      const checkInterval = setInterval(async () => {
        // In production, you'd check Redis or a message queue here
        // For now, this is just a placeholder
      }, 5000)

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(pingInterval)
        clearInterval(checkInterval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
