# Prisma OpenSSL Compatibility Fix

## Probleem Opgelost ✅

De applicatie crashte met:
```
Error loading shared library libssl.so.1.1: No such file or directory
```

## Oorzaak
- Prisma 5.22.0 vereist OpenSSL 1.1 (`libssl.so.1.1`)
- Alpine Linux 3.20 (in `node:20-alpine`) heeft alleen OpenSSL 3
- Incompatibiliteit tussen Prisma engine en Alpine versie

## Oplossing
Updated Dockerfile runner stage om OpenSSL 1.1 compatibility libraries te installeren vanuit Alpine 3.16 repository.

### Wijziging:
```dockerfile
# Install dependencies including OpenSSL 1.1 compatibility
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    && apk add --no-cache --repository=http://dl-cdn.alpinelinux.org/alpine/v3.16/main openssl1.1-compat-libs
```

## Deploy Stappen

```bash
cd /opt/tladmin

# Commit wijziging
git add Dockerfile
git commit -m "Fix Prisma OpenSSL compatibility with Alpine Linux"
git push origin main

# Rebuild zonder cache
docker compose --env-file .env.production down
docker compose --env-file .env.production build --no-cache
docker compose --env-file .env.production up -d

# Check logs
docker compose --env-file .env.production logs -f tladmin
```

## Verificatie
Na succesvolle start:
1. Check of applicatie draait zonder errors
2. Prisma migraties worden automatisch uitgevoerd
3. Test database connectie

## Status
✅ Dockerfile updated
✅ Ready to deploy
