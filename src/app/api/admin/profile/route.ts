import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id }
    })
    
    if (!dbUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      profile: {
        profilePhoto: dbUser.profilePhoto || null,
        backgroundPhoto: dbUser.backgroundPhoto || null,
        transparency: typeof dbUser.transparency === 'number' ? dbUser.transparency : 30,
        language: dbUser.language || null,
        name: dbUser.displayName || null,
        email: dbUser.email || null
      }
    })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching profile:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const profilePhotoUrl = body?.profilePhotoUrl ?? null
    const backgroundPhotoUrl = body?.backgroundPhotoUrl ?? null
    const transparencyRaw = body?.transparency
    const transparency = Number.isFinite(Number(transparencyRaw))
      ? Math.max(5, Math.min(90, Number(transparencyRaw)))
      : undefined
    const language = body?.language ? String(body.language).trim() : undefined

    const updateData: any = {}
    
    if (profilePhotoUrl !== undefined) {
      updateData.profilePhoto = profilePhotoUrl || null
    }
    if (backgroundPhotoUrl !== undefined) {
      updateData.backgroundPhoto = backgroundPhotoUrl || null
    }
    if (transparency !== undefined) {
      updateData.transparency = transparency
    }
    if (language) {
      updateData.language = language
    }

    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData
    })
    
    return NextResponse.json({ 
      success: true, 
      profile: {
        profilePhoto: updatedUser.profilePhoto,
        backgroundPhoto: updatedUser.backgroundPhoto,
        transparency: updatedUser.transparency,
        language: updatedUser.language
      }
    })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error updating profile:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
