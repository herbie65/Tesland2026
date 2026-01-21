'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ClockIcon, EnvelopeIcon, MapPinIcon, PhoneIcon } from '@heroicons/react/24/outline'

const OPEN_TIME_MINUTES = 8 * 60 + 30
const CLOSE_TIME_MINUTES = 17 * 60

type SupportedLocale = 'nl' | 'en' | 'de' | 'fr'

const footerText: Record<
  SupportedLocale,
  {
    companyInfo: string
    account: string
    loginRequired: string
    myAccount: string
    wishlist: string
    orders: string
    about: string
    jobs: string
    contact: string
    aboutLink: string
    terms: string
    privacy: string
    returns: string
    follow: string
    openingHours: string
    disclaimer: string
    openNowPrefix: string
    openNowSuffix: string
    closedNowPrefix: string
    hours: string
    minutes: string
  }
> = {
  nl: {
    companyInfo: 'Bedrijfsinfo',
    account: 'Account',
    loginRequired: '(Inloggen vereist)',
    myAccount: 'Mijn rekening',
    wishlist: 'Mijn verlanglijst',
    orders: 'Bestellingen',
    about: 'Over Ons',
    jobs: 'Vacatures',
    contact: 'Contact',
    aboutLink: 'Over Ons',
    terms: 'Algemene voorwaarden',
    privacy: 'Privacybeleid',
    returns: 'Retourneren',
    follow: 'Volg Ons',
    openingHours: '8:30 – 17:00 (Ma. – Vrij.)',
    disclaimer:
      'DISCLAIMER: Alle andere bedrijven, producten of namen waarnaar op deze website wordt verwezen, worden alleen gebruikt voor identificatiedoeleinden en zijn mogelijk handelsmerken van hun respectieve eigenaren. Er wordt niet geconcludeerd of gesuggereerd dat enig item dat door Tesland wordt verkocht, een product is dat is geautoriseerd door of op enigerlei wijze is verbonden met Tesla Inc. Tesland en zijn websitepublicaties zijn niet gelieerd aan of goedgekeurd door Tesla Inc. Tesla Model S, Tesla Model X, Tesla Model Y, Tesla Model 3 en Tesla Roadster zijn handelsmerken van Tesla Inc.',
    openNowPrefix: 'Nu open – nog ',
    openNowSuffix: 'tot sluitingstijd',
    closedNowPrefix: 'Nu gesloten – opent over ',
    hours: 'uur',
    minutes: 'min'
  },
  en: {
    companyInfo: 'Company info',
    account: 'Account',
    loginRequired: '(Login required)',
    myAccount: 'My account',
    wishlist: 'My wishlist',
    orders: 'Orders',
    about: 'About Us',
    jobs: 'Jobs',
    contact: 'Contact',
    aboutLink: 'About us',
    terms: 'Terms & conditions',
    privacy: 'Privacy policy',
    returns: 'Returns',
    follow: 'Follow us',
    openingHours: '8:30 – 17:00 (Mon – Fri)',
    disclaimer:
      'DISCLAIMER: Any other companies, products or names referenced on this website are used for identification purposes only and may be trademarks of their respective owners. No conclusion or suggestion is made that any item sold by Tesland is authorized by or affiliated with Tesla, Inc. Tesland and its publications are not affiliated with or endorsed by Tesla, Inc. Tesla Model S, Tesla Model X, Tesla Model Y, Tesla Model 3 and Tesla Roadster are trademarks of Tesla, Inc.',
    openNowPrefix: 'Open now – ',
    openNowSuffix: 'until closing',
    closedNowPrefix: 'Closed now – opens in ',
    hours: 'hr',
    minutes: 'min'
  },
  de: {
    companyInfo: 'Unternehmensinfo',
    account: 'Konto',
    loginRequired: '(Anmeldung erforderlich)',
    myAccount: 'Mein Konto',
    wishlist: 'Meine Wunschliste',
    orders: 'Bestellungen',
    about: 'Über uns',
    jobs: 'Stellenangebote',
    contact: 'Kontakt',
    aboutLink: 'Über uns',
    terms: 'Allgemeine Bedingungen',
    privacy: 'Datenschutz',
    returns: 'Rücksendungen',
    follow: 'Folgen Sie uns',
    openingHours: '8:30 – 17:00 (Mo. – Fr.)',
    disclaimer:
      'HAFTUNGSAUSSCHLUSS: Alle anderen Unternehmen, Produkte oder Namen, auf die auf dieser Website verwiesen wird, dienen nur Identifikationszwecken und können Marken ihrer jeweiligen Inhaber sein. Es wird nicht behauptet oder suggeriert, dass ein von Tesland verkauftes Produkt von Tesla, Inc. autorisiert ist oder mit Tesla, Inc. verbunden ist. Tesland und seine Veröffentlichungen sind nicht mit Tesla, Inc. verbunden oder von Tesla, Inc. genehmigt. Tesla Model S, Tesla Model X, Tesla Model Y, Tesla Model 3 und Tesla Roadster sind Marken der Tesla, Inc.',
    openNowPrefix: 'Jetzt geöffnet – noch ',
    openNowSuffix: 'bis zur Schließung',
    closedNowPrefix: 'Jetzt geschlossen – öffnet in ',
    hours: 'Std',
    minutes: 'Min'
  },
  fr: {
    companyInfo: 'Infos société',
    account: 'Compte',
    loginRequired: '(Connexion requise)',
    myAccount: 'Mon compte',
    wishlist: 'Ma liste d’envies',
    orders: 'Commandes',
    about: 'À propos',
    jobs: 'Emplois',
    contact: 'Contact',
    aboutLink: 'À propos',
    terms: 'Conditions générales',
    privacy: 'Politique de confidentialité',
    returns: 'Retours',
    follow: 'Suivez-nous',
    openingHours: '8:30 – 17:00 (Lun – Ven)',
    disclaimer:
      'AVERTISSEMENT : Toute autre entreprise, produit ou nom référencé sur ce site est utilisé uniquement à des fins d’identification et peut être une marque de son propriétaire respectif. Il n’est pas conclu ni suggéré qu’un article vendu par Tesland soit autorisé par Tesla, Inc. ou lié à Tesla, Inc. Tesland et ses publications ne sont pas affiliés à Tesla, Inc. et ne sont pas approuvés par Tesla, Inc. Tesla Model S, Tesla Model X, Tesla Model Y, Tesla Model 3 et Tesla Roadster sont des marques de Tesla, Inc.',
    openNowPrefix: 'Ouvert – ',
    openNowSuffix: 'avant la fermeture',
    closedNowPrefix: 'Fermé – ouvre dans ',
    hours: 'h',
    minutes: 'min'
  }
}

