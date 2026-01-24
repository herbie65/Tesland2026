import { NextRequest, NextResponse } from 'next/server'
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
      'We houden u op de hoogte.\n\n' +
      '{{werkplaatsNaam}}',
    availableVariables: ['{{klantNaam}}', '{{kenteken}}', '{{workorderId}}', '{{werkplaatsNaam}}']
  },
  {
    id: 'workorder_planned',
    subject: 'Werkorder gepland – {{datum}} {{tijd}}',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'Uw werkorder {{workorderId}} is ingepland.\n' +
      'Datum/tijd: {{datum}} {{tijd}}\n' +
      'Monteur: {{monteur}}\n' +
      'Kenteken: {{kenteken}}\n\n' +
      '{{werkplaatsNaam}}',
    availableVariables: [
      '{{klantNaam}}',
      '{{workorderId}}',
      '{{datum}}',
      '{{tijd}}',
      '{{monteur}}',
      '{{kenteken}}',
      '{{werkplaatsNaam}}'
    ]
  },
  {
    id: 'workorder_updated',
    subject: 'Werkorder bijgewerkt – {{workorderId}}',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'Uw werkorder is bijgewerkt.\n' +
      'Werkorder: {{workorderId}}\n' +
      'Wijziging: {{wijziging}}\n\n' +
      '{{werkplaatsNaam}}',
    availableVariables: ['{{klantNaam}}', '{{workorderId}}', '{{wijziging}}', '{{werkplaatsNaam}}']
  },
  {
    id: 'appointment_confirmed',
    subject: 'Afspraak bevestigd – {{datum}} {{tijd}}',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'Uw afspraak is bevestigd voor {{datum}} om {{tijd}}.\n' +
      'Kenteken: {{kenteken}}\n\n' +
      '{{werkplaatsNaam}}',
    availableVariables: ['{{klantNaam}}', '{{datum}}', '{{tijd}}', '{{kenteken}}', '{{werkplaatsNaam}}']
  },
  {
    id: 'appointment_reminder',
    subject: 'Herinnering afspraak – {{datum}} {{tijd}}',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'Dit is een herinnering voor uw afspraak op {{datum}} om {{tijd}}.\n' +
      'Kenteken: {{kenteken}}\n\n' +
      '{{werkplaatsNaam}}',
    availableVariables: ['{{klantNaam}}', '{{datum}}', '{{tijd}}', '{{kenteken}}', '{{werkplaatsNaam}}']
  },
  {
    id: 'appointment_cancelled',
    subject: 'Afspraak geannuleerd – {{datum}} {{tijd}}',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'Uw afspraak op {{datum}} om {{tijd}} is geannuleerd.\n' +
      'Reden: {{reden}}\n\n' +
      'Neem contact op om een nieuwe afspraak te maken.\n\n' +
      '{{werkplaatsNaam}}',
    availableVariables: ['{{klantNaam}}', '{{datum}}', '{{tijd}}', '{{reden}}', '{{werkplaatsNaam}}']
  },
  {
    id: 'appointment_rescheduled',
    subject: 'Afspraak verplaatst – {{datum}} {{tijd}}',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'Uw afspraak is verplaatst.\n' +
      'Nieuwe datum/tijd: {{datum}} {{tijd}}\n' +
      'Kenteken: {{kenteken}}\n\n' +
      '{{werkplaatsNaam}}',
    availableVariables: ['{{klantNaam}}', '{{datum}}', '{{tijd}}', '{{kenteken}}', '{{werkplaatsNaam}}']
  },
  {
    id: 'extra_work_approval_required',
    subject: 'Extra werk vereist – actie nodig',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'Er is extra werk nodig voor uw voertuig ({{kenteken}}).\n' +
      'Omschrijving: {{extraWerk}}\n' +
      'Indicatie: {{bedrag}}\n\n' +
      'Graag uw akkoord via {{akkoordLink}}.\n\n' +
      '{{werkplaatsNaam}}',
    availableVariables: [
      '{{klantNaam}}',
      '{{kenteken}}',
      '{{extraWerk}}',
      '{{bedrag}}',
      '{{akkoordLink}}',
      '{{werkplaatsNaam}}'
    ]
  },
  {
    id: 'extra_work_approved',
    subject: 'Extra werk goedgekeurd – dank u',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'Bedankt voor uw akkoord. We gaan aan de slag met het extra werk.\n' +
      'Werkorder: {{workorderId}}\n' +
      'Kenteken: {{kenteken}}\n\n' +
      '{{werkplaatsNaam}}',
    availableVariables: ['{{klantNaam}}', '{{workorderId}}', '{{kenteken}}', '{{werkplaatsNaam}}']
  },
  {
    id: 'extra_work_declined',
    subject: 'Extra werk afgewezen',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'We hebben uw afwijzing voor het extra werk ontvangen.\n' +
      'Werkorder: {{workorderId}}\n' +
      'Kenteken: {{kenteken}}\n\n' +
      '{{werkplaatsNaam}}',
    availableVariables: ['{{klantNaam}}', '{{workorderId}}', '{{kenteken}}', '{{werkplaatsNaam}}']
  },
  {
    id: 'parts_required',
    subject: 'Onderdelen nodig – {{workorderId}}',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'Voor uw werkorder {{workorderId}} zijn onderdelen nodig.\n' +
      'Onderdelen: {{onderdelen}}\n\n' +
      'Wij houden u op de hoogte.\n\n' +
      '{{werkplaatsNaam}}',
    availableVariables: ['{{klantNaam}}', '{{workorderId}}', '{{onderdelen}}', '{{werkplaatsNaam}}']
  },
  {
    id: 'parts_ready',
    subject: 'Onderdelen binnen – {{workorderId}}',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'De benodigde onderdelen voor werkorder {{workorderId}} zijn binnen.\n' +
      'Wij plannen uw afspraak in of gaan verder met het werk.\n\n' +
      '{{werkplaatsNaam}}',
    availableVariables: ['{{klantNaam}}', '{{workorderId}}', '{{werkplaatsNaam}}']
  },
  {
    id: 'work_completed',
    subject: 'Werk afgerond – {{workorderId}}',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'Uw werkorder {{workorderId}} is gereed.\n' +
      'Kenteken: {{kenteken}}\n\n' +
      'U kunt uw voertuig ophalen op {{pickupDatum}}.\n\n' +
      '{{werkplaatsNaam}}',
    availableVariables: ['{{klantNaam}}', '{{kenteken}}', '{{workorderId}}', '{{pickupDatum}}', '{{werkplaatsNaam}}']
  },
  {
    id: 'pickup_ready',
    subject: 'Voertuig klaar voor ophalen – {{workorderId}}',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'Uw voertuig staat klaar.\n' +
      'Werkorder: {{workorderId}}\n' +
      'Kenteken: {{kenteken}}\n\n' +
      '{{werkplaatsNaam}}',
    availableVariables: ['{{klantNaam}}', '{{workorderId}}', '{{kenteken}}', '{{werkplaatsNaam}}']
  },
  {
    id: 'invoice_available',
    subject: 'Factuur beschikbaar – {{factuurNummer}}',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'Uw factuur {{factuurNummer}} staat klaar.\n' +
      'Kenteken: {{kenteken}}\n\n' +
      'U kunt betalen via {{betaalLink}}.\n\n' +
      '{{werkplaatsNaam}}',
    availableVariables: [
      '{{klantNaam}}',
      '{{kenteken}}',
      '{{factuurNummer}}',
      '{{betaalLink}}',
      '{{werkplaatsNaam}}'
    ]
  },
  {
    id: 'payment_received',
    subject: 'Betaling ontvangen – {{factuurNummer}}',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'We hebben uw betaling ontvangen.\n' +
      'Factuur: {{factuurNummer}}\n' +
      'Bedrag: {{bedrag}}\n\n' +
      'Dank u wel.\n\n' +
      '{{werkplaatsNaam}}',
    availableVariables: ['{{klantNaam}}', '{{factuurNummer}}', '{{bedrag}}', '{{werkplaatsNaam}}']
  },
  {
    id: 'payment_failed',
    subject: 'Betaling mislukt – {{factuurNummer}}',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'De betaling voor factuur {{factuurNummer}} is mislukt.\n' +
      'U kunt opnieuw betalen via {{betaalLink}}.\n\n' +
      '{{werkplaatsNaam}}',
    availableVariables: ['{{klantNaam}}', '{{factuurNummer}}', '{{betaalLink}}', '{{werkplaatsNaam}}']
  },
  {
    id: 'review_request',
    subject: 'Hoe was uw ervaring?',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'We horen graag hoe u onze service heeft ervaren.\n' +
      'Laat uw review achter via {{reviewLink}}.\n\n' +
      '{{werkplaatsNaam}}',
    availableVariables: ['{{klantNaam}}', '{{reviewLink}}', '{{werkplaatsNaam}}']
  },
  {
    id: 'service_due_reminder',
    subject: 'Onderhoud herinnering – {{kenteken}}',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'Het is tijd voor onderhoud aan uw voertuig ({{kenteken}}).\n' +
      'Plan eenvoudig een afspraak via {{planningLink}}.\n\n' +
      '{{werkplaatsNaam}}',
    availableVariables: ['{{klantNaam}}', '{{kenteken}}', '{{planningLink}}', '{{werkplaatsNaam}}']
  },
  {
    id: 'apk_reminder',
    subject: 'APK-herinnering – {{kenteken}}',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'De APK van uw voertuig ({{kenteken}}) verloopt op {{apkDatum}}.\n' +
      'Plan eenvoudig een afspraak via {{planningLink}}.\n\n' +
      '{{werkplaatsNaam}}',
    availableVariables: [
      '{{klantNaam}}',
      '{{kenteken}}',
      '{{merk}}',
      '{{type}}',
      '{{apkDatum}}',
      '{{planningLink}}',
      '{{werkplaatsNaam}}'
    ]
  },
  {
    id: 'replacement_transport',
    subject: 'Vervangend vervoer geregeld – {{datum}} {{tijd}}',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'Uw vervangend vervoer is geregeld.\n' +
      'Type: {{vervoerType}}\n' +
      'Ophalen/brengen: {{vervoerDetails}}\n' +
      'Datum/tijd: {{datum}} {{tijd}}\n\n' +
      '{{werkplaatsNaam}}',
    availableVariables: [
      '{{klantNaam}}',
      '{{vervoerType}}',
      '{{vervoerDetails}}',
      '{{datum}}',
      '{{tijd}}',
      '{{werkplaatsNaam}}'
    ]
  },
  {
    id: 'order_confirmed',
    subject: 'Bestelling ontvangen – {{orderNummer}}',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'Bedankt voor uw bestelling!\n' +
      'Ordernummer: {{orderNummer}}\n' +
      'Totaal: {{bedrag}}\n\n' +
      '{{webshopNaam}}',
    availableVariables: ['{{klantNaam}}', '{{orderNummer}}', '{{bedrag}}', '{{webshopNaam}}']
  },
  {
    id: 'order_paid',
    subject: 'Betaling ontvangen – {{orderNummer}}',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'We hebben uw betaling ontvangen.\n' +
      'Ordernummer: {{orderNummer}}\n\n' +
      '{{webshopNaam}}',
    availableVariables: ['{{klantNaam}}', '{{orderNummer}}', '{{webshopNaam}}']
  },
  {
    id: 'order_processing',
    subject: 'Bestelling in behandeling – {{orderNummer}}',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'Uw bestelling is in behandeling.\n' +
      'Ordernummer: {{orderNummer}}\n\n' +
      '{{webshopNaam}}',
    availableVariables: ['{{klantNaam}}', '{{orderNummer}}', '{{webshopNaam}}']
  },
  {
    id: 'order_shipped',
    subject: 'Bestelling verzonden – {{orderNummer}}',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'Uw bestelling is verzonden.\n' +
      'Ordernummer: {{orderNummer}}\n' +
      'Track & trace: {{trackingUrl}}\n\n' +
      '{{webshopNaam}}',
    availableVariables: ['{{klantNaam}}', '{{orderNummer}}', '{{trackingUrl}}', '{{webshopNaam}}']
  },
  {
    id: 'order_delivered',
    subject: 'Bestelling bezorgd – {{orderNummer}}',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'Uw bestelling is bezorgd.\n' +
      'Ordernummer: {{orderNummer}}\n\n' +
      '{{webshopNaam}}',
    availableVariables: ['{{klantNaam}}', '{{orderNummer}}', '{{webshopNaam}}']
  },
  {
    id: 'order_cancelled',
    subject: 'Bestelling geannuleerd – {{orderNummer}}',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'Uw bestelling is geannuleerd.\n' +
      'Ordernummer: {{orderNummer}}\n' +
      'Reden: {{reden}}\n\n' +
      '{{webshopNaam}}',
    availableVariables: ['{{klantNaam}}', '{{orderNummer}}', '{{reden}}', '{{webshopNaam}}']
  },
  {
    id: 'order_refund',
    subject: 'Terugbetaling verwerkt – {{orderNummer}}',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'De terugbetaling voor uw order {{orderNummer}} is verwerkt.\n' +
      'Bedrag: {{bedrag}}\n\n' +
      '{{webshopNaam}}',
    availableVariables: ['{{klantNaam}}', '{{orderNummer}}', '{{bedrag}}', '{{webshopNaam}}']
  },
  {
    id: 'order_backorder',
    subject: 'Backorder – {{orderNummer}}',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'Een onderdeel uit uw bestelling is tijdelijk niet leverbaar.\n' +
      'Ordernummer: {{orderNummer}}\n' +
      'Product: {{productNaam}}\n\n' +
      '{{webshopNaam}}',
    availableVariables: ['{{klantNaam}}', '{{orderNummer}}', '{{productNaam}}', '{{webshopNaam}}']
  },
  {
    id: 'return_received',
    subject: 'Retour ontvangen – {{orderNummer}}',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'We hebben uw retour ontvangen.\n' +
      'Ordernummer: {{orderNummer}}\n' +
      'Product: {{productNaam}}\n' +
      'Status: {{retourStatus}}\n\n' +
      '{{webshopNaam}}',
    availableVariables: [
      '{{klantNaam}}',
      '{{orderNummer}}',
      '{{productNaam}}',
      '{{retourStatus}}',
      '{{webshopNaam}}'
    ]
  },
  {
    id: 'stock_back_in',
    subject: 'Product weer op voorraad – {{productNaam}}',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'Het product {{productNaam}} is weer op voorraad.\n' +
      'Bestel direct via {{productUrl}}.\n\n' +
      '{{webshopNaam}}',
    availableVariables: ['{{klantNaam}}', '{{productNaam}}', '{{productUrl}}', '{{webshopNaam}}']
  },
  {
    id: 'account_created',
    subject: 'Welkom bij {{webshopNaam}}',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'Uw account is aangemaakt.\n' +
      'Inloggen: {{accountUrl}}\n\n' +
      '{{webshopNaam}}',
    availableVariables: ['{{klantNaam}}', '{{accountUrl}}', '{{webshopNaam}}']
  },
  {
    id: 'password_reset',
    subject: 'Wachtwoord reset aanvragen',
    bodyText:
      'Hallo {{klantNaam}},\n\n' +
      'U heeft een wachtwoord reset aangevraagd.\n' +
      'Reset via: {{resetLink}}\n\n' +
      'Als u dit niet was, negeer deze e-mail.\n\n' +
      '{{webshopNaam}}',
    availableVariables: ['{{klantNaam}}', '{{resetLink}}', '{{webshopNaam}}']
  }
]

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['SYSTEM_ADMIN', 'MANAGEMENT'])
    const firestore = ensureFirestore()
    const nowIso = new Date().toISOString()
    const force = request.nextUrl.searchParams.get('force') === '1'

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
      if (snap.exists) {
        if (!force) continue
        await docRef.set(
          {
            id: template.id,
            subject: template.subject,
            bodyText: template.bodyText,
            availableVariables: template.availableVariables,
            lastEditedAt: nowIso,
            lastEditedBy: 'system'
          },
          { merge: true }
        )
        created.push(template.id)
        continue
      }
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
