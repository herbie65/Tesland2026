export type Locale = 'nl' | 'en' | 'de' | 'fr'

type MaintenanceCopy = {
  title: string
  description: string
  heroTitle: string
  heroBody: string
  heroCta: string
  apkTitle: string
  apkBody: string
  apkBullets: string[]
  apkCta: string
  whyTitle: string
  whyBullets: string[]
  checksTitle: string
  checksIntro: string
  checksBullets: string[]
  checksOutro: string
  xpelTitle: string
  xpelLead: string
  xpelBodyOne: string
  xpelBodyTwo: string
  xpelBodyThree: string
  xpelCta: string
  ppfPopupTitle: string
  ppfPopupBody: string
  ppfPopupCta: string
  ppfInfoTitle: string
  ppfInfoBody: string
  ppfOptionsTitle: string
  ppfOptions: Array<{ title: string; body: string }>
  ppfBenefitsTitle: string
  ppfBenefits: string[]
  ppfWindowTitle: string
  ppfWindowBody: string
  ppfWindowBenefits: string[]
  ppfClose: string
  tireHotelTitle: string
  tireHotelBodyOne: string
  tireHotelBodyTwo: string
  appointmentTitle: string
  appointmentBody: string
  appointmentCta: string
  contactTitle: string
  contactCompany: string
  contactHoursTitle: string
  contactHoursWeek: string
  contactHoursWeekend: string
}

