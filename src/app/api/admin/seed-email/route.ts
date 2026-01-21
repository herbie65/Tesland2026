import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
import { requireRole } from '@/lib/auth'

const ensureFirestore = () => {
  ensureAdmin()
  if (!adminFirestore) {
    throw new Error('Firebase Admin not initialized')
  }
  return adminFirestore
}

const templates = [
  {
    id: 'workorder_created',
    subject: 'Werkorder aangemaakt – {{workorderId}}',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'Uw werkorder is aangemaakt.\n' +
      'Kenteken: {{kenteken}}\n' +
      'Werkorder: {{workorderId}}\n\n' +
      'We houden u op de hoogte.',
    availableVariables: ['{{klantNaam}}', '{{kenteken}}', '{{workorderId}}']
  },
  {
    id: 'appointment_confirmed',
    subject: 'Afspraak aangevraagd – {{datum}} {{tijd}}',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'Uw afspraak is aangevraagd voor {{datum}} om {{tijd}}.\n' +
      'Kenteken: {{kenteken}}\n\n' +
      'Let op: dit is pas bevestigd na onze bevestigingsmail.',
    availableVariables: ['{{klantNaam}}', '{{datum}}', '{{tijd}}', '{{kenteken}}']
  },
  {
    id: 'extra_work_approval_required',
    subject: 'Extra werk vereist – actie nodig',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'Er is extra werk nodig voor uw voertuig ({{kenteken}}).\n' +
      'Graag uw akkoord.',
    availableVariables: ['{{klantNaam}}', '{{kenteken}}']
  },
  {
    id: 'work_completed',
    subject: 'Werk afgerond – {{workorderId}}',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'Uw werkorder {{workorderId}} is gereed.\n' +
      'Kenteken: {{kenteken}}',
    availableVariables: ['{{klantNaam}}', '{{kenteken}}', '{{workorderId}}']
  },
  {
    id: 'invoice_available',
    subject: 'Factuur beschikbaar – {{factuurNummer}}',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'Uw factuur {{factuurNummer}} staat klaar.\n' +
      'Kenteken: {{kenteken}}',
    availableVariables: ['{{klantNaam}}', '{{kenteken}}', '{{factuurNummer}}']
  }
]

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['SYSTEM_ADMIN', 'MANAGEMENT'])
    const firestore = ensureFirestore()
    const nowIso = new Date().toISOString()

    const emailSettingsRef = firestore.collection('settings').doc('email')
    const emailSettingsSnap = await emailSettingsRef.get()
    if (!emailSettingsSnap.exists) {
      await emailSettingsRef.set({
        mode: 'TEST',
        testRecipients: ['herbert@tesland.com'],
        fromName: 'Tesland',
        fromEmail: 'noreply@tesland.nl',
        provider: 'SMTP',
        created_at: nowIso,
        updated_at: nowIso
      })
    }

    const created: string[] = []
    for (const template of templates) {
      const docRef = firestore.collection('emailTemplates').doc(template.id)
      const snap = await docRef.get()
      if (snap.exists) continue
      await docRef.set({
        id: template.id,
        enabled: true,
        subject: template.subject,
        bodyText: template.bodyText,
        availableVariables: template.availableVariables,
        lastEditedAt: nowIso,
        lastEditedBy: 'system'
      })
      created.push(template.id)
    }

    return NextResponse.json({ success: true, created })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error seeding email settings/templates:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
