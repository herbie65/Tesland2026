# Klant Display & Handtekening Systeem

Dit systeem maakt het mogelijk om klanten hun werkorder te laten zien op een iPad en digitaal te laten tekenen voor akkoord.

## 📱 Overzicht

Het systeem bestaat uit drie onderdelen:
1. **Admin interface** - Voor receptionisten om werkorders te openen op het display
2. **Klant display** - iPad pagina waarop klanten hun werkorder zien en kunnen tekenen
3. **Handtekening opslag** - Digitale handtekeningen worden opgeslagen bij de werkorder

## 🚀 Setup

### 1. Database Migratie

Voer de database migratie uit om de handtekening velden toe te voegen:

```bash
npx prisma migrate dev
```

Dit voegt de volgende velden toe aan de `WorkOrder` tabel:
- `customerSignature` - Base64 encoded handtekening afbeelding
- `customerSignedAt` - Tijdstip van tekenen
- `customerSignedBy` - Naam van de klant
- `signatureIpAddress` - IP adres van het apparaat

### 2. iPad Configuratie

1. Open Safari op de iPad
2. Ga naar: `https://yourdomain.com/display`
3. Klik op het 'Share' icoon en selecteer "Zet op beginscherm"
4. Geef het de naam "Tesland Klant Display"
5. Open de app in full-screen modus

**Tip:** Gebruik "Guided Access" op de iPad om de app te vergrendelen:
- Ga naar: Instellingen > Toegankelijkheid > Guided Access
- Schakel "Guided Access" in
- Start de display app en druk 3x op de power knop
- Nu kan de klant de app niet verlaten

## 📋 Gebruiksinstructie

### Voor Receptionisten

**Stap 1: Klant komt binnen**
1. Open de werkorder in het admin panel
2. Klik op de **"Toon op iPad"** knop (blauwe tablet icoon) rechtsboven
3. De werkorder verschijnt automatisch op het iPad display

**Stap 2: Klant bekijkt en tekent**
- De klant ziet nu:
  - Werkorder details
  - Voertuig informatie
  - Geplande werkzaamheden
  - Benodigde onderdelen
  - Notities en opmerkingen

**Stap 3: Digitaal tekenen**
1. Klant klikt op **"Teken voor akkoord"**
2. Klant voert optioneel zijn naam in (wordt vooringevuld met klantnaam)
3. Klant tekent met vinger of stylus
4. Klant klikt op **"Bevestigen"**
5. Handtekening wordt opgeslagen

**Stap 4: Bevestiging**
- Er verschijnt een groen vinkje met bevestiging
- De handtekening is nu zichtbaar in de werkorder detail pagina
- De receptionist kan doorgaan met het proces

### Voor Klanten

Het iPad display is volledig zelfbedienend:

1. **Wachten** - Scherm toont "Welkom bij Tesland"
2. **Bekijken** - Werkorder details worden automatisch getoond
3. **Tekenen** - Klik op de grote blauwe knop
4. **Klaar** - Groen vinkje verschijnt na akkoord

## 🔧 Technische Details

### API Endpoints

**GET `/api/display/active`**
- Haalt de actieve werkorder op voor het display
- Geen authenticatie vereist (klant-facing)

**POST `/api/display/active`**
- Stelt een werkorder in als actief voor het display
- Vereist MANAGEMENT of MONTEUR rol

**POST `/api/display/signature`**
- Slaat de klant handtekening op
- Geen authenticatie vereist (klant-facing)
- Validatie: werkorder moet bestaan en nog niet getekend zijn

**GET `/api/display/events`**
- Server-Sent Events stream voor real-time updates
- Keep-alive ping elke 30 seconden

### Display Update Mechanisme

Momenteel gebruikt het systeem **polling** (om de 5 seconden):
- Eenvoudig te implementeren
- Werkt out-of-the-box zonder extra infrastructure
- Geschikt voor single-server setups

Voor productie met meerdere servers kun je upgraden naar:
- **Redis Pub/Sub** voor real-time push updates
- **WebSockets** voor bi-directionele communicatie

### Handtekening Opslag

Handtekeningen worden opgeslagen als **Base64 encoded PNG** in de database:
- Voordeel: geen file storage nodig, alles in één query
- Nadeel: grotere database records (~50-100KB per handtekening)

