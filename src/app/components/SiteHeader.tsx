'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { MagnifyingGlassIcon, ShoppingCartIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import HeaderMenu from './HeaderMenu'
import LanguagePicker from './LanguagePicker'
import { fetchCart } from '@/lib/shop-cart'

type HeaderItem = {
  label: string
  href: string
  hasDropdown?: boolean
  children?: HeaderItem[]
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

export default function SiteHeader() {
  const [settings, setSettings] = useState<HeaderSettings>({})
  const pathname = usePathname() || '/'
  const locale = pathname.split('/').filter(Boolean)[0] || 'nl'
  const localePrefix = locale === 'nl' || locale === 'en' || locale === 'de' || locale === 'fr' ? `/${locale}` : ''
  const [cartCount, setCartCount] = useState(0)
  const [cartFlash, setCartFlash] = useState(false)

  useEffect(() => {
    let isMounted = true
    const loadHeader = async () => {
      const response = await fetch('/api/public/site-header', { cache: 'no-store' })
      const data = await response.json().catch(() => null)
      if (!isMounted) return
      setSettings(data?.success ? data.item?.data || data.item || {} : {})
    }

    loadHeader()

    return () => {
      isMounted = false
    }
  }, [])

  const menuItems = Array.isArray(settings.menuItems) ? settings.menuItems : []
  const actions = settings.actions || {}
  const showSearch = actions.showSearch === true
  const showAccount = actions.showAccount !== false
  const showCart = actions.showCart !== false

  const logoSrc =
    settings.logoUrl && !settings.logoUrl.startsWith('http') && !settings.logoUrl.startsWith('/')
      ? `/${settings.logoUrl}`
      : settings.logoUrl

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const data = await fetchCart()
        if (!alive) return
        const count = Array.isArray(data.items)
          ? data.items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0)
          : 0
        setCartCount(count)
      } catch {
        // ignore
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent<{ count?: number }>).detail
      const next = Number(detail?.count ?? 0)
      setCartCount(next)
      setCartFlash(true)
      window.setTimeout(() => setCartFlash(false), 500)
    }
    window.addEventListener('tesland:cart-updated', onUpdate)
    return () => window.removeEventListener('tesland:cart-updated', onUpdate)
  }, [])

  return (
    <header className="border-b border-slate-200 bg-slate-900 text-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link className="flex items-center gap-3" href={localePrefix || '/'}>
          {logoSrc ? (
            <img
              src={logoSrc}
              alt={settings.logoAlt || 'Tesland'}
              className="h-10 w-auto"
            />
          ) : (
            <span className="text-lg font-semibold tracking-wide">Tesland</span>
          )}
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold lg:flex">
          <HeaderMenu items={menuItems} />
        </nav>
        <div className="flex items-center gap-4">
          <LanguagePicker />
          {showSearch ? (
            <button className="rounded-full p-2 text-white hover:bg-white/10" type="button">
              <MagnifyingGlassIcon className="h-5 w-5" />
            </button>
          ) : null}
          {showAccount ? (
            <Link className="rounded-full p-2 text-white hover:bg-white/10" href={`${localePrefix}/customer/account`}>
              <UserCircleIcon className="h-6 w-6" />
            </Link>
          ) : null}
          {showCart ? (
            <Link className="relative rounded-full p-2 text-white hover:bg-white/10" href={`${localePrefix}/cart`}>
              <ShoppingCartIcon className="h-5 w-5" />
              {cartCount > 0 ? (
                <span
                  className={`absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[11px] font-semibold text-slate-900 shadow ${
                    cartFlash ? 'bg-amber-300' : 'bg-amber-400'
                  }`}
                >
                  {cartCount}
                </span>
              ) : null}
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  )
}