const getLocaleFromPath = (path: string | null): SupportedLocale => {
  if (!path) return 'nl'
  if (path === '/en' || path.startsWith('/en/')) return 'en'
  if (path === '/de' || path.startsWith('/de/')) return 'de'
  if (path === '/fr' || path.startsWith('/fr/')) return 'fr'
  if (path === '/nl' || path.startsWith('/nl/')) return 'nl'
  return 'nl'
}

const getOpeningTooltip = (locale: SupportedLocale) => {
  const copy = footerText[locale]
  const now = new Date()
  const day = now.getDay()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const isWeekday = day >= 1 && day <= 5

  if (isWeekday && currentMinutes >= OPEN_TIME_MINUTES && currentMinutes < CLOSE_TIME_MINUTES) {
    const minsLeft = CLOSE_TIME_MINUTES - currentMinutes
    const hrs = Math.floor(minsLeft / 60)
    const mins = minsLeft % 60
    const timeLeft = `${hrs > 0 ? `${hrs} ${copy.hours} ` : ''}${mins} ${copy.minutes}`
    return `${copy.openNowPrefix}${timeLeft} ${copy.openNowSuffix}`
  }

  let nextOpenDay = day
  if (day === 6 || currentMinutes >= CLOSE_TIME_MINUTES) nextOpenDay = (day + 1) % 7
  if (day === 0) nextOpenDay = 1
  if (nextOpenDay === 6 || nextOpenDay === 0) nextOpenDay = 1

  let daysAhead = (nextOpenDay - day + 7) % 7
  if (daysAhead === 0 && currentMinutes < OPEN_TIME_MINUTES) daysAhead = 0

  const nextOpen = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)
  nextOpen.setHours(8, 30, 0, 0)

  const diffMin = Math.floor((nextOpen.getTime() - now.getTime()) / 60000)
  const hrs = Math.floor(diffMin / 60)
  const mins = diffMin % 60

  const timeLeft = `${hrs > 0 ? `${hrs} ${copy.hours} ` : ''}${mins} ${copy.minutes}`
  return `${copy.closedNowPrefix}${timeLeft}`
}

