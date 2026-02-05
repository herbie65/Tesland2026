import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const DEFAULT_HEADER = {
  logoUrl: null as string | null,
  logoAlt: 'Tesland - Dé Tesla Specialist',
  menuItems: [
      {
        label: 'Onderhoud',
        href: '/onderhoud',
        hasDropdown: true,
        children: [
          {
            label: 'Model 3 Onderhoud',
            href: '/onderhoud',
            children: [
              { label: 'Onderhoud', href: '/onderhoud' },
              { label: 'APK', href: '/onderhoud#apk' },
              { label: 'Zomer-/wintercheck', href: '/onderhoud#checks' },
              { label: 'PPF & ramen tinten', href: '/onderhoud#ppf' },
              { label: 'Bandenhotel', href: '/onderhoud#tire-hotel' },
              { label: 'Plan afspraak', href: '/planning' }
            ]
          },
          {
            label: 'Model Y Onderhoud',
            href: '/onderhoud',
            children: [
              { label: 'Onderhoud', href: '/onderhoud' },
              { label: 'APK', href: '/onderhoud#apk' },
              { label: 'Zomer-/wintercheck', href: '/onderhoud#checks' },
              { label: 'PPF & ramen tinten', href: '/onderhoud#ppf' },
              { label: 'Bandenhotel', href: '/onderhoud#tire-hotel' },
              { label: 'Plan afspraak', href: '/planning' }
            ]
          },
          {
            label: 'Model S Onderhoud',
            href: '/onderhoud',
            children: [
              { label: 'Onderhoud', href: '/onderhoud' },
              { label: 'APK', href: '/onderhoud#apk' },
              { label: 'Zomer-/wintercheck', href: '/onderhoud#checks' },
              { label: 'PPF & ramen tinten', href: '/onderhoud#ppf' },
              { label: 'Bandenhotel', href: '/onderhoud#tire-hotel' },
              { label: 'Plan afspraak', href: '/planning' }
            ]
          },
          {
            label: 'Model X Onderhoud',
            href: '/onderhoud',
            children: [
              { label: 'Onderhoud', href: '/onderhoud' },
              { label: 'APK', href: '/onderhoud#apk' },
              { label: 'Zomer-/wintercheck', href: '/onderhoud#checks' },
              { label: 'PPF & ramen tinten', href: '/onderhoud#ppf' },
              { label: 'Bandenhotel', href: '/onderhoud#tire-hotel' },
              { label: 'Plan afspraak', href: '/planning' }
            ]
          }
        ]
      },
      { label: 'Reparaties', href: '/reparaties', hasDropdown: false },
      { label: 'Accessoires', href: '/accessoires', hasDropdown: true },
      { label: 'Onderdelen', href: '/onderdelen', hasDropdown: false },
      { label: 'Winterwielen', href: '/winterwielen', hasDropdown: false },
      { label: 'Fan-Shop', href: '/fan-shop', hasDropdown: false },
    ],
    actions: {
      showSearch: true,
      showAccount: true,
      showCart: true,
      cartCount: 0,
    },
  }

export async function GET() {
  let headerSettings = { ...DEFAULT_HEADER }
  try {
    const item = await prisma.setting.findUnique({ where: { group: 'siteHeader' } })
    if (item?.data && typeof item.data === 'object') {
      const saved = item.data as Record<string, unknown>
      headerSettings = {
        logoUrl: typeof saved.logoUrl === 'string' ? saved.logoUrl : headerSettings.logoUrl,
        logoAlt: typeof saved.logoAlt === 'string' ? saved.logoAlt : headerSettings.logoAlt,
        menuItems: Array.isArray(saved.menuItems) ? saved.menuItems : headerSettings.menuItems,
        actions: saved.actions && typeof saved.actions === 'object'
          ? { ...headerSettings.actions, ...(saved.actions as Record<string, unknown>) }
          : headerSettings.actions,
      }
    }
  } catch {
    // fallback to default
  }

  return NextResponse.json({
    success: true,
    item: {
      data: headerSettings,
    },
  })
}
