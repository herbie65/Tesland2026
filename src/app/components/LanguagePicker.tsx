'use client'

import { useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

type LocaleOption = {
  code: 'nl' | 'en' | 'de' | 'fr'
  label: string
  shortLabel: string
  flag: string
}

const localeOptions: LocaleOption[] = [
  { code: 'nl', label: 'Nederlands', shortLabel: 'NL', flag: '🇳🇱' },
  { code: 'en', label: 'English', shortLabel: 'EN', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', shortLabel: 'DE', flag: '🇩🇪' },
  { code: 'fr', label: 'Français', shortLabel: 'FR', flag: '🇫🇷' }
]

const getCurrentLocale = (pathname: string) => {
  const segment = pathname.split('/').filter(Boolean)[0]
  if (segment === 'nl' || segment === 'en' || segment === 'de' || segment === 'fr') {
    return segment
  }
  return 'nl'
}

const buildLocalePath = (pathname: string, locale: string) => {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 0) {
    return `/${locale}`
  }
  if (parts[0] === 'nl' || parts[0] === 'en' || parts[0] === 'de' || parts[0] === 'fr') {
    parts[0] = locale
    return `/${parts.join('/')}`
  }
  return `/${locale}/${parts.join('/')}`
}

export default function LanguagePicker() {
  const pathname = usePathname() || '/'
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const currentLocale = useMemo(() => getCurrentLocale(pathname), [pathname])

  const currentOption = localeOptions.find((item) => item.code === currentLocale)
  const currentLabel = currentOption?.shortLabel || 'NL'
  const currentFlag = currentOption?.flag || '🇳🇱'

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-[0_0_12px_rgba(139,195,66,0.35)] transition-all hover:border-white/40 hover:bg-white/10"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="text-base">{currentFlag}</span>
        {currentLabel}
        <span className="text-[10px] text-[#8bc342]">▾</span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-36 max-h-56 overflow-auto rounded-2xl border border-white/10 bg-[#111]/95 p-2 text-xs text-white shadow-[0_12px_32px_rgba(0,0,0,0.45)] backdrop-blur"
        >
          {localeOptions.map((item) => (
            <button
              key={item.code}
              type="button"
              role="menuitem"
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-semibold transition-all hover:bg-white/5 ${
                item.code === currentLocale ? 'text-[#8bc342]' : 'text-white'
              }`}
              onClick={() => {
                setOpen(false)
                document.cookie = `tesland_locale=${item.code}; path=/; max-age=31536000`
                const target = buildLocalePath(pathname, item.code)
                router.push(target)
              }}
            >
              <span className="flex items-center gap-2">
                <span className="text-base">{item.flag}</span>
                {item.label}
              </span>
              {item.code === currentLocale ? <span className="text-[#8bc342]">•</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
