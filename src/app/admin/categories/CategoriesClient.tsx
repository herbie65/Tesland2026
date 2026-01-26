'use client'

import { useState, useEffect } from 'react'
import { FolderIcon } from '@heroicons/react/24/outline'

interface Category {
  id: string
  magentoId: number
  name: string
  slug: string
  description: string | null
  isActive: boolean
  position: number
  level: number
  path: string | null
  parentId: string | null
  parent?: {
    name: string
  }
  _count?: {
    children: number
    productCategories: number
  }
}

export default function CategoriesClient() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [viewMode, setViewMode] = useState<'flat' | 'tree'>('flat')

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/categories')
      const data = await response.json()
      setCategories(data.categories || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(filter.toLowerCase()) ||
    cat.slug.toLowerCase().includes(filter.toLowerCase())
  )

  // Build tree structure
  const buildTree = (items: Category[]): Category[] => {
    const map = new Map<string, Category & { children: Category[] }>()
    const roots: (Category & { children: Category[] })[] = []

    // Create map
    items.forEach(item => {
      map.set(item.id, { ...item, children: [] })
    })

    // Build tree
    items.forEach(item => {
      const node = map.get(item.id)!
      if (item.parentId && map.has(item.parentId)) {
        map.get(item.parentId)!.children.push(node)
      } else {
        roots.push(node)
      }
    })

    return roots
  }

  const renderTree = (items: (Category & { children?: Category[] })[], depth = 0) => {
    return items.map(cat => (
      <div key={cat.id}>
        <div
          className={`flex items-center justify-between p-4 border-b hover:bg-slate-50`}
          style={{ paddingLeft: `${depth * 2 + 1}rem` }}
        >
          <div className="flex items-center gap-3 flex-1">
            <FolderIcon className="h-5 w-5 text-slate-400" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900">{cat.name}</span>
                <span className="text-xs text-slate-500">
                  (Level {cat.level})
                </span>
                {!cat.isActive && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                    Inactief
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-600 mt-1">
                <span className="font-mono text-xs">{cat.slug}</span>
                {cat._count && (
                  <span className="ml-3">
                    {cat._count.children} subcategorieën • {cat._count.productCategories} producten
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/categories/${cat.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
              title="Bekijk op website"
            >
              <span className="text-xs font-mono">{cat.slug}</span>
            </a>
          </div>
        </div>
        {cat.children && cat.children.length > 0 && renderTree(cat.children, depth + 1)}
      </div>
    ))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Categorieën laden...</div>
      </div>
    )
  }

  const tree = viewMode === 'tree' ? buildTree(filteredCategories) : filteredCategories

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Zoek categorieën..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('flat')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              viewMode === 'flat'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-300'
            }`}
          >
            Lijst
          </button>
          <button
            onClick={() => setViewMode('tree')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              viewMode === 'tree'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-300'
            }`}
          >
            Boom
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-sm text-slate-600">Totaal Categorieën</div>
          <div className="text-2xl font-semibold text-slate-900 mt-1">
            {categories.length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-sm text-slate-600">Actief</div>
          <div className="text-2xl font-semibold text-green-600 mt-1">
            {categories.filter(c => c.isActive).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-sm text-slate-600">Inactief</div>
          <div className="text-2xl font-semibold text-red-600 mt-1">
            {categories.filter(c => !c.isActive).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="text-sm text-slate-600">Root Categorieën</div>
          <div className="text-2xl font-semibold text-blue-600 mt-1">
            {categories.filter(c => !c.parentId).length}
          </div>
        </div>
      </div>

      {/* Categories List/Tree */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {filteredCategories.length === 0 ? (
          <div className="p-8 text-center text-slate-600">
            {filter ? 'Geen categorieën gevonden' : 'Geen categorieën beschikbaar'}
          </div>
        ) : viewMode === 'tree' ? (
          <div>{renderTree(tree as any)}</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredCategories
              .sort((a, b) => {
                if (a.level !== b.level) return a.level - b.level
                return a.position - b.position
              })
              .map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <FolderIcon className="h-5 w-5 text-slate-400" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{cat.name}</span>
                        <span className="text-xs text-slate-500">
                          (Level {cat.level})
                        </span>
                        {!cat.isActive && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                            Inactief
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-600 mt-1">
                        <span className="font-mono text-xs">{cat.slug}</span>
                        {cat.parent && (
                          <span className="ml-3 text-slate-500">
                            Parent: {cat.parent.name}
                          </span>
                        )}
                        {cat._count && (
                          <span className="ml-3">
                            {cat._count.children} subcategorieën • {cat._count.productCategories} producten
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`/categories/${cat.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Bekijk op website"
                    >
                      Bekijk →
                    </a>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
