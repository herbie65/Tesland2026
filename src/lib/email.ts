import nodemailer from 'nodemailer'
import sgMail from '@sendgrid/mail'
import { prisma } from '@/lib/prisma'
import { getEmailSettings } from '@/lib/settings'

type EmailTemplate = {
  id: string
  name?: string
  isActive?: boolean
  subject?: string
  body?: string
}

type SendEmailInput = {
  templateId: string
  to: string | string[]
  variables?: Record<string, string>
}

const renderTemplate = (value: string, variables: Record<string, string>) => {
  return value.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? '')
}

const loadTemplate = async (templateId: string) => {
  const template = await prisma.emailTemplate.findUnique({
    where: { id: templateId },
  })
  
  if (!template) {
    return null
  }
  
  return template as EmailTemplate
}

const logEmail = async (payload: Record<string, any>) => {
  await prisma.emailLog.create({
    data: {
      to: payload.to,
      from: payload.from || null,
      subject: payload.subject,
      templateId: payload.templateId || null,
      status: payload.status || 'sent',
      error: payload.error || null,
      sentAt: new Date(),
    },
  })
}

const sendViaSmtp = async (payload: {
  to: string[]
  fromEmail: string
  fromName: string
  subject: string
  text: string
  html?: string
}) => {
  const settings = await getEmailSettings()
  
  if (!settings) {
    throw new Error('Email instellingen niet gevonden. Configureer deze via Instellingen.')
  }
  
  const host = settings.smtpHost
  const port = Number(settings.smtpPort || 587)
  const user = settings.smtpUser
  const pass = settings.smtpPassword
  const secure = settings.smtpSecure === 'true' || settings.smtpSecure === true
  
  if (!host || !user || !pass) {
    throw new Error('SMTP credentials zijn niet compleet. Vul SMTP Host, Gebruiker en Wachtwoord in.')
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
    text: payload.text,
    html: payload.html || payload.text.replace(/\n/g, '<br>')
  })
}

const sendViaSendgrid = async (payload: {
  to: string[]
  fromEmail: string
  fromName: string
  subject: string
  text: string
  html?: string
}) => {
  const settings = await getEmailSettings()
  
  if (!settings) {
    throw new Error('Email instellingen niet gevonden. Configureer deze via Instellingen.')
  }
  
  const apiKey = settings.sendgridApiKey
  
  if (!apiKey) {
    throw new Error('SendGrid API Key is niet ingevuld. Vul deze in bij de email instellingen.')
  }
  
  sgMail.setApiKey(apiKey)
  await sgMail.send({
    to: payload.to,
    from: { email: payload.fromEmail, name: payload.fromName },
    subject: payload.subject,
    text: payload.text,
    html: payload.html || payload.text.replace(/\n/g, '<br>')
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
      to: toOriginal.join(', '),
      templateId,
      subject: '',
      status: 'failed',
      error: 'Template not found'
    })
    return { success: false, error: 'Template not found' }
  }

  if (template.isActive === false) {
    await logEmail({
      to: toOriginal.join(', '),
      templateId,
      subject: template.subject || '',
      status: 'failed',
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
      to: toOriginal.join(', '),
      templateId,
      subject: template.subject || '',
      status: 'failed',
      error: 'No recipients'
    })
    return { success: false, error: 'No recipients' }
  }

  const subject = renderTemplate(template.subject || '', variables)
  const bodyHtml = renderTemplate(template.body || '', variables)
  
  // Convert paragraph tags to line breaks for better email formatting
  const cleanHtml = bodyHtml
    .replace(/<\/p><p>/g, '</p><br><p>') // Add break between paragraphs
    .replace(/<p><\/p>/g, '<br>') // Empty paragraphs become line breaks
    .replace(/<p>/g, '') // Remove opening p tags
    .replace(/<\/p>/g, '<br>') // Convert closing p tags to breaks
  
  // Generate HTML version with signature
  let html = cleanHtml
  if (settings.signature) {
    html = `${html}<br><br>---<br>${settings.signature}`
  }
  
  // Plain text version (strip HTML tags)
  const text = bodyHtml.replace(/<[^>]*>/g, '').replace(/\n\n+/g, '\n\n')

  try {
    if (settings.provider === 'SENDGRID') {
      await sendViaSendgrid({
        to: toActual,
        fromEmail: settings.fromEmail,
        fromName: settings.fromName,
        subject,
        text,
        html
      })
    } else {
      await sendViaSmtp({
        to: toActual,
        fromEmail: settings.fromEmail,
        fromName: settings.fromName,
        subject,
        text,
        html
      })
    }

    await logEmail({
      to: toActual.join(', '),
      from: `${settings.fromName} <${settings.fromEmail}>`,
      templateId,
      subject,
      status: 'sent'
    })
    return { success: true }
  } catch (error: any) {
    await logEmail({
      to: toActual.join(', '),
      from: `${settings.fromName} <${settings.fromEmail}>`,
      templateId,
      subject,
      status: 'failed',
      error: error.message
    })
    return { success: false, error: error.message }
  }
}
