import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getEmailSettings } from '@/lib/settings'

export async function POST(request: NextRequest) {
  console.log('[Test Email] POST /api/settings/email/test - Request received')
  
  try {
    console.log('[Test Email] Checking authentication...')
    await requireRole(request, ['MANAGEMENT'])
    console.log('[Test Email] Authentication passed')

    console.log('[Test Email] Loading email settings...')
    const settings = await getEmailSettings()
    
    console.log('[Test Email] Email settings:', JSON.stringify(settings, null, 2))
    
    if (!settings) {
      console.error('[Test Email] Email instellingen niet gevonden')
      return NextResponse.json(
        { success: false, error: 'Email instellingen niet gevonden' },
        { status: 400 }
      )
    }

    if (settings.mode === 'OFF') {
      console.error('[Test Email] Email mode is OFF')
      return NextResponse.json(
        { success: false, error: 'Email staat uit. Zet mode op TEST of LIVE.' },
        { status: 400 }
      )
    }

    // Determine test recipient
    const testRecipient = settings.mode === 'TEST' && settings.testRecipients?.length > 0
      ? settings.testRecipients[0]
      : settings.fromEmail

    console.log('[Test Email] Test recipient:', testRecipient)

    if (!testRecipient) {
      console.error('[Test Email] Geen test ontvanger gevonden')
      return NextResponse.json(
        { success: false, error: 'Geen test ontvanger gevonden. Vul een test ontvanger in.' },
        { status: 400 }
      )
    }

    // Validate From Email
    if (!settings.fromEmail || !settings.fromName) {
      console.error('[Test Email] From email/name ontbreekt')
      return NextResponse.json(
        { success: false, error: 'From e-mail en From naam zijn verplicht' },
        { status: 400 }
      )
    }

    // Validate SMTP/SendGrid settings
    if (settings.provider === 'SMTP') {
      console.log('[Test Email] Validating SMTP settings...')
      if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPassword) {
        console.error('[Test Email] SMTP credentials incomplete:', {
          hasHost: !!settings.smtpHost,
          hasUser: !!settings.smtpUser,
          hasPassword: !!settings.smtpPassword
        })
        return NextResponse.json(
          { success: false, error: 'SMTP credentials zijn niet compleet (Host, Gebruiker, Wachtwoord vereist)' },
          { status: 400 }
        )
      }
    } else if (settings.provider === 'SENDGRID') {
      console.log('[Test Email] Validating SendGrid settings...')
      if (!settings.sendgridApiKey) {
        console.error('[Test Email] SendGrid API Key ontbreekt')
        return NextResponse.json(
          { success: false, error: 'SendGrid API Key is niet ingevuld' },
          { status: 400 }
        )
      }
    }

    console.log('[Test Email] All validations passed, sending email...')

    // Create a simple test template on the fly
    const testSubject = 'Test email van TESland'
    const testBody = `Dit is een test email van TESland.

Email instellingen:
- Mode: ${settings.mode}
- Provider: ${settings.provider}
- From: ${settings.fromName} <${settings.fromEmail}>
${settings.provider === 'SMTP' ? `- SMTP Host: ${settings.smtpHost}
- SMTP Port: ${settings.smtpPort}
- SMTP User: ${settings.smtpUser}` : ''}

Als u deze email ontvangt, werken de instellingen correct!

Met vriendelijke groet,
TESland Email Systeem`

    // Send directly based on provider
    if (settings.provider === 'SMTP') {
      console.log('[Test Email] Sending via SMTP...')
      const nodemailer = require('nodemailer')
      const transporter = nodemailer.createTransport({
        host: settings.smtpHost,
        port: Number(settings.smtpPort || 587),
        secure: settings.smtpSecure === 'true' || settings.smtpSecure === true,
        auth: {
          user: settings.smtpUser,
          pass: settings.smtpPassword
        }
      })
      
      await transporter.sendMail({
        from: `"${settings.fromName}" <${settings.fromEmail}>`,
        to: testRecipient,
        subject: testSubject,
        text: testBody
      })
      console.log('[Test Email] SMTP email sent successfully')
    } else {
      console.log('[Test Email] Sending via SendGrid...')
      const sgMail = require('@sendgrid/mail')
      sgMail.setApiKey(settings.sendgridApiKey)
      await sgMail.send({
        to: testRecipient,
        from: { email: settings.fromEmail, name: settings.fromName },
        subject: testSubject,
        text: testBody
      })
      console.log('[Test Email] SendGrid email sent successfully')
    }

    console.log('[Test Email] Returning success response')
    return NextResponse.json({
      success: true,
      message: `Test email verzonden naar ${testRecipient}`,
      recipient: testRecipient
    })
  } catch (error: any) {
    console.error('[Test Email] Error:', error)
    console.error('[Test Email] Error stack:', error.stack)
    return NextResponse.json(
      { success: false, error: error.message || 'Onbekende fout bij versturen test email' },
      { status: 500 }
    )
  }
}