export const copyByLocale: Record<Locale, MaintenanceCopy> = {
  nl: {
    title: 'Tesland – Dé Tesla Specialist voor Onderhoud, Accessoires en Service',
    description:
      'Op zoek naar betrouwbare service voor je Tesla? Bij Tesland vind je onderhoud, onderdelen, accessoires en expertise onder één dak. Sinds 2015 dé specialist.',
    heroTitle: 'Dé onafhankelijke Tesla-specialist – klanten uit heel Europa vertrouwen op ons',
    heroBody:
      'Tesland is jouw onafhankelijke Tesla-specialist voor onderhoud, reparaties, accessoires én APK. We bieden snelle en deskundige service voor alles wat jouw Tesla nodig heeft – van bandenwissels en uitlijnen tot complete onderhoudsbeurten. Snel, betrouwbaar en duurzaam – al sinds 2015.',
    heroCta: 'Plan direct uw Onderhoud',
    apkTitle: 'Ook voor je APK ben je bij Tesland aan het juiste adres',
    apkBody:
      'Onze ervaren monteurs voeren de APK-keuring vakkundig uit, volledig volgens de RDW-richtlijnen. Tesland was een van de eerste bedrijven in Nederland met een certificering voor het uitvoeren van APK’s speciaal voor elektrische voertuigen. Combineer je APK met een onderhoudsbeurt en je Tesla is in één keer volledig klaar voor de weg.',
    apkBullets: [
      'Snel een afspraak, meestal klaar terwijl je wacht',
      'RDW-erkend en volledig Tesla-gespecialiseerd',
      'Combineer met onderhoud voor maximale efficiëntie'
    ],
    apkCta: 'Plan direct uw APK',
    whyTitle: 'Waarom kiezen Tesla-rijders voor Tesland?',
    whyBullets: [
      'Altijd keuze uit originele of kwalitatieve after-market onderdelen',
      'Gespecialiseerde Tesla-monteurs met jarenlange ervaring',
      'Geen lange wachttijden, gewoon snel geholpen',
      'Fijne wachtruimte met goede koffie en snelle wifi',
      'Milieuvriendelijk: energiepositief en duurzaam ingericht service center',
      "Vervangende Tesla's beschikbaar als je mobiel moet blijven"
    ],
    checksTitle: 'Tesla zomer- en wintercheck',
    checksIntro: 'Met onze zomer- en wintercheck ga je altijd veilig op weg. We controleren onder andere:',
    checksBullets: [
      'Banden',
      'Foutmeldingen',
      'HEPA-filter',
      'Koelvloeistof',
      'Remmen',
      'Ruitenwisserbladen & vloeistof',
      'Verlichting'
    ],
    checksOutro: 'Laat ook je airco reinigen en filters vervangen voor een frisse, gezonde auto!',
    xpelTitle: 'XPEL: onzichtbare lakbescherming en stijlvolle raamfolie',
    xpelLead: 'Laat je Tesla professioneel beschermen met XPEL folie.',
    xpelBodyOne:
      'Onze hoogwaardige Paint Protection Film (PPF) beschermt de lak tegen steenslag, krassen en vuil — vrijwel onzichtbaar en zelfherstellend.',
    xpelBodyTwo:
      'De XPEL raamfolie zorgt voor extra comfort, privacy en een stijlvolle uitstraling. Bovendien houdt het warmte en UV-straling buiten, waardoor je interieur langer mooi blijft.',
    xpelBodyThree: 'Kies voor de beste bescherming, zonder in te leveren op design.',
    xpelCta: 'Meer over PPF & Ramen tinten',
    tireHotelTitle: 'Tesland bandenhotel',
    tireHotelBodyOne:
      'Geen ruimte om je banden thuis op te slaan? Tesland biedt de perfecte oplossing met een speciaal ingericht bandenhotel. Jouw banden worden veilig opgeslagen onder ideale omstandigheden, zodat ze langer meegaan en hun prestaties behouden.',
    tireHotelBodyTwo:
      'Tegen een kleine meerprijs reinigen wij je banden van binnen en buiten tijdens de opslag. Zo komen ze weer fris onder je auto, vrij van remstof en strooizout.',
    appointmentTitle: 'Maak direct een afspraak',
    appointmentBody:
      'Houd je Tesla in topconditie. Plan eenvoudig online je onderhoud of reparatie. Is de planning vol? Bel ons voor spoed: 085 303 3403',
    appointmentCta: 'Plan direct een afspraak',
    contactTitle: 'Contact & openingstijden',
    contactCompany: 'Tesland BV',
    contactHoursTitle: 'Openingstijden',
    contactHoursWeek: 'Maandag t/m Vrijdag: 8.30 - 17.00 uur',
    contactHoursWeekend: 'Zaterdag & zondag: gesloten'
  },
  en: {
    title: 'Tesland – Tesla Specialist for Maintenance, Accessories and Service',
    description:
      'Looking for reliable Tesla service? Tesland offers maintenance, parts, accessories and expertise under one roof. Specialist since 2015.',
    heroTitle: 'The independent Tesla specialist – trusted by customers across Europe',
    heroBody:
      'Tesland is your independent Tesla specialist for maintenance, repairs, accessories and APK. We provide fast, expert service for everything your Tesla needs — from tire changes and alignment to full maintenance. Fast, reliable and sustainable since 2015.',
    heroCta: 'Book your maintenance',
    apkTitle: 'Your APK inspection is in good hands at Tesland',
    apkBody:
      'Our experienced technicians perform APK inspections professionally according to RDW guidelines. Tesland was one of the first companies in the Netherlands certified to perform APK inspections for electric vehicles. Combine your APK with a maintenance visit and your Tesla is road‑ready in one go.',
    apkBullets: [
      'Quick appointment, often ready while you wait',
      'RDW‑certified and Tesla‑specialized',
      'Combine with maintenance for maximum efficiency'
    ],
    apkCta: 'Book your APK',
    whyTitle: 'Why Tesla drivers choose Tesland',
    whyBullets: [
      'Original or high‑quality aftermarket parts',
      'Specialized Tesla technicians with years of experience',
      'No long waiting times, quick service',
      'Comfortable waiting area with great coffee and fast Wi‑Fi',
      'Eco‑friendly: energy‑positive, sustainable service center',
      'Replacement Teslas available when you need to stay mobile'
    ],
    checksTitle: 'Tesla summer & winter check',
    checksIntro: 'Our seasonal checks keep you safe on the road. We inspect:',
    checksBullets: [
      'Tires',
      'Fault codes',
      'HEPA filter',
      'Coolant',
      'Brakes',
      'Wiper blades & fluid',
      'Lighting'
    ],
    checksOutro: 'Have your air conditioning cleaned and filters replaced for a fresh, healthy car.',
    xpelTitle: 'XPEL: invisible paint protection and stylish window tint',
    xpelLead: 'Protect your Tesla professionally with XPEL film.',
    xpelBodyOne:
      'Our premium Paint Protection Film (PPF) guards paint against stone chips, scratches and grime — virtually invisible and self‑healing.',
    xpelBodyTwo:
      'XPEL window film adds comfort, privacy and a sleek look. It blocks heat and UV rays, keeping your interior looking new.',
    xpelBodyThree: 'Choose the best protection without compromising design.',
    xpelCta: 'More about PPF & window tint',
    tireHotelTitle: 'Tesland tire hotel',
    tireHotelBodyOne:
      'No space to store your tires at home? Tesland offers a dedicated tire hotel. Your tires are stored safely under ideal conditions so they last longer and perform better.',
    tireHotelBodyTwo:
      'For a small additional fee, we clean your tires inside and out during storage. They return fresh, free of brake dust and road salt.',
    appointmentTitle: 'Book an appointment',
    appointmentBody:
      'Keep your Tesla in top condition. Book maintenance or repairs online. If the schedule is full, call us for urgent assistance: 085 303 3403',
    appointmentCta: 'Book an appointment',
    contactTitle: 'Contact & opening hours',
    contactCompany: 'Tesland BV',
    contactHoursTitle: 'Opening hours',
    contactHoursWeek: 'Monday to Friday: 8.30 – 17.00',
    contactHoursWeekend: 'Saturday & Sunday: closed'
  },
  de: {
    title: 'Tesland – Tesla‑Spezialist für Wartung, Zubehör und Service',
    description:
      'Zuverlässiger Tesla‑Service gesucht? Tesland bietet Wartung, Teile, Zubehör und Expertise unter einem Dach. Spezialist seit 2015.',
    heroTitle: 'Der unabhängige Tesla‑Spezialist – europaweit geschätzt',
    heroBody:
      'Tesland ist Ihr unabhängiger Tesla‑Spezialist für Wartung, Reparaturen, Zubehör und APK. Wir bieten schnellen, fachkundigen Service für alles, was Ihr Tesla braucht — von Reifenwechsel und Achsvermessung bis zur großen Wartung. Schnell, zuverlässig und nachhaltig seit 2015.',
    heroCta: 'Wartungstermin buchen',
    apkTitle: 'Auch Ihre APK ist bei Tesland in besten Händen',
    apkBody:
      'Unsere erfahrenen Techniker führen die APK fachgerecht nach RDW‑Richtlinien durch. Tesland war eines der ersten Unternehmen in den Niederlanden mit Zertifizierung für APKs speziell für Elektrofahrzeuge. Kombinieren Sie die APK mit einer Wartung — so ist Ihr Tesla in einem Besuch bereit.',
    apkBullets: [
      'Schneller Termin, oft fertig während Sie warten',
      'RDW‑anerkannt und Tesla‑spezialisiert',
      'Mit Wartung kombinieren für maximale Effizienz'
    ],
    apkCta: 'APK buchen',
    whyTitle: 'Warum Tesla‑Fahrer Tesland wählen',
    whyBullets: [
      'Originalteile oder hochwertige Aftermarket‑Teile',
      'Spezialisierte Tesla‑Techniker mit jahrelanger Erfahrung',
      'Keine langen Wartezeiten, schnelle Hilfe',
      'Angenehmer Wartebereich mit gutem Kaffee und schnellem WLAN',
      'Umweltfreundlich: energiepositives, nachhaltiges Servicecenter',
      'Ersatz‑Teslas verfügbar, wenn Sie mobil bleiben möchten'
    ],
    checksTitle: 'Tesla Sommer‑ und Wintercheck',
    checksIntro: 'Mit unserem Saisoncheck bleiben Sie sicher unterwegs. Wir prüfen u. a.:',
    checksBullets: [
      'Reifen',
      'Fehlermeldungen',
      'HEPA‑Filter',
      'Kühlmittel',
      'Bremsen',
      'Wischerblätter & Flüssigkeit',
      'Beleuchtung'
    ],
    checksOutro: 'Lassen Sie auch Ihre Klimaanlage reinigen und Filter wechseln.',
    xpelTitle: 'XPEL: unsichtbarer Lackschutz & stilvolle Fensterfolie',
    xpelLead: 'Schützen Sie Ihren Tesla professionell mit XPEL‑Folie.',
    xpelBodyOne:
      'Unsere hochwertige Paint Protection Film (PPF) schützt den Lack vor Steinschlag, Kratzern und Schmutz — nahezu unsichtbar und selbstheilend.',
    xpelBodyTwo:
      'XPEL Fensterfolie sorgt für Komfort, Privatsphäre und einen eleganten Look. Sie hält Wärme und UV‑Strahlen draußen, damit der Innenraum länger schön bleibt.',
    xpelBodyThree: 'Wählen Sie besten Schutz ohne Design‑Kompromisse.',
    xpelCta: 'Mehr zu PPF & Scheibentönung',
    tireHotelTitle: 'Tesland Reifenhotel',
    tireHotelBodyOne:
      'Kein Platz für die Reifen zu Hause? Tesland bietet ein spezielles Reifenhotel. Ihre Reifen werden sicher unter idealen Bedingungen gelagert, damit sie länger halten.',
    tireHotelBodyTwo:
      'Gegen einen kleinen Aufpreis reinigen wir die Reifen innen und außen während der Lagerung.',
    appointmentTitle: 'Termin vereinbaren',
    appointmentBody:
      'Halten Sie Ihren Tesla in Top‑Zustand. Wartung oder Reparatur einfach online buchen. Ist der Kalender voll? Rufen Sie uns an: 085 303 3403',
    appointmentCta: 'Termin vereinbaren',
    contactTitle: 'Kontakt & Öffnungszeiten',
    contactCompany: 'Tesland BV',
    contactHoursTitle: 'Öffnungszeiten',
    contactHoursWeek: 'Montag bis Freitag: 8.30 – 17.00 Uhr',
    contactHoursWeekend: 'Samstag & Sonntag: geschlossen'
  },
  fr: {
    title: 'Tesland – Spécialiste Tesla pour l’entretien, les accessoires et le service',
    description:
      'Service Tesla fiable ? Tesland propose entretien, pièces, accessoires et expertise sous un même toit. Spécialiste depuis 2015.',
    heroTitle: 'Le spécialiste Tesla indépendant – reconnu dans toute l’Europe',
    heroBody:
      'Tesland est votre spécialiste Tesla indépendant pour l’entretien, les réparations, les accessoires et l’APK. Nous offrons un service rapide et expert pour tout ce dont votre Tesla a besoin — du changement de pneus à l’alignement, jusqu’à l’entretien complet. Rapide, fiable et durable depuis 2015.',
    heroCta: 'Planifier l’entretien',
    apkTitle: 'Votre contrôle APK est entre de bonnes mains',
    apkBody:
      'Nos techniciens expérimentés réalisent l’APK selon les directives RDW. Tesland a été l’une des premières entreprises aux Pays‑Bas certifiées pour l’APK des véhicules électriques. Combinez votre APK avec l’entretien pour repartir en toute sérénité.',
    apkBullets: [
      'Rendez‑vous rapide, souvent terminé pendant l’attente',
      'Certifié RDW et spécialisé Tesla',
      'Combinez avec l’entretien pour plus d’efficacité'
    ],
    apkCta: 'Planifier l’APK',
    whyTitle: 'Pourquoi les conducteurs Tesla choisissent Tesland',
    whyBullets: [
      'Pièces d’origine ou aftermarket de qualité',
      'Techniciens Tesla spécialisés avec des années d’expérience',
      'Pas de longues attentes, service rapide',
      'Espace d’attente agréable avec bon café et Wi‑Fi rapide',
      'Éco‑responsable : centre de service durable et énergétiquement positif',
      'Tesla de remplacement disponibles si vous devez rester mobile'
    ],
    checksTitle: 'Contrôle été & hiver Tesla',
    checksIntro: 'Nos contrôles saisonniers garantissent votre sécurité. Nous vérifions notamment :',
    checksBullets: [
      'Pneus',
      'Codes d’erreur',
      'Filtre HEPA',
      'Liquide de refroidissement',
      'Freins',
      'Essuie‑glaces & liquide',
      'Éclairage'
    ],
    checksOutro: 'Faites aussi nettoyer votre climatisation et remplacer les filtres.',
    xpelTitle: 'XPEL : protection de peinture et film solaire élégant',
    xpelLead: 'Protégez votre Tesla avec le film XPEL.',
    xpelBodyOne:
      'Notre film de protection PPF protège la peinture contre les impacts, rayures et saletés — quasi invisible et auto‑cicatrisant.',
    xpelBodyTwo:
      'Le film solaire XPEL améliore le confort, la confidentialité et le style. Il bloque la chaleur et les UV pour préserver l’intérieur.',
    xpelBodyThree: 'Choisissez la meilleure protection sans compromis.',
    xpelCta: 'Plus sur le PPF & vitrage teinté',
    ppfPopupTitle: 'Protégez votre Tesla avec le PPF',
    ppfPopupBody:
      'Avec nos films XPEL ULTIMATE PLUS et Stealth, votre peinture reste brillante et protégée des rayures.',
    ppfPopupCta: 'Planifier votre rendez‑vous PPF',
    ppfInfoTitle: 'Qu’est‑ce que la PPF (Paint Protection Film) ?',
    ppfInfoBody:
      'La PPF est un film transparent auto‑cicatrisant qui protège la peinture contre les impacts, insectes, fientes et plus encore.',
    ppfOptionsTitle: 'Nos options PPF',
    ppfOptions: [
      { title: 'Carrosserie complète', body: 'Protection maximale de l’avant à l’arrière.' },
      { title: 'Pack avant', body: 'Capot, pare‑chocs avant, ailes et rétroviseurs.' },
      { title: 'Finition mate (Stealth)', body: 'Protection solide avec un look mat unique.' }
    ],
    ppfBenefitsTitle: 'Pourquoi la PPF chez Tesland ?',
    ppfBenefits: [
      'Concessionnaire officiel XPEL & installateur premium',
      'Application professionnelle par des techniciens certifiés',
      'Brillance améliorée et protection de la peinture',
      'Auto‑cicatrisant pour les micro‑rayures',
      'Augmente la valeur de revente'
    ],
    ppfWindowTitle: 'Film solaire XPEL',
    ppfWindowBody:
      'Le film solaire XPEL bloque la chaleur et les UV, offrant plus de confort et protégeant l’intérieur.',
    ppfWindowBenefits: [
      'Bloque jusqu’à 98% de la chaleur infrarouge',
      'Protection contre les UV et la décoloration',
      'Plus de confidentialité et de confort',
      'Installation sans bulles ni plis'
    ],
    ppfClose: 'Fermer',
    tireHotelTitle: 'Hôtel de pneus Tesland',
    tireHotelBodyOne:
      'Pas de place pour stocker vos pneus ? Tesland propose un hôtel de pneus dédié. Vos pneus sont stockés en toute sécurité dans des conditions idéales.',
    tireHotelBodyTwo:
      'Pour un petit supplément, nous nettoyons vos pneus pendant le stockage.',
    appointmentTitle: 'Prendre rendez‑vous',
    appointmentBody:
      'Gardez votre Tesla en parfait état. Planifiez l’entretien ou la réparation en ligne. Si le planning est complet, appelez‑nous : 085 303 3403',
    appointmentCta: 'Prendre rendez‑vous',
    contactTitle: 'Contact & horaires',
    contactCompany: 'Tesland BV',
    contactHoursTitle: 'Horaires',
    contactHoursWeek: 'Lundi au vendredi : 8h30 – 17h00',
    contactHoursWeekend: 'Samedi & dimanche : fermé'
  }
}

const localePaths: Record<Locale, string> = {
  nl: '/nl/onderhoud',
  en: '/en/maintenance',
  de: '/de/wartung',
  fr: '/fr/entretien'
}

export const getMaintenanceMeta = (locale: Locale) => {
  const copy = copyByLocale[locale]
  return {
    title: copy.title,
    description: copy.description,
    alternates: {
      canonical: localePaths[locale],
      languages: {
        nl: localePaths.nl,
        en: localePaths.en,
        de: localePaths.de,
        fr: localePaths.fr
      }
    }
  }
}
