# 🔥 VPS Deploy - Current Status

## Last Build Attempt Failed On:
- **File**: `src/app/admin/planning/PlanningClient kopie.tsx`
- **Error**: TypeScript error on line 406

## ✅ Fixed (pushed to GitHub):
- ✅ Removed `PlanningClient kopie.tsx` 
- ✅ Removed `prisma.config.ts`
- ✅ Latest commit: `2b69257`

---

## 📋 Next Steps (Run these on VPS as deploy user):

### 1. SSH to VPS
```bash
ssh herbert@46.62.229.245
```

### 2. Switch to deploy user
```bash
sudo -iu deploy
```

### 3. Deploy commands (copy-paste one by one):
```bash
cd /opt/tladmin
git pull origin main
docker compose --env-file .env.production build --no-cache
docker compose --env-file .env.production up -d
```

### 4. Check if it worked:
```bash
docker compose ps
docker logs tladmin --tail=100
```

### 5. Test locally on VPS:
```bash
curl -I http://127.0.0.1:3000
```

Expected: `HTTP/1.1 200 OK` or redirect

---

## 🎯 If Build Succeeds:

### Next step: Setup Nginx

```bash
exit  # Back to herbert user
sudo cp /opt/tladmin/nginx-site.conf /etc/nginx/sites-available/tladmin
sudo nano /etc/nginx/sites-available/tladmin
# Change: server_name admin.tesland.com; to your actual domain

sudo ln -s /etc/nginx/sites-available/tladmin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Then test: `http://46.62.229.245`

---

## 🔒 For SSL (after Nginx works):

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d admin.tesland.com
```

(Only works if DNS is pointed to VPS)

---

## 🐛 If Build Still Fails:

Check the error message and tell me:
1. Which file?
2. Which line?
3. What error?

I'll fix it and push again.

---

**Current status: Waiting for you to run the deploy commands above** ⏳
