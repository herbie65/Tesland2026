/**
 * Example: Product List Component
 * 
 * Shows how to use the imported Magento products in your frontend
 * Place in: tesland-core/src/components/ProductList.tsx
 */

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  shortDescription: string;
  price: number;
  specialPrice?: number;
  displayPrice: number;
  hasActiveSpecialPrice: boolean;
  image: string | null;
  inventory: {
    qty: number;
    isInStock: boolean;
  } | null;
}

interface ProductListProps {
  categorySlug: string;
}

export default function ProductList({ categorySlug }: ProductListProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchProducts();
  }, [categorySlug, page]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:3001/api/catalog/categories/${categorySlug}?page=${page}&pageSize=20`
      );
      const data = await response.json();

      setProducts(data.products);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 aspect-square rounded-lg mb-4"></div>
            <div className="bg-gray-200 h-4 rounded mb-2"></div>
            <div className="bg-gray-200 h-4 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.slug}`}
            className="group"
          >
            <div className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
              {/* Product Image */}
              <div className="relative aspect-square bg-gray-100">
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    No Image
                  </div>
                )}

                {/* Special Price Badge */}
                {product.hasActiveSpecialPrice && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-sm font-bold">
                    SALE
                  </div>
                )}

                {/* Out of Stock Badge */}
                {product.inventory && !product.inventory.isInStock && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      Niet op voorraad
                    </span>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2 group-hover:text-blue-600 transition-colors">
                  {product.name}
                </h3>

                {product.shortDescription && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {product.shortDescription}
                  </p>
                )}

                {/* Price */}
                <div className="flex items-center gap-2">
                  {product.hasActiveSpecialPrice && product.price ? (
                    <>
                      <span className="text-red-600 font-bold text-xl">
                        €{product.displayPrice?.toFixed(2)}
                      </span>
                      <span className="text-gray-400 line-through text-sm">
                        €{product.price.toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span className="font-bold text-xl">
                      €{product.displayPrice?.toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Stock Info */}
                {product.inventory && (
                  <div className="mt-2 text-sm">
                    {product.inventory.isInStock ? (
                      <span className="text-green-600">
                        ✓ Op voorraad ({product.inventory.qty})
                      </span>
                    ) : (
                      <span className="text-red-600">
                        ✗ Niet op voorraad
                      </span>
                    )}
                  </div>
                )}

                {/* SKU */}
                <div className="mt-2 text-xs text-gray-500">
                  SKU: {product.sku}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Vorige
          </button>

          <div className="flex items-center gap-2">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => setPage(i + 1)}
                className={`px-4 py-2 border rounded ${
                  page === i + 1
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-50'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Volgende
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Example: Product Detail Component
 * 
 * Shows a single product with all details
 * Place in: tesland-core/src/components/ProductDetail.tsx
 */

interface ProductDetailProps {
  productSlug: string;
}

export function ProductDetail({ productSlug }: ProductDetailProps) {
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchProduct();
  }, [productSlug]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:3001/api/catalog/products/${productSlug}`
      );
      const data = await response.json();
      setProduct(data);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !product) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Images */}
        <div>
          {/* Main Image */}
          <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
            {product.images[selectedImage] ? (
              <Image
                src={product.images[selectedImage].url}
                alt={product.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                No Image
              </div>
            )}
          </div>

          {/* Thumbnail Gallery */}
          {product.images.length > 1 && (
            <div className="grid grid-cols-6 gap-2">
              {product.images.map((image: any, index: number) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImage(index)}
                  className={`relative aspect-square rounded border-2 overflow-hidden ${
                    selectedImage === index
                      ? 'border-blue-600'
                      : 'border-gray-200'
                  }`}
                >
                  <Image
                    src={image.url}
                    alt={`${product.name} ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>

          {/* Price */}
          <div className="mb-6">
            {product.hasActiveSpecialPrice ? (
              <div className="flex items-center gap-3">
                <span className="text-4xl font-bold text-red-600">
                  €{product.displayPrice.toFixed(2)}
                </span>
                <span className="text-2xl text-gray-400 line-through">
                  €{product.price.toFixed(2)}
                </span>
                <span className="bg-red-500 text-white px-2 py-1 rounded text-sm font-bold">
                  {Math.round(((product.price - product.displayPrice) / product.price) * 100)}% OFF
                </span>
              </div>
            ) : (
              <span className="text-4xl font-bold">
                €{product.displayPrice.toFixed(2)}
              </span>
            )}
          </div>

          {/* Stock */}
          {product.inventory && (
            <div className="mb-6">
              {product.inventory.isInStock ? (
                <div className="flex items-center gap-2 text-green-600">
                  <span className="text-lg font-semibold">✓ Op voorraad</span>
                  <span className="text-sm">({product.inventory.qty} beschikbaar)</span>
                </div>
              ) : (
                <div className="text-red-600 text-lg font-semibold">
                  ✗ Niet op voorraad
                </div>
              )}
            </div>
          )}

          {/* Short Description */}
          {product.shortDescription && (
            <div
              className="mb-6 text-gray-700"
              dangerouslySetInnerHTML={{ __html: product.shortDescription }}
            />
          )}

          {/* Custom Options (Inbouwkosten) */}
          {product.customOptions.length > 0 && (
            <div className="mb-6 border-t pt-6">
              <h3 className="font-semibold text-lg mb-4">Extra Opties</h3>
              {product.customOptions.map((option: any) => (
                <div key={option.id} className="mb-4">
                  <label className="block font-medium mb-2">
                    {option.title}
                    {option.isRequired && <span className="text-red-600">*</span>}
                  </label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    onChange={(e) => setSelectedOptions({
                      ...selectedOptions,
                      [option.id]: e.target.value
                    })}
                  >
                    <option value="">-- Selecteer --</option>
                    {option.values.map((value: any) => (
                      <option key={value.id} value={value.id}>
                        {value.title} 
                        {value.price > 0 && ` (+€${value.price.toFixed(2)})`}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          {/* Add to Cart */}
          <button
            className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            disabled={!product.inventory?.isInStock}
          >
            {product.inventory?.isInStock ? 'Toevoegen aan winkelwagen' : 'Niet beschikbaar'}
          </button>

          {/* Categories */}
          {product.categories.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <span className="text-gray-600">Categorieën: </span>
              {product.categories.map((cat: any, index: number) => (
                <span key={cat.id}>
                  <Link href={`/categories/${cat.slug}`} className="text-blue-600 hover:underline">
                    {cat.name}
                  </Link>
                  {index < product.categories.length - 1 && ', '}
                </span>
              ))}
            </div>
          )}

          {/* SKU */}
          <div className="mt-4 text-sm text-gray-500">
            SKU: {product.sku}
          </div>
        </div>
      </div>

      {/* Full Description */}
      {product.description && (
        <div className="mt-12 border-t pt-8">
          <h2 className="text-2xl font-bold mb-4">Productbeschrijving</h2>
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Example: Category Page
 * 
 * Place in: tesland-core/src/app/categories/[slug]/page.tsx
 */

export default function CategoryPage({ params }: { params: { slug: string } }) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Producten</h1>
      <ProductList categorySlug={params.slug} />
    </div>
  );
}

/**
 * Example: Product Page
 * 
 * Place in: tesland-core/src/app/products/[slug]/page.tsx
 */

export default function ProductPage({ params }: { params: { slug: string } }) {
  return <ProductDetail productSlug={params.slug} />;
}
