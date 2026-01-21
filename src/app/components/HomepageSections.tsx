import type { CSSProperties } from 'react'

export type SupportedLocale = 'nl' | 'en' | 'de' | 'fr'

type HomepageMeta = {
  title: string
  description: string
  keywords: string[]
}

type FeatureCard = {
  title: string
  description: string
  buttonLabel: string
  image: string
  alt: string
  link: string
  accent: 'orange' | 'green'
}

type UspItem = {
  title: string
  subtitle: string
  description: string
}

type HomepageContent = {
  heroTitle: string
  heroSubtitle: string
  heroCta: string
  featureCards: FeatureCard[]
  modelsTitle: string
  modelButton: string
  modelTiles: Array<{ title: string; href: string; image: string }>
  aboutTitle: string
  aboutBody: string
  uspItems: UspItem[]
  newsletterTitle: string
  newsletterLabel: string
  newsletterPlaceholder: string
  newsletterButton: string
}

const localeMeta: Record<SupportedLocale, HomepageMeta> = {
  nl: {
    title: 'Tesla specialist voor onderhoud en accessoires',
    description:
      'Tesland is dé onafhankelijke Tesla-specialist voor onderhoud, accessoires en service. Plan direct een afspraak.',
    keywords: [
      'Tesla specialist',
      'Tesla onderhoud',
      'Tesla accessoires',
      'Tesla service',
      'Tesla onderdelen',
      'Tesla reparatie'
    ]
  },
  en: {
    title: 'Tesla specialist for maintenance and accessories',
    description:
      'Tesland is the independent Tesla specialist for maintenance, accessories and service. Book an appointment today.',
    keywords: [
      'Tesla specialist',
      'Tesla maintenance',
      'Tesla accessories',
      'Tesla service',
      'Tesla parts',
      'Tesla repair'
    ]
  },
  de: {
    title: 'Tesla-Spezialist für Wartung und Zubehör',
    description:
      'Tesland ist der unabhängige Tesla-Spezialist für Wartung, Zubehör und Service. Vereinbaren Sie einen Termin.',
    keywords: [
      'Tesla Spezialist',
      'Tesla Wartung',
      'Tesla Zubehör',
      'Tesla Service',
      'Tesla Teile',
      'Tesla Reparatur'
    ]
  },
  fr: {
    title: 'Spécialiste Tesla pour l’entretien et les accessoires',
    description:
      'Tesland est le spécialiste Tesla indépendant pour l’entretien, les accessoires et le service. Prenez rendez-vous.',
    keywords: [
      'Spécialiste Tesla',
      'Entretien Tesla',
      'Accessoires Tesla',
      'Service Tesla',
      'Pièces Tesla',
      'Réparation Tesla'
    ]
  }
}

