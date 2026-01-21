import { NextResponse } from 'next/server'

export async function GET() {
  try {
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: '0.1.0'
    })
  } catch {
    return NextResponse.json({ status: 'error', message: 'Health check failed' }, { status: 500 })
  }
}
