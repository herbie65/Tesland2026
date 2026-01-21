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
    selectableSaturday: false,
    selectableSunday: false
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
  integrations: {
    webhookUrl: "",
    externalSystem: ""
  }
}
