import CategoriesClient from './CategoriesClient'

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Categorieën</h1>
        <p className="text-slate-600">Beheer product categorieën uit Magento.</p>
      </header>
      <CategoriesClient />
    </div>
  )
}
