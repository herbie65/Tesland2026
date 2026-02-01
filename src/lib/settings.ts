import { prisma } from '@/lib/prisma'

export type StatusEntry = {
  code: string
  label: string
  sortOrder?: number
}

export type PricingModeEntry = {
  code: string
  label: string
  sortOrder?: number
}

export type StatusSettings = {
  workOrder: StatusEntry[]
  partsLine: StatusEntry[]
  partsSummary: StatusEntry[]
}

export type DefaultsSettings = {
  workOrderStatus: string
  pricingMode: string
  partsSummaryStatus: string
}

export type PartsLogicSettings = {
  missingLineStatuses: string[]
  readyLineStatuses?: string[]
  completeSummaryStatuses: string[]
}

export type SalesStatusSettings = {
  orderStatus: StatusEntry[]
  paymentStatus: StatusEntry[]
  shipmentStatus: StatusEntry[]
  rmaStatus: StatusEntry[]
}

export type PaymentMethod = {
  code: string
  label: string
  sortOrder?: number
}

export type ShippingMethod = {
  code: string
  label: string
  sortOrder?: number
}

export type NumberingSettings = {
  orderPrefix: string
  invoicePrefix: string
  creditPrefix: string
  rmaPrefix: string
  yearLength: number
  sequenceLength: number
}

export type NotificationSettings = {
  enabled?: boolean
  leadTimeHoursDefault?: number
  planningLeadHours?: number
  dedupeMode?: string
  channels?: {
    inApp?: boolean
    email?: boolean
    push?: boolean
  }
  typesEnabled?: {
    planningRisk?: boolean
    etaDelay?: boolean
    approvalMissing?: boolean
  }
}

export type EmailSettings = {
  mode: 'OFF' | 'TEST' | 'LIVE'
  testRecipients: string[]
  fromName: string
  fromEmail: string
  provider: 'SMTP' | 'SENDGRID'
  // SMTP credentials
  smtpHost?: string
  smtpPort?: string
  smtpUser?: string
  smtpPassword?: string
  smtpSecure?: string | boolean
  // SendGrid credentials
  sendgridApiKey?: string
  // Email signature (HTML)
  signature?: string
}

export type VoipSettings = {
  enabled: boolean
  apiEmail: string
  apiToken: string
}

export type MollieSettings = {
  enabled: boolean
  apiKey: string
  testMode: boolean
  webhookUrl?: string
}

export type AbsenceType = {
  code: string
  label: string
  color: string
  deductsFromBalance?: boolean
}

export type WorkOrderDefaults = {
  workOrderStatusDefault: string
  defaultDurationMinutes: number
  laborLineDurationMinutes: number
}

export type ExecutionStatusRule = {
  when: {
    workOrderStatus?: string
    partsSummaryStatus?: string
  }
  executionStatus: string
}

export type ExecutionStatusRules = {
  rules: ExecutionStatusRule[]
}

export type WorkOrderTransition = {
  from: string
  to: string
  roles: string[]
  requiresOverride?: boolean
}

export type WorkOrderTransitionsSettings = {
  transitions: WorkOrderTransition[]
}

const readSettingsDoc = async (group: string) => {
  const setting = await prisma.setting.findUnique({
    where: { group },
  })
  
  if (!setting) {
    throw new Error(`Missing settings group: ${group}`)
  }
  
  return setting.data as any
}

const readSettingsDocOptional = async (group: string) => {
  const setting = await prisma.setting.findUnique({
    where: { group },
  })
  
  if (!setting) {
    return null
  }
  
  return setting.data as any
}

const seedNotificationSettings = async (): Promise<NotificationSettings> => {
  const payload: NotificationSettings = {
    enabled: true,
    leadTimeHoursDefault: 24,
    planningLeadHours: 24,
    dedupeMode: 'PER_DAY',
    channels: { inApp: true, email: false, push: false },
    typesEnabled: { planningRisk: true, etaDelay: true, approvalMissing: true }
  }
  
  await prisma.setting.upsert({
    where: { group: 'notifications' },
    update: { data: payload },
    create: {
      group: 'notifications',
      data: payload,
    },
  })
  
  return payload
}

