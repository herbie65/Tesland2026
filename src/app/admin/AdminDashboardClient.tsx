'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'

type DashboardCard = {
  title: string
  href: string
  description: string
  icon?: string
  roles?: string[] // Only show for these roles (if empty, show for all)
}

const baseCards: DashboardCard[] = [
  { 
    title: 'Planning', 
    href: '/admin/planning', 
    description: 'Plan afspraken en werkbonnen.',
    icon: '📅'
  },
  { 
    title: 'Mijn Verlof', 
    href: '/admin/my-dashboard', 
    description: 'Bekijk je verlofbalans en dien aanvragen in.',
    icon: '🏖️'
  },
  { 
    title: 'Werkoverzicht', 
    href: '/admin/workoverzicht', 
    description: 'Statusoverzicht per kolom.',
    icon: '📊'
  },
  { 
    title: 'Klanten', 
    href: '/admin/customers', 
    description: 'Beheer klantgegevens.',
    icon: '👥'
  },
  { 
    title: 'Voertuigen', 
    href: '/admin/vehicles', 
    description: 'Koppel voertuigen en eigenaars.',
    icon: '🚗'
  },
  { 
    title: 'Producten', 
    href: '/admin/products', 
    description: 'Beheer het assortiment.',
    icon: '📦'
  },
  { 
    title: 'Magazijn', 
    href: '/admin/magazijn', 
    description: 'Onderdelen en picklist.',
    icon: '🏭'
  },
  { 
    title: 'Orders', 
    href: '/admin/orders', 
    description: 'Opdrachten en statusbeheer.',
    icon: '📋'
  },
  { 
    title: 'Verlof Beheer', 
    href: '/admin/leave-management', 
    description: 'Beheer verlofaanvragen van medewerkers.',
    icon: '✅',
    roles: ['admin', 'manager']
  },
  { 
    title: 'Verlof Rapportage', 
    href: '/admin/leave-reports', 
    description: 'Overzichten en statistieken.',
    icon: '📈',
    roles: ['admin', 'manager']
  },
  { 
    title: 'Import', 
    href: '/admin/import', 
    description: 'Importeer CSV data.',
    icon: '📥'
  },
  { 
    title: 'Instellingen', 
    href: '/admin/settings', 
    description: 'Basisconfiguratie.',
    icon: '⚙️'
  }
]

export default function AdminDashboardClient() {
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [userName, setUserName] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      const response = await apiFetch('/api/auth/me')
      if (response.user) {
        setUserName(response.user.displayName || response.user.email)
        // Get user roles
        const roles: string[] = []
        if (response.user.isSystemAdmin) roles.push('admin')
        if (response.user.role) roles.push(response.user.role.toLowerCase())
        setUserRoles(roles)
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const visibleCards = baseCards.filter(card => {
    // If no roles specified, show to everyone
    if (!card.roles || card.roles.length === 0) return true
    // Check if user has any of the required roles
    return card.roles.some(role => userRoles.includes(role))
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-48 mb-2"></div>
          <div className="h-4 bg-slate-200 rounded w-96"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">
          {userName ? `Welkom, ${userName}` : 'Dashboard'}
        </h2>
        <p className="text-slate-600">
          Start met de belangrijkste modules of werk je instellingen bij.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm transition hover:bg-white hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              {card.icon && (
                <span className="text-2xl" role="img" aria-label={card.title}>
                  {card.icon}
                </span>
              )}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{card.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </section>

      {userRoles.includes('admin') || userRoles.includes('manager') ? (
        <section className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            👔 Management Functies
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            Als manager heb je toegang tot extra modules voor teamoverzicht en goedkeuringen.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <Link
              href="/admin/leave-management"
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-blue-300 hover:bg-blue-50 transition"
            >
              <span className="text-xl">✅</span>
              <div>
                <div className="font-medium text-sm">Verlof Beheer</div>
                <div className="text-xs text-slate-600">Goedkeuringen & team overzicht</div>
              </div>
            </Link>
            <Link
              href="/admin/leave-reports"
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-blue-300 hover:bg-blue-50 transition"
            >
              <span className="text-xl">📈</span>
              <div>
                <div className="font-medium text-sm">Verlof Rapportage</div>
                <div className="text-xs text-slate-600">Statistieken & exports</div>
              </div>
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  )
}
