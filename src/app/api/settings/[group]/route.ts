import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
import { requireRole } from '@/lib/auth'

type RouteContext = {
  params: { group?: string } | Promise<{ group?: string }>
}

const getGroupFromRequest = async (request: NextRequest, context: RouteContext) => {
  const params = await context.params
  const direct = params?.group
  if (direct) return direct
  const segments = request.nextUrl.pathname.split('/').filter(Boolean)
  return segments[segments.length - 1] || ''
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const group = await getGroupFromRequest(request, context)
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'group is required' },
        { status: 400 }
      )
    }
    if (group === 'rdwSettings') {
      await requireRole(request, ['SYSTEM_ADMIN'])
    } else {
      await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR'])
    }
    ensureAdmin()
    if (!adminFirestore) {
      return NextResponse.json({ success: false, error: 'Firebase Admin not initialized' }, { status: 500 })
    }
    const docSnap = await adminFirestore.collection('settings').doc(group).get()
    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, item: { id: docSnap.id, ...docSnap.data() } })
  } catch (error: any) {
    console.error('Error fetching settings group:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const group = await getGroupFromRequest(request, context)
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'group is required' },
        { status: 400 }
      )
    }
    if (group === 'rdwSettings') {
      await requireRole(request, ['SYSTEM_ADMIN'])
    } else {
      await requireRole(request, ['MANAGEMENT'])
    }
    const body = await request.json()
    const { data } = body || {}
    if (!data) {
      return NextResponse.json({ success: false, error: 'data is required' }, { status: 400 })
    }
    if (group === 'rdwSettings') {
      const requiredFields = [
        'bedrijfsnummer',
        'keuringsinstantienummer',
        'kvkNaam',
        'kvkNummer',
        'kvkVestigingsnummer'
      ]
      const missing = requiredFields.filter(
        (field) => !String(data[field] || '').trim()
      )
      if (missing.length) {
        return NextResponse.json(
          { success: false, error: 'Alle RDW-velden zijn verplicht.' },
          { status: 400 }
        )
      }
    }
    ensureAdmin()
    if (!adminFirestore) {
      return NextResponse.json({ success: false, error: 'Firebase Admin not initialized' }, { status: 500 })
    }
    const payload = {
      group,
      data,
      updated_at: new Date().toISOString()
    }
    await adminFirestore.collection('settings').doc(group).set(payload, { merge: true })
    return NextResponse.json({ success: true, item: { id: group, ...payload } })
  } catch (error: any) {
    console.error('Error updating settings group:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
