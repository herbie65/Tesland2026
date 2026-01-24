'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/useAuth'

export default function BootstrapPage() {
  const { user, loading } = useAuth()
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const handleBootstrap = async () => {
    try {
      setStatus('Creating admin...')
      setError('')
      
      const token = await user?.getIdToken()
      if (!token) {
        setError('Not logged in')
        return
      }

      const res = await fetch('/api/auth/bootstrap', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      const data = await res.json()
      
      if (data.success) {
        setStatus('✅ Success! You are now SYSTEM_ADMIN. Refresh the page.')
        setTimeout(() => window.location.reload(), 2000)
      } else {
        setError(data.error || 'Failed')
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (loading) return <div className="p-8">Loading...</div>
  if (!user) return <div className="p-8">Please log in first</div>

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Admin Bootstrap</h1>
        
        <div className="mb-4 p-4 bg-blue-50 rounded">
          <p className="text-sm text-blue-800">
            Logged in as: <strong>{user.email}</strong>
          </p>
        </div>

        <button
          onClick={handleBootstrap}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
        >
          Maak mij SYSTEM_ADMIN
        </button>

        {status && (
          <div className="mt-4 p-4 bg-green-50 text-green-800 rounded">
            {status}
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-800 rounded">
            {error}
          </div>
        )}

        <div className="mt-6 text-sm text-gray-600">
          <p><strong>Note:</strong> This only works if no admin exists yet.</p>
        </div>
      </div>
    </div>
  )
}
