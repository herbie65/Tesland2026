# Mollie Payment Integratie

Deze documentatie beschrijft de Mollie payment integratie in TLadmin.

## Overzicht

De Mollie integratie stelt klanten in staat om facturen direct online te betalen via iDEAL, creditcard, Bancontact en andere betaalmethodes. De betaalstatus wordt automatisch bijgewerkt via webhooks.

## Features

- ✅ **Online betalingen**: Klanten kunnen facturen direct betalen
- ✅ **Meerdere betaalmethodes**: iDEAL, creditcard, Bancontact, etc.
- ✅ **Automatische statusupdates**: Via Mollie webhooks
- ✅ **Test & Live modus**: Veilig testen met test API key
- ✅ **Payment tracking**: Alle betalingen worden opgeslagen in de database
- ✅ **Admin dashboard**: Overzicht van alle betalingen per factuur

## Installatie

### 1. NPM Package

De Mollie client is al geïnstalleerd via:
```bash
npm install @mollie/api-client
```

### 2. Database Migratie

Voer de database migratie uit om de `payments` tabel aan te maken:

```bash
psql -d your_database < prisma/migrations/add_payments_table.sql
```

### 3. Prisma Schema

Het Payment model is toegevoegd aan `prisma/schema.prisma`. Genereer de Prisma client:

```bash
npm run prisma:generate
```

## Configuratie

### 1. Mollie Account

