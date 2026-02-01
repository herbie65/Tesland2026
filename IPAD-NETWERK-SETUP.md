# iPad Setup - Lokaal Netwerk Toegang

## Probleem
`localhost:3000` werkt niet vanaf de iPad omdat dat alleen lokaal op de computer werkt.

## Oplossing: Gebruik lokaal IP adres

### Stap 1: Vind je lokale IP adres (Mac)

**Optie A: Via Systeemvoorkeuren**
1. Open **Systeemvoorkeuren** (Systeeminstellingen)
2. Klik op **Netwerk**
3. Selecteer je actieve verbinding (Wi-Fi of Ethernet)
4. Je IP adres staat rechts (bijv. `192.168.1.100`)

**Optie B: Via Terminal**
```bash
# Voor WiFi
ipconfig getifaddr en0

# Voor Ethernet
ipconfig getifaddr en1
```

### Stap 2: Start development server

```bash
cd /Users/herbertkats/Desktop/Tesland2026
npm run dev
```

De server draait nu op:
- `http://localhost:3000` (alleen op je computer)
- `http://[JE-IP-ADRES]:3000` (toegankelijk vanaf andere apparaten)

### Stap 3: Configureer Next.js voor externe toegang

Next.js 16 staat standaard externe connecties toe, maar controleer of het werkt:

```bash
# Test vanaf je computer
curl http://[JE-IP-ADRES]:3000/api/health
```

Als dit niet werkt, start de dev server met:
```bash
npm run dev -- -H 0.0.0.0
```

### Stap 4: Open op iPad

**In Safari op de iPad:**
1. Zorg dat iPad en computer op **hetzelfde WiFi netwerk** zitten
2. Open Safari
3. Ga naar: `http://[JE-IP-ADRES]:3000/display`
   - Bijvoorbeeld: `http://192.168.1.100:3000/display`

### Stap 5: Voeg toe aan beginscherm (PWA)

1. Klik op het **Share** icoon (vierkant met pijl omhoog)
2. Scroll naar beneden en klik **"Zet op beginscherm"**
3. Geef het een naam: "Tesland Display"
4. Klik **"Voeg toe"**

Nu heb je een app icoon op je iPad!

## Firewall Instellingen (als het niet werkt)

Als de iPad geen verbinding kan maken:

### Mac Firewall controleren:
1. **Systeemvoorkeuren** → **Beveiliging** → **Firewall**
2. Als Firewall AAN staat:
   - Klik **"Firewall-opties"**
   - Vink **"Blokkeer alle inkomende verbindingen"** UIT
   - Voeg **"node"** toe als toegestaan (als gevraagd)

### Port 3000 testen:
```bash
# Op je Mac - check of de poort open is
lsof -i :3000

# Op je iPad - open Safari en ga naar:
http://[JE-IP-ADRES]:3000
```

## Admin Panel Configuratie

Voor de admin interface moet je ook het lokale IP gebruiken:

**Op je computer:**
- Open: `http://[JE-IP-ADRES]:3000/admin/workorders/[id]`
- Klik "Toon op iPad" knop
- iPad toont automatisch de werkorder

## Troubleshooting

### "Safari kan de pagina niet openen"
- ✅ Check: zijn iPad en Mac op hetzelfde WiFi?
- ✅ Check: is de dev server aan? (`npm run dev`)
- ✅ Check: is het IP adres correct?
- ✅ Test: `ping [JE-IP-ADRES]` vanaf je Mac

### "Verbinding time-out"
- Firewall blokkeert mogelijk poort 3000
- Mac slaapmodus kan netwerk blokkeren
- VPN kan interfereren

### IP adres verandert steeds
Dit is normaal bij DHCP. Oplossingen:

**Optie A: Statisch IP toewijzen (Router)**
1. Log in op je router (meestal `192.168.1.1`)
2. Zoek "DHCP Reservations" of "Static IP"
3. Wijs een vast IP toe aan je Mac's MAC adres

**Optie B: Gebruik hostname (mDNS)**
```bash
# Op iPad, gebruik in plaats van IP:
http://[COMPUTERNAAM].local:3000/display

# Vind je computernaam:
hostname
# Bijvoorbeeld: "Herberts-MacBook-Pro.local"
```

## Productie Setup

Voor productie wil je dit niet via IP doen maar via een echte domeinnaam:

1. **Deploy naar server** met vast IP/domein
2. **HTTPS certificaat** (gratis via Let's Encrypt)
3. **Toegang via**: `https://tesland.nl/display`

Zie `docker-compose.prod.yml` en deployment scripts voor productie setup.

## Snelle Test Checklist

✅ Mac en iPad op zelfde WiFi  
✅ Dev server draait (`npm run dev`)  
✅ IP adres gevonden (`ipconfig getifaddr en0`)  
✅ Firewall staat externe verbindingen toe  
✅ Test URL: `http://[IP]:3000/display`  

## Voorbeeld

Als je IP adres `192.168.1.50` is:

**Op je Mac:**
```bash
ipconfig getifaddr en0
# Output: 192.168.1.50

npm run dev
# Server draait op poort 3000
```

**Op je iPad:**
- Open Safari
- Ga naar: `http://192.168.1.50:3000/display`
- ✅ Werkt!

**In admin (op Mac):**
- Open: `http://192.168.1.50:3000/admin/workorders/xxx`
- Klik "Toon op iPad"
- ✅ iPad toont werkorder!
