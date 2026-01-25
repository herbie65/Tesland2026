# Email Bevestiging - Test Instructies

## ✅ Systeem Configuratie Voltooid

### Database Setup
1. **Email Settings** (TEST mode)
   - Mode: `TEST` (emails worden alleen naar testRecipients gestuurd)
   - Provider: `SMTP`
   - From Email: `noreply@tesland.nl`
   - From Name: `TESland Enschede`
   - Test Recipients: `herbert@tesland.nl`

2. **Email Template** (`appointment_confirmed`)
   - Subject: `Bevestiging afspraak {{datum}} om {{tijd}}`
   - Variables: `klantNaam`, `datum`, `tijd`, `kenteken`
   - Status: Actief

3. **Email Logs Table**
   - Klaar om emails te loggen

## 🔧 SMTP Configuratie Vereist

Om emails daadwerkelijk te versturen, moet je de volgende environment variables instellen in `.env.local`:

```bash
SMTP_HOST=smtp.jouwprovider.nl
SMTP_PORT=587
SMTP_USER=jouw@email.nl
SMTP_PASS=jouwwachtwoord
SMTP_SECURE=false  # true voor port 465, false voor 587
```

**Voorbeelden voor populaire providers:**

### Gmail
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=jouw@gmail.com
SMTP_PASS=app-specific-password  # Niet je normale wachtwoord!
SMTP_SECURE=false
```
*Let op: Voor Gmail moet je een App-specific password aanmaken in je Google Account settings.*

### Office 365 / Outlook
```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=jouw@bedrijf.nl
SMTP_PASS=jouwwachtwoord
SMTP_SECURE=false
```

### Transip / VPS
```bash
SMTP_HOST=smtp.transip.email
SMTP_PORT=587
SMTP_USER=noreply@tesland.nl
SMTP_PASS=jouwwachtwoord
SMTP_SECURE=false
```

## 📧 Test Procedure

### Stap 1: Configureer SMTP
1. Maak een `.env.local` bestand in `/TLadmin/`
2. Voeg de SMTP credentials toe (zie voorbeelden hierboven)
3. Herstart de Next.js server: `npm run dev`

### Stap 2: Test Email Versturen
1. Open **Planning** in de admin
2. Klik **"Nieuwe planning"**
3. Vul in:
   - Kies een **klant met email** (bijv. "'T Hollandsche Autohuys")
   - Kies een **datum en tijd**
   - Kies een **voertuig**
   - Vul een **omschrijving** in

4. **Belangrijk**: Vink aan **"Bevestigingsmail sturen"**
   - Deze optie verschijnt alleen als de geselecteerde klant een email adres heeft

5. Klik **"Toevoegen"**

### Stap 3: Controleer Resultaat

#### In TEST Mode
- Email wordt NIET naar de klant gestuurd
- Email wordt alleen naar `herbert@tesland.nl` gestuurd
- Check je inbox voor testmail

#### Check Logs in Database
```sql
SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 5;
```

#### Check Console Output
In de terminal waar Next.js draait zie je:
```
[Email] Sending confirmation email to: herbert@tesland.nl
[Email] Successfully sent confirmation email
```

Of bij fouten:
```
[Email] Failed to send: [error message]
```

## 🚀 Productie Activeren

Als je klaar bent om echte emails naar klanten te sturen:

```sql
UPDATE settings 
SET data = jsonb_set(data, '{mode}', '"LIVE"')
WHERE "group" = 'email';
```

In LIVE mode worden emails naar de echte klant email adressen gestuurd.

## 📊 Email Statistieken Bekijken

```sql
-- Laatste 10 verstuurde emails
SELECT 
  sent_at,
  "to",
  subject,
  status,
  error
FROM email_logs 
ORDER BY sent_at DESC 
LIMIT 10;

-- Email statistieken
SELECT 
  status,
  COUNT(*) as aantal
FROM email_logs
GROUP BY status;
```

## ⚠️ Troubleshooting

### "Missing SMTP credentials" error
- Check of `.env.local` bestaat en de SMTP variabelen bevat
- Herstart de Next.js server na het aanmaken/wijzigen van `.env.local`

### "Template not found" error
- Check of de template bestaat: `SELECT * FROM email_templates WHERE id = 'appointment_confirmed';`

### "Email settings missing" error
- Check of email settings bestaan: `SELECT * FROM settings WHERE "group" = 'email';`

### Email komt niet aan
- Check SPAM folder
- Controleer SMTP credentials
- Kijk in `email_logs` table voor error messages
- Check console logs voor gedetailleerde foutmeldingen

## 🎯 Features

### Wat Werkt Nu
✅ Planning aanmaken met email toggle
✅ Email template met variabelen (klantNaam, datum, tijd, kenteken)
✅ TEST mode (veilig testen zonder klanten te mailen)
✅ Email logging (alle verstuurde emails worden gelogd)
✅ Customer email automatisch geladen als klant geselecteerd is
✅ Toggle alleen zichtbaar als klant een email heeft

### Frontend
- De "Bevestigingsmail sturen" toggle staat in de planning modal
- Toggle is alleen zichtbaar als `selectedCustomer?.email` aanwezig is
- `sendEmail` state wordt meegegeven in de POST/PATCH request

### Backend
- `/api/planning` POST route stuurt email als `sendEmail === true`
- Gebruikt `customerEmail` uit request body
- Formatteert datum en tijd correct voor template
- Logt alle email activiteit
