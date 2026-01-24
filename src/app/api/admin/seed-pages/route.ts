import { NextRequest, NextResponse } from 'next/server'
// import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
import { requireRole } from '@/lib/auth'

const ensureFirestore = () => {
  ensureAdmin()
  if (!adminFirestore) {
    throw new Error('Firebase Admin not initialized')
  }
  return adminFirestore
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['SYSTEM_ADMIN', 'MANAGEMENT'])
    const firestore = ensureFirestore()
    const docRef = firestore.collection('pages').doc('_home')
    const existing = await docRef.get()
    if (existing.exists) {
      return NextResponse.json({ success: true, id: '_home', reused: true })
    }

    const legacyRef = firestore.collection('pages').doc('home')
    const legacySnap = await legacyRef.get()
    if (legacySnap.exists) {
      const legacyData = legacySnap.data() || {}
      const nowIso = new Date().toISOString()
      await docRef.set(
        {
          ...legacyData,
          id: '_home',
          slug: '/',
          draftTitle: legacyData.draftTitle ?? legacyData.title ?? 'Tesland',
          draftSeo: legacyData.draftSeo ?? legacyData.seo ?? {
            metaTitle: 'Tesland',
            metaDescription: 'Werkplaatssoftware voor planning, magazijn en werkorders.'
          },
          draftBlocks: Array.isArray(legacyData.draftBlocks)
            ? legacyData.draftBlocks
            : Array.isArray(legacyData.blocks)
              ? legacyData.blocks
              : [],
          updated_at: nowIso
        },
        { merge: true }
      )
      return NextResponse.json({ success: true, id: '_home', migratedFrom: 'home' })
    }

    const nowIso = new Date().toISOString()

    const payload = {
      id: '_home',
      slug: '/',
      title: 'Tesland',
      status: 'PUBLISHED',
      seo: {
        metaTitle: 'Tesland',
        metaDescription: 'Werkplaatssoftware voor planning, magazijn en werkorders.',
        metaKeywords:
          'tesla onderhoud, tesla accessoires, tesla service, tesla specialist, tesla onderdelen'
      },
      blocks: [
        {
          type: 'hero',
          headline: 'Tesland werkplaatssoftware',
          subheadline: 'Eén centrale plek voor planning, onderdelen en werkorders.',
          ctaText: 'Open de planning',
          ctaLink: '/admin/planning',
          backgroundImage: ''
        },
        {
          type: 'introText',
          heading: 'Alles voor de werkplaats',
          body:
            'Plan werkorders, beheer onderdelen en houd klanten overzichtelijk bij.\n\n' +
            'Tesland maakt samenwerken in de werkplaats duidelijk en snel.'
        },
        {
          type: 'ctaBanner',
          text: 'Klaar om vandaag te starten met Tesland?',
          buttonText: 'Ga naar de admin',
          buttonLink: '/admin'
        }
      ],
      draftTitle: 'Tesland',
      draftSeo: {
        metaTitle: 'Tesland',
        metaDescription: 'Werkplaatssoftware voor planning, magazijn en werkorders.',
        metaKeywords:
          'tesla onderhoud, tesla accessoires, tesla service, tesla specialist, tesla onderdelen'
      },
      draftBlocks: [
        {
          type: 'hero',
          headline: 'Tesland werkplaatssoftware',
          subheadline: 'Eén centrale plek voor planning, onderdelen en werkorders.',
          ctaText: 'Open de planning',
          ctaLink: '/admin/planning',
          backgroundImage: ''
        },
        {
          type: 'introText',
          heading: 'Alles voor de werkplaats',
          body:
            'Plan werkorders, beheer onderdelen en houd klanten overzichtelijk bij.\n\n' +
            'Tesland maakt samenwerken in de werkplaats duidelijk en snel.'
        },
        {
          type: 'ctaBanner',
          text: 'Klaar om vandaag te starten met Tesland?',
          buttonText: 'Ga naar de admin',
          buttonLink: '/admin'
        }
      ],
      created_at: nowIso,
      updated_at: nowIso
    }

    await docRef.set(payload, { merge: true })
    return NextResponse.json({ success: true, id: docRef.id })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error seeding pages:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
