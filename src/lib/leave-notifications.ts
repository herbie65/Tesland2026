import { prisma } from '@/lib/prisma'

/**
 * Stuur notificatie naar managers bij nieuwe verlofaanvraag
 */
export async function sendLeaveRequestNotification(leaveRequestId: string) {
  try {
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    })
    
    if (!leaveRequest) {
      return
    }
    
    // Vind alle managers (MANAGEMENT role)
    const managers = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { role: 'MANAGEMENT' },
          { isSystemAdmin: true },
          {
            roleRef: {
              name: 'MANAGEMENT',
            },
          },
        ],
      },
    })
    
    const startDate = new Date(leaveRequest.startDate).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    const endDate = new Date(leaveRequest.endDate).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    
    // Maak notificaties aan voor alle managers
    const notifications = managers.map((manager) => ({
      userId: manager.id,
      title: `${leaveRequest.user.displayName || 'Medewerker'} heeft verlof aangevraagd`,
      message: `${startDate} - ${endDate} (${leaveRequest.totalDays} dagen)`,
      type: 'leave_request_pending',
      link: '/admin/leave-management?tab=pending',
      meta: {
        leaveRequestId: leaveRequest.id,
        userId: leaveRequest.userId,
      },
    }))
    
    await prisma.notification.createMany({
      data: notifications,
    })
  } catch (error) {
    console.error('Error sending leave request notification:', error)
  }
}

/**
 * Stuur notificatie naar medewerker bij goedkeuring
 */
export async function sendApprovalNotification(leaveRequestId: string) {
  try {
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
        reviewer: {
          select: {
            displayName: true,
          },
        },
      },
    })
    
    if (!leaveRequest) {
      return
    }
    
    const startDate = new Date(leaveRequest.startDate).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    const endDate = new Date(leaveRequest.endDate).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    
    await prisma.notification.create({
      data: {
        userId: leaveRequest.userId,
        title: 'Verlofaanvraag goedgekeurd',
        message: `Je verlof van ${startDate} - ${endDate} is goedgekeurd${leaveRequest.reviewer ? ` door ${leaveRequest.reviewer.displayName}` : ''}.`,
        type: 'leave_request_approved',
        link: '/admin/my-dashboard',
        meta: {
          leaveRequestId: leaveRequest.id,
        },
      },
    })
  } catch (error) {
    console.error('Error sending approval notification:', error)
  }
}

/**
 * Stuur notificatie naar medewerker bij afwijzing
 */
export async function sendRejectionNotification(leaveRequestId: string) {
  try {
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
        reviewer: {
          select: {
            displayName: true,
          },
        },
      },
    })
    
    if (!leaveRequest) {
      return
    }
    
    const startDate = new Date(leaveRequest.startDate).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    const endDate = new Date(leaveRequest.endDate).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    
    let message = `Je verlof van ${startDate} - ${endDate} is afgewezen`
    if (leaveRequest.reviewer) {
      message += ` door ${leaveRequest.reviewer.displayName}`
    }
    if (leaveRequest.reviewNotes) {
      message += `. Reden: ${leaveRequest.reviewNotes}`
    }
    message += '.'
    
    await prisma.notification.create({
      data: {
        userId: leaveRequest.userId,
        title: 'Verlofaanvraag afgewezen',
        message,
        type: 'leave_request_rejected',
        link: '/admin/my-dashboard',
        meta: {
          leaveRequestId: leaveRequest.id,
        },
      },
    })
  } catch (error) {
    console.error('Error sending rejection notification:', error)
  }
}