Voor high-volume gebruik kun je overwegen:
- Opslaan als aparte image files in `/public/media/signatures/`
- Alleen de URL opslaan in de database
- Voordeel: snellere queries, kleinere backups

## 🎨 Aanpassingen

### Welke informatie wordt getoond?

Pas aan in `/src/app/display/DisplayClient.tsx`:

```typescript
// Verberg prijzen voor klanten:
// Verwijder of comment out de prijs secties

// Toon alleen basis informatie:
// Comment out de parts en labor secties
```

### Styling

Het display gebruikt:
- **Gradient achtergrond**: `bg-gradient-to-br from-blue-50 to-indigo-100`
- **Tesland kleuren**: blauw (primary), indigo (accent)
- **Grote tekst**: goed leesbaar op afstand

Pas kleuren aan in `/src/app/display/DisplayClient.tsx` en `/src/components/SignaturePad.tsx`.

### Handtekening pad grootte

Pas aan in `/src/app/display/DisplayClient.tsx`:

```typescript
<SignaturePad
  onSave={handleSignatureSave}
  width={700}  // ← Verander breedte
  height={350} // ← Verander hoogte
  className="w-full"
/>
```

## 🔐 Beveiliging

### Belangrijke beveiligingsoverwegingen:

1. **Display endpoints zijn openbaar** - noodzakelijk voor iPad zonder login
2. **IP logging** - elk getekend document logt het IP adres
3. **Eenmalig tekenen** - een werkorder kan maar één keer getekend worden
4. **Geen gevoelige data** - prijzen en interne notities kun je verbergen

### Recommended Setup:

1. **Dedicated iPad** - gebruik een vast iPad apparaat op een veilige locatie
2. **Guided Access** - vergrendel de iPad in display modus
3. **Privé netwerk** - plaats de iPad op een intern WiFi netwerk
4. **Geen publieke toegang** - display URL is niet gelinkt vanaf website

## 📊 Monitoring

### Check welke werkorder actief is:

```bash
curl https://yourdomain.com/api/display/active
```

### Database query voor getekende werkorders:

```sql
SELECT 
  work_order_number,
  customer_signed_by,
  customer_signed_at,
  signature_ip_address
FROM work_orders
WHERE customer_signed_at IS NOT NULL
ORDER BY customer_signed_at DESC;
```

## 🐛 Troubleshooting

**Display toont "Welkom bij Tesland" maar geen werkorder**
- Check of je op "Toon op iPad" hebt geklikt in de admin
- Refresh de display pagina (swipe down)
- Check de browser console voor errors

**Handtekening wordt niet opgeslagen**
- Check of de werkorder al getekend is (kan maar 1x)
- Check database connectie
- Check browser console voor API errors

**iPad blijft op oude werkorder staan**
- Display ververst elke 5 seconden automatisch
- Manueel refreshen: swipe down
- Check of de nieuwe werkorder succesvol geactiveerd is

**"Toon op iPad" knop doet niets**
- Check of je de juiste rechten hebt (MANAGEMENT/MONTEUR)
- Check browser console voor errors
- Test de API endpoint direct: `POST /api/display/active`

## 📈 Toekomstige Verbeteringen

Mogelijke uitbreidingen:

- [ ] **Multiple displays** - meerdere iPad displays tegelijk
- [ ] **QR code login** - klant scant QR code om eigen werkorder te zien
- [ ] **Email bevestiging** - automatisch email met PDF na tekenen
- [ ] **Foto's uploaden** - klant kan schade foto's maken op iPad
- [ ] **Chat functie** - directe communicatie tussen klant en monteur
- [ ] **Status updates** - real-time updates tijdens reparatie
- [ ] **Tevredenheid survey** - vragenlijst na afronding

## 💡 Tips

1. **Test eerst intern** - test het systeem grondig voordat je het aan klanten laat zien
2. **Backup handtekeningen** - handtekeningen zijn belangrijk juridisch bewijs, maak backups
3. **Privacy wetgeving** - zorg dat je AVG/GDPR compliant bent met opslag van handtekeningen
4. **Scherm bescherming** - gebruik een screen protector op de iPad
5. **Laad de iPad** - houd de iPad aangesloten op stroom

## 📞 Support

Bij vragen of problemen:
1. Check eerst deze README
2. Check de browser console voor errors
3. Check de server logs voor API errors
4. Contact de ontwikkelaar

## 📄 Licentie

Dit systeem is onderdeel van Tesland2026 - Tesland Business Management System.
