# Checklist deploy / database / admin

## 1. Database niet bereikbaar

Met `docker-compose.yml` (alleen tladmin, `network_mode: host`) draait er **geen** Postgres-container. De app praat met Postgres op de **host** of elders.

- **PostgreSQL op dezelfde server (poort 5432):**  
  In `.env.production` moet staan:
  ```bash
  DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:5432/tesland?schema=public
  ```
  Vervang USER en PASSWORD. **Niet** `@postgres:5432` gebruiken (die hostnaam bestaat niet als je alleen tladmin draait).

- **Controleren of Postgres draait:**
  ```bash
  # Als Postgres in Docker draait (bijv. tesland_db):
  docker ps | grep -E 'postgres|tesland'

  # Als Postgres als systeemservice draait:
  sudo systemctl status postgresql
  ```

- **Connectie testen vanaf de host:**
  ```bash
  psql "$DATABASE_URL" -c "SELECT 1"
  # of, als psql niet beschikbaar:
  nc -zv 127.0.0.1 5432
  ```

Als je wél een Postgres-container gebruikt (bijv. uit een andere compose-file), moet die draaien en moet `DATABASE_URL` naar die container wijzen. Met `network_mode: host` is dat meestal `127.0.0.1:5432` als de container poort 5432 op de host mapt.

---

## 2. Admin toont "Pagina in opbouw"

Die tekst komt van de **catch-all** route (`/[...slug]`). Als je die ziet op `/admin`, wordt de echte admin-route niet geraakt: de **build** bevat die route niet of er is een routingprobleem.

- **URL controleren:**  
  In de adresbalk moet letterlijk `https://app.tesland.com/admin` staan (geen `/nl/admin` of iets anders).

- **Schone rebuild:**
  ```bash
  cd ~/tesland2026
  git pull
  docker compose build --no-cache
  docker compose down
  docker compose up -d
  ```

- **In de build-output controleren** of o.a. deze routes bestaan:
  - `/admin`
  - `/api/guard`
  (staan in het route-overzicht van `next build`.)

---

## 3. .env.production op de server

Moet in ieder geval kloppen:

- `DATABASE_URL` – juiste host (bij jouw setup meestal `127.0.0.1`), poort, database, user en wachtwoord.
- `JWT_SECRET` – gezet en hetzelfde als eerder.
- Optioneel: `SITE_ACCESS_PASSWORD` voor de site-access gate.

Na wijziging in `.env.production`:

```bash
docker compose down
docker compose up -d
```

---

## 4. Snelle controle in de container

```bash
# Bestaat DATABASE_URL?
docker exec tesland2026 printenv DATABASE_URL

# Kan de app de DB bereiken? (als de app een health-check heeft)
curl -s https://app.tesland.com/api/health/db
# of
curl -s https://app.tesland.com/api/health
```

Als `DATABASE_URL` leeg is of verkeerd, dan kan de app de database niet bereiken en kunnen admin-pagina’s (en andere DB-afhankelijke routes) falen of vreemd gedrag vertonen.
