/**
 * Centrale configuratie voor het Instellingen-submenu.
 * Enige bron van waarheid: wijzig hier om items toe te voegen, te verwijderen of te hernoemen.
 */

export type SettingsMenuItem = {
  id: string
  label: string
  href: string
}

/** Slug voor pagina's die een sectie van SettingsClient tonen (geen eigen route). */
export const SETTINGS_SECTION_SLUGS = [
  'personalisatie',
  'algemeen',
  'planning',
  'workoverzicht',
  'notificaties',
  'email',
  'rdw',
  'afwezigheidstypes',
  'integraties',
  'voip'
] as const

export type SettingsSectionSlug = (typeof SETTINGS_SECTION_SLUGS)[number]

export function isSettingsSectionSlug(slug: string): slug is SettingsSectionSlug {
  return SETTINGS_SECTION_SLUGS.includes(slug as SettingsSectionSlug)
}

const BASE = '/admin/settings'

export const SETTINGS_MENU_ITEMS: SettingsMenuItem[] = [
  { id: 'roles', label: 'Rollen', href: `${BASE}/roles` },
  { id: 'users', label: 'Gebruikers', href: `${BASE}/users` },
  { id: 'personalisatie', label: 'Personalisatie', href: `${BASE}/personalisatie` },
  { id: 'algemeen', label: 'Algemeen', href: `${BASE}/algemeen` },
  { id: 'planning', label: 'Planning, types & tarieven', href: `${BASE}/planning` },
  { id: 'workoverzicht', label: 'Werkoverzicht', href: `${BASE}/workoverzicht` },
  { id: 'notificaties', label: 'Notificaties', href: `${BASE}/notificaties` },
  { id: 'email', label: 'E-mail instellingen', href: `${BASE}/email` },
  { id: 'email-templates', label: 'E-mail templates', href: `${BASE}/email-templates` },
  { id: 'rdw', label: 'RDW / APK', href: `${BASE}/rdw` },
  { id: 'afwezigheidstypes', label: 'Afwezigheidstypes', href: `${BASE}/afwezigheidstypes` },
  { id: 'integraties', label: 'Integraties', href: `${BASE}/integraties` },
  { id: 'voip', label: 'VoIP / Telefonie', href: `${BASE}/voip` },
  { id: 'mollie', label: 'Mollie Betalingen', href: `${BASE}/mollie` },
  { id: 'dhl', label: 'DHL Verzenden', href: `${BASE}/dhl` },
  { id: 'webshop', label: 'Webshop', href: `${BASE}/webshop` },
  { id: 'postcodelookup', label: 'Postcode lookup', href: `${BASE}/postcodelookup` },
  { id: 'vat', label: 'BTW / VAT', href: `${BASE}/vat` }
]