1. Maak een account aan op [mollie.com](https://www.mollie.com)
2. Ga naar **Developers** → **API keys**
3. Kopieer je **Test API key** (begint met `test_`)
4. Voor productie: kopieer je **Live API key** (begint met `live_`)

### 2. TLadmin Settings

1. Log in als SYSTEM_ADMIN
2. Ga naar **Admin** → **Instellingen** → **💳 Mollie Betalingen**
3. Configureer de instellingen:
   - **Schakel Mollie in**: Toggle aan
   - **Test Modus**: Aan voor development, Uit voor productie
   - **API Key**: Plak je Mollie API key
   - **Webhook URL**: Wordt automatisch ingevuld
4. Klik op **Test Connectie** om te verifiëren
5. Klik op **Opslaan**

### 3. Webhook Configuratie (Productie)

Voor productie moet je de webhook URL configureren in je Mollie dashboard:

1. Ga naar [Mollie Dashboard](https://www.mollie.com/dashboard) → **Developers** → **Webhooks**
2. Voeg een nieuwe webhook toe:
   ```
   https://yourdomain.com/api/payments/mollie/webhook
   ```
3. Voor development kun je [ngrok](https://ngrok.com) gebruiken om webhooks lokaal te testen

## Gebruik

### Betaling Aanmaken via API

```typescript
// POST /api/payments/mollie
const response = await fetch('/api/payments/mollie', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    invoiceId: 'uuid-van-factuur',
    amount: '125.50',
    description: 'Factuur FAC-2024-0123'
  })
})

const { success, payment, checkoutUrl } = await response.json()

if (success) {
  // Redirect klant naar checkoutUrl om te betalen
  window.location.href = checkoutUrl
}
```

### Betaling Status Ophalen

```typescript
// GET /api/payments/mollie/[id]
const response = await fetch('/api/payments/mollie/abc123')
const { success, payment } = await response.json()

console.log(payment.status) // 'open', 'paid', 'canceled', etc.
```

### Betaling Annuleren

```typescript
// DELETE /api/payments/mollie/[id]
const response = await fetch('/api/payments/mollie/abc123', {
  method: 'DELETE'
})
```

### Betalingen van Factuur Ophalen

```typescript
// GET /api/payments/mollie?invoiceId=xxx
const response = await fetch('/api/payments/mollie?invoiceId=xxx')
const { success, payments } = await response.json()
```

## Webhook Flow

1. Klant betaalt via Mollie checkout
2. Mollie stuurt webhook naar `/api/payments/mollie/webhook`
3. Server haalt payment status op bij Mollie
4. Payment status wordt bijgewerkt in database
5. Als status = `paid`: Factuur wordt automatisch gemarkeerd als "BETAALD"

## Payment Statuses

- **open**: Betaling is aangemaakt maar nog niet afgerond
- **paid**: Betaling is succesvol afgerond
- **canceled**: Betaling is geannuleerd
- **expired**: Betaling is verlopen
- **failed**: Betaling is mislukt

## Database Schema

### Payment Model

```prisma
model Payment {
  id                 String    @id @default(uuid())
  invoiceId          String
  provider           String    @default("MOLLIE")
  providerPaymentId  String?   // Mollie payment ID (tr_...)
  amount             Decimal
  currency           String    @default("EUR")
  status             String    @default("open")
  description        String?
  checkoutUrl        String?
  webhookUrl         String?
  metadata           Json?
  
  createdAt  DateTime
  updatedAt  DateTime
  paidAt     DateTime?
  canceledAt DateTime?
  expiredAt  DateTime?
  failedAt   DateTime?
  
  createdBy String?
  
  invoice Invoice @relation(fields: [invoiceId], references: [id])
}
```

## API Endpoints

### Payment Endpoints

- `GET /api/payments/mollie?invoiceId=xxx` - List payments voor factuur
- `POST /api/payments/mollie` - Maak nieuwe payment
- `GET /api/payments/mollie/[id]` - Haal payment op
- `PATCH /api/payments/mollie/[id]` - Sync payment status met Mollie
- `DELETE /api/payments/mollie/[id]` - Annuleer payment

### Webhook

- `POST /api/payments/mollie/webhook` - Mollie webhook voor status updates

### Settings

- `GET /api/settings/mollie` - Haal Mollie settings op
- `POST /api/settings/mollie` - Update Mollie settings
- `POST /api/settings/mollie/test` - Test Mollie connectie

## Library Files

### Core Files

- `src/lib/mollie-client.ts` - Mollie API client wrapper
- `src/lib/settings.ts` - Settings helper (getMollieSettings)

### API Routes

- `src/app/api/payments/mollie/route.ts` - Payment CRUD
- `src/app/api/payments/mollie/[id]/route.ts` - Single payment
- `src/app/api/payments/mollie/webhook/route.ts` - Webhook handler
- `src/app/api/settings/mollie/route.ts` - Settings CRUD
- `src/app/api/settings/mollie/test/route.ts` - Connection test

### Admin Pages

- `src/app/admin/settings/mollie/page.tsx` - Settings page wrapper
- `src/app/admin/settings/mollie/MollieSettingsClient.tsx` - Settings UI

## Environment Variables

Optioneel kun je de base URL voor webhooks instellen:

```env
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

Als deze niet is ingesteld, moet je de webhook URL handmatig configureren in de admin settings.

## Testing

### Test Mode

In test mode:
- Gebruik een test API key (`test_...`)
- Betalingen worden niet echt verwerkt
- Je kunt test betalingen doen op [mollie.com/checkout/test-mode](https://www.mollie.com/checkout/test-mode)

### Test Betaalmethodes

Mollie biedt verschillende test betaalmethodes:
- **iDEAL**: Gebruik test bank "TBM Bank"
- **Creditcard**: Gebruik test nummers van Mollie docs

### Webhook Testing

Voor lokale webhook testing:

1. Installeer ngrok: `npm install -g ngrok`
2. Start ngrok: `ngrok http 3000`
3. Gebruik de ngrok URL in je webhook configuratie: `https://xxx.ngrok.io/api/payments/mollie/webhook`

## Productie

### Checklist

- [ ] Mollie account geactiveerd voor live payments
- [ ] Live API key ingesteld in TLadmin
- [ ] Test Modus uitgeschakeld
- [ ] Webhook URL correct geconfigureerd in Mollie dashboard
- [ ] SSL certificaat actief op je domein
- [ ] Test betalingen succesvol afgerond

### Security

- API keys worden opgeslagen in de database (encrypted aanbevolen voor productie)
- Webhook endpoint valideert payment IDs
- Alleen MANAGEMENT en SYSTEM_ADMIN kunnen settings aanpassen
- Alle payment mutations worden gelogd met `createdBy`

## Troubleshooting

### Webhook komt niet aan

1. Check of webhook URL correct is in Mollie dashboard
2. Controleer firewall/server instellingen
3. Test met ngrok voor lokale development
4. Check logs in Mollie dashboard onder "Developers" → "API Logs"

### Payment status niet bijgewerkt

1. Handmatig synchroniseren via `PATCH /api/payments/mollie/[id]`
2. Check webhook logs in je server terminal
3. Verificeer payment status in Mollie dashboard

### API Key errors

1. Controleer of je de juiste key gebruikt (test vs live)
2. Test key moet beginnen met `test_`
3. Live key moet beginnen met `live_`
4. Test connectie via admin settings pagina

## Support

- Mollie Documentatie: [docs.mollie.com](https://docs.mollie.com)
- Mollie Support: [mollie.com/contact](https://www.mollie.com/contact)
- TLadmin Issues: Neem contact op met je development team

## Licentie

Deze integratie maakt gebruik van de officiële Mollie API client.
