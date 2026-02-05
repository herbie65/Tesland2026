'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { fetchCart, updateCartItems } from '@/lib/shop-cart'

type CatalogProduct = {
  id: string
  sku: string
  name: string
  slug: string
  displayPrice: unknown
  mainImage: string | null
  inventory: { isInStock: boolean } | null
}

export default function ShopClient({ locale }: { locale: string }) {
  const localePrefix = locale ? `/${locale}` : ''
  const [q, setQ] = useState('')
  const [items, setItems] = useState<CatalogProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cartMap, setCartMap] = useState<Record<string, number>>({})
  const [toast, setToast] = useState<string | null>(null)
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success')

  const load = async (query: string) => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (query.trim()) params.set('q', query.trim())
      params.set('limit', '24')
      const res = await fetch(`/api/catalog/products?${params.toString()}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Kan producten niet laden')
      }
      setItems(data.items || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load('')
  }, [])

  useEffect(() => {
    let alive = true
    const loadCart = async () => {
      try {
        const data = await fetchCart()
        if (!alive) return
        const map: Record<string, number> = {}
        for (const it of data.items || []) {
          map[it.productId] = Number(it.quantity) || 0
        }
        setCartMap(map)
      } catch {
        // ignore
      }
    }
    loadCart()
    return () => {
      alive = false
    }
  }, [])

  const filtered = useMemo(() => items, [items])

  return (
    <div className="space-y-6">
      {toast ? (
        <div
          className={`fixed right-6 top-6 z-50 rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg ${
            toastVariant === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
          role="status"
        >
          {toast}
        </div>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-semibold text-slate-900">Shop</h1>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            load(q)
          }}
        >
          <input
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            placeholder="Zoek op naam of SKU…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="submit">
            Zoeken
          </button>
        </form>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-600">Laden…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-600">Geen producten gevonden.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const price = Number(p.displayPrice || 0)
            const canBuy = p.inventory ? p.inventory.isInStock : true
            return (
              <div key={p.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <Link href={`${localePrefix}/products/${p.slug}`} className="block">
                  <div className="aspect-[4/3] bg-slate-100">
                    {p.mainImage ? (
                      <img src={p.mainImage} alt={p.name} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-slate-500">{p.sku}</p>
                    <h3 className="mt-1 line-clamp-2 text-base font-semibold text-slate-900">{p.name}</h3>
                    <p className="mt-2 text-lg font-bold text-slate-900">€{price.toFixed(2)}</p>
                  </div>
                </Link>
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 p-4">
                  <button
                    type="button"
                    className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!canBuy}
                    onClick={async () => {
                      const nextQty = (cartMap[p.id] || 0) + 1
                      setCartMap((prev) => ({ ...prev, [p.id]: nextQty }))
                      try {
                        await updateCartItems([{ productId: p.id, quantity: nextQty }])
                        setToastVariant('success')
                        setToast('Toegevoegd aan winkelwagen')
                      } catch (e: unknown) {
                        setCartMap((prev) => ({ ...prev, [p.id]: Math.max(0, nextQty - 1) }))
                        setToastVariant('error')
                        setToast(e instanceof Error ? e.message : 'Kon niet toevoegen aan winkelwagen')
                      } finally {
                        window.setTimeout(() => setToast(null), 2000)
                      }
                    }}
                  >
                    In winkelwagen
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

