'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    
    if (!token) {
      router.replace('/login')
      return
    }

    // Verify token by checking /api/auth/me
    fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        // Allow all authenticated staff accounts; only block webshop customer accounts.
        const isSystemAdmin = data?.user?.isSystemAdmin === true
        const roleRaw = (data?.user?.roleName || data?.user?.role || '') as string
        const role = String(roleRaw).toLowerCase().trim()
        const isCustomer = role === 'customer' || role === 'klant' || Boolean(data?.user?.customerId)
        const isAllowed = isSystemAdmin || !isCustomer

        if (isAllowed) {
          setIsAuthenticated(true)
          return
        }

        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.replace('/login')
      } else {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.replace('/login')
      }
    })
    .catch(() => {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.replace('/login')
    })
    .finally(() => {
      setIsLoading(false)
    })
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Router.push will redirect
  }

  return <>{children}</>
}
