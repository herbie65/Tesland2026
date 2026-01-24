import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Simple connectivity check
    await prisma.$queryRaw`SELECT 1`
    
    return NextResponse.json({
      success: true,
      database: 'connected',
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Database health check failed:', error)
    return NextResponse.json(
      {
        success: false,
        database: 'error',
        error: error.message,
      },
      { status: 500 }
    )
  }
}
