'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChartBarIcon,
  DocumentTextIcon,
  FolderIcon,
  HeartIcon,
  Cog6ToothIcon,
  ShoppingBagIcon,
  MapPinIcon,
  UserCircleIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'
import { ChartBarIcon as ChartBarIconSolid } from '@heroicons/react/24/solid'
import { clearCustomerSession } from '@/lib/customer-session'

type CustomerAccountLayoutProps = {
  localePrefix: string
  customer: { name: string; email: string | null; company: string | null }
  overdueInvoicesCount: number
  children: React.ReactNode
}

const navItems = [
  { href: '', label: 'Overzicht', icon: ChartBarIcon, iconActive: ChartBarIconSolid },
  { href: '/customer/account/orders', label: 'Bestellingen', icon: ShoppingBagIcon },
  { href: '/customer/account/invoices', label: 'Facturen', icon: DocumentTextIcon, badge: 'overdue' },
  { href: '/customer/account/afspraken', label: 'Afspraken', icon: CalendarDaysIcon },
  { href: '/customer/account/documents', label: 'Documenten', icon: FolderIcon },
  { href: '/customer/account/profile', label: 'Profiel', icon: UserCircleIcon },
  { href: '/customer/account/addresses', label: 'Adressen', icon: MapPinIcon },
  { href: '/customer/account/wishlist', label: 'Verlanglijst', icon: HeartIcon },
  { href: '/customer/account/settings', label: 'Instellingen', icon: Cog6ToothIcon }
]

export default function CustomerAccountLayout({
  localePrefix,
  customer,
  overdueInvoicesCount,
  children
}: CustomerAccountLayoutProps) {
  const pathname = usePathname() || ''
  const basePath = localePrefix + '/customer/account'
  const isActive = (href: string) => {
    if (href === '') return pathname === basePath || pathname === basePath + '/'
    return pathname.includes(href)
  }

  const initial = (customer.company || customer.name || 'T').charAt(0).toUpperCase()

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-8 px-6 py-8">
      <aside className="w-64 shrink-0 space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-xl font-semibold text-emerald-700">
              {initial}
            </div>
            <p className="mt-2 font-semibold text-slate-900">
              {(customer.company || customer.name || '').toUpperCase()}
            </p>
            <p className="text-sm text-slate-600">{customer.company || customer.name}</p>
            <p className="text-sm text-slate-500">{customer.email || ''}</p>
          </div>
        </div>
        <nav className="space-y-0.5 rounded-2xl border border-slate-200 bg-white py-2 shadow-sm">
          {navItems.map((item) => {
            const href = item.href ? `${localePrefix}${item.href}` : basePath
            const active = isActive(item.href)
            const Icon = active && item.iconActive ? item.iconActive : item.icon
            const showBadge = item.badge === 'overdue' && overdueInvoicesCount > 0
            return (
              <Link
                key={item.href || 'overview'}
                href={href}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {showBadge && (
                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
                    Te laat ({overdueInvoicesCount})
                  </span>
                )}
              </Link>
            )
          })}
          <div className="my-2 border-t border-slate-100" />
          <button
            type="button"
            onClick={() => {
              clearCustomerSession()
              window.location.href = `${localePrefix}/customer/account/login`
            }}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Uitloggen
          </button>
        </nav>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