const normalizeEntries = (value: any, groupLabel: string): StatusEntry[] => {
  if (!Array.isArray(value)) {
    throw new Error(`Expected array for ${groupLabel}`)
  }
  return value.map((entry) => ({
    code: String(entry.code || '').trim(),
    label: String(entry.label || '').trim(),
    sortOrder: Number.isFinite(Number(entry.sortOrder)) ? Number(entry.sortOrder) : undefined
  }))
}

export const getStatusSettings = async (): Promise<StatusSettings> => {
  const data = await readSettingsDoc('statuses')
  const workOrder = normalizeEntries(data.workOrder, 'statuses.workOrder')
  const partsLine = normalizeEntries(data.partsLine, 'statuses.partsLine')
  const partsSummary = normalizeEntries(data.partsSummary, 'statuses.partsSummary')
  return { workOrder, partsLine, partsSummary }
}

export const getPricingModes = async (): Promise<PricingModeEntry[]> => {
  const data = await readSettingsDoc('pricingModes')
  const source = Array.isArray(data) ? data : data.modes ?? data.items
  return normalizeEntries(source, 'pricingModes')
}

export const getDefaultsSettings = async (): Promise<DefaultsSettings> => {
  const data = await readSettingsDoc('defaults')
  const workOrderStatus = String(data.workOrderStatus || '').trim()
  const pricingMode = String(data.pricingMode || '').trim()
  const partsSummaryStatus = String(data.partsSummaryStatus || '').trim()
  if (!workOrderStatus || !pricingMode || !partsSummaryStatus) {
    throw new Error('Missing defaults settings fields')
  }
  return { workOrderStatus, pricingMode, partsSummaryStatus }
}

export const getPartsLogicSettings = async (): Promise<PartsLogicSettings> => {
  const data = await readSettingsDoc('partsLogic')
  const missingLineStatuses = Array.isArray(data.missingLineStatuses)
    ? data.missingLineStatuses.map((code: any) => String(code || '').trim()).filter(Boolean)
    : []
  const readyLineStatuses = Array.isArray(data.readyLineStatuses)
    ? data.readyLineStatuses.map((code: any) => String(code || '').trim()).filter(Boolean)
    : undefined
  const completeSummaryStatuses = Array.isArray(data.completeSummaryStatuses)
    ? data.completeSummaryStatuses.map((code: any) => String(code || '').trim()).filter(Boolean)
    : []
  if (!missingLineStatuses.length) {
    throw new Error('Missing partsLogic.missingLineStatuses')
  }
  if (!completeSummaryStatuses.length) {
    throw new Error('Missing partsLogic.completeSummaryStatuses')
  }
  return { missingLineStatuses, readyLineStatuses, completeSummaryStatuses }
}

export const getSalesStatusSettings = async (): Promise<SalesStatusSettings> => {
  const data = await readSettingsDoc('salesStatuses')
  return {
    orderStatus: normalizeEntries(data.orderStatus, 'salesStatuses.orderStatus'),
    paymentStatus: normalizeEntries(data.paymentStatus, 'salesStatuses.paymentStatus'),
    shipmentStatus: normalizeEntries(data.shipmentStatus, 'salesStatuses.shipmentStatus'),
    rmaStatus: normalizeEntries(data.rmaStatus, 'salesStatuses.rmaStatus')
  }
}

export const getPaymentMethods = async (): Promise<PaymentMethod[]> => {
  const data = await readSettingsDoc('paymentMethods')
  return normalizeEntries(Array.isArray(data) ? data : data.items, 'paymentMethods')
}

