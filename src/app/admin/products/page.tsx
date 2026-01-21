import ProductsClient from './ProductsClient'

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Producten</h1>
        <p className="text-slate-600">Beheer het productassortiment.</p>
      </header>
      <ProductsClient />
    </div>
  )
}
