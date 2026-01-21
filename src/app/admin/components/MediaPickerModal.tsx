'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { apiFetch } from '@/lib/api'

interface MediaItem {
  name: string
  url: string
  size?: number
  updatedAt?: string
}

type MediaCategory = 'products' | 'uploads' | 'profile' | 'wallpapers'

export default function MediaPickerModal({
  isOpen,
  onClose,
  onSelect,
  allowUpload = true,
  title = 'Kies uit Media',
  category
}: {
  isOpen: boolean
  onClose: () => void
  onSelect: (url: string) => void
  allowUpload?: boolean
  title?: string
  category: MediaCategory
}) {
  const [files, setFiles] = useState<MediaItem[]>([])
  const [filtered, setFiltered] = useState<MediaItem[]>([])
  const [query, setQuery] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      setError(null)
      const res = await apiFetch(`/api/media/list?category=${category}`)
      const data = await res.json()
      if (res.ok && Array.isArray(data.files)) {
        setFiles(data.files)
        setFiltered(data.files)
      } else {
        throw new Error(data.error || 'Failed to load media')
      }
    } catch (e: any) {
      setError(e.message)
    }
  }

  useEffect(() => {
    if (isOpen) load()
  }, [isOpen, category])

  useEffect(() => {
    if (!query) return setFiltered(files)
    const q = query.toLowerCase()
    setFiltered(files.filter((f) => f.name.toLowerCase().includes(q)))
  }, [query, files])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('category', category)
      const res = await apiFetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (res.ok) {
        await load()
      } else {
        throw new Error(data.error || 'Upload mislukt')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="Sluiten" className="text-slate-500 hover:text-slate-700">
            ×
          </button>
        </div>

        <div className="p-4 space-y-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Zoeken op bestandsnaam…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            {allowUpload && (
              <label className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-slate-900 text-white rounded-md cursor-pointer hover:bg-slate-800">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
                {uploading ? 'Uploaden…' : 'Uploaden'}
              </label>
            )}
          </div>
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filtered.map((f) => {
              const isPDF = f.name.toLowerCase().endsWith('.pdf')
              return (
                <button
                  key={f.url}
                  className="border rounded p-2 hover:shadow focus:outline-none focus:ring-2 focus:ring-slate-900 text-left"
                  onClick={() => {
                    onSelect(f.url)
                    onClose()
                  }}
                >
                  {isPDF ? (
                    <div className="w-full h-28 bg-slate-100 flex items-center justify-center rounded">
                      <div className="text-center">
                        <div className="text-xs text-slate-600 mt-1">PDF</div>
                      </div>
                    </div>
                  ) : (
                    <Image
                      src={f.url}
                      alt={f.name}
                      width={200}
                      height={112}
                      className="w-full h-28 object-cover rounded"
                      loading="lazy"
                    />
                  )}
                  <div className="mt-2 text-xs break-all">{f.name}</div>
                </button>
              )
            })}
            {filtered.length === 0 && (
              <div className="text-sm text-slate-500 col-span-full">Geen bestanden gevonden</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
