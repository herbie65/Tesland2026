import { headers } from 'next/headers'
import { MagnifyingGlassIcon, ShoppingCartIcon, UserCircleIcon } from '@heroicons/react/24/outline'

type HeaderItem = {
  label: string
  href: string
  hasDropdown?: boolean
}

type HeaderSettings = {
  logoUrl?: string
  logoAlt?: string
  menuItems?: HeaderItem[]
  actions?: {
    showSearch?: boolean
    showAccount?: boolean
    showCart?: boolean
    cartCount?: number
  }
}

export default async function SiteHeader() {
  const headerList = await headers()
  const host = headerList.get('host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const response = await fetch(`${protocol}://${host}/api/public/site-header`, { cache: 'no-store' })
  const data = await response.json().catch(() => null)
  const settings: HeaderSettings = data?.success ? data.item?.data || data.item || {} : {}

  const menuItems = Array.isArray(settings.menuItems) ? settings.menuItems : []
  const actions = settings.actions || {}
  const cartCount = typeof actions.cartCount === 'number' ? actions.cartCount : 0

  return (
    <header className="border-b border-slate-200 bg-slate-900 text-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <a className="flex items-center gap-3" href="/">
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt={settings.logoAlt || 'Tesland'}
              className="h-10 w-auto"
            />
          ) : (
            <span className="text-lg font-semibold tracking-wide">Tesland</span>
          )}
        </a>
        <nav className="hidden items-center gap-6 text-sm font-semibold lg:flex">
          {menuItems.map((item) => (
            <a
              key={`${item.label}-${item.href}`}
              className="nav-link flex items-center gap-1"
              href={item.href}
            >
              {item.label}
              {item.hasDropdown ? <span className="accent-text">▾</span> : null}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          {actions.showSearch ? (
            <button className="rounded-full p-2 text-white hover:bg-white/10" type="button">
              <MagnifyingGlassIcon className="h-5 w-5" />
            </button>
          ) : null}
          {actions.showAccount ? (
            <button className="rounded-full p-2 text-white hover:bg-white/10" type="button">
              <UserCircleIcon className="h-6 w-6" />
            </button>
          ) : null}
          {actions.showCart ? (
            <button className="relative rounded-full p-2 text-white hover:bg-white/10" type="button">
              <ShoppingCartIcon className="h-5 w-5" />
              <span className="accent-bg absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[11px] font-semibold text-slate-900">
                {cartCount}
              </span>
            </button>
          ) : null}
        </div>
      </div>
    </header>
  )
}
