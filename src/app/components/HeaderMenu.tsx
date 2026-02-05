'use client'

import { useMemo, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

type HeaderItem = {
  label: string
  href: string
  hasDropdown?: boolean
  children?: HeaderItem[]
}

type SupportedLocale = 'nl' | 'en' | 'de' | 'fr'

type Category = {
  id: string
  magentoId?: number | null
  name: string
  slug: string
  level: number
  parentId: string | null
  position?: number
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
  const [flatCategories, setFlatCategories] = useState<Category[]>([])
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [hoveredOnderhoudModel, setHoveredOnderhoudModel] = useState<number | null>(null)
  const [hoveredCatalogChildId, setHoveredCatalogChildId] = useState<string | null>(null)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/catalog/categories')
      const data = await response.json()
      
      if (data.success) {
        const list = (data.categories || data.items || data) as Category[]
        setFlatCategories(Array.isArray(list) ? list : [])
        const tree = buildCategoryTree(Array.isArray(list) ? list : [])
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
      
      if (cat.parentId && map.has(cat.parentId)) {
        const parent = map.get(cat.parentId)!
        parent.children.push(node)
      }
    })

    // Determine "Default Category" root (Magento id 2) and use its children as roots
    const defaultCategory = categories.find(
      (cat) => cat.magentoId === 2 || normalize(cat.name) === 'default category'
    )

    categories.forEach((cat) => {
      const node = map.get(cat.id)!
      const isRoot =
        defaultCategory?.id
          ? cat.parentId === defaultCategory.id
          : !cat.parentId || cat.parentId === '2'
      if (isRoot) roots.push(node)
    })

    // Sort children by position then name for stable menus
    const sortNode = (node: Category & { children: Category[] }) => {
      node.children.sort((a, b) => {
        const ap = typeof a.position === 'number' ? a.position : 0
        const bp = typeof b.position === 'number' ? b.position : 0
        if (ap !== bp) return ap - bp
        return a.name.localeCompare(b.name)
      })
      node.children.forEach((child) => sortNode(child as any))
    }
    roots.forEach((r) => sortNode(r))

    return roots
  }

  const [hoveredModel, setHoveredModel] = useState<string | null>(null)

  const resolveHref = (rawHref: string) => {
    if (!rawHref) return '/'
    if (
      rawHref.startsWith('http://') ||
      rawHref.startsWith('https://') ||
      rawHref.startsWith('mailto:') ||
      rawHref.startsWith('tel:') ||
      rawHref.startsWith('#')
    ) {
      return rawHref
    }

    const match = rawHref.match(/^([^?#]+)(.*)$/)
    const base = match?.[1] || rawHref
    const suffix = match?.[2] || ''

    if (base === '/onderhoud') {
      const localized =
        locale === 'en'
          ? '/en/maintenance'
          : locale === 'de'
            ? '/de/wartung'
            : locale === 'fr'
              ? '/fr/entretien'
              : '/nl/onderhoud'
      return `${localized}${suffix}`
    }

    if (base === '/planning') {
      return `/${locale}/planning${suffix}`
    }

    return rawHref
  }

  const resolveCategoryHref = (slug: string) => `/${locale}/categories/${slug}`

  const findCatalogRootByMenuLabel = (label: string) => {
    const mapping: Record<string, string> = {
      Winterwielen: 'Winterwheels',
    }
    const target = mapping[label] || label
    const targetNorm = normalize(target)
    return categories.find((cat) => normalize(cat.name) === targetNorm) || null
  }

  const transformChildLabel = (parentLabel: string, childName: string) => {
    if (parentLabel === 'Onderhoud') return childName.replace(/\s*Services\s*$/i, ' Onderhoud')
    if (parentLabel === 'Reparaties') return childName.replace(/\s*Repairs\s*$/i, ' Reparaties')
    if (parentLabel === 'Onderdelen') return childName.replace(/\s*Parts\s*$/i, ' Onderdelen')
    return childName
  }

  const renderCatalogDropdown = (item: HeaderItem) => {
    const root = findCatalogRootByMenuLabel(item.label)
    if (!root || !(root.children?.length)) return null

    const childNodes = root.children || []
    const activeChild =
      hoveredCatalogChildId ? childNodes.find((c) => c.id === hoveredCatalogChildId) : null

    return (
      <div
        key={`${item.label}-${item.href}`}
        className="relative"
        onMouseEnter={() => {
          setOpenMenu(item.label)
          setHoveredCatalogChildId(childNodes[0]?.id || null)
        }}
        onMouseLeave={() => {
          setOpenMenu(null)
          setHoveredCatalogChildId(null)
        }}
      >
        <button
          type="button"
          className="nav-link flex items-center gap-1 text-white hover:text-green-400 transition-colors"
          onClick={() => setOpenMenu((prev) => (prev === item.label ? null : item.label))}
        >
          {translateLabel(item.label, locale)}
          <span className="accent-text">▾</span>
        </button>

        {openMenu === item.label ? (
          <div className="absolute left-0 top-full w-[560px] pt-2 z-50">
            <div className="rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
              <div className="grid grid-cols-2 gap-0 p-3">
                <div className="border-r border-slate-700 pr-3">
                  <ul className="space-y-1">
                    {childNodes.map((child) => (
                      <li key={child.id} onMouseEnter={() => setHoveredCatalogChildId(child.id)}>
                        <Link
                          href={resolveCategoryHref(child.slug)}
                          className={`block rounded px-3 py-2 transition-colors ${
                            hoveredCatalogChildId === child.id
                              ? 'bg-slate-700 text-green-400'
                              : 'text-white hover:bg-slate-700 hover:text-green-400'
                          }`}
                          onClick={() => setOpenMenu(null)}
                        >
                          {transformChildLabel(item.label, child.name)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pl-3">
                  {activeChild?.children?.length ? (
                    <ul className="space-y-1">
                      {activeChild.children.map((grand) => (
                        <li key={grand.id}>
                          <Link
                            href={resolveCategoryHref(grand.slug)}
                            className="block rounded px-3 py-2 text-slate-300 hover:bg-slate-700 hover:text-green-400 transition-colors"
                            onClick={() => setOpenMenu(null)}
                          >
                            {grand.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500 text-sm px-3 py-6">
                      Kies een categorie →
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  const normalize = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

  const getOnderhoudCatalogNode = () => categories.find((cat) => normalize(cat.name) === 'onderhoud')

  const getOnderhoudModelNodes = () => {
    const onderhoud = getOnderhoudCatalogNode()
    const kids = onderhoud?.children || []
    const filtered = kids.filter((cat) => {
      const n = normalize(cat.name)
      return n.startsWith('model ') && (n.includes(' services') || n.endsWith(' services'))
    })

    const order = ['model 3 services', 'model y services', 'model s services', 'model x services']
    return filtered.sort((a, b) => order.indexOf(normalize(a.name)) - order.indexOf(normalize(b.name)))
  }

  const onderhoudLabelFromCategoryName = (categoryName: string) =>
    categoryName.replace(/\s*Services\s*$/i, ' Onderhoud')

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
    // If this menu item maps to a Magento root category with children, show a dropdown
    const dropdown = renderCatalogDropdown(item)
    if (dropdown) return dropdown

    // Regular menu item
    const catalogRoot = findCatalogRootByMenuLabel(item.label)
    const href = catalogRoot?.slug ? resolveCategoryHref(catalogRoot.slug) : resolveHref(item.href)

    return (
      <Link
        key={`${item.label}-${item.href}`}
        className="nav-link flex items-center gap-1 text-white hover:text-green-400 transition-colors"
        href={href}
      >
        {translateLabel(item.label, locale)}
        {item.hasDropdown ? <span className="accent-text">▾</span> : null}
      </Link>
    )
  }

  return (
    <>
      {items.map((item) => renderMenuItem(item))}
    </>
  )
}
