import nodemailer from 'nodemailer'
import sgMail from '@sendgrid/mail'
import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
import { getEmailSettings } from '@/lib/settings'

type EmailTemplate = {
  id: string
  enabled?: boolean
  subject?: string
  bodyText?: string
}

type SendEmailInput = {
  templateId: string
  to: string | string[]
  variables?: Record<string, string>
}

const ensureFirestore = () => {
  ensureAdmin()
  if (!adminFirestore) {
    throw new Error('Firebase Admin not initialized')
  }
  return adminFirestore
}

const renderTemplate = (value: string, variables: Record<string, string>) => {
  return value.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? '')
}

const loadTemplate = async (templateId: string) => {
  const firestore = ensureFirestore()
  const docSnap = await firestore.collection('emailTemplates').doc(templateId).get()
  if (!docSnap.exists) {
    return null
  }
  return { id: docSnap.id, ...docSnap.data() } as EmailTemplate
}

const logEmail = async (payload: Record<string, any>) => {
  const firestore = ensureFirestore()
  const nowIso = new Date().toISOString()
  await firestore.collection('emailLogs').add({ ...payload, sentAt: nowIso })
}

const sendViaSmtp = async (payload: {
  to: string[]
  fromEmail: string
  fromName: string
  subject: string
  text: string
}) => {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const secure = process.env.SMTP_SECURE === 'true'
  if (!host || !user || !pass) {
    throw new Error('Missing SMTP credentials')
  }
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  })
  await transporter.sendMail({
    from: `"${payload.fromName}" <${payload.fromEmail}>`,
    to: payload.to.join(','),
    subject: payload.subject,
    text: payload.text
  })
}

const sendViaSendgrid = async (payload: {
  to: string[]
  fromEmail: string
  fromName: string
  subject: string
  text: string
}) => {
  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) {
    throw new Error('Missing SENDGRID_API_KEY')
  }
  sgMail.setApiKey(apiKey)
  await sgMail.send({
    to: payload.to,
    from: { email: payload.fromEmail, name: payload.fromName },
    subject: payload.subject,
    text: payload.text
  })
}

export const sendTemplatedEmail = async ({ templateId, to, variables = {} }: SendEmailInput) => {
  const settings = await getEmailSettings()
  if (!settings) {
    return { success: false, error: 'Email settings missing' }
  }
  const mode = settings.mode
  const template = await loadTemplate(templateId)
  const toOriginal = Array.isArray(to) ? to : [to]

  if (!template) {
    await logEmail({
      templateId,
      mode,
      toOriginal,
      toActual: [],
      subject: '',
      success: false,
      error: 'Template not found'
    })
    return { success: false, error: 'Template not found' }
  }

  if (template.enabled === false) {
    await logEmail({
      templateId,
      mode,
      toOriginal,
      toActual: [],
      subject: template.subject || '',
      success: false,
      error: 'Template disabled'
    })
    return { success: false, error: 'Template disabled' }
  }

  if (mode === 'OFF') {
    return { success: false, error: 'Mode OFF' }
  }

  const toActual =
    mode === 'TEST'
      ? (settings.testRecipients || []).filter(Boolean)
      : toOriginal

  if (!toActual.length) {
    await logEmail({
      templateId,
      mode,
      toOriginal,
      toActual: [],
      subject: template.subject || '',
      success: false,
      error: 'No recipients'
    })
    return { success: false, error: 'No recipients' }
  }

  const subject = renderTemplate(template.subject || '', variables)
  const text = renderTemplate(template.bodyText || '', variables)

  try {
    if (settings.provider === 'SENDGRID') {
      await sendViaSendgrid({
        to: toActual,
        fromEmail: settings.fromEmail,
        fromName: settings.fromName,
        subject,
        text
      })
    } else {
      await sendViaSmtp({
        to: toActual,
        fromEmail: settings.fromEmail,
        fromName: settings.fromName,
        subject,
        text
      })
    }

    await logEmail({
      templateId,
      mode,
      toOriginal,
      toActual,
      subject,
      success: true
    })
    return { success: true }
  } catch (error: any) {
    await logEmail({
      templateId,
      mode,
      toOriginal,
      toActual,
      subject,
      success: false,
      error: error.message
    })
    return { success: false, error: error.message }
  }
}
