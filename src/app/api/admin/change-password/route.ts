import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Niet ingelogd' }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Huidig en nieuw wachtwoord zijn verplicht' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Wachtwoord moet minimaal 6 tekens zijn' },
        { status: 400 }
      )
    }

    // Get user with password
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, password: true }
    })

    if (!dbUser || !dbUser.password) {
      return NextResponse.json(
        { success: false, error: 'Gebruiker niet gevonden' },
        { status: 404 }
      )
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, dbUser.password)
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Huidig wachtwoord is onjuist' },
        { status: 400 }
      )
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 10)

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: newHash }
    })

    return NextResponse.json({ success: true, message: 'Wachtwoord succesvol gewijzigd' })
  } catch (error: any) {
    console.error('Error changing password:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
