'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'
import { fetchCart, updateCartItems, type ShopCartItem } from '@/lib/shop-cart'

export default function CartPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'nl'
  const [items, setItems] = useState<ShopCartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchCart()
        if (!alive) return
        setItems(data.items || [])
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [])

  const totals = useMemo(() => {
    const subtotal = items.reduce((acc, i) => acc + Number(i.product.price || 0) * Number(i.quantity || 0), 0)
    return { subtotal }
  }, [items])

  const localePrefix = `/${locale}`

  return (
    <div className="public-site min-h-screen bg-[#111] text-slate-900">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="rounded-2xl bg-slate-50 p-6">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-semibold text-slate-900">Winkelwagen</h1>
            <Link className="text-sm font-semibold text-slate-700 hover:underline" href={`${localePrefix}/shop`}>
              Verder winkelen
            </Link>
          </div>

          {error ? (
            <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : loading ? (
            <p className="mt-6 text-sm text-slate-600">Laden…</p>
          ) : items.length === 0 ? (
            <p className="mt-6 text-sm text-slate-600">Je winkelwagen is leeg.</p>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Product</th>
                      <th className="px-4 py-3 text-left">Prijs</th>
                      <th className="px-4 py-3 text-left">Aantal</th>
                      <th className="px-4 py-3 text-left">Totaal</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((i) => {
                      const lineTotal = Number(i.product.price || 0) * Number(i.quantity || 0)
                      return (
                        <tr key={i.productId}>
                          <td className="px-4 py-3">
                            <Link
                              className="font-medium text-slate-900 hover:underline"
                              href={`${localePrefix}/products/${i.product.slug}`}
                            >
                              {i.product.name}
                            </Link>
                            <div className="text-xs text-slate-500">{i.product.sku}</div>
                          </td>
                          <td className="px-4 py-3">€{Number(i.product.price || 0).toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <input
                              className="w-20 rounded-lg border border-slate-200 px-3 py-2"
                              type="number"
                              min={1}
                              step={1}
                              value={i.quantity}
                              onChange={async (e) => {
                                const nextQty = Number(e.target.value)
                                setItems((prev) =>
                                  prev.map((x) => (x.productId === i.productId ? { ...x, quantity: nextQty } : x))
                                )
                                await updateCartItems([{ productId: i.productId, quantity: nextQty }])
                              }}
                            />
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">€{lineTotal.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                              type="button"
                              onClick={async () => {
                                setItems((prev) => prev.filter((x) => x.productId !== i.productId))
                                await updateCartItems([{ productId: i.productId, quantity: 0 }])
                              }}
                            >
                              Verwijderen
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col items-end gap-3">
                <div className="text-sm text-slate-700">
                  Subtotaal: <span className="font-semibold text-slate-900">€{totals.subtotal.toFixed(2)}</span>
                </div>
                <Link
                  className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
                  href={`${localePrefix}/checkout`}
                >
                  Naar afrekenen
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

