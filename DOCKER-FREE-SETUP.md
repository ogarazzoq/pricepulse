# 🎯 Docker'siz Local Development Setup

Bu yo'riqnoma Docker'siz, faqat cloud service'lar bilan PricePulse'ni local'da ishga tushirish uchun.

---

## ✅ **Kerakli Cloud Service'lar (Hammasi BEPUL)**

### 1. **PostgreSQL Database** 
Quyidagi service'lardan birini tanlang:

#### Option A: Neon.tech (Tavsiya etiladi)
- **URL:** https://neon.tech
- **Plan:** Free tier (10GB storage, serverless)
- **Qadamlar:**
  1. GitHub bilan login qiling
  2. "Create a project" → Name: `pricepulse-dev`
  3. Region: AWS US East (yoki yaqin)
  4. Database name: `neondb` (default)
  5. Connection string'ni ko'chirib oling:
     ```
     postgresql://username:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```

#### Option B: Supabase
- **URL:** https://supabase.com
- **Plan:** Free (500MB database, unlimited API calls)
- **Qadamlar:**
  1. GitHub bilan login
  2. "New Project"
  3. Settings → Database → Connection Pooling
  4. Connection string'ni oling (Session mode)

#### Option C: ElephantSQL
- **URL:** https://www.elephantsql.com
- **Plan:** Tiny Turtle (20MB - kichik test uchun)
- **Qadamlar:**
  1. Sign up
  2. Create New Instance
  3. URL'ni ko'chirib oling

### 2. **Redis** (Optional, lekin tavsiya etiladi)

#### Option A: Upstash (Tavsiya etiladi)
- **URL:** https://upstash.com
- **Plan:** Free (10,000 commands/day)
- **Qadamlar:**
  1. GitHub bilan login
  2. "Create Database" → Redis
  3. Region: AWS US East
  4. Connect → REST API
  5. Ma'lumotlarni oling:
     - Endpoint: `https://xxxxx.upstash.io`
     - Redis URL: `redis://default:password@xxxxx.upstash.io:6379`

#### Option B: Redis'siz ishlash
Redis'ni o'rnatmasangiz:
- ✅ API ishlaydi
- ✅ CRUD operations ishlaydi
- ❌ Background jobs ishlamaydi (price sync, alerts evaluation)

---

## 📝 **Setup Qadamlari**

### 1. Environment Variables'ni o'rnatish

`apps/api/.env` faylini tahrirlang:

```env
# Server
NODE_ENV=development
PORT=4000
API_PREFIX=api/v1
CORS_ORIGIN=http://localhost:3000

# Database - NEON (yoki boshqa service'dan olingan URL)
DATABASE_URL=postgresql://username:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# Redis - UPSTASH (yoki bo'sh qoldiring)
REDIS_HOST=us1-xxxxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-upstash-password

# JWT Secrets (o'zgartiring!)
JWT_ACCESS_SECRET=my-super-secret-jwt-access-key-32-chars-min
JWT_REFRESH_SECRET=my-super-secret-jwt-refresh-key-32-chars-min
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=2592000

# Admin Bootstrap
BOOTSTRAP_ADMIN_EMAIL=admin@test.com
BOOTSTRAP_ADMIN_PASSWORD=Admin123456
BOOTSTRAP_ADMIN_NAME=Admin User

# Mailer (optional - bo'sh qoldiring)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

# Telegram (optional)
TELEGRAM_BOT_TOKEN=

# Jobs
PRICE_SYNC_CRON=0 */2 * * *
ALERT_EVALUATE_CRON=*/15 * * * *
```

### 2. Dependencies'ni o'rnatish

```bash
# Root directory'da
npm install
```

### 3. Prisma setup

```bash
cd apps/api

# Prisma client'ni generatsiya qiling
npx prisma generate

# Database'ga migratsiyalarni qo'llang
npx prisma migrate deploy

# Seed data (demo mahsulotlar)
npm run prisma:seed
```

**Kutilayotgan natija:**
```
✓ Migrations applied successfully
✓ Seed data created:
  - 2 Marketplaces (FakeStore API, DummyJSON)
  - 40+ Products
  - 1 Admin user (email: admin@test.com)
```

