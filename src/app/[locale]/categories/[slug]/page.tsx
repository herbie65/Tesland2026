import Link from 'next/link'
import { notFound } from 'next/navigation'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'
import { prisma } from '@/lib/prisma'

export default async function CategoryPage({
  params
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  const localePrefix = `/${locale}`

  const category: any = await prisma.category.findUnique({
    where: { slug },
    include: {
      parent: true,
      children: {
        where: { isActive: true },
        orderBy: { position: 'asc' }
      },
    }
  })

  if (!category) notFound()

  // Include products from this category + all descendants (Magento assigns products to leaf categories often)
  const descendantIds: string[] = []
  if (typeof category.path === 'string' && category.path.length) {
    const descendants = await prisma.category.findMany({
      where: {
        isActive: true,
        path: { startsWith: `${category.path}/` }
      },
      select: { id: true }
    })
    descendantIds.push(...descendants.map((c) => c.id))
  }

  const categoryIds = [category.id, ...descendantIds]

  const products: any[] = await prisma.productCatalog.findMany({
    where: {
      status: 'enabled',
      categories: {
        some: {
          categoryId: { in: categoryIds }
        }
      }
    },
    include: {
      images: { where: { isMain: true }, take: 1 },
      inventory: true
    },
    take: 48,
    orderBy: { name: 'asc' }
  })

  return (
    <div className="public-site min-h-screen bg-[#111]">
      <SiteHeader />

      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="bg-white border-b border-slate-200">
          <div className="mx-auto max-w-6xl px-6 py-3">
            <div className="flex items-center space-x-2 text-sm text-slate-600">
              <Link href={localePrefix} className="hover:text-green-600">
                Home
              </Link>
              <span>/</span>
              {category.parent ? (
                <>
                  <Link href={`${localePrefix}/categories/${category.parent.slug}`} className="hover:text-green-600">
                    {category.parent.name}
                  </Link>
                  <span>/</span>
                </>
              ) : null}
              <span className="text-slate-900 font-medium">{category.name}</span>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{category.name}</h1>
            {category.description ? <p className="text-slate-600">{category.description}</p> : null}
          </div>

          {category.children?.length ? (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Subcategorieën</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {category.children.map((child: any) => (
                  <Link
                    key={child.id}
                    href={`${localePrefix}/categories/${child.slug}`}
                    className="bg-white p-4 rounded-lg border border-slate-200 hover:border-green-500 hover:shadow-md transition-all"
                  >
                    <span className="font-medium text-slate-900">{child.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Producten ({products.length})</h2>
            {products.length === 0 ? (
              <div className="bg-white p-8 rounded-lg text-center text-slate-600">
                Geen producten beschikbaar in deze categorie
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product: any) => (
                  (() => {
                    const effectiveInStock = product.inventory
                      ? (product.inventory.manageStock === false ? true : Boolean(product.inventory.isInStock))
                      : true
                    return (
                  <Link
                    key={product.id}
                    href={`${localePrefix}/products/${product.slug}`}
                    className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="aspect-square bg-slate-100 relative">
                      {product.images?.[0]?.localPath || product.images?.[0]?.url ? (
                        <img
                          src={(product.images?.[0]?.localPath || product.images?.[0]?.url) as string}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <span className="text-xs">Geen afbeelding</span>
                        </div>
                      )}
                      {product.inventory && !effectiveInStock ? (
                        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                          Uitverkocht
                        </div>
                      ) : null}
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-slate-900 mb-2 line-clamp-2">{product.name}</h3>
                      <span className="text-lg font-bold text-slate-900">
                        €{Number(product.specialPrice || product.price || 0).toFixed(2)}
                      </span>
                    </div>
                  </Link>
                    )
                  })()
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}

