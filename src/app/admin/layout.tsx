'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { apiFetch } from '@/lib/api'
import { getFirebaseAuth, logout } from '@/lib/firebase-auth'
import { onAuthStateChanged } from 'firebase/auth'
import {
  ArrowDownTrayIcon,
  ArrowUturnLeftIcon,
  CalendarIcon,
  ChartBarIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  CubeIcon,
  DocumentTextIcon,
  ReceiptRefundIcon,
  WrenchScrewdriverIcon,
  ShoppingCartIcon,
  TruckIcon,
  UsersIcon
} from '@heroicons/react/24/outline'
import './admin-styles.css'
import AdminAuthGate from './components/AdminAuthGate'

type NavLink = { type: 'link'; name: string; href: string; icon: any }
type NavGroup = { type: 'group'; name: string; icon: any; children: NavLink[] }
type NavItem = NavLink | NavGroup

const NAV_ITEMS: NavItem[] = [
  { type: 'link', name: 'Dashboard', href: '/admin', icon: ChartBarIcon },
  {
    type: 'group',
    name: 'Website',
    icon: DocumentTextIcon,
    children: [
      { type: 'link', name: 'Homepage', href: '/admin/website/pages/home', icon: DocumentTextIcon },
      { type: 'link', name: 'Header', href: '/admin/website/header', icon: DocumentTextIcon }
    ]
  },
  { type: 'link', name: 'Planning', href: '/admin/planning', icon: CalendarIcon },
  { type: 'link', name: 'Werkorders', href: '/admin/workorders', icon: WrenchScrewdriverIcon },
  { type: 'link', name: 'Klanten', href: '/admin/customers', icon: UsersIcon },
  { type: 'link', name: 'Voertuigen', href: '/admin/vehicles', icon: TruckIcon },
  { type: 'link', name: 'Producten', href: '/admin/products', icon: CubeIcon },
  { type: 'link', name: 'Magazijn', href: '/admin/magazijn', icon: WrenchScrewdriverIcon },
  { type: 'link', name: 'Gebruikers', href: '/admin/users', icon: UsersIcon },
  {
    type: 'group',
    name: 'Verkopen',
    icon: ShoppingCartIcon,
    children: [
      { type: 'link', name: 'Orders', href: '/admin/orders', icon: ShoppingCartIcon },
      { type: 'link', name: 'Facturen', href: '/admin/invoices', icon: DocumentTextIcon },
      { type: 'link', name: 'Creditfacturen', href: '/admin/credit-invoices', icon: ReceiptRefundIcon },
      { type: 'link', name: 'RMA', href: '/admin/rmas', icon: ArrowUturnLeftIcon }
    ]
  },
  { type: 'link', name: 'Tools', href: '/admin/tools', icon: Cog6ToothIcon },
  { type: 'link', name: 'Import', href: '/admin/import', icon: ArrowDownTrayIcon },
  { type: 'link', name: 'Instellingen', href: '/admin/settings', icon: Cog6ToothIcon }
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [salesOpen, setSalesOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [notificationsPos, setNotificationsPos] = useState<{ top: number; right: number } | null>(
    null
  )
  const [portalReady, setPortalReady] = useState(false)

  const unreadCount = notifications.filter(
    (item) => !Array.isArray(item.readBy) || !currentUserId || !item.readBy.includes(currentUserId)
  ).length

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return
      setCurrentUserId(user.uid)
      try {
        const meResponse = await apiFetch('/api/admin/me')
        const meData = await meResponse.json()
        if (meResponse.ok && meData.success) {
          setUserRole(meData.user?.role || null)
        }
        const response = await apiFetch('/api/admin/profile')
        const data = await response.json()
        if (response.ok && data.success) {
          const transparency = Number(data.profile?.transparency ?? 30)
          const opacity = Math.max(0.05, Math.min(0.95, transparency / 100))
          document.documentElement.style.setProperty('--admin-glass-opacity', String(opacity))
          const bg = data.profile?.backgroundPhoto || null
          setBackgroundImage(bg)
          setProfilePhoto(data.profile?.profilePhoto || null)
        }
      } catch (error) {
        console.error('Failed to load profile settings', error)
      }
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const auth = getFirebaseAuth()
    let interval: ReturnType<typeof setInterval> | null = null
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) return
      const loadNotifications = async () => {
        try {
          const response = await apiFetch('/api/notifications')
          if (!response.ok) return
          const data = await response.json()
          if (data.success) {
            setNotifications(data.items || [])
          }
        } catch (error) {
          console.error('Failed to load notifications', error)
        }
      }
      loadNotifications()
      interval = setInterval(loadNotifications, 30000)
    })
    return () => {
      unsub()
      if (interval) clearInterval(interval)
    }
  }, [])

  const markAllRead = async () => {
    try {
      const response = await apiFetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true })
      })
      if (!response.ok) return
      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          readBy: Array.isArray(item.readBy)
            ? Array.from(new Set([...item.readBy, currentUserId].filter(Boolean)))
            : currentUserId
              ? [currentUserId]
              : item.readBy
        }))
      )
    } catch (error) {
      console.error('Failed to mark notifications read', error)
    }
  }

  const markRead = async (id: string) => {
    try {
      const response = await apiFetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] })
      })
      if (!response.ok) return
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                readBy: Array.isArray(item.readBy)
                  ? Array.from(new Set([...item.readBy, currentUserId].filter(Boolean)))
                  : currentUserId
                    ? [currentUserId]
                    : item.readBy
              }
            : item
        )
      )
    } catch (error) {
      console.error('Failed to mark notification read', error)
    }
  }

  useEffect(() => {
    const salesGroup = NAV_ITEMS.find((item) => item.type === 'group' && item.name === 'Verkopen')
    if (salesGroup && salesGroup.type === 'group') {
      const isActive = salesGroup.children.some((child) => child.href === pathname)
      if (isActive) {
        setSalesOpen(true)
      }
    }
  }, [pathname])

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    if (!notificationsOpen) return
    const updatePos = () => {
      const button = document.querySelector('[data-notifications-button="true"]') as HTMLElement | null
      if (!button) return
      const rect = button.getBoundingClientRect()
      setNotificationsPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      })
    }
    updatePos()
    window.addEventListener('resize', updatePos)
    window.addEventListener('scroll', updatePos, true)
    return () => {
      window.removeEventListener('resize', updatePos)
      window.removeEventListener('scroll', updatePos, true)
    }
  }, [notificationsOpen])

  return (
    <AdminAuthGate>
      <div
        className="min-h-screen admin-background"
        style={
          backgroundImage
            ? ({ ['--admin-background-image' as any]: `url("${backgroundImage}")` } as React.CSSProperties)
            : undefined
        }
        data-has-background={backgroundImage ? 'true' : 'false'}
      >
      <header className="glass-card m-4 mb-0 sticky top-0 z-[80] overflow-visible">
        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold glass-text-primary">TLadmin</h1>
            <p className="text-sm glass-text-secondary">
              Beheer planning, klanten, voertuigen, producten en orders.
            </p>
          </div>
          <div className="relative z-[100] flex items-center gap-3">
            <button
              type="button"
              onClick={async () => {
                try {
                  await logout()
                } finally {
                  window.location.href = '/admin'
                }
              }}
              className="rounded-lg border border-white/40 bg-white/60 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-white"
            >
              Uitloggen
            </button>
            <button
              type="button"
              data-notifications-button="true"
              onClick={(event) => {
                const rect = (event.currentTarget as HTMLButtonElement).getBoundingClientRect()
                const nextPos = {
                  top: rect.bottom + 8,
                  right: window.innerWidth - rect.right
                }
                setNotificationsPos(nextPos)
                setNotificationsOpen((prev) => !prev)
              }}
              className="relative rounded-full bg-white/60 p-2 text-slate-700 hover:bg-white"
            >
              <span className="sr-only">Notificaties</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
              >
                <path
                  fillRule="evenodd"
                  d="M12 2.25a6 6 0 00-6 6v2.878l-.707 2.121a.75.75 0 00.712 1.001h12a.75.75 0 00.712-1l-.707-2.122V8.25a6 6 0 00-6-6zM9.75 19.5a2.25 2.25 0 104.5 0h-4.5z"
                  clipRule="evenodd"
                />
              </svg>
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-xs text-white">
                  {unreadCount}
                </span>
              ) : null}
            </button>
            {portalReady && notificationsOpen && notificationsPos
              ? createPortal(
                  <div
                    className="fixed z-[200] w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
                    style={{ top: notificationsPos.top, right: notificationsPos.right }}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-800">Meldingen</h3>
                      <button
                        type="button"
                        onClick={markAllRead}
                        className="text-xs text-slate-500 hover:text-slate-700"
                      >
                        Markeer alles gelezen
                      </button>
                    </div>
                    <div className="mt-3 max-h-72 space-y-2 overflow-auto">
                      {notifications.length === 0 ? (
                        <p className="text-sm text-slate-500">Geen meldingen.</p>
                      ) : (
                        notifications.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                          >
                            <p className="text-sm font-medium text-slate-800">
                              {item.title || 'Melding'}
                            </p>
                            <p className="text-xs text-slate-600">{item.message || '-'}</p>
                            <p className="mt-1 text-[11px] text-slate-400">
                              {item.created_at ? new Date(item.created_at).toLocaleString() : '-'}
                            </p>
                            <button
                              type="button"
                              onClick={() => markRead(item.id)}
                              className="mt-2 text-xs text-slate-500 hover:text-slate-700"
                            >
                              Markeer gelezen
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>,
                  document.body
                )
              : null}
          </div>
        </div>
      </header>

      <div className="m-4 flex flex-col gap-4 lg:flex-row">
        <aside className="glass-sidebar w-full rounded-2xl lg:w-64">
          <div className="px-6 pt-6">
            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt="Profielfoto"
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 text-sm text-slate-600">
                TL
              </div>
            )}
          </div>
          <nav className="px-4 py-4">
            <div className="space-y-1">
              {NAV_ITEMS.map((item) => {
                if (item.type === 'link' && item.name === 'Tools' && userRole !== 'SYSTEM_ADMIN') {
                  return null
                }
                if (item.type === 'group') {
                  const isActive = item.children.some((child) => child.href === pathname)
                  return (
                    <div key={item.name} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setSalesOpen((prev) => !prev)}
                        className={`flex w-full items-center px-4 py-2.5 text-sm font-medium glass-nav-item ${
                          isActive ? 'active' : ''
                        }`}
                      >
                        <div
                          className={`mr-3 flex h-8 w-8 items-center justify-center rounded-full ${
                            isActive ? 'bg-purple-600' : 'bg-gray-200'
                          }`}
                        >
                          <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                        </div>
                        <span className="flex-1 text-left">{item.name}</span>
                        <ChevronDownIcon
                          className={`h-4 w-4 transition-transform ${salesOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {salesOpen ? (
                        <div className="ml-6 space-y-1 border-l border-slate-200 pl-3">
                          {item.children.map((child) => {
                            const childActive = pathname === child.href
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={`flex items-center px-4 py-2 text-sm font-medium glass-nav-item ${
                                  childActive ? 'active' : ''
                                }`}
                              >
                                <div
                                  className={`mr-3 flex h-7 w-7 items-center justify-center rounded-full ${
                                    childActive ? 'bg-purple-600' : 'bg-gray-200'
                                  }`}
                                >
                                  <child.icon
                                    className={`h-4 w-4 ${childActive ? 'text-white' : 'text-gray-600'}`}
                                  />
                                </div>
                                {child.name}
                              </Link>
                            )
                          })}
                        </div>
                      ) : null}
                    </div>
                  )
                }
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center px-4 py-2.5 text-sm font-medium glass-nav-item ${
                      isActive ? 'active' : ''
                    }`}
                  >
                    <div
                      className={`mr-3 flex h-8 w-8 items-center justify-center rounded-full ${
                        isActive ? 'bg-purple-600' : 'bg-gray-200'
                      }`}
                    >
                      <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                    </div>
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </nav>
        </aside>

        <main className="glass-card flex-1 overflow-auto rounded-2xl p-6">{children}</main>
      </div>
    </div>
    </AdminAuthGate>
  )
}
