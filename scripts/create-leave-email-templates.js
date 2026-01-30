const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createLeaveEmailTemplates() {
  console.log('Creating leave management email templates...')

  // Template 1: New Leave Request (to managers)
  await prisma.emailTemplate.upsert({
    where: { id: 'leave-request-new' },
    update: {},
    create: {
      id: 'leave-request-new',
      name: 'Nieuwe verlofaanvraag',
      subject: 'Nieuwe verlofaanvraag van {{employeeName}}',
      body: `<p>Beste {{managerName}},</p>

<p>{{employeeName}} heeft een verlofaanvraag ingediend:</p>

<p><strong>Type:</strong> {{absenceType}}<br>
<strong>Periode:</strong> {{startDate}} tot {{endDate}}<br>
<strong>Aantal dagen:</strong> {{totalDays}}<br>
<strong>Reden:</strong> {{reason}}</p>

<p>Log in op het systeem om de aanvraag goed te keuren of af te wijzen.</p>

<p>Met vriendelijke groet,<br>
Het HR Systeem</p>`,
      isActive: true,
    },
  })

  // Template 2: Leave Request Approved (to employee)
  await prisma.emailTemplate.upsert({
    where: { id: 'leave-request-approved' },
    update: {},
    create: {
      id: 'leave-request-approved',
      name: 'Verlofaanvraag goedgekeurd',
      subject: 'Je verlofaanvraag is goedgekeurd',
      body: `<p>Beste {{employeeName}},</p>

<p>Goed nieuws! Je verlofaanvraag is goedgekeurd door {{reviewerName}}.</p>

<p><strong>Type:</strong> {{absenceType}}<br>
<strong>Periode:</strong> {{startDate}} tot {{endDate}}<br>
<strong>Aantal dagen:</strong> {{totalDays}}</p>

{{#if reviewNotes}}
<p><strong>Opmerking:</strong> {{reviewNotes}}</p>
{{/if}}

<p>Fijne vakantie gewenst!</p>

<p>Met vriendelijke groet,<br>
Het HR Team</p>`,
      isActive: true,
    },
  })

  // Template 3: Leave Request Rejected (to employee)
  await prisma.emailTemplate.upsert({
    where: { id: 'leave-request-rejected' },
    update: {},
    create: {
      id: 'leave-request-rejected',
      name: 'Verlofaanvraag afgewezen',
      subject: 'Je verlofaanvraag is afgewezen',
      body: `<p>Beste {{employeeName}},</p>

<p>Helaas moeten we je laten weten dat je verlofaanvraag is afgewezen.</p>

<p><strong>Type:</strong> {{absenceType}}<br>
<strong>Periode:</strong> {{startDate}} tot {{endDate}}<br>
<strong>Aantal dagen:</strong> {{totalDays}}</p>

<p><strong>Reden afwijzing:</strong> {{reviewNotes}}</p>

<p>Voor vragen kun je contact opnemen met {{reviewerName}}.</p>

<p>Met vriendelijke groet,<br>
Het HR Team</p>`,
      isActive: true,
    },
  })

  console.log('✅ Email templates created successfully!')
}

createLeaveEmailTemplates()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