export const getShippingMethods = async (): Promise<ShippingMethod[]> => {
  const data = await readSettingsDoc('shippingMethods')
  return normalizeEntries(Array.isArray(data) ? data : data.items, 'shippingMethods')
}

export const getNumberingSettings = async (): Promise<NumberingSettings> => {
  const data = await readSettingsDoc('numbering')
  const orderPrefix = String(data.orderPrefix || '').trim()
  const invoicePrefix = String(data.invoicePrefix || '').trim()
  const creditPrefix = String(data.creditPrefix || '').trim()
  const rmaPrefix = String(data.rmaPrefix || '').trim()
  const yearLength = Number(data.yearLength || 2)
  const sequenceLength = Number(data.sequenceLength || 5)
  if (!orderPrefix || !invoicePrefix || !creditPrefix || !rmaPrefix) {
    throw new Error('Missing numbering prefixes in settings')
  }
  return {
    orderPrefix,
    invoicePrefix,
    creditPrefix,
    rmaPrefix,
    yearLength,
    sequenceLength
  }
}

export const getExecutionStatusRules = async (): Promise<ExecutionStatusRules> => {
  const data = await readSettingsDocOptional('executionStatusRules')
  if (!data) {
    return { rules: [] }
  }
  const rules = Array.isArray(data.rules) ? data.rules : []
  const normalized = rules
    .map((rule: any) => ({
      when: {
        workOrderStatus: rule?.when?.workOrderStatus ? String(rule.when.workOrderStatus).trim() : undefined,
        partsSummaryStatus: rule?.when?.partsSummaryStatus ? String(rule.when.partsSummaryStatus).trim() : undefined
      },
      executionStatus: String(rule?.executionStatus || '').trim()
    }))
    .filter((rule: ExecutionStatusRule) => rule.executionStatus)
  return { rules: normalized }
}

export const getWorkOrderTransitions = async (): Promise<WorkOrderTransitionsSettings> => {
  const data = await readSettingsDoc('workOrderTransitions')
  const source = Array.isArray(data.transitions) ? data.transitions : data.items ?? []
  if (!Array.isArray(source) || source.length === 0) {
    throw new Error('Missing workOrderTransitions.transitions')
  }
  const normalized = source.map((entry: any) => ({
    from: String(entry?.from || '').trim(),
    to: String(entry?.to || '').trim(),
    roles: Array.isArray(entry?.roles)
      ? entry.roles.map((role: any) => String(role || '').trim()).filter(Boolean)
      : [],
    requiresOverride: entry?.requiresOverride === true
  }))
  return { transitions: normalized }
}

export const getNotificationSettings = async (): Promise<NotificationSettings> => {
  const data = await readSettingsDocOptional('notifications')
  const resolved = data ?? (await seedNotificationSettings())
  const planningLeadHours = Number(resolved?.planningLeadHours ?? resolved?.leadTimeHoursDefault)
  return {
    enabled: resolved?.enabled ?? true,
    leadTimeHoursDefault: Number(resolved?.leadTimeHoursDefault ?? 24),
    planningLeadHours: Number.isFinite(planningLeadHours) ? planningLeadHours : undefined,
    dedupeMode: resolved?.dedupeMode,
    channels: resolved?.channels,
    typesEnabled: resolved?.typesEnabled
  }
}

