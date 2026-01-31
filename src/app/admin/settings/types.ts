export type SettingsGroup = {
  id: string
  group: string
  data: Record<string, any>
}

export const SETTINGS_DEFAULTS: Record<string, any> = {
  general: {
    companyName: '',
    contactEmail: '',
    contactPhone: '',
    address: ''
  },
  planning: {
    defaultDurationMinutes: 60,
    defaultStatus: 'planned',
    dayStart: '08:30',
    dayEnd: '16:30',
    slotMinutes: 60,
    dayViewDays: 3,
    selectableSaturday: false,
    selectableSunday: false,
    breaks: []
  },
  workoverview: {
    columns: []
  },
  notifications: {
    senderEmail: '',
    notifyOnNewOrder: false,
    notifyOnPlanningChange: false,
    planningLeadHours: 24
  },
  email: {
    mode: 'OFF',
    testRecipients: [],
    fromName: '',
    fromEmail: '',
    provider: 'SMTP'
  },
  warehouseStatuses: {
    items: []
  },
  rdwSettings: {
    bedrijfsnummer: '',
    keuringsinstantienummer: '',
    kvkNaam: '',
    kvkNummer: '',
    kvkVestigingsnummer: '',
    aansluitnummer: '',
    certificaatReferentie: '',
    enabled: false
  },
  siteHeader: {
    logoUrl: '',
    logoAlt: '',
    menuItems: [],
    actions: {}
  },
  integrations: {
    webhookUrl: '',
    externalSystem: ''
  },
  absenceTypes: { 
    items: [] 
  }
}
