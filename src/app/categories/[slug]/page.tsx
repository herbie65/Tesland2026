import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PrismaClient } from '@prisma/client'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'

const prisma = new PrismaClient()

interface Props {
  params: { slug: string }
}

async function getCategory(slug: string) {
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      parent: true,
      children: {
        where: { isActive: true },
        orderBy: { position: 'asc' },
      },
      productCategories: {
        include: {
          product: {
            include: {
              images: {
                where: { isMain: true },
                take: 1,
              },
              inventory: true,
            },
          },
        },
        take: 50,
      },
    },
  })

  return category
}

export default async function CategoryPage({ params }: Props) {
  const category = await getCategory(params.slug)

  if (!category) {
    notFound()
  }

  const products = category.productCategories
    .map(pc => pc.product)
    .filter(p => p.status === 'enabled')

  return (
    <div className="public-site min-h-screen bg-[#111]">
      <SiteHeader />
      
      <main className="min-h-screen bg-slate-50 text-slate-900">
        {/* Breadcrumbs */}
        <div className="bg-white border-b border-slate-200">
          <div className="mx-auto max-w-6xl px-6 py-3">
            <div className="flex items-center space-x-2 text-sm text-slate-600">
              <Link href="/" className="hover:text-green-600">
                Home
              </Link>
              <span>/</span>
              {category.parent && (
                <>
                  <Link href={`/categories/${category.parent.slug}`} className="hover:text-green-600">
                    {category.parent.name}
                  </Link>
                  <span>/</span>
                </>
              )}
              <span className="text-slate-900 font-medium">{category.name}</span>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-6 py-8">
          {/* Category Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {category.name}
            </h1>
            {category.description && (
              <p className="text-slate-600">{category.description}</p>
            )}
          </div>

          {/* Subcategories */}
          {category.children.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Subcategorieën
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {category.children.map(child => (
                  <Link
                    key={child.id}
                    href={`/categories/${child.slug}`}
                    className="bg-white p-4 rounded-lg border border-slate-200 hover:border-green-500 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <span className="font-medium text-slate-900">{child.name}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Products */}
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Producten ({products.length})
            </h2>

            {products.length === 0 ? (
              <div className="bg-white p-8 rounded-lg text-center text-slate-600">
                Geen producten beschikbaar in deze categorie
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map(product => (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug}`}
                    className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {/* Product Image */}
                    <div className="aspect-square bg-slate-100 relative">
                      {product.images[0]?.filePath ? (
                        <img
                          src={`/media/products${product.images[0].filePath}`}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      {product.inventory && !product.inventory.isInStock && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                          Uitverkocht
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <h3 className="font-medium text-slate-900 mb-2 line-clamp-2">
                        {product.name}
                      </h3>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          {product.specialPrice ? (
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-green-600">
                                €{Number(product.specialPrice).toFixed(2)}
                              </span>
                              <span className="text-sm text-slate-500 line-through">
                                €{Number(product.price).toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-lg font-bold text-slate-900">
                              €{Number(product.price).toFixed(2)}
                            </span>
                          )}
                        </div>
                        
                        {product.inventory && (
                          <span className={`text-xs px-2 py-1 rounded ${
                            product.inventory.isInStock
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {product.inventory.isInStock ? 'Op voorraad' : 'Uitverkocht'}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
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
