import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { getUserLeaveConfig, seedOpeningBalanceIfMissing, syncUserBalancesFromLedger, upsertCarryoverEntry } from '@/lib/leave-ledger'

type RouteContext = {
  params: { id: string } | Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireAuth(request)
    const body = await request.json()
    const toDateOrNull = (value: unknown) => {
      if (value === null || value === undefined || value === '') return null
      const date = new Date(value as string)
      return Number.isNaN(date.getTime()) ? null : date
    }
    const toNumberOrNull = (value: unknown) => {
      if (value === null || value === undefined || value === '') return null
      const num = typeof value === 'number' ? value : Number(value)
      return Number.isFinite(num) ? num : null
    }
    const toBooleanOrUndefined = (value: unknown) => {
      if (value === undefined) return undefined
      if (value === null) return null
      if (typeof value === 'boolean') return value
      if (value === 'true') return true
      if (value === 'false') return false
      return Boolean(value)
    }
    const toStringArrayOrUndefined = (value: unknown) => {
      if (value === undefined) return undefined
      if (!Array.isArray(value)) return []
      return value.filter((item) => typeof item === 'string' && item.trim().length > 0)
    }
    const { 
      displayName, email, roleId, photoURL, photoUrl, phoneNumber, isSystemAdmin, active, 
      color, planningHoursPerDay, workingDays, icalUrl, voipExtension,
      // HR fields
      firstName, lastName, dateOfBirth, privateEmail, iban,
      address, city, postalCode, country,
      employmentStartDate, employmentEndDate, hasFixedTermContract,
      contractHoursPerWeek, annualLeaveDaysOrHours,
      emergencyContactName, emergencyContactRelation, emergencyContactPhone, emergencyContactEmail,
      hrNotes, leaveBalanceLegal, leaveBalanceExtra, leaveBalanceCarryover
    } = body || {}
    
    console.log('PATCH /api/users/[id] - Received icalUrl:', icalUrl)
    
    const params = await context.params
    const userId = params?.id || request.nextUrl.pathname.split('/').filter(Boolean).pop() || ''
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    }

    // Get existing user data
    const existing = await prisma.user.findUnique({ where: { id: userId } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (displayName !== undefined) updateData.displayName = displayName
    if (email !== undefined) updateData.email = email
    if (roleId !== undefined) {
      // Update via relation if roleId is provided
      updateData.roleRef = roleId ? { connect: { id: roleId } } : { disconnect: true }
    }
    if (photoURL !== undefined || photoUrl !== undefined) updateData.photoURL = photoUrl || photoURL
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber
    const isSystemAdminValue = toBooleanOrUndefined(isSystemAdmin)
    if (isSystemAdminValue !== undefined) updateData.isSystemAdmin = isSystemAdminValue
    const isActiveValue = toBooleanOrUndefined(active)
    if (isActiveValue !== undefined) updateData.isActive = isActiveValue
    if (color !== undefined) updateData.color = color
    if (planningHoursPerDay !== undefined) updateData.planningHoursPerDay = toNumberOrNull(planningHoursPerDay)
    if (workingDays !== undefined) updateData.workingDays = toStringArrayOrUndefined(workingDays)
    if (icalUrl !== undefined) updateData.icalUrl = icalUrl
    if (voipExtension !== undefined) updateData.voipExtension = voipExtension
    
    // HR fields
    if (firstName !== undefined) updateData.firstName = firstName
    if (lastName !== undefined) updateData.lastName = lastName
    if (dateOfBirth !== undefined) updateData.dateOfBirth = toDateOrNull(dateOfBirth)
    if (privateEmail !== undefined) updateData.privateEmail = privateEmail
    if (iban !== undefined) updateData.iban = iban
    if (address !== undefined) updateData.address = address
    if (city !== undefined) updateData.city = city
    if (postalCode !== undefined) updateData.postalCode = postalCode
    if (country !== undefined) updateData.country = country
    if (employmentStartDate !== undefined) updateData.employmentStartDate = toDateOrNull(employmentStartDate)
    if (employmentEndDate !== undefined) updateData.employmentEndDate = toDateOrNull(employmentEndDate)
    const hasFixedTermContractValue = toBooleanOrUndefined(hasFixedTermContract)
    if (hasFixedTermContractValue !== undefined) updateData.hasFixedTermContract = hasFixedTermContractValue
    if (contractHoursPerWeek !== undefined) updateData.contractHoursPerWeek = toNumberOrNull(contractHoursPerWeek)
    if (annualLeaveDaysOrHours !== undefined) {
      updateData.annualLeaveDaysOrHours = toNumberOrNull(annualLeaveDaysOrHours)
    }
    if (leaveBalanceLegal !== undefined) updateData.leaveBalanceLegal = toNumberOrNull(leaveBalanceLegal)
    if (leaveBalanceExtra !== undefined) updateData.leaveBalanceExtra = toNumberOrNull(leaveBalanceExtra)
    if (emergencyContactName !== undefined) updateData.emergencyContactName = emergencyContactName
    if (emergencyContactRelation !== undefined) updateData.emergencyContactRelation = emergencyContactRelation
    if (emergencyContactPhone !== undefined) updateData.emergencyContactPhone = emergencyContactPhone
    if (emergencyContactEmail !== undefined) updateData.emergencyContactEmail = emergencyContactEmail
    if (hrNotes !== undefined) updateData.hrNotes = hrNotes
    if (leaveBalanceCarryover !== undefined) updateData.leaveBalanceCarryover = toNumberOrNull(leaveBalanceCarryover)
    
    console.log('Update data for icalUrl:', updateData.icalUrl)

    const item = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    })
    
    console.log('Updated user icalUrl:', item.icalUrl)

    // Sync carryover ledger entry when updated via HR settings
    if (leaveBalanceCarryover !== undefined) {
      try {
        const userConfig = getUserLeaveConfig({
          hoursPerDay: item.hoursPerDay || 8,
          annualLeaveDaysOrHours: item.annualLeaveDaysOrHours ?? null,
          leaveUnit: item.leaveUnit === 'HOURS' ? 'HOURS' : 'DAYS',
          employmentStartDate: item.employmentStartDate,
        })

        await seedOpeningBalanceIfMissing({
          userId: item.id,
          leaveBalanceVacation: (item.leaveBalanceLegal || 0) + (item.leaveBalanceExtra || 0),
          leaveBalanceCarryover: item.leaveBalanceCarryover,
          leaveUnit: userConfig.leaveUnit,
          hoursPerDay: userConfig.hoursPerDay,
        })

        const carryoverMinutes = Number.isFinite(Number(item.leaveBalanceCarryover))
          ? Math.round(Number(item.leaveBalanceCarryover) * 60)
          : 0

        await upsertCarryoverEntry({
          userId: item.id,
          amountMinutes: carryoverMinutes,
          year: new Date().getFullYear(),
          notes: 'Carryover updated via HR settings',
        })

        await syncUserBalancesFromLedger(item.id)
      } catch (ledgerError) {
        console.warn('Leave ledger sync failed (non-critical):', ledgerError)
        // Continue anyway - the direct balance fields are updated
      }
    }

    // Log role changes
    if (roleId !== undefined && roleId !== existing.roleId) {
      await logAudit(
        {
          action: 'USER_ROLE_CHANGED',
          actorUid: actor.id,
          actorEmail: actor.email,
          targetUid: userId,
          targetEmail: existing.email || null,
          beforeRole: existing.roleId || existing.role || null,
          afterRole: roleId || null
        },
        request
      )
    }

    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    console.error('Error updating user:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth(request)
    const params = await context.params
    const userId = params?.id || request.nextUrl.pathname.split('/').filter(Boolean).pop() || ''
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    }

    await prisma.user.delete({
      where: { id: userId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }
    console.error('Error deleting user:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
