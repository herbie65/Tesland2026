'use client'

import { useMemo, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

type HeaderItem = {
  label: string
  href: string
  hasDropdown?: boolean
}

type SupportedLocale = 'nl' | 'en' | 'de' | 'fr'

type Category = {
  id: string
  name: string
  slug: string
  level: number
  parentId: string | null
  children?: Category[]
}

const labelTranslations: Record<string, Record<SupportedLocale, string>> = {
  Onderhoud: { nl: 'Onderhoud', en: 'Maintenance', de: 'Wartung', fr: 'Entretien' },
  Reparaties: { nl: 'Reparaties', en: 'Repairs', de: 'Reparaturen', fr: 'Reparations' },
  Accessoires: { nl: 'Accessoires', en: 'Accessories', de: 'Zubehoer', fr: 'Accessoires' },
  Onderdelen: { nl: 'Onderdelen', en: 'Parts', de: 'Teile', fr: 'Pieces' },
  Winterwielen: { nl: 'Winterwielen', en: 'Winter wheels', de: 'Winterraeder', fr: 'Roues hiver' },
  'Fan-Shop': { nl: 'Fan-Shop', en: 'Fan shop', de: 'Fan-Shop', fr: 'Boutique fan' }
}

const getLocaleFromPath = (path: string) => {
  const segment = path.split('/').filter(Boolean)[0]
  if (segment === 'nl' || segment === 'en' || segment === 'de' || segment === 'fr') {
    return segment as SupportedLocale
  }
  return 'nl'
}

const translateLabel = (label: string, locale: SupportedLocale) => {
  const entry = labelTranslations[label]
  if (!entry) return label
  return entry[locale] || label
}

export default function HeaderMenu({ items }: { items: HeaderItem[] }) {
  const pathname = usePathname() || '/'
  const locale = useMemo(() => getLocaleFromPath(pathname), [pathname])
  const [categories, setCategories] = useState<Category[]>([])
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/categories')
      const data = await response.json()
      
      if (data.success) {
        const tree = buildCategoryTree(data.categories)
        setCategories(tree)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const buildCategoryTree = (categories: Category[]): Category[] => {
    const map = new Map<string, Category & { children: Category[] }>()
    const roots: (Category & { children: Category[] })[] = []

    // Create map with all categories
    categories.forEach(cat => {
      map.set(cat.id, { ...cat, children: [] })
    })

    // Build tree structure
    categories.forEach(cat => {
      const node = map.get(cat.id)!
      
      // Only add to roots if it's a top-level category
      if (!cat.parentId || cat.parentId === '2') {
        roots.push(node)
      } else if (cat.parentId && map.has(cat.parentId)) {
        // Add as child to parent
        const parent = map.get(cat.parentId)!
        parent.children.push(node)
      }
    })

    return roots
  }

  const [hoveredModel, setHoveredModel] = useState<string | null>(null)

  // Get model categories - these are at level 3, children of "Accessoires"
  const modelCategories = categories.filter(cat => {
    const name = cat.name
    // Match exact model names
    return (name === 'Model 3' || name === 'Model Y' || 
            name === 'Model S' || name === 'Model X') &&
           cat.level === 3
  }).sort((a, b) => {
    // Sort in order: 3, Y, S, X
    const order = ['Model 3', 'Model Y', 'Model S', 'Model X']
    return order.indexOf(a.name) - order.indexOf(b.name)
  })

  // Get general categories - these are children of the top level categories
  // Excluding Model-specific ones
  const generalCategories = categories.filter(cat => {
    const name = cat.name.toLowerCase()
    // Get level 4+ categories that are not under Model categories
    return !name.includes('model') && 
           cat.level >= 4 &&
           cat.level <= 5
  }).slice(0, 10)

  const renderMenuItem = (item: HeaderItem) => {
    // Check if this is the Accessoires item
    if (item.label === 'Accessoires' && item.hasDropdown) {
      return (
        <div
          key={`${item.label}-${item.href}`}
          className="relative"
          onMouseEnter={() => setOpenMenu('accessoires')}
          onMouseLeave={() => {
            setOpenMenu(null)
            setHoveredModel(null)
          }}
        >
          <button className="nav-link flex items-center gap-1 text-white hover:text-green-400 transition-colors">
            {translateLabel(item.label, locale)}
            <span className="accent-text">▾</span>
          </button>

          {/* Mega Menu */}
          {openMenu === 'accessoires' && (
            <div className="absolute left-0 top-full mt-2 w-screen max-w-5xl bg-slate-800 shadow-xl rounded-b-lg z-50 border border-slate-700">
              <div className="grid grid-cols-3 gap-0 p-6">
                {/* Column 1: Model Categories */}
                <div className="pr-6 border-r border-slate-700">
                  <ul className="space-y-1">
                    {modelCategories.map(cat => (
                      <li 
                        key={cat.id}
                        onMouseEnter={() => setHoveredModel(cat.id)}
                        onMouseLeave={() => setHoveredModel(null)}
                      >
                        <div className={`flex items-center justify-between px-3 py-2 rounded transition-colors ${
                          hoveredModel === cat.id ? 'bg-slate-700 text-green-400' : 'text-white hover:text-green-400'
                        }`}>
                          <span className="font-medium">{cat.name}</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Column 2: Subcategories (shown on model hover) */}
                <div className="px-6 border-r border-slate-700">
                  {hoveredModel && modelCategories.find(cat => cat.id === hoveredModel) && (
                    <ul className="space-y-1">
                      {modelCategories
                        .find(cat => cat.id === hoveredModel)
                        ?.children?.map(child => (
                          <li key={child.id}>
                            <Link
                              href={`/categories/${child.slug}`}
                              className="flex items-center justify-between px-3 py-2 rounded text-slate-300 hover:bg-slate-700 hover:text-green-400 transition-colors"
                            >
                              <span>{child.name}</span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          </li>
                        ))}
                    </ul>
                  )}
                  {!hoveredModel && (
                    <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                      Hover over een model →
                    </div>
                  )}
                </div>

                {/* Column 3: General Categories */}
                <div className="pl-6">
                  <ul className="space-y-1">
                    {generalCategories.map(cat => (
                      <li key={cat.id}>
                        <Link
                          href={`/categories/${cat.slug}`}
                          className="block px-3 py-2 rounded text-slate-300 hover:bg-slate-700 hover:text-green-400 transition-colors"
                        >
                          {cat.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )
    }

    // Regular menu item
    return (
      <a
        key={`${item.label}-${item.href}`}
        className="nav-link flex items-center gap-1 text-white hover:text-green-400 transition-colors"
        href={item.href}
      >
        {translateLabel(item.label, locale)}
        {item.hasDropdown ? <span className="accent-text">▾</span> : null}
      </a>
    )
  }

  return (
    <>
      {items.map((item) => renderMenuItem(item))}
    </>
  )
}