### 4. Backend'ni ishga tushirish

```bash
cd apps/api
npm run start:dev
```

**Tekshirish:**
```bash
# Browser'da:
http://localhost:4000/api/v1/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "checks": {
    "api": "ok",
    "database": "ok",
    "redis": "ok"  // yoki "unavailable" agar Redis yo'q bo'lsa
  }
}
```

### 5. Frontend'ni ishga tushirish

Yangi terminal oching:

```bash
cd apps/web

# .env.local yarating (agar yo'q bo'lsa)
echo "NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1" > .env.local

# Ishga tushiring
npm run dev
```

**Browser'da oching:**
- URL: http://localhost:3000
- Login:
  - Email: `admin@test.com`
  - Password: `Admin123456`

---

## ✅ **Ishlayotganini tekshirish**

### 1. Health Check
```bash
curl http://localhost:4000/api/v1/health
```

### 2. Login
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Admin123456"}'
```

### 3. Products
```bash
curl http://localhost:4000/api/v1/products
```

### 4. Frontend
Browser'da:
1. http://localhost:3000
2. Login qiling
3. Products, Alerts, Dashboard sahifalarini tekshiring

---

## 🎨 **Yangi Funksiyalarni Sinash**

### 1. Saved Products
1. Login qiling
2. Products sahifasiga o'ting
3. Biror mahsulotdagi ❤️ (heart) icon'ni bosing
4. Sidebar'da "Saved" link paydo bo'ladi
5. "Saved" sahifaga o'ting - saqlangan mahsulotlar ko'rinadi

### 2. Search History
1. Products sahifasida qidiruv qiling: "laptop"
2. Yana qidiring: "phone"
3. Dashboard'ga o'ting
4. "Recent Searches" widget'da qidiruvlaringiz ko'rinadi

### 3. Enhanced Alerts
1. Alerts sahifasiga o'ting
2. Yangi alert yarating
3. Alert'ni pause qiling (ACTIVE → PAUSED)
4. Yana activate qiling
5. Archive qiling

---

## ⚠️ **Muammolar va Yechimlar**

### "Can't reach database server"
**Sabab:** Database URL noto'g'ri yoki database o'chirilgan

**Yechim:**
1. Neon.tech dashboard'ga o'ting
2. Database holati: Active ekanligini tekshiring
3. Connection string'ni qayta ko'chirib oling
4. `.env` faylida `DATABASE_URL` ni tekshiring

### "Redis connection failed"
**Sabab:** Redis config noto'g'ri yoki Upstash o'chirilgan

**Yechim:**
1. Upstash dashboard'da database Active ekanligini tekshiring
2. Connection string'ni qayta oling
3. `.env` da `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` ni tekshiring

**Alternativ:** Redis'ni o'chirib qo'ying (jobs ishlamaydi):
```env
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=
```

### "Prisma migrate failed"
**Sabab:** Database connection issue

**Yechim:**
```bash
# Connection'ni tekshiring
npx prisma db pull

# Agar ishlasa:
npx prisma migrate deploy
```

### "Port already in use"
**Sabab:** 4000 yoki 3000 port band

**Yechim:**
```bash
# Backend'ni boshqa portda ishlatish
PORT=4001 npm run start:dev

# Frontend .env.local'da API URL'ni yangilang
NEXT_PUBLIC_API_URL=http://localhost:4001/api/v1
```

---

## 📊 **Service'lar Xarajatlari**

| Service | Free Tier | Limit |
|---------|-----------|-------|
| Neon.tech | ✅ Bepul | 10GB storage |
| Supabase | ✅ Bepul | 500MB database, 2GB bandwidth |
| ElephantSQL | ✅ Bepul | 20MB storage |
| Upstash Redis | ✅ Bepul | 10,000 commands/day |

**Jami:** $0/month ✅

---

## 🎯 **Xulosa**

✅ Docker kerak emas
✅ Local PostgreSQL/Redis o'rnatish kerak emas  
✅ Hammasi cloud'da, bepul
✅ Istalgan joydan (uy, universitet) ishlaydi
✅ Internet bo'lsa kifoya

**Tayyor!** 🚀