const localeContent: Record<SupportedLocale, HomepageContent> = {
  nl: {
    heroTitle: 'DÉ TESLA SPECIALIST VAN NEDERLAND',
    heroSubtitle: 'Voor onderhoud, accessoires en service aan jouw Tesla',
    heroCta: 'Plan direct een afspraak',
    featureCards: [
      {
        title: 'Snelle Service',
        description: 'Onze monteurs staan altijd voor je klaar. Snel, vakkundig en betrouwbaar.',
        buttonLabel: 'Onderhoud',
        image: '/media/wysiwyg/service.png',
        alt: 'Snelle Service',
        link: '/onderhoud',
        accent: 'orange'
      },
      {
        title: 'Comfort & Duurzaamheid',
        description:
          'Geniet van gratis koffie, wifi en een ontspannen sfeer. Wij zijn energiepositief en duurzaam.',
        buttonLabel: 'Kijk bij ons binnen',
        image: '/media/wysiwyg/wacht.png',
        alt: 'Comfort & Duurzaamheid',
        link: '/pand',
        accent: 'green'
      },
      {
        title: 'Accessoires & Onderdelen',
        description: 'Het grootste assortiment Tesla accessoires. Snel leverbaar en altijd op voorraad.',
        buttonLabel: 'Bekijk accessoires',
        image: '/media/wysiwyg/snel.png',
        alt: 'Accessoires & Onderdelen',
        link: '/accessoires',
        accent: 'orange'
      }
    ],
    modelsTitle: 'Populaire Tesla Modellen',
    modelButton: 'Bekijk',
    modelTiles: [
      { title: 'Model S', href: '/accessoires/model-s/', image: '/media/wysiwyg/TL-MS.png' },
      { title: 'Model 3', href: '/accessoires/model-3/', image: '/media/wysiwyg/TL-M3.png' },
      { title: 'Model X', href: '/accessoires/model-x/', image: '/media/wysiwyg/TL-MX.png' },
      { title: 'Model Y', href: '/accessoires/model-y/', image: '/media/wysiwyg/TL-MY.png' }
    ],
    aboutTitle: 'Over Tesland',
    aboutBody:
      'Tesland is de onafhankelijke Tesla-specialist voor onderhoud, accessoires en service. Sinds 2015 helpen wij duizenden Tesla-rijders uit binnen- en buitenland om hun auto in topconditie te houden. Onze moderne werkplaats is volledig ingericht op Tesla’s – met gecertificeerde specialisten, originele én hoogwaardige after-market onderdelen, en korte wachttijden. Of het nu gaat om een APK, bandenservice of technische upgrade: wij staan voor je klaar. In Augustus 2025 is Tesland uitgeroepen tot finalist: "BOVAG Onafhankelijk Autobedrijf van het 2025"',
    uspItems: [
      { title: 'BOVAG & RDW', subtitle: 'Erkende kwaliteit', description: 'en betrouwbaarheid' },
      { title: 'Tesla-specialisten', subtitle: 'Ervaren team', description: 'volledig getraind' },
      { title: 'Snelle service', subtitle: 'Minimale wachttijd', description: 'maximale inzet' },
      { title: 'Koffie & wifi', subtitle: 'Relaxte wachtruimte', description: 'met zicht op je auto' }
    ],
    newsletterTitle: 'Schrijf je in voor onze nieuwsbrief',
    newsletterLabel: 'E-mailadres',
    newsletterPlaceholder: 'Voer uw e-mailadres in',
    newsletterButton: 'Meld je aan'
  },
  en: {
    heroTitle: 'THE TESLA SPECIALIST OF THE NETHERLANDS',
    heroSubtitle: 'For maintenance, accessories and service for your Tesla',
    heroCta: 'Book an appointment',
    featureCards: [
      {
        title: 'Fast Service',
        description: 'Our technicians are always ready. Fast, skilled and reliable.',
        buttonLabel: 'Maintenance',
        image: '/media/wysiwyg/service.png',
        alt: 'Fast Service',
        link: '/maintenance',
        accent: 'orange'
      },
      {
        title: 'Comfort & Sustainability',
        description:
          'Enjoy free coffee, Wi‑Fi and a relaxed atmosphere. We are energy‑positive and sustainable.',
        buttonLabel: 'Visit us',
        image: '/media/wysiwyg/wacht.png',
        alt: 'Comfort & Sustainability',
        link: '/pand',
        accent: 'green'
      },
      {
        title: 'Accessories & Parts',
        description: 'The largest selection of Tesla accessories. Fast delivery and always in stock.',
        buttonLabel: 'View accessories',
        image: '/media/wysiwyg/snel.png',
        alt: 'Accessories & Parts',
        link: '/accessoires',
        accent: 'orange'
      }
    ],
    modelsTitle: 'Popular Tesla Models',
    modelButton: 'View',
    modelTiles: [
      { title: 'Model S', href: '/accessoires/model-s/', image: '/media/wysiwyg/TL-MS.png' },
      { title: 'Model 3', href: '/accessoires/model-3/', image: '/media/wysiwyg/TL-M3.png' },
      { title: 'Model X', href: '/accessoires/model-x/', image: '/media/wysiwyg/TL-MX.png' },
      { title: 'Model Y', href: '/accessoires/model-y/', image: '/media/wysiwyg/TL-MY.png' }
    ],
    aboutTitle: 'About Tesland',
    aboutBody:
      'Tesland is the independent Tesla specialist for maintenance, accessories and service. Since 2015 we have helped thousands of Tesla drivers from the Netherlands and abroad keep their cars in top condition. Our modern workshop is fully equipped for Tesla vehicles with certified specialists, original and high‑quality aftermarket parts, and short waiting times. Whether it is an APK, tire service or a technical upgrade, we are here to help. In August 2025, Tesland was named a finalist for the “BOVAG Independent Car Company 2025” award.',
    uspItems: [
      { title: 'BOVAG & RDW', subtitle: 'Certified quality', description: 'and reliability' },
      { title: 'Tesla specialists', subtitle: 'Experienced team', description: 'fully trained' },
      { title: 'Fast service', subtitle: 'Minimal waiting time', description: 'maximum effort' },
      { title: 'Coffee & Wi‑Fi', subtitle: 'Relaxed waiting area', description: 'with a view of your car' }
    ],
    newsletterTitle: 'Subscribe to our newsletter',
    newsletterLabel: 'Email address',
    newsletterPlaceholder: 'Enter your email address',
    newsletterButton: 'Sign up'
  },
  de: {
    heroTitle: 'DER TESLA-SPEZIALIST DER NIEDERLANDE',
    heroSubtitle: 'Für Wartung, Zubehör und Service rund um Ihren Tesla',
    heroCta: 'Termin vereinbaren',
    featureCards: [
      {
        title: 'Schneller Service',
        description: 'Unsere Techniker sind immer für Sie da. Schnell, kompetent und zuverlässig.',
        buttonLabel: 'Wartung',
        image: '/media/wysiwyg/service.png',
        alt: 'Schneller Service',
        link: '/wartung',
        accent: 'orange'
      },
      {
        title: 'Komfort & Nachhaltigkeit',
        description:
          'Genießen Sie kostenlosen Kaffee, WLAN und eine entspannte Atmosphäre. Wir arbeiten energiepositiv und nachhaltig.',
        buttonLabel: 'Besuchen Sie uns',
        image: '/media/wysiwyg/wacht.png',
        alt: 'Komfort & Nachhaltigkeit',
        link: '/pand',
        accent: 'green'
      },
      {
        title: 'Zubehör & Teile',
        description: 'Das größte Sortiment an Tesla‑Zubehör. Schnell lieferbar und stets auf Lager.',
        buttonLabel: 'Zubehör ansehen',
        image: '/media/wysiwyg/snel.png',
        alt: 'Zubehör & Teile',
        link: '/accessoires',
        accent: 'orange'
      }
    ],
    modelsTitle: 'Beliebte Tesla Modelle',
    modelButton: 'Ansehen',
    modelTiles: [
      { title: 'Model S', href: '/accessoires/model-s/', image: '/media/wysiwyg/TL-MS.png' },
      { title: 'Model 3', href: '/accessoires/model-3/', image: '/media/wysiwyg/TL-M3.png' },
      { title: 'Model X', href: '/accessoires/model-x/', image: '/media/wysiwyg/TL-MX.png' },
      { title: 'Model Y', href: '/accessoires/model-y/', image: '/media/wysiwyg/TL-MY.png' }
    ],
    aboutTitle: 'Über Tesland',
    aboutBody:
      'Tesland ist der unabhängige Tesla‑Spezialist für Wartung, Zubehör und Service. Seit 2015 helfen wir Tausenden von Tesla‑Fahrern aus dem In‑ und Ausland, ihre Fahrzeuge in Bestform zu halten. Unsere moderne Werkstatt ist vollständig auf Tesla ausgerichtet – mit zertifizierten Spezialisten, Original‑ und hochwertigen Aftermarket‑Teilen sowie kurzen Wartezeiten. Ob APK, Reifenservice oder technisches Upgrade: Wir sind für Sie da. Im August 2025 wurde Tesland als Finalist für den „BOVAG Unabhängiger Auto­betrieb 2025“ ausgezeichnet.',
    uspItems: [
      { title: 'BOVAG & RDW', subtitle: 'Anerkannte Qualität', description: 'und Zuverlässigkeit' },
      { title: 'Tesla‑Spezialisten', subtitle: 'Erfahrenes Team', description: 'vollständig geschult' },
      { title: 'Schneller Service', subtitle: 'Minimale Wartezeit', description: 'maximaler Einsatz' },
      { title: 'Kaffee & WLAN', subtitle: 'Entspannter Wartebereich', description: 'mit Blick auf Ihr Auto' }
    ],
    newsletterTitle: 'Newsletter abonnieren',
    newsletterLabel: 'E‑Mail‑Adresse',
    newsletterPlaceholder: 'E‑Mail‑Adresse eingeben',
    newsletterButton: 'Anmelden'
  },
  fr: {
    heroTitle: 'LE SPÉCIALISTE TESLA DES PAYS‑BAS',
    heroSubtitle: 'Pour l’entretien, les accessoires et le service de votre Tesla',
    heroCta: 'Prendre rendez‑vous',
    featureCards: [
      {
        title: 'Service rapide',
        description: 'Nos techniciens sont toujours prêts. Rapide, compétent et fiable.',
        buttonLabel: 'Entretien',
        image: '/media/wysiwyg/service.png',
        alt: 'Service rapide',
        link: '/entretien',
        accent: 'orange'
      },
      {
        title: 'Confort & durabilité',
        description:
          'Profitez d’un café gratuit, du Wi‑Fi et d’une atmosphère détendue. Nous sommes éco‑responsables.',
        buttonLabel: 'Nous rendre visite',
        image: '/media/wysiwyg/wacht.png',
        alt: 'Confort & durabilité',
        link: '/pand',
        accent: 'green'
      },
      {
        title: 'Accessoires & pièces',
        description: 'Le plus grand choix d’accessoires Tesla. Livraison rapide et toujours en stock.',
        buttonLabel: 'Voir les accessoires',
        image: '/media/wysiwyg/snel.png',
        alt: 'Accessoires & pièces',
        link: '/accessoires',
        accent: 'orange'
      }
    ],
    modelsTitle: 'Modèles Tesla populaires',
    modelButton: 'Voir',
    modelTiles: [
      { title: 'Model S', href: '/accessoires/model-s/', image: '/media/wysiwyg/TL-MS.png' },
      { title: 'Model 3', href: '/accessoires/model-3/', image: '/media/wysiwyg/TL-M3.png' },
      { title: 'Model X', href: '/accessoires/model-x/', image: '/media/wysiwyg/TL-MX.png' },
      { title: 'Model Y', href: '/accessoires/model-y/', image: '/media/wysiwyg/TL-MY.png' }
    ],
    aboutTitle: 'À propos de Tesland',
    aboutBody:
      'Tesland est le spécialiste Tesla indépendant pour l’entretien, les accessoires et le service. Depuis 2015, nous aidons des milliers de conducteurs Tesla des Pays‑Bas et d’ailleurs à maintenir leur voiture en parfait état. Notre atelier moderne est entièrement équipé pour Tesla, avec des spécialistes certifiés, des pièces d’origine et de haute qualité, et des délais d’attente courts. Qu’il s’agisse d’un APK, d’un service pneus ou d’une mise à niveau technique, nous sommes là pour vous. En août 2025, Tesland a été finaliste du prix « BOVAG Entreprise automobile indépendante 2025 ».',
    uspItems: [
      { title: 'BOVAG & RDW', subtitle: 'Qualité reconnue', description: 'et fiabilité' },
      { title: 'Spécialistes Tesla', subtitle: 'Équipe expérimentée', description: 'entièrement formée' },
      { title: 'Service rapide', subtitle: 'Temps d’attente minimal', description: 'engagement maximal' },
      { title: 'Café & Wi‑Fi', subtitle: 'Espace d’attente relaxant', description: 'avec vue sur votre voiture' }
    ],
    newsletterTitle: 'Inscrivez‑vous à notre newsletter',
    newsletterLabel: 'Adresse e‑mail',
    newsletterPlaceholder: 'Saisissez votre e‑mail',
    newsletterButton: 'S’inscrire'
  }
}

