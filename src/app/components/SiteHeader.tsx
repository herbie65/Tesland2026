'use client'

import { useEffect, useState } from 'react'
import { MagnifyingGlassIcon, ShoppingCartIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import HeaderMenu from './HeaderMenu'
import LanguagePicker from './LanguagePicker'

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

export default function SiteHeader() {
  const [settings, setSettings] = useState<HeaderSettings>({})

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
  const cartCount = typeof actions.cartCount === 'number' ? actions.cartCount : 0

  const logoSrc =
    settings.logoUrl && !settings.logoUrl.startsWith('http') && !settings.logoUrl.startsWith('/')
      ? `/${settings.logoUrl}`
      : settings.logoUrl

  return (
    <header className="border-b border-slate-200 bg-slate-900 text-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <a className="flex items-center gap-3" href="/">
          {logoSrc ? (
            <img
              src={logoSrc}
              alt={settings.logoAlt || 'Tesland'}
              className="h-10 w-auto"
            />
          ) : (
            <span className="text-lg font-semibold tracking-wide">Tesland</span>
          )}
        </a>
        <nav className="hidden items-center gap-6 text-sm font-semibold lg:flex">
          <HeaderMenu items={menuItems} />
        </nav>
        <div className="flex items-center gap-4">
          <LanguagePicker />
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
