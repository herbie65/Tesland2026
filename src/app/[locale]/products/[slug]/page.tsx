import { notFound } from 'next/navigation'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'
import { prisma } from '@/lib/prisma'
import ProductClient from './ProductClient'

export default async function ProductPage({
  params
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { slug } = await params

  const product: any = await prisma.productCatalog.findUnique({
    where: { slug },
    include: {
      images: {
        orderBy: [{ isMain: 'desc' }, { position: 'asc' }]
      },
      inventory: true
    }
  })

  if (!product) notFound()

  const now = new Date()
  const specialActive =
    product.specialPrice &&
    (!product.specialPriceFrom || new Date(product.specialPriceFrom) <= now) &&
    (!product.specialPriceTo || new Date(product.specialPriceTo) >= now)
  const displayPrice = specialActive ? product.specialPrice : product.price
  const mainImage = product.images?.find((img: any) => img.isMain)?.localPath ||
    product.images?.find((img: any) => img.isMain)?.url ||
    product.images?.[0]?.localPath ||
    product.images?.[0]?.url ||
    null
  const effectiveInStock = product.inventory
    ? (product.inventory.manageStock === false ? true : Boolean(product.inventory.isInStock))
    : true

  return (
    <div className="public-site min-h-screen bg-[#111] text-slate-900">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="rounded-2xl bg-slate-50 p-6">
          <ProductClient
            product={{
              id: product.id,
              sku: product.sku,
              name: product.name,
              slug: product.slug,
              displayPrice: Number(displayPrice || 0),
              isInStock: effectiveInStock,
              mainImage,
              description: product.description
            }}
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