export default function SiteFooter() {
  const pathname = usePathname()
  const locale = useMemo(() => getLocaleFromPath(pathname), [pathname])
  const copy = footerText[locale]
  const [tooltipText, setTooltipText] = useState('...')

  useEffect(() => {
    const update = () => setTooltipText(getOpeningTooltip(locale))
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [locale])

  return (
    <footer className="bg-[#2c303f] text-white">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-6 py-10 sm:grid-cols-2 lg:grid-cols-3">
        <div className="footer-links space-y-4">
          <h6 className="text-lg font-semibold">{copy.companyInfo}</h6>
          <div className="space-y-3 text-sm">
            <a
              href="https://www.google.com/maps/place/Kweekgrasstraat+36,+1313+BX+Almere"
              target="_blank"
              rel="noreferrer"
              className="grid grid-cols-[16px_1fr] items-start gap-2"
            >
              <MapPinIcon className="mt-0.5 h-4 w-4 text-[#8bc342]" />
              <div className="leading-5">
                <p>Kweekgrasstraat 36</p>
                <p>1313 BX Almere</p>
              </div>
            </a>
            <div className="opening-status-container text-sm">
              <div className="grid grid-cols-[16px_1fr] items-center gap-2">
                <ClockIcon className="h-4 w-4 text-[#8bc342]" />
                <p className="opening-status leading-5">{copy.openingHours}</p>
              </div>
              <div className="opening-tooltip">{tooltipText}</div>
            </div>
            <a className="flex items-center gap-2 whitespace-nowrap" href="tel:+31853033403">
              <PhoneIcon className="h-4 w-4 text-[#8bc342]" />
              +31 (0)85 3033 403
            </a>
            <a className="flex items-center gap-2 whitespace-nowrap" href="mailto:info@tesland.com">
              <EnvelopeIcon className="h-4 w-4 text-[#8bc342]" />
              info@tesland.com
            </a>
          </div>
        </div>
        <div className="footer-links space-y-3">
          <h6 className="text-lg font-semibold">{copy.account}</h6>
          <p className="text-[10px] text-white/70">{copy.loginRequired}</p>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="/customer/account">{copy.myAccount}</a>
            </li>
            <li>
              <a href="/wishlist">{copy.wishlist}</a>
            </li>
            <li>
              <a href="/sales/order/history">{copy.orders}</a>
            </li>
          </ul>
        </div>
        <div className="footer-links space-y-3">
          <h6 className="text-lg font-semibold">{copy.about}</h6>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="/vacatures">{copy.jobs}</a>
            </li>
            <li>
              <a href="/contact">{copy.contact}</a>
            </li>
            <li>
              <a href="/over-ons">{copy.aboutLink}</a>
            </li>
            <li>
              <a href="/algemene-voorwaarden">{copy.terms}</a>
            </li>
            <li>
              <a href="/privacy-policy-cookie-restriction-mode">{copy.privacy}</a>
            </li>
            <li>
              <a href="/retourzendingen">{copy.returns}</a>
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 pb-10 pt-2">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href="https://www.google.com/search?q=tesland&hl=nl#lrd=0x0:0x0,1"
            target="_blank"
            rel="noreferrer"
            title="Google Reviews"
          >
            <img
              src="/media/wysiwyg/google.jpg"
              alt="Google Reviews"
              className="footer-review-logo"
            />
          </a>
          <a
            href="https://nl.trustpilot.com/review/tesland.com"
            target="_blank"
            rel="noreferrer"
            title="Trustpilot Reviews"
          >
            <img
              src="/media/wysiwyg/trustpilot.jpg"
              alt="Trustpilot Reviews"
              className="footer-review-logo"
            />
          </a>
          <a href="https://www.bovag.nl/" target="_blank" rel="noreferrer" title="BOVAG">
            <img src="/media/wysiwyg/bovag.jpg" alt="BOVAG" className="footer-review-logo" />
          </a>
          <a href="https://www.rdw.nl/" target="_blank" rel="noreferrer" title="RDW Erkend">
            <img src="/media/wysiwyg/RDW.jpg" alt="RDW Erkend" className="footer-review-logo" />
          </a>
        </div>

        <h6 className="text-lg font-semibold text-white">{copy.follow}</h6>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            className="footer-social"
            href="https://www.facebook.com/tesland.nl/"
            title="Facebook"
            aria-label="Facebook"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22 12.06C22 6.54 17.52 2 12 2S2 6.54 2 12.06c0 4.99 3.66 9.12 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.25c-1.23 0-1.61.77-1.61 1.56v1.88h2.74l-.44 2.91h-2.3V22c4.78-.82 8.44-4.95 8.44-9.94Z" />
            </svg>
          </a>
          <a
            className="footer-social"
            href="https://www.instagram.com/tesland_official"
            title="Instagram"
            aria-label="Instagram"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3Zm-5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5Zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5Zm6.25-2.75a1.25 1.25 0 1 1-1.25 1.25 1.25 1.25 0 0 1 1.25-1.25Z" />
            </svg>
          </a>
          <a
            className="footer-social"
            href="https://www.tiktok.com/@tesland_official"
            title="TikTok"
            aria-label="TikTok"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M16.5 3c.6 2.15 2.26 3.86 4.5 4.3v3.06c-1.64-.05-3.17-.59-4.5-1.5v5.52A6.38 6.38 0 1 1 10.12 8v3.25a2.82 2.82 0 1 0 2.88 2.8V3h3.5Z" />
            </svg>
          </a>
          <a
            className="footer-social"
            href="https://www.linkedin.com/company/tesland"
            title="LinkedIn"
            aria-label="LinkedIn"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6.94 8.5H3.28V21h3.66V8.5Zm-1.83-1.6a2.1 2.1 0 1 1 2.1-2.1 2.1 2.1 0 0 1-2.1 2.1ZM21 14.01V21h-3.66v-6.26c0-1.57-.03-3.58-2.18-3.58-2.18 0-2.52 1.7-2.52 3.47V21H9V8.5h3.51v1.7h.05a3.85 3.85 0 0 1 3.46-1.9c3.7 0 4.38 2.44 4.38 5.61Z" />
            </svg>
          </a>
          <a
            className="footer-social"
            href="https://twitter.com/tesland1"
            title="Twitter"
            aria-label="Twitter"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18.9 2H22l-6.73 7.68L23 22h-6.62l-5.18-7.01L4.6 22H2l7.17-8.2L1 2h6.78l4.68 6.35L18.9 2Zm-1.16 18h1.9L7.77 4H5.73l12.01 16Z" />
            </svg>
          </a>
        </div>
        <p className="max-w-[800px] text-center text-[11px] leading-relaxed text-[#ccc]">
          {copy.disclaimer}
        </p>
      </div>
    </footer>
  )
}
