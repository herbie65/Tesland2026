# MyPOS Payment Terminal – Integratie

## Kun je een betaallink naar het MyPOS-terminal sturen?

### Bluetooth
- MyPOS ondersteunt **Bluetooth** (BLE) via hun **Android- en iOS-SDK**. Alleen een native app op telefoon/tablet kan direct met het terminal communiceren.
- Een **webapp** (zoals Tesland2026) kan niet via Bluetooth met het terminal praten; de browser heeft daar geen toegang toe.
- Een “betaallink” (URL) kun je niet letterlijk naar het terminal “schieten”: het terminal is een kaartlezer, geen webbrowser.

### Aanbevolen: Cash Register Remote API (geen Bluetooth nodig)
MyPOS biedt de **Cash Register Remote API**: je server stuurt een betalingsverzoek naar MyPOS, en MyPOS zorgt dat het op het juiste terminal verschijnt. Geen Bluetooth nodig op de kantoor-PC.

**Workflow:**
1. In Tesland2026 klik je bij een factuur op “Naar MyPOS terminal”.
2. Onze server stuurt een request (bedrag, factuurnummer) naar MyPOS Server (`https://crr-api.mypos.com/infromhttp`).
3. MyPOS stuurt het verzoek naar het bij jou **gekoppelde** terminal.
4. Op het terminal verschijnt het bedrag; de klant pint of tikt.
5. MyPOS meldt het resultaat terug; wij kunnen de factuurstatus bijwerken.

**Wat je nodig hebt:**
- Toegang van MyPOS: **login ID (e-mail)** als partner.
- **Certificaten**: 2048-bit x509 (private key + public certificate), uitgewisseld met MyPOS.
- Terminal in **Cash Register Remote (CRR)**-modus:
  1. API-aanroep `MPRSubscribe` om een security code te krijgen.
  2. Op het terminal: menu → “Pair device” → code invoeren.
  3. Daarna staat het terminal in CRR-modus en ontvangt het transacties van de server.

**Technisch (voor implementatie):**
- Communicatie: **XML SOAP** naar het MyPOS-endpoint.
- Belangrijke call: **MPRPurchase** (bedrag, terminal ID, request ID, digitale handtekening).
- Zie: [MyPOS Developers – Cash Register Remote API](https://developers.mypos.com/en/doc/in_person_payments/v1_0/356-cash-register-remote-api) en [API Calls](https://developers.mypos.com/en/doc/in_person_payments/v1_0/358-api-calls).

Als je deze API wilt gebruiken, kunnen we in Tesland2026 een knop “Naar MyPOS terminal” toevoegen (bij dezelfde plek als “Laat zien op iPad”) die het facturbedrag naar de MyPOS Remote API stuurt, zodat het op jouw terminal verschijnt.