export const getHomepageMeta = (locale: SupportedLocale): HomepageMeta => {
  return localeMeta[locale] || localeMeta.nl
}

export const getHomepageContent = (locale: SupportedLocale): HomepageContent => {
  return localeContent[locale] || localeContent.nl
}

export default function HomepageSections({ locale }: { locale: SupportedLocale }) {
  const content = getHomepageContent(locale)
  const localePrefix = `/${locale}`

  return (
    <>
      <section className="relative left-1/2 right-1/2 -mx-[50vw] h-[45vw] max-h-[480px] w-screen overflow-hidden rounded-[32px]">
        <video autoPlay loop muted playsInline className="h-full w-screen object-cover">
          <source src="/branding/Tesland_Hero.mp4" type="video/mp4" />
          Your browser does not support video playback.
        </video>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[linear-gradient(120deg,rgba(17,17,17,0.15),rgba(24,24,24,0.25)_80%)] px-[5vw] text-center">
          <h1 className="mb-3 max-w-[90vw] text-[clamp(24px,4vw,36px)] font-extrabold text-white shadow-[0_4px_24px_rgba(0,0,0,0.67)]">
            {content.heroTitle}
          </h1>
          <p className="mb-6 max-w-[85vw] text-[clamp(14px,2.5vw,20px)] text-white shadow-[0_2px_8px_rgba(0,0,0,0.67)]">
            {content.heroSubtitle}
          </p>
          <a
            href={`${localePrefix}/planning`}
            className="inline-flex items-center justify-center rounded-[28px] bg-gradient-to-r from-[#e45b25] to-[#8bc342] px-8 py-3 text-[clamp(16px,3vw,20px)] font-bold tracking-[0.5px] text-white shadow-[0_0_22px_rgba(228,91,37,0.45)] transition-all duration-200 hover:scale-[1.06] hover:from-[#8bc342] hover:to-[#e45b25] hover:text-[#181818] hover:shadow-[0_0_32px_rgba(139,195,66,0.6),0_0_18px_rgba(228,91,37,0.7)]"
          >
            {content.heroCta}
          </a>
        </div>
      </section>

      <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-[#111] py-10">
        <div className="mx-auto flex max-w-[1920px] flex-wrap justify-center gap-[2vw] px-6">
          {content.featureCards.map((card) => {
            const isGreen = card.accent === 'green'
            const accentColor = isGreen ? '#8bc342' : '#e45b25'
            return (
              <div
                key={card.title}
                className="flex min-w-[220px] flex-1 rounded-[24px] bg-[#222] px-6 py-8 text-center shadow-[0_8px_28px_rgba(17,17,17,0.12)]"
                style={
                  {
                    maxWidth: 400,
                    boxShadow: `0 12px 30px rgba(17,17,17,0.14), 0 0 20px ${accentColor}55`
                  } as CSSProperties
                }
              >
                <div className="flex w-full flex-col items-center">
                  <div className="mb-[18px] h-[180px] w-[180px] overflow-hidden rounded-[24px] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-all duration-300 ease-in-out hover:-translate-y-2 hover:scale-105 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
                    <img src={card.image} alt={card.alt} className="h-full w-full object-cover" />
                  </div>
                  <h2 className="mb-2 text-[1.3em] font-bold" style={{ color: accentColor }}>
                    {card.title}
                  </h2>
                  <p className="text-white">{card.description}</p>
                  <a
                    href={`${localePrefix}${card.link}`}
                    className={`mt-3 inline-flex items-center justify-center rounded-[16px] px-4 py-2 text-[0.9em] text-white transition-all duration-200 ${
                      isGreen
                        ? 'bg-[#8bc342] shadow-[0_0_16px_rgba(139,195,66,0.7)] hover:bg-[#e45b25] hover:shadow-[0_0_22px_rgba(228,91,37,0.7)]'
                        : 'bg-[#e45b25] shadow-[0_0_16px_rgba(228,91,37,0.7)] hover:bg-[#8bc342] hover:shadow-[0_0_22px_rgba(139,195,66,0.7)]'
                    }`}
                  >
                    {card.buttonLabel}
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-[#111] py-16">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-10 px-6">
          <h2 className="text-center text-[clamp(24px,3vw,36px)] font-bold text-[#8bc342]">
            {content.modelsTitle}
          </h2>
          <div className="flex flex-wrap justify-center gap-6">
            {content.modelTiles.map((tile) => (
              <a
                key={tile.title}
                href={`${localePrefix}${tile.href}`}
                className="flex min-w-[220px] flex-1 flex-col items-center rounded-[24px] border border-[#8bc342] bg-[#cccccc] px-6 py-8 text-center text-[#111] shadow-[0_0_12px_rgba(139,195,66,0.4)] transition-all duration-300 ease-in-out hover:-translate-y-1.5 hover:shadow-[0_0_24px_rgba(139,195,66,0.8),0_12px_32px_rgba(0,0,0,0.15)]"
                style={{ maxWidth: 360 }}
              >
                <img src={tile.image} alt={tile.title} className="mb-5 h-[50px] w-auto" />
                <h3 className="mb-2 font-bold text-[#333]">{tile.title}</h3>
                <span className="mt-4 inline-flex items-center justify-center rounded-[24px] bg-gradient-to-r from-[#27ae60] to-[#f39c12] px-6 py-2 text-sm font-bold text-white transition-colors duration-200 hover:bg-[#e45b25]">
                  {content.modelButton}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-[#181818] py-16">
        <div className="mx-auto w-full max-w-[1200px] px-6 text-center">
          <h2 className="mb-5 text-[clamp(24px,3vw,36px)] font-bold text-[#8bc342]">
            {content.aboutTitle}
          </h2>
          <p className="mb-8 text-[clamp(16px,2vw,18px)] leading-relaxed text-[#ccc]">
            {content.aboutBody}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-5">
            {content.uspItems.map((item) => (
              <div
                key={item.title}
                className="flex w-full max-w-[260px] flex-1 flex-col items-center rounded-[24px] bg-[#222] px-6 py-6 text-center shadow-[0_0_12px_rgba(139,195,66,0.53)] transition-all duration-300 ease-in-out"
              >
                <h3 className="mb-2 text-base font-semibold text-[#e45b25]">{item.title}</h3>
                <p className="text-sm text-[#8bc342]">
                  <strong>{item.subtitle}</strong>
                  <br />
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-[#7cc122] py-10">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-6 px-6">
          <div className="flex items-center gap-4">
            <img src="/branding/logo_tesland_white.png" alt="Tesland" className="h-12 w-auto" />
            <p className="text-lg font-semibold text-white">{content.newsletterTitle}</p>
          </div>
          <form className="flex w-full max-w-md items-center gap-3 sm:w-auto">
            <label className="sr-only" htmlFor="newsletter-email">
              {content.newsletterLabel}
            </label>
            <input
              id="newsletter-email"
              type="email"
              placeholder={content.newsletterPlaceholder}
              className="w-full flex-1 rounded-full border border-white/50 bg-white/10 px-5 py-2 text-sm text-white placeholder-white/80 focus:border-white focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-full border border-white/70 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              {content.newsletterButton}
            </button>
          </form>
        </div>
      </section>
    </>
  )
}
