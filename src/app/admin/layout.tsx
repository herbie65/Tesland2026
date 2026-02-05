'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { apiFetch, getCurrentUser, logout } from '@/lib/api'
import {
  ArrowDownTrayIcon,
  ArrowUturnLeftIcon,
  CalendarIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChevronDownIcon,
  ClockIcon,
  Cog6ToothIcon,
  CubeIcon,
  DocumentTextIcon,
  FolderIcon,
  HomeIcon,
  ReceiptRefundIcon,
  WrenchScrewdriverIcon,
  ShoppingCartIcon,
  TruckIcon,
  UsersIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'
import './admin-styles.css'
import AdminAuthGate from './components/AdminAuthGate'
import { SETTINGS_MENU_ITEMS } from '@/lib/settings-menu'

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
      { type: 'link', name: 'Header', href: '/admin/website/header', icon: DocumentTextIcon },
      { type: 'link', name: 'Categorieën', href: '/admin/categories', icon: FolderIcon }
    ]
  },
  {
    type: 'group',
    name: 'Werkplaats',
    icon: WrenchScrewdriverIcon,
    children: [
      { type: 'link', name: 'Planning', href: '/admin/planning', icon: CalendarIcon },
      { type: 'link', name: 'Werkoverzicht', href: '/admin/workoverzicht', icon: ChartBarIcon },
      { type: 'link', name: 'Werkorders', href: '/admin/workorders', icon: WrenchScrewdriverIcon },
      { type: 'link', name: 'Voertuigen', href: '/admin/vehicles', icon: TruckIcon }
    ]
  },
  {
    type: 'group',
    name: 'HR',
    icon: UserGroupIcon,
    children: [
      { type: 'link', name: 'Mijn Dashboard', href: '/admin/my-dashboard', icon: HomeIcon },
      { type: 'link', name: 'Verlof Beheer', href: '/admin/leave-management', icon: CalendarDaysIcon },
      { type: 'link', name: 'Rapportage', href: '/admin/leave-reports', icon: ChartBarIcon },
      { type: 'link', name: 'HR Instellingen', href: '/admin/hr-settings', icon: Cog6ToothIcon }
    ]
  },
  { type: 'link', name: 'Klanten', href: '/admin/customers', icon: UsersIcon },
  {
    type: 'group',
    name: 'Magazijn',
    icon: WrenchScrewdriverIcon,
    children: [
      { type: 'link', name: 'Overzicht', href: '/admin/magazijn', icon: WrenchScrewdriverIcon },
      { type: 'link', name: 'Orders', href: '/admin/orders', icon: ShoppingCartIcon },
      { type: 'link', name: "RMA's", href: '/admin/rmas', icon: ArrowUturnLeftIcon },
      { type: 'link', name: 'Producten', href: '/admin/products', icon: CubeIcon }
    ]
  },
  {
    type: 'group',
    name: 'Verkopen',
    icon: ShoppingCartIcon,
    children: [
      { type: 'link', name: 'Orders', href: '/admin/orders', icon: ShoppingCartIcon },
      { type: 'link', name: 'Offertes', href: '/admin/offertes', icon: DocumentTextIcon },
      { type: 'link', name: 'Facturen', href: '/admin/invoices', icon: DocumentTextIcon },
      { type: 'link', name: 'Creditfacturen', href: '/admin/credit-invoices', icon: ReceiptRefundIcon }
    ]
  },
  { type: 'link', name: 'Tools', href: '/admin/tools', icon: Cog6ToothIcon },
  { type: 'link', name: 'Import', href: '/admin/import', icon: ArrowDownTrayIcon },
  {
    type: 'group',
    name: 'Instellingen',
    icon: Cog6ToothIcon,
    children: SETTINGS_MENU_ITEMS.map((item) => ({
      type: 'link' as const,
      name: item.label,
      href: item.href,
      icon: Cog6ToothIcon
    }))
  }
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [salesOpen, setSalesOpen] = useState(false)
  const [magazijnOpen, setMagazijnOpen] = useState(false)
  const [hrOpen, setHrOpen] = useState(false)
  const [werkplaatsOpen, setWerkplaatsOpen] = useState(false)
  const [websiteOpen, setWebsiteOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [pagePermissions, setPagePermissions] = useState<{ [path: string]: boolean }>({})
  const [isSystemAdmin, setIsSystemAdmin] = useState(false)
  const [pendingLeaveRequests, setPendingLeaveRequests] = useState(0)
  const [notificationsPos, setNotificationsPos] = useState<{ top: number; left: number } | null>(
    null
  )
  const [portalReady, setPortalReady] = useState(false)
  
  // Sidebar resize state
  const [sidebarWidth, setSidebarWidth] = useState<number>(256) // Default 64 * 4 = 256px (w-64)
  const [isResizing, setIsResizing] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  const unreadCount = notifications.filter(
    (item) => !Array.isArray(item.readBy) || !currentUserId || !item.readBy.includes(currentUserId)
  ).length

  // Helper function to check if user has access to a page
  const hasPageAccess = (path: string): boolean => {
    // System admins have access to everything
    if (isSystemAdmin) return true
    
    // If no permissions are set, deny access (secure by default)
    if (!pagePermissions || Object.keys(pagePermissions).length === 0) {
      return false
    }
    
    // Check if the page is explicitly allowed
    return pagePermissions[path] === true
  }

  // Helper function to check if a group has any accessible children
  const hasAccessToGroupChildren = (children: NavLink[]): boolean => {
    return children.some(child => hasPageAccess(child.href))
  }

  // Load sidebar width from localStorage
  useEffect(() => {
    const savedWidth = localStorage.getItem('admin-sidebar-width')
    if (savedWidth) {
      const width = parseInt(savedWidth, 10)
      if (width >= 60 && width <= 400) {
        setSidebarWidth(width)
      }
    }
  }, [])

  // Handle resize
  useEffect(() => {
    if (!isResizing) return
    
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = e.clientX - 16 // Subtract left margin
      const clampedWidth = Math.max(60, Math.min(400, newWidth))
      setSidebarWidth(clampedWidth)
    }
    
    const handleMouseUp = () => {
      setIsResizing(false)
      localStorage.setItem('admin-sidebar-width', sidebarWidth.toString())
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'ew-resize'
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [isResizing, sidebarWidth])

  useEffect(() => {
    const user = getCurrentUser()
    if (!user) return
    
    setCurrentUserId(user.id)
    
    // Load cached profile immediately for faster render
    const cachedProfile = localStorage.getItem('userProfile')
    if (cachedProfile) {
      try {
        const parsed = JSON.parse(cachedProfile)
        if (parsed.backgroundPhoto) setBackgroundImage(parsed.backgroundPhoto)
        if (parsed.profilePhoto) setProfilePhoto(parsed.profilePhoto)
        if (parsed.transparency) {
          const opacity = Math.max(0.05, Math.min(0.95, Number(parsed.transparency) / 100))
          document.documentElement.style.setProperty('--admin-glass-opacity', String(opacity))
        }
      } catch (e) {
        // ignore parse errors
      }
    }
    
    // Load user profile and settings from API
    const loadProfile = async () => {
      try {
        const meData = await apiFetch('/api/admin/me')
        if (meData.success) {
          setUserRole(meData.user?.role || null)
          setPagePermissions(meData.user?.pagePermissions || {})
          setIsSystemAdmin(meData.user?.isSystemAdmin || false)
        }
        const data = await apiFetch('/api/admin/profile')
        if (data.success) {
          const transparency = Number(data.profile?.transparency ?? 30)
          const opacity = Math.max(0.05, Math.min(0.95, transparency / 100))
          document.documentElement.style.setProperty('--admin-glass-opacity', String(opacity))
          const bg = data.profile?.backgroundPhoto || null
          setBackgroundImage(bg)
          setProfilePhoto(data.profile?.profilePhoto || null)
          
          // Cache profile for next load
          localStorage.setItem('userProfile', JSON.stringify(data.profile))
        }
      } catch (error) {
        console.error('Failed to load profile settings', error)
      }
    }
    loadProfile()
  }, [])

  useEffect(() => {
    const user = getCurrentUser()
    if (!user) return
    
    const loadNotifications = async () => {
      try {
        const data = await apiFetch('/api/notifications')
        if (data.success) {
          setNotifications(data.items || [])
        }
      } catch (error) {
        console.error('Failed to load notifications', error)
      }
    }
    
    const loadPendingLeaveRequests = async () => {
      try {
        const data = await apiFetch('/api/leave-requests')
        if (data.success || data.items) {
          const items = data.items || []
          const pending = items.filter((item: any) => item.status === 'PENDING')
          setPendingLeaveRequests(pending.length)
        }
      } catch (error) {
        // Silently fail - user might not have access
        console.error('Failed to load leave requests', error)
      }
    }
    
    loadNotifications()
    loadPendingLeaveRequests()
    const interval = setInterval(() => {
      loadNotifications()
      loadPendingLeaveRequests()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const markAllRead = async () => {
    try {
      await apiFetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true })
      })
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
      await apiFetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] })
      })
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
    const websiteGroup = NAV_ITEMS.find((item) => item.type === 'group' && item.name === 'Website')
    if (websiteGroup && websiteGroup.type === 'group') {
      const isActive = websiteGroup.children.some((child) => child.href === pathname)
      if (isActive) {
        setWebsiteOpen(true)
      }
    }

    const salesGroup = NAV_ITEMS.find((item) => item.type === 'group' && item.name === 'Verkopen')
    if (salesGroup && salesGroup.type === 'group') {
      const isActive = salesGroup.children.some((child) => child.href === pathname)
      if (isActive) {
        setSalesOpen(true)
      }
    }
    
    const magazijnGroup = NAV_ITEMS.find((item) => item.type === 'group' && item.name === 'Magazijn')
    if (magazijnGroup && magazijnGroup.type === 'group') {
      const isActive = magazijnGroup.children.some((child) => child.href === pathname)
      if (isActive) {
        setMagazijnOpen(true)
      }
    }
    
    const hrGroup = NAV_ITEMS.find((item) => item.type === 'group' && item.name === 'HR')
    if (hrGroup && hrGroup.type === 'group') {
      const isActive = hrGroup.children.some((child) => child.href === pathname)
      if (isActive) {
        setHrOpen(true)
      }
    }

    const werkplaatsGroup = NAV_ITEMS.find((item) => item.type === 'group' && item.name === 'Werkplaats')
    if (werkplaatsGroup && werkplaatsGroup.type === 'group') {
      const isActive = werkplaatsGroup.children.some((child) => child.href === pathname)
      if (isActive) {
        setWerkplaatsOpen(true)
      }
    }

    const settingsGroup = NAV_ITEMS.find((item) => item.type === 'group' && item.name === 'Instellingen')
    if (settingsGroup && settingsGroup.type === 'group') {
      const isActive = settingsGroup.children.some((child) => child.href === pathname)
      if (isActive) {
        setSettingsOpen(true)
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
        left: rect.left
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
      <div className="p-4 flex flex-col gap-4 lg:flex-row">
        <div className="relative hidden lg:block lg:sticky lg:top-4 lg:self-start">
          <aside 
            className="glass-sidebar rounded-2xl transition-all duration-300 ease-in-out"
            style={{ 
              width: isHovering && sidebarWidth < 150 ? '256px' : `${sidebarWidth}px`,
              transitionProperty: isResizing ? 'none' : 'width',
              maxHeight: 'calc(100vh - 2rem)'
            }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <div className="px-4 pt-3 pb-2">
              <div className="relative inline-block">
                <button
                  type="button"
                  data-notifications-button="true"
                  onClick={(event) => {
                    const rect = (event.currentTarget as HTMLButtonElement).getBoundingClientRect()
                    const nextPos = {
                      top: rect.bottom + 8,
                      left: rect.left
                    }
                    setNotificationsPos(nextPos)
                    setNotificationsOpen((prev) => !prev)
                  }}
                  className="focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-full"
                >
                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt="Profielfoto"
                      className="h-12 w-12 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-purple-300 transition-all"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-sm text-slate-600 cursor-pointer hover:bg-slate-300 transition-all">
                      TL
                    </div>
                  )}
                  {unreadCount > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white shadow-lg ring-2 ring-white">
                      {unreadCount}
                    </span>
                  ) : null}
                </button>
              </div>
            </div>
            <nav className="px-4 py-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 10rem)' }}>
              <div className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  if (item.type === 'link' && item.name === 'Tools' && userRole !== 'SYSTEM_ADMIN') {
                    return null
                  }
                  
                  // Check page access for single links
                  if (item.type === 'link' && !hasPageAccess(item.href)) {
                    return null
                  }
                  
                  // Check group access - hide if no children are accessible
                  if (item.type === 'group' && !hasAccessToGroupChildren(item.children)) {
                    return null
                  }
                  
                  // Define showText once for this item
                  const showText = sidebarWidth >= 150 || isHovering
                  
                  if (item.type === 'group') {
                    const isActive = item.children.some((child) => child.href === pathname)
                    const showText = sidebarWidth >= 150 || isHovering
                    const isOpen = 
                      item.name === 'Website' ? websiteOpen : 
                      item.name === 'Verkopen' ? salesOpen : 
                      item.name === 'Magazijn' ? magazijnOpen :
                      item.name === 'HR' ? hrOpen : 
                      item.name === 'Werkplaats' ? werkplaatsOpen :
                      item.name === 'Instellingen' ? settingsOpen :
                      false
                    const setOpen = 
                      item.name === 'Website' ? setWebsiteOpen : 
                      item.name === 'Verkopen' ? setSalesOpen : 
                      item.name === 'Magazijn' ? setMagazijnOpen :
                      item.name === 'HR' ? setHrOpen :
                      item.name === 'Werkplaats' ? setWerkplaatsOpen :
                      item.name === 'Instellingen' ? setSettingsOpen :
                      () => {}
                    
                    return (
                      <div key={item.name} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => setOpen((prev) => !prev)}
                          className={`flex w-full items-center px-4 py-2.5 text-sm font-medium glass-nav-item ${
                            isActive ? 'active' : ''
                          } ${!showText ? 'justify-center' : ''}`}
                          title={!showText ? item.name : undefined}
                        >
                          <div
                            className={`${showText ? 'mr-3' : ''} flex h-8 w-8 items-center justify-center rounded-full ${
                              isActive ? 'bg-purple-600' : 'bg-gray-200'
                            }`}
                          >
                            <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                          </div>
                          {showText && (
                            <>
                              <span className="flex-1 text-left whitespace-nowrap overflow-hidden">{item.name}</span>
                              <ChevronDownIcon
                                className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                              />
                            </>
                          )}
                        </button>
                        {isOpen && showText ? (
                          <div className="ml-6 space-y-1 border-l border-slate-200 pl-3">
                            {item.children.map((child) => {
                              // Filter out pages the user doesn't have access to
                              if (!hasPageAccess(child.href)) {
                                return null
                              }
                              
                              const childActive = pathname === child.href
                              const showBadge = child.name === 'Verlof Beheer' && pendingLeaveRequests > 0
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
                                  <span className="whitespace-nowrap overflow-hidden flex-1">{child.name}</span>
                                  {showBadge && (
                                    <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">
                                      {pendingLeaveRequests}
                                    </span>
                                  )}
                                </Link>
                              )
                            })}
                          </div>
                        ) : null}
                      </div>
                    )
                  }
                  
                  // Single link item
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center px-4 py-2.5 text-sm font-medium glass-nav-item ${
                        isActive ? 'active' : ''
                      } ${!showText ? 'justify-center' : ''}`}
                      title={!showText ? item.name : undefined}
                    >
                      <div
                        className={`${showText ? 'mr-3' : ''} flex h-8 w-8 items-center justify-center rounded-full ${
                          isActive ? 'bg-purple-600' : 'bg-gray-200'
                        }`}
                      >
                        <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                      </div>
                      {showText && <span className="whitespace-nowrap overflow-hidden">{item.name}</span>}
                    </Link>
                  )
                })}
                
                {/* Uitloggen */}
                {(() => {
                  const showText = sidebarWidth >= 150 || isHovering
                  return (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={logout}
                        className={`flex items-center px-4 py-2.5 text-sm font-medium glass-nav-item w-full ${!showText ? 'justify-center' : ''}`}
                        title={!showText ? 'Uitloggen' : undefined}
                      >
                        <div className={`${showText ? 'mr-3' : ''} flex h-8 w-8 items-center justify-center rounded-full bg-gray-200`}>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="h-5 w-5 text-gray-600"
                          >
                            <path
                              fillRule="evenodd"
                              d="M7.5 3.75A1.5 1.5 0 006 5.25v13.5a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V15a.75.75 0 011.5 0v3.75a3 3 0 01-3 3h-6a3 3 0 01-3-3V5.25a3 3 0 013-3h6a3 3 0 013 3V9A.75.75 0 0115 9V5.25a1.5 1.5 0 00-1.5-1.5h-6zm10.72 4.72a.75.75 0 011.06 0l3 3a.75.75 0 010 1.06l-3 3a.75.75 0 11-1.06-1.06l1.72-1.72H9a.75.75 0 010-1.5h10.94l-1.72-1.72a.75.75 0 010-1.06z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        {showText && <span className="whitespace-nowrap overflow-hidden">Uitloggen</span>}
                      </button>
                    </div>
                  )
                })()}
              </div>
            </nav>
            
            {/* Notificaties Dropdown Portal */}
            {portalReady && notificationsOpen && notificationsPos
              ? createPortal(
                  <div
                    className="fixed z-[200] w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
                    style={{ top: notificationsPos.top, left: notificationsPos.left }}
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
          </aside>
          
          {/* Resize handle */}
          <div
            className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-purple-400 hover:w-1.5 transition-all group"
            onMouseDown={(e) => {
              e.preventDefault()
              setIsResizing(true)
            }}
            style={{ zIndex: 90 }}
          >
            <div className="absolute inset-y-0 -right-2 w-4" />
          </div>
        </div>
        
        {/* Mobile sidebar - full width */}
        <aside className="glass-sidebar w-full rounded-2xl lg:hidden">
          <div className="px-4 pt-3 pb-2">
            <div className="relative inline-block">
              <button
                type="button"
                data-notifications-button="true"
                onClick={(event) => {
                  const rect = (event.currentTarget as HTMLButtonElement).getBoundingClientRect()
                  const nextPos = {
                    top: rect.bottom + 8,
                    left: rect.left
                  }
                  setNotificationsPos(nextPos)
                  setNotificationsOpen((prev) => !prev)
                }}
                className="focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-full"
              >
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt="Profielfoto"
                    className="h-12 w-12 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-purple-300 transition-all"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-sm text-slate-600 cursor-pointer hover:bg-slate-300 transition-all">
                    TL
                  </div>
                )}
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white shadow-lg ring-2 ring-white">
                    {unreadCount}
                  </span>
                ) : null}
              </button>
            </div>
          </div>
          <nav className="px-4 py-3">
            <div className="space-y-1">
              {NAV_ITEMS.map((item) => {
                if (item.type === 'link' && item.name === 'Tools' && userRole !== 'SYSTEM_ADMIN') {
                  return null
                }
                
                // Check page access for single links
                if (item.type === 'link' && !hasPageAccess(item.href)) {
                  return null
                }
                
                // Check group access - hide if no children are accessible
                if (item.type === 'group' && !hasAccessToGroupChildren(item.children)) {
                  return null
                }
                
                if (item.type === 'group') {
                  const isActive = item.children.some((child) => child.href === pathname)
                  const isOpen = 
                    item.name === 'Website' ? websiteOpen : 
                    item.name === 'Verkopen' ? salesOpen : 
                    item.name === 'Magazijn' ? magazijnOpen :
                    item.name === 'HR' ? hrOpen : 
                    item.name === 'Werkplaats' ? werkplaatsOpen :
                    item.name === 'Instellingen' ? settingsOpen :
                    false
                  const setOpen = 
                    item.name === 'Website' ? setWebsiteOpen : 
                    item.name === 'Verkopen' ? setSalesOpen : 
                    item.name === 'Magazijn' ? setMagazijnOpen :
                    item.name === 'HR' ? setHrOpen :
                    item.name === 'Werkplaats' ? setWerkplaatsOpen :
                    item.name === 'Instellingen' ? setSettingsOpen :
                    () => {}
                  
                  return (
                    <div key={item.name} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setOpen((prev) => !prev)}
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
                          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {isOpen ? (
                        <div className="ml-6 space-y-1 border-l border-slate-200 pl-3">
                          {item.children.map((child) => {
                            // Filter out pages the user doesn't have access to
                            if (!hasPageAccess(child.href)) {
                              return null
                            }
                            
                            const childActive = pathname === child.href
                            const showBadge = child.name === 'Verlof Beheer' && pendingLeaveRequests > 0
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
                                <span className="flex-1">{child.name}</span>
                                {showBadge && (
                                  <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">
                                    {pendingLeaveRequests}
                                  </span>
                                )}
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
              
              {/* Uitloggen - Mobile */}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={logout}
                  className="flex items-center px-4 py-2.5 text-sm font-medium glass-nav-item w-full"
                >
                  <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-5 w-5 text-gray-600"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.5 3.75A1.5 1.5 0 006 5.25v13.5a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V15a.75.75 0 011.5 0v3.75a3 3 0 01-3 3h-6a3 3 0 01-3-3V5.25a3 3 0 013-3h6a3 3 0 013 3V9A.75.75 0 0115 9V5.25a1.5 1.5 0 00-1.5-1.5h-6zm10.72 4.72a.75.75 0 011.06 0l3 3a.75.75 0 010 1.06l-3 3a.75.75 0 11-1.06-1.06l1.72-1.72H9a.75.75 0 010-1.5h10.94l-1.72-1.72a.75.75 0 010-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span>Uitloggen</span>
                </button>
              </div>
            </div>
          </nav>
        </aside>

        <main className="glass-card flex-1 overflow-auto rounded-2xl p-6">{children}</main>
      </div>
    </div>
    </AdminAuthGate>
  )
}
