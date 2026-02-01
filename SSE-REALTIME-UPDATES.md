# Server-Sent Events (SSE) Real-Time Updates

## Overzicht

Het systeem gebruikt **Server-Sent Events (SSE)** voor real-time updates van werkorders. Dit is veel efficiënter dan polling omdat de server wijzigingen direct naar de client pusht.

## Architectuur

### Server-Side

#### Event Emitter (`src/lib/workorder-events.ts`)
Centrale event emitter die wijzigingen broadcast naar alle verbonden clients:

```typescript
import { workOrderEvents } from '@/lib/workorder-events'

// Notify all connected clients of a change
workOrderEvents.notifyStatusChange(workOrderId, 'IN_UITVOERING')
workOrderEvents.notifyColumnChange(workOrderId, 'Onder handen')
workOrderEvents.notifySessionChange(workOrderId)
```

#### SSE Endpoint (`/api/workorders/stream`)
Server-Sent Events stream die clients kunnen openen voor live updates:

```
GET /api/workorders/stream
Headers:
  Content-Type: text/event-stream
  Cache-Control: no-cache
  Connection: keep-alive
```

Events die worden gepusht:
- `type: 'connected'` - Initial connection
- `type: 'workorder-update'` - Werkorder changed
  - `changeType: 'status'` - Status changed
  - `changeType: 'column'` - Column/position changed
  - `changeType: 'session'` - Work session started/stopped

#### API Endpoints die Events Triggeren

Alle muterende endpoints pushen nu automatisch updates:

1. **`/api/workorders/[id]/column`** (PATCH)
   - Triggers: `notifyColumnChange()`, `notifyStatusChange()`
   - When: Werkorder wordt verplaatst tussen kolommen

2. **`/api/display/signature`** (POST)
   - Triggers: `notifyColumnChange()`, `notifyStatusChange()`
   - When: Klant tekent werkorder op iPad

3. **`/api/workorders/[id]/sessions`** (POST)
   - Triggers: `notifySessionChange()`
   - When: Monteur start werk

4. **`/api/workorders/[id]/sessions/[sessionId]`** (PATCH)
   - Triggers: `notifySessionChange()`
   - When: Monteur stopt werk

### Client-Side

Clients openen een SSE verbinding en luisteren naar updates:

```typescript
useEffect(() => {
  const eventSource = new EventSource('/api/workorders/stream')
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data)
    if (data.type === 'workorder-update') {
      // Reload data when update is received
      loadWorkOrders()
    }
  }
  
  eventSource.onerror = () => {
    eventSource.close()
    // Reconnect after 5 seconds
    setTimeout(connectSSE, 5000)
  }
  
  return () => eventSource.close()
}, [])
```

#### Pagina's met Live Updates

1. **`/admin/workorders`** (`WorkOrdersClient.tsx`)
   - Toont alle werkorders
   - Updates: status, kolom, sessies

2. **`/admin/workoverzicht`** (`WorkOverviewClient.tsx`)
   - Kanban board voor werkplaats
   - Updates: werkorder verplaatsingen, actieve sessies, live timers

## Voordelen van SSE vs Polling

### Polling (oud systeem)
```typescript
// Client vraagt elke 10 seconden om updates
setInterval(() => {
  fetch('/api/workorders') // 🔴 Veel onnodige requests
}, 10000)
```

**Nadelen:**
- ❌ Veel onnodige requests (ook als er niets changed)
- ❌ Server load: 6 requests/min × aantal clients
- ❌ Vertraging: max 10 seconden voordat update zichtbaar is
- ❌ Batterij drain op mobiele devices

### SSE (nieuw systeem)
```typescript
// Server pusht updates direct naar client
eventSource.onmessage = (event) => {
  // 🟢 Alleen update als er echt iets changed
}
```

**Voordelen:**
- ✅ Directe updates (< 100ms latency)
- ✅ Minimale server load (1 open connection)
- ✅ Geen onnodige requests
- ✅ Batterij-vriendelijk
- ✅ Automatische reconnect bij verbinding verlies

## Flow Voorbeeld

### Scenario: Klant tekent werkorder op iPad

```
1. iPad → POST /api/display/signature
   └─> Update database (status: GOEDGEKEURD, column: Auto binnen)
   └─> workOrderEvents.notifyStatusChange()
   └─> workOrderEvents.notifyColumnChange()

2. Event Emitter → Broadcast to all SSE clients
   └─> Client 1 (admin op werkorders pagina)
   └─> Client 2 (monteur op werkoverzicht)
   └─> Client 3 (magazijn op magazijn pagina)

3. Clients ontvangen event → loadWorkOrders()
   └─> Status update verschijnt direct
   └─> Werkorder verschijnt in "Auto binnen" kolom
```

### Latency

| Actie                    | Polling | SSE    |
|--------------------------|---------|--------|
| Status wijziging         | ~5s     | <100ms |
| Kolom verplaatsing       | ~5s     | <100ms |
| Start/stop werk sessie   | ~5s     | <100ms |
| Handtekening iPad        | ~5s     | <100ms |

## Monitoring

SSE verbindingen zijn zichtbaar in de browser console:

```
✅ SSE verbonden - live updates actief
📡 Live update ontvangen: status
📡 Live update ontvangen: column
📡 Live update ontvangen: session
❌ SSE verbinding verbroken, herverbinden...
```

## Browser Compatibiliteit

SSE wordt ondersteund door alle moderne browsers:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

**Let op:** Internet Explorer wordt NIET ondersteund (maar dat is ook end-of-life).

## Troubleshooting

### Client krijgt geen updates

1. Check browser console voor SSE verbinding:
   ```
   ✅ SSE verbonden - live updates actief
   ```

2. Test de stream endpoint:
   ```bash
   curl -N -H "Authorization: Bearer <token>" http://localhost:3000/api/workorders/stream
   ```

3. Check of events worden getriggerd op server:
   ```typescript
   console.log('Pushing SSE event:', { workOrderId, changeType })
   workOrderEvents.notifyStatusChange(workOrderId, newStatus)
   ```

### Connection drops

SSE verbindingen hebben een keepalive (30s) om timeouts te voorkomen. Bij verbinding verlies wordt automatisch na 5 seconden opnieuw verbonden.

### Nginx/Reverse Proxy

Als je een reverse proxy gebruikt, zorg dat buffering uit staat:

```nginx
location /api/workorders/stream {
    proxy_pass http://localhost:3000;
    proxy_buffering off;
    proxy_cache off;
    proxy_set_header X-Accel-Buffering no;
    proxy_set_header Connection '';
    proxy_http_version 1.1;
    chunked_transfer_encoding off;
}
```

## Toekomstige Uitbreidingen

Mogelijk uit te breiden met events voor:
- 📦 Onderdelen status (besteld, ontvangen)
- 📄 Invoice created
- 👤 Klant updates
- 🚗 RDW data refresh
- 📧 Email notificaties
