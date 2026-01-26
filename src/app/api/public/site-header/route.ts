import { NextResponse } from 'next/server'

export async function GET() {
  // Return default header configuration
  const headerSettings = {
    logoUrl: null,
    logoAlt: 'Tesland - Dé Tesla Specialist',
    menuItems: [
      { label: 'Onderhoud', href: '/onderhoud', hasDropdown: false },
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

  return NextResponse.json({
    success: true,
    item: {
      data: headerSettings,
    },
  })
}