export const getEmailSettings = async (): Promise<EmailSettings | null> => {
  const data = await readSettingsDocOptional('email')
  if (!data) return null
  const mode = String(data?.mode || 'OFF').toUpperCase()
  const provider = String(data?.provider || 'SMTP').toUpperCase()
  const testRecipients = Array.isArray(data?.testRecipients)
    ? data.testRecipients.map((item: any) => String(item || '').trim()).filter(Boolean)
    : []
  const fromName = String(data?.fromName || 'Tesland')
  const fromEmail = String(data?.fromEmail || 'noreply@tesland.nl')
  
  return {
    mode: mode === 'LIVE' ? 'LIVE' : mode === 'TEST' ? 'TEST' : 'OFF',
    testRecipients,
    fromName,
    fromEmail,
    provider: provider === 'SENDGRID' ? 'SENDGRID' : 'SMTP',
    // SMTP credentials
    smtpHost: data?.smtpHost ? String(data.smtpHost) : undefined,
    smtpPort: data?.smtpPort ? String(data.smtpPort) : undefined,
    smtpUser: data?.smtpUser ? String(data.smtpUser) : undefined,
    smtpPassword: data?.smtpPassword ? String(data.smtpPassword) : undefined,
    smtpSecure: data?.smtpSecure,
    // SendGrid credentials
    sendgridApiKey: data?.sendgridApiKey ? String(data.sendgridApiKey) : undefined,
    // Email signature
    signature: data?.signature ? String(data.signature) : undefined
  }
}

export const getWorkOrderDefaults = async (): Promise<WorkOrderDefaults> => {
  const defaults = await readSettingsDoc('defaults')
  const planning = await readSettingsDoc('planning')
  const workOrderStatusDefault = String(defaults.workOrderStatusDefault || '').trim()
  const duration = Number(planning.defaultDurationMinutes)
  const laborDuration = Number(planning.laborLineDurationMinutes)
  if (!workOrderStatusDefault) {
    throw new Error('Missing defaults.workOrderStatusDefault')
  }
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error('Missing planning.defaultDurationMinutes')
  }
  if (!Number.isFinite(laborDuration) || laborDuration <= 0) {
    throw new Error('Missing planning.laborLineDurationMinutes')
  }
  return {
    workOrderStatusDefault,
    defaultDurationMinutes: duration,
    laborLineDurationMinutes: laborDuration
  }
}

export const getVoipSettings = async (): Promise<VoipSettings | null> => {
  const data = await readSettingsDocOptional('voip')
  if (!data) return null
  
  return {
    enabled: data?.enabled === true,
    apiEmail: String(data?.apiEmail || ''),
    apiToken: String(data?.apiToken || '')
  }
}

export const getAbsenceTypes = async (): Promise<AbsenceType[]> => {
  const data = await readSettingsDoc('absenceTypes')
  const items = Array.isArray(data.items) ? data.items : []
  if (!items.length) {
    throw new Error('absenceTypes settings ontbreken')
  }
  return items.map((item: any) => {
    const code = String(item.code || '').trim()
    const label = String(item.label || '').trim()
    const color = String(item.color || '').trim()
    if (!code || !label || !color) {
      throw new Error('absenceTypes settings bevatten lege velden')
    }
    return {
      code,
      label,
      color,
      deductsFromBalance: item.deductsFromBalance === true || ['VERLOF', 'VAKANTIE'].includes(code)
    }
  })
}

export const assertStatusExists = (code: string, list: StatusEntry[], label: string) => {
  if (!list.some((entry) => entry.code === code)) {
    throw new Error(`Unknown status "${code}" for ${label}`)
  }
}

export const getStatusSortOrder = (code: string, list: StatusEntry[], label: string) => {
  const entry = list.find((item) => item.code === code)
  if (!entry) {
    throw new Error(`Unknown status "${code}" for ${label}`)
  }
  if (!Number.isFinite(entry.sortOrder)) {
    throw new Error(`Missing sortOrder for status "${code}" in ${label}`)
  }
  return Number(entry.sortOrder)
}

export const getMollieSettings = async (): Promise<MollieSettings | null> => {
  try {
    const data = await readSettingsDocOptional('mollie')
    if (!data) {
      return null
    }
    return {
      enabled: data.enabled === true,
      apiKey: String(data.apiKey || ''),
      testMode: data.testMode === true,
      webhookUrl: data.webhookUrl ? String(data.webhookUrl) : undefined
    }
  } catch (error) {
    console.error('[getMollieSettings] Error:', error)
    return null
  }
}
