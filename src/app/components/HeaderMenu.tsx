 'use client'

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'

type HeaderItem = {
  label: string
  href: string
  hasDropdown?: boolean
}

type SupportedLocale = 'nl' | 'en' | 'de' | 'fr'

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

  return (
    <>
      {items.map((item) => (
        <a
          key={`${item.label}-${item.href}`}
          className="nav-link flex items-center gap-1"
          href={item.href}
        >
          {translateLabel(item.label, locale)}
          {item.hasDropdown ? <span className="accent-text">▾</span> : null}
        </a>
      ))}
    </>
  )
}
