# 🔄 Telegram Bot Polling Mode Setup

## ✅ Polling Mode (Webhook O'rniga)

Webhook bilan muammo bo'lsa, polling mode ishlatamiz. Bu oddiy va ishonchli.

---

## 🚀 Railway Deploy Setup

### 1. Environment Variables

Railway dashboard'da quyidagi variable'larni qo'shing:

```env
TELEGRAM_BOT_TOKEN=8810783474:AAH05dyAYwKJij6g2eDZ1HjlE4EVLjxCxgE
TELEGRAM_MODE=polling
```

**MUHIM**: `TELEGRAM_MODE=polling` o'rnatilganda bot webhook o'rniga polling ishlatadi.

---

### 2. Webhook'ni O'chirish

Agar webhook o'rnatilgan bo'lsa, uni o'chirish kerak:

#### A. cURL bilan:

```bash
curl -X POST "https://api.telegram.org/bot8810783474:AAH05dyAYwKJij6g2eDZ1HjlE4EVLjxCxgE/deleteWebhook"
```

**Javob:**
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was deleted"
}
```

#### B. Webhook Status Tekshirish:

```bash
curl "https://api.telegram.org/bot8810783474:AAH05dyAYwKJij6g2eDZ1HjlE4EVLjxCxgE/getWebhookInfo"
```

**Kutilgan javob (webhook o'chirilgandan keyin):**
```json
{
  "ok": true,
  "result": {
    "url": "",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

---

## 🔧 Kod O'zgarishlari

### Bot Service (Already Implemented)

`telegram-bot.service.ts` allaqachon polling mode'ni qo'llab-quvvatlaydi:

```typescript
const mode = this.config.get<string>('telegram.mode') || 'polling';

if (mode === 'polling') {
  this.logger.log('Starting bot in polling mode...');
  await this.bot.launch();
  this.logger.log('Telegram bot started in polling mode');
  
  // Graceful shutdown
  process.once('SIGINT', () => this.bot?.stop('SIGINT'));
  process.once('SIGTERM', () => this.bot?.stop('SIGTERM'));
}
```

---

## ✅ Polling Mode Afzalliklari

### 👍 Yaxshi Tomonlar:
- ✅ **Oddiy Setup** - webhook konfiguratsiyasi kerak emas
- ✅ **Ishonchli** - connection muammolari kam
- ✅ **Development Friendly** - local testlash oson
- ✅ **No SSL Required** - HTTPS sertifikat shart emas
- ✅ **Firewall Friendly** - kiruvchi portlar ochish kerak emas

### 👎 Kuchsiz Tomonlar:
- ⚠️ **Resource Usage** - doimiy polling requests
- ⚠️ **Slight Delay** - 1-2 soniya kechikish (odatda sezilmaydi)
- ⚠️ **Scalability** - ko'p botlar uchun webhook yaxshiroq

---

## 📊 Webhook vs Polling

| Feature | Webhook | Polling |
|---------|---------|---------|
| **Setup** | Qiyin (HTTPS, domain kerak) | Oson |
| **Latency** | Instant | 1-2s delay |
| **Resources** | Kam (event-driven) | Ko'proq (doimiy requests) |
| **Reliability** | Network'ga bog'liq | Barqaror |
| **Scalability** | Yaxshi | O'rtacha |
| **Development** | Qiyin (tunnel kerak) | Oson |

---

## 🧪 Test Qilish

### 1. Railway Deploy Bo'lgandan Keyin

Railway logs'da quyidagi xabarni ko'ring:

```
[TelegramBotService] Starting bot in polling mode...
[TelegramBotService] Telegram bot started in polling mode
```

### 2. Bot'ni Test Qilish

1. Telegram'da botga o'ting: [@newPricePulse_bot](https://t.me/newPricePulse_bot)
2. `/start` yuboring
3. Bot javob berishi kerak: "👋 Welcome to PricePulse Bot!"
4. `/menu` - asosiy menyu
5. `/help` - yordam

### 3. Funksionallik Test

- ✅ Account linking
- ✅ View alerts
- ✅ View saved products
- ✅ View notifications
- ✅ Language switching
- ✅ Alert notifications

---

## 🔍 Troubleshooting

### Bot Javob Bermayapti

1. **Railway logs'ni tekshiring:**
   ```
   railway logs
   ```

2. **Environment variables to'g'ri o'rnatilganini tekshiring:**
   ```
   TELEGRAM_BOT_TOKEN=8810783474:AAH05dyAYwKJij6g2eDZ1HjlE4EVLjxCxgE
   TELEGRAM_MODE=polling
   ```

3. **Webhook o'chirilganini tekshiring:**
   ```bash
   curl "https://api.telegram.org/bot8810783474:AAH05dyAYwKJij6g2eDZ1HjlE4EVLjxCxgE/getWebhookInfo"
   ```
   
   `url` bo'sh bo'lishi kerak: `"url": ""`

4. **Bot tokenini tekshiring:**
   ```bash
   curl "https://api.telegram.org/bot8810783474:AAH05dyAYwKJij6g2eDZ1HjlE4EVLjxCxgE/getMe"
   ```

### "Conflict: terminated by other getUpdates"

Bu xatolik webhook va polling bir vaqtda ishlaganda yuzaga keladi.

**Yechim:**
```bash
# Webhook'ni o'chiring
curl -X POST "https://api.telegram.org/bot8810783474:AAH05dyAYwKJij6g2eDZ1HjlE4EVLjxCxgE/deleteWebhook"

# Railway'ni restart qiling
railway restart
```

---

## 📝 Railway Deployment Checklist

- [ ] `TELEGRAM_BOT_TOKEN` o'rnatilgan
- [ ] `TELEGRAM_MODE=polling` o'rnatilgan
- [ ] Webhook o'chirilgan (deleteWebhook)
- [ ] Railway deploy muvaffaqiyatli
- [ ] Logs'da "polling mode" ko'rinadi
- [ ] Bot `/start` ga javob beradi
- [ ] Barcha commands ishlaydi

---

## 🎯 Production Deployment Steps

### 1. Railway'da Environment Variables

Variables tab'da:
```
TELEGRAM_BOT_TOKEN=8810783474:AAH05dyAYwKJij6g2eDZ1HjlE4EVLjxCxgE
TELEGRAM_MODE=polling
DATABASE_URL=<your-railway-postgres-url>
REDIS_URL=<your-railway-redis-url>
JWT_ACCESS_SECRET=<your-secret>
JWT_REFRESH_SECRET=<your-secret>
```

### 2. Webhook O'chirish

```bash
curl -X POST "https://api.telegram.org/bot8810783474:AAH05dyAYwKJij6g2eDZ1HjlE4EVLjxCxgE/deleteWebhook"
```

### 3. Deploy

```bash
git add .
git commit -m "feat: switch to polling mode for Telegram bot"
git push origin main
```

Railway avtomatik deploy qiladi.

### 4. Verify

Railway logs'da:
```
✅ [TelegramBotService] Starting bot in polling mode...
✅ [TelegramBotService] Telegram bot started in polling mode
```

### 5. Test

Telegram'da [@newPricePulse_bot](https://t.me/newPricePulse_bot):
- ✅ `/start` - ishlaydi
- ✅ `/menu` - ishlaydi  
- ✅ `/help` - ishlaydi
- ✅ Account linking - ishlaydi
- ✅ View alerts - ishlaydi

---

## 💡 Pro Tips

1. **Monitoring**: Railway logs'ni doimiy kuzating
2. **Error Handling**: Bot xatolari logs'da ko'rinadi
3. **Restart**: Muammo bo'lsa `railway restart`
4. **Health Check**: `/telegram/health` endpoint test qiling
5. **Database**: Prisma migrations avtomatik run bo'ladi

---

## 🔄 Webhook'ga Qaytish (Keyinchalik)

Agar keyinchalik webhook'ga qaytmoqchi bo'lsangiz:

### 1. Environment Variable O'zgartirish
```env
TELEGRAM_MODE=webhook
TELEGRAM_WEBHOOK_URL=https://your-domain.railway.app/api/v1/telegram/webhook
```

### 2. Webhook O'rnatish
```bash
curl -X POST "https://api.telegram.org/bot8810783474:AAH05dyAYwKJij6g2eDZ1HjlE4EVLjxCxgE/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-domain.railway.app/api/v1/telegram/webhook"}'
```

### 3. Restart
```bash
railway restart
```

---

**Status:** ✅ Polling Mode Configured - Ready for Production
**Bot:** [@newPricePulse_bot](https://t.me/newPricePulse_bot)
**Mode:** Polling (Recommended for Railway)
