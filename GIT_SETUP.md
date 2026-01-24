# 📦 TLadmin — Git & GitHub Setup

## Doel
TLadmin correct en veilig in GitHub zetten, zonder secrets, met Prisma schema & migrations als source of truth.

---

## 1. Wat gaat WÉL en NIET in Git

### ✅ WÉL committen
- Alle applicatiecode
- `prisma/schema.prisma`
- `prisma/migrations/**`
- `TECHNICAL_OVERVIEW.md`
- Deze handleiding (`GIT_SETUP.md`)
- Eventuele scripts (`scripts/*.sh`, zonder secrets)

### ❌ NOOIT committen
- `.env`
- `.env.local`
- `.env.production`
- `.env.*`
- `node_modules`
- `.next`
- logs / tijdelijke bestanden

---

## 2. `.gitignore` (verplicht)

Controleer dat dit minimaal in `.gitignore` staat:

```gitignore
# Node / Next
node_modules
.next
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment
.env
.env.local
.env.*.local
.env.production

# OS / editor
.DS_Store
.vscode
.idea

# Prisma
.prisma
```

⚠️ Als er nu al `.env*` bestanden getrackt zijn:
eerst verwijderen uit git history vóór pushen.

---

## 3. Prisma & database-afspraken

- Prisma is **schema-first**
- `schema.prisma` + `migrations` zijn leidend
- Local dev: `prisma migrate dev`
- Productie: alleen `prisma migrate deploy`

➡️ Daarom:
- `prisma/migrations/**` MOET in Git
- Nooit migrations handmatig op productie aanpassen

---

## 4. Repo initialiseren en pushen

Vanaf de project root:

```bash
git init
git add .
git commit -m "Initial TLadmin (Next.js + JWT + Prisma + Postgres)"
git branch -M main
```

GitHub repo aanmaken (bijv. `TLadmin`), daarna:

```bash
git remote add origin git@github.com:ORG_OR_USER/TLadmin.git
git push -u origin main
```

---

## 5. Controle vóór push (belangrijk)

Run:

```bash
git status
```

Check dat:
- ❌ geen `.env*` bestanden in de lijst staan
- ❌ geen secrets of wachtwoorden in code zitten
- ✅ `prisma/schema.prisma` zichtbaar is
- ✅ `prisma/migrations/` zichtbaar is

Optioneel extra check:

```bash
git grep PASSWORD
git grep SECRET
```

---

## 6. Optioneel maar aanbevolen: env templates

Deze mogen in Git (zonder echte waarden):

**`.env.example`**:
```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
JWT_SECRET=replace_me
```

**`.env.local.example`**:
```env
DATABASE_URL=postgresql://appuser:devpassword@127.0.0.1:5432/tesland_dev?schema=public
```

Zo weet elke dev hoe de setup hoort te zijn, zonder risico.

---

## 7. Conclusie

Na deze stap:
- GitHub is source of truth
- Prisma schema & migrations zijn geborgd
- Geen kans op het lekken van secrets
- Klaar voor gecontroleerde deploy naar Hetzner

---

**Als dit bestand staat en gepusht is, gaan we door met:**
👉 **DEEL 2 – Deploy naar Hetzner (Docker + Nginx + Prisma)**

Zeg maar wanneer je daar klaar voor bent.
