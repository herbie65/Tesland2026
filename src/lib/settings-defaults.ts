export const SETTINGS_DEFAULTS = {
  general: {
    companyName: "",
    contactEmail: "",
    contactPhone: "",
    address: ""
  },
  planning: {
    defaultDurationMinutes: 60,
    defaultStatus: "planned",
    dayStart: "08:00",
    dayEnd: "17:00",
    slotMinutes: 60,
    dayViewDays: 3,
    selectableSaturday: false,
    selectableSunday: false,
    breaks: []
  },
  workoverview: {
    columns: [
      "Afspraak",
      "Wachten",
      "Diagnose",
      "Wachten op toestemming",
      "Onder handen",
      "Gereed"
    ]
  },
  notifications: {
    senderEmail: "",
    notifyOnNewOrder: false,
    notifyOnPlanningChange: false,
    planningLeadHours: 24
  },
  email: {
    mode: "OFF",
    testRecipients: [],
    fromName: "Tesland",
    fromEmail: "noreply@tesland.nl",
    provider: "SMTP"
  },
  warehouseStatuses: {
    items: [
      { code: "ORDERED", label: "Onderdelen besteld", requiresEta: true },
      { code: "PICKING", label: "Onderdelen worden gepakt" },
      { code: "READY", label: "Onderdelen liggen klaar", requiresLocation: true }
    ]
  },
  rdwSettings: {
    bedrijfsnummer: "",
    keuringsinstantienummer: "",
    kvkNaam: "",
    kvkNummer: "",
    kvkVestigingsnummer: "",
    aansluitnummer: "",
    certificaatReferentie: "",
    enabled: false
  },
  siteHeader: {
    logoUrl: "",
    logoAlt: "Tesland",
    menuItems: [
      { label: "Onderhoud", href: "/onderhoud", hasDropdown: true },
      { label: "Reparaties", href: "/reparaties", hasDropdown: true },
      { label: "Accessoires", href: "/accessoires", hasDropdown: true },
      { label: "Onderdelen", href: "/onderdelen", hasDropdown: true },
      { label: "Winterwielen", href: "/winterwielen", hasDropdown: false },
      { label: "Fan-Shop", href: "/fan-shop", hasDropdown: false }
    ],
    actions: {
      showSearch: true,
      showAccount: true,
      showCart: true,
      cartCount: 0
    }
  },
  integrations: {
    webhookUrl: "",
    externalSystem: ""
  },
  absenceTypes: {
    items: [
      { code: "ZIEK", label: "Ziek", color: "#ef4444" },
      { code: "VERLOF", label: "Verlof", color: "#f59e0b" },
      { code: "BUITENGEWOON_VERLOF", label: "Buitengewoon verlof", color: "#8b5cf6" },
      { code: "VERGADERING", label: "Vergadering", color: "#3b82f6" },
      { code: "AFSPRAAK", label: "Afspraak", color: "#06b6d4" },
      { code: "VAKANTIE", label: "Vakantie", color: "#22c55e" }
    ]
  }
}
