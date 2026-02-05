'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchCart, updateCartItems } from '@/lib/shop-cart'

type Props = {
  product: {
    id: string
    sku: string
    name: string
    slug: string
    displayPrice: number
    isInStock: boolean
    mainImage: string | null
    description?: string | null
  }
}

export default function ProductClient({ product }: Props) {
  const [qty, setQty] = useState(1)
  const [existingQty, setExistingQty] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success')
  const [busy, setBusy] = useState(false)
  const canBuy = product.isInStock
  const price = useMemo(() => Number(product.displayPrice || 0), [product.displayPrice])

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const data = await fetchCart()
        if (!alive) return
        const found = (data.items || []).find((i) => i.productId === product.id)
        setExistingQty(found ? Number(found.quantity) || 0 : 0)
      } catch {
        // ignore
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [product.id])

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
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
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="aspect-square bg-white">
          {product.mainImage ? (
            <img
              src={product.mainImage}
              alt={product.name}
              className="h-full w-full object-contain"
            />
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm text-slate-500">{product.sku}</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">{product.name}</h1>
        </div>

        <p className="text-2xl font-bold text-slate-900">€{price.toFixed(2)}</p>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">
            Aantal
            <input
              className="ml-2 w-20 rounded-lg border border-slate-200 px-3 py-2"
              type="number"
              min={1}
              step={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value || 1))))}
            />
          </label>
          <button
            type="button"
            className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canBuy || busy}
            onClick={async () => {
              const nextQty = existingQty + qty
              setBusy(true)
              setExistingQty(nextQty)
              try {
                await updateCartItems([{ productId: product.id, quantity: nextQty }])
                setToastVariant('success')
                setToast('Toegevoegd aan winkelwagen')
              } catch (e: unknown) {
                setExistingQty(existingQty)
                setToastVariant('error')
                setToast(e instanceof Error ? e.message : 'Kon niet toevoegen aan winkelwagen')
              } finally {
                setBusy(false)
                window.setTimeout(() => setToast(null), 2000)
              }
            }}
          >
            {busy ? 'Toevoegen…' : 'In winkelwagen'}
          </button>
        </div>

        {!canBuy ? (
          <p className="text-sm text-red-600">Dit product is momenteel niet op voorraad.</p>
        ) : null}

        {product.description ? (
          <div className="prose prose-slate max-w-none">
            <div className="whitespace-pre-line">{product.description}</div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

