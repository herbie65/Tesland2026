import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['SYSTEM_ADMIN'])

    const requiredSettings = [
      { key: 'statuses', label: 'Statuses (werk, onderdelen, overzicht)' },
      { key: 'defaults', label: 'Default instellingen' },
      { key: 'pricingModes', label: 'Prijsmodi' },
      { key: 'partsLogic', label: 'Onderdelenlogica' },
      { key: 'email', label: 'E-mail configuratie' },
      { key: 'uiIndicators', label: 'UI Indicatoren (planning)' },
      { key: 'workOrderTransitions', label: 'Werkorder transities' },
      { key: 'magazijnStatuses', label: 'Magazijn statuses' }
    ]

    const items = await Promise.all(
      requiredSettings.map(async (req) => {
        const setting = await prisma.setting.findUnique({
          where: { group: req.key }
        })
        return {
          key: req.key,
          label: req.label,
          exists: !!setting,
          updatedAt: setting?.updatedAt ? new Date(setting.updatedAt).toLocaleDateString('nl-NL') : null
        }
      })
    )

    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('[settings-health] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Fout bij ophalen settings health' },
      { status: error.status || 500 }
    )
  }
}
