export const MESSAGES = {
  en: {
    welcome: {
      title: `╔═══════════════════════╗
║  💹 PricePulse Bot    ║
╚═══════════════════════╝`,
      description: '📊 Track prices across all marketplaces\n💰 Get alerts when prices drop\n⭐ Manage your saved products',
      needLink: '🔗 <b>Link your account</b> to unlock all features!',
      alreadyLinked: '✅ Account linked! Choose an option:',
    },
    menu: {
      title: `🏠 <b>Main Menu</b>

Select an option below:`,
      alerts: '🔔 My Alerts',
      saved: '⭐ Saved Products',
      notifications: '📬 Notifications',
      settings: '⚙️ Settings',
      help: 'ℹ️ Help',
      back: '◀️ Back to Menu',
    },
    buttons: {
      linkAccount: '🔗 Link Account',
      unlinkAccount: '🔓 Unlink Account',
      pause: '⏸ Pause',
      resume: '▶️ Resume',
      edit: '✏️ Edit',
      delete: '🗑 Delete',
      confirm: '✅ Confirm',
      cancel: '❌ Cancel',
      viewProduct: '🛒 View Deal',
      createAlert: '🔔 Create Alert',
      remove: '🗑 Remove',
      refresh: '🔄 Refresh',
      previous: '◀️ Prev',
      next: 'Next ▶️',
    },
    alerts: {
      title: '🔔 <b>My Price Alerts</b>',
      empty: `📭 <i>No active alerts yet</i>

Create alerts on the website to get notified when prices drop!`,
      emptyHint: '👉 Go to website → Product page → Set Alert',
      header: (count: number) => `🔔 <b>My Alerts</b>  •  <i>${count} total</i>\n${'─'.repeat(28)}`,
      item: (i: number, title: string, condition: string, threshold: string, currency: string, status: string, statusEmoji: string) =>
        `${statusEmoji} <b>${i}. ${title}</b>\n` +
        `   📉 <i>${condition}</i> <code>${threshold} ${currency}</code>\n` +
        `   Status: ${status}`,
      condition: {
        BELOW: 'Price drops below',
        ABOVE: 'Price goes above',
        PERCENT_DROP: 'Price drops by',
      },
      status: {
        ACTIVE: 'Active',
        PAUSED: 'Paused',
        TRIGGERED: 'Triggered',
        ARCHIVED: 'Archived',
      },
      statusEmoji: {
        ACTIVE: '🟢',
        PAUSED: '🟡',
        TRIGGERED: '🔵',
        ARCHIVED: '⚫',
      },
      paused: '⏸ <b>Alert paused</b>\nYou won\'t receive notifications for this alert.',
      resumed: '▶️ <b>Alert resumed</b>\nYou\'ll receive notifications again.',
      deleted: '🗑 <b>Alert deleted</b>\nThis alert has been removed.',
      confirmDelete: '⚠️ <b>Delete this alert?</b>\n\nThis action cannot be undone.',
      actions: (title: string) => `⚙️ <b>Alert Actions</b>\n\n📦 ${title}`,
      select: 'Select an alert to manage:',
    },
    saved: {
      title: '⭐ <b>Saved Products</b>',
      empty: `📭 <i>No saved products yet</i>

Save products on the website to track them here!`,
      emptyHint: '👉 Go to website → Product page → Save',
      header: (count: number) => `⭐ <b>Saved Products</b>  •  <i>${count} total</i>\n${'─'.repeat(28)}`,
      item: (i: number, title: string, price: string, currency: string, stores: number, url?: string) => {
        let text = `${i}. <b>${title}</b>\n`;
        if (price) text += `   💰 From <code>${price} ${currency}</code>  🏪 ${stores} store${stores !== 1 ? 's' : ''}\n`;
        if (url) text += `   🔗 <a href="${url}">View on website</a>`;
        return text;
      },
      price: 'From',
      marketplaces: (count: number) => `🏪 ${count} store${count !== 1 ? 's' : ''}`,
      removed: '🗑 <b>Removed from saved</b>',
      confirmRemove: '⚠️ <b>Remove this product?</b>',
    },
    notifications: {
      title: '📬 <b>Recent Notifications</b>',
      empty: `📭 <i>No notifications yet</i>

You'll receive notifications here when price alerts trigger.`,
      header: (count: number) => `📬 <b>Notifications</b>  •  <i>Last ${count}</i>\n${'─'.repeat(28)}`,
      item: (subject: string, date: string, statusEmoji: string) =>
        `${statusEmoji} <b>${subject}</b>\n   🕐 <i>${date}</i>`,
      status: {
        SENT: '✅',
        PENDING: '⏳',
        FAILED: '❌',
      },
    },
    settings: {
      title: `⚙️ <b>Settings</b>

Customize your PricePulse Bot experience:`,
      language: '🌐 Language / Til',
      accountInfo: '👤 Account Info',
      notificationPrefs: '🔔 Notification Prefs',
      selectLanguage: '🌐 <b>Select Language</b>\n\nChoose your preferred language:',
      languageChanged: '✅ <b>Language updated to English!</b>',
      accountTitle: '👤 <b>Your Account</b>',
      unlinked: '🔓 <b>Account unlinked</b>\n\nYou can link again anytime with /start',
      confirmUnlink: '⚠️ <b>Unlink account?</b>\n\nYou\'ll stop receiving notifications.',
    },
    alert_notification: {
      title: '🔥 Price Drop Alert!',
      oldPrice: 'Was',
      newPrice: 'Now',
      save: 'You save',
      marketplace: 'at',
    },
    linking: {
      instructions: `🔗 <b>Link Your Account</b>

To receive notifications and manage your data:`,
      steps: [
        '1️⃣ Go to <b>PricePulse website</b>',
        '2️⃣ Open <b>Settings → Telegram Bot</b>',
        '3️⃣ Click <b>"Generate Code"</b>',
        '4️⃣ Send the code here',
      ],
      expires: '⏰ <i>Code expires in 15 minutes</i>',
      success: `✅ <b>Account Linked Successfully!</b>

You can now:
• Receive price drop notifications
• Manage your alerts from bot
• View saved products`,
      failed: '❌ <b>Link failed</b> — code expired or invalid',
      invalidCode: '❌ <b>Invalid code</b>\n\nPlease generate a new code on the website.',
      alreadyLinked: '⚠️ This Telegram is already linked to another account.',
      enterCode: '🔑 <b>Enter your verification code:</b>\n\n<i>Example: ABC123</i>',
    },
    errors: {
      notLinked: `⚠️ <b>Account not linked</b>

Please link your account first to use this feature.`,
      notFound: '❌ Not found',
      serverError: '⚠️ <i>Service temporarily unavailable. Please try again.</i>',
    },
    help: {
      title: `ℹ️ <b>PricePulse Bot Help</b>
${'─'.repeat(28)}`,
      description: '📋 <b>Available Commands:</b>',
      commands: [
        '/start — Start & main menu',
        '/alerts — View price alerts',
        '/saved — View saved products',
        '/notifications — View notifications',
        '/settings — Bot settings',
        '/help — Show this help',
        '/menu — Main menu',
        '/unlink — Unlink account',
      ],
      features: '\n✨ <b>Features:</b>',
      featureList: [
        '• 🔔 Instant price drop notifications',
        '• 📊 Manage alerts (pause/resume/delete)',
        '• ⭐ Browse saved products',
        '• 📬 View notification history',
        '• 🌐 English & O\'zbek support',
      ],
    },
  },

  uz: {
    welcome: {
      title: `╔═══════════════════════╗
║  💹 PricePulse Bot    ║
╚═══════════════════════╝`,
      description: '📊 Barcha do\'konlarda narxlarni kuzating\n💰 Narx tushganda xabarnoma oling\n⭐ Saqlangan mahsulotlarni boshqaring',
      needLink: '🔗 <b>Akkauntingizni bog\'lang</b> — barcha imkoniyatlardan foydalaning!',
      alreadyLinked: '✅ Akkount bog\'langan! Variantni tanlang:',
    },
    menu: {
      title: `🏠 <b>Asosiy Menyu</b>

Quyidagi variantni tanlang:`,
      alerts: '🔔 Ogohlantirishlarim',
      saved: '⭐ Saqlangan',
      notifications: '📬 Bildirishnomalar',
      settings: '⚙️ Sozlamalar',
      help: 'ℹ️ Yordam',
      back: '◀️ Menyuga qaytish',
    },
    buttons: {
      linkAccount: '🔗 Akkauntni Bog\'lash',
      unlinkAccount: '🔓 Bog\'lanishni Uzish',
      pause: '⏸ To\'xtatish',
      resume: '▶️ Davom ettirish',
      edit: '✏️ Tahrirlash',
      delete: '🗑 O\'chirish',
      confirm: '✅ Tasdiqlash',
      cancel: '❌ Bekor qilish',
      viewProduct: '🛒 Ko\'rish',
      createAlert: '🔔 Ogohlantirish',
      remove: '🗑 Olib tashlash',
      refresh: '🔄 Yangilash',
      previous: '◀️ Oldingi',
      next: 'Keyingi ▶️',
    },
    alerts: {
      title: '🔔 <b>Narx Ogohlantirishlarim</b>',
      empty: `📭 <i>Hali ogohlantirishlar yo'q</i>

Narx tushganda xabar olish uchun veb-saytda ogohlantirish yarating!`,
      emptyHint: '👉 Veb-sayt → Mahsulot sahifasi → Ogohlantirish',
      header: (count: number) => `🔔 <b>Ogohlantirishlar</b>  •  <i>${count} ta</i>\n${'─'.repeat(28)}`,
      item: (i: number, title: string, condition: string, threshold: string, currency: string, status: string, statusEmoji: string) =>
        `${statusEmoji} <b>${i}. ${title}</b>\n` +
        `   📉 <i>${condition}</i> <code>${threshold} ${currency}</code>\n` +
        `   Holat: ${status}`,
      condition: {
        BELOW: 'Narx pastga tushsa',
        ABOVE: 'Narx yuqoriga ko\'tarilsa',
        PERCENT_DROP: 'Narx tushishi',
      },
      status: {
        ACTIVE: 'Faol',
        PAUSED: 'To\'xtatilgan',
        TRIGGERED: 'Ishga tushgan',
        ARCHIVED: 'Arxivlangan',
      },
      statusEmoji: {
        ACTIVE: '🟢',
        PAUSED: '🟡',
        TRIGGERED: '🔵',
        ARCHIVED: '⚫',
      },
      paused: '⏸ <b>Ogohlantirish to\'xtatildi</b>\nBu ogohlantirish uchun xabarnoma kelmaydi.',
      resumed: '▶️ <b>Ogohlantirish davom ettirildi</b>\nEndi yana xabarnomalar keladi.',
      deleted: '🗑 <b>Ogohlantirish o\'chirildi</b>',
      confirmDelete: '⚠️ <b>Bu ogohlantirishni o\'chirish?</b>\n\nBu amalni qaytarib bo\'lmaydi.',
      actions: (title: string) => `⚙️ <b>Amallar</b>\n\n📦 ${title}`,
      select: 'Boshqarish uchun ogohlantirishni tanlang:',
    },
    saved: {
      title: '⭐ <b>Saqlangan Mahsulotlar</b>',
      empty: `📭 <i>Hali saqlangan mahsulotlar yo'q</i>

Kuzatish uchun veb-saytda mahsulotlarni saqlang!`,
      emptyHint: '👉 Veb-sayt → Mahsulot sahifasi → Saqlash',
      header: (count: number) => `⭐ <b>Saqlangan</b>  •  <i>${count} ta</i>\n${'─'.repeat(28)}`,
      item: (i: number, title: string, price: string, currency: string, stores: number, url?: string) => {
        let text = `${i}. <b>${title}</b>\n`;
        if (price) text += `   💰 <code>${price} ${currency}</code>  🏪 ${stores} ta do'kon\n`;
        if (url) text += `   🔗 <a href="${url}">Veb-saytda ko'rish</a>`;
        return text;
      },
      price: 'Dan boshlab',
      marketplaces: (count: number) => `🏪 ${count} ta do'kon`,
      removed: '🗑 <b>Saqlanganlardan olib tashlandi</b>',
      confirmRemove: '⚠️ <b>Bu mahsulotni olib tashlash?</b>',
    },
    notifications: {
      title: '📬 <b>So\'nggi Bildirishnomalar</b>',
      empty: `📭 <i>Hali bildirishnomalar yo'q</i>

Narx ogohlantirishlari ishlaganda bu yerda ko'rinadi.`,
      header: (count: number) => `📬 <b>Bildirishnomalar</b>  •  <i>So'nggi ${count} ta</i>\n${'─'.repeat(28)}`,
      item: (subject: string, date: string, statusEmoji: string) =>
        `${statusEmoji} <b>${subject}</b>\n   🕐 <i>${date}</i>`,
      status: {
        SENT: '✅',
        PENDING: '⏳',
        FAILED: '❌',
      },
    },
    settings: {
      title: `⚙️ <b>Sozlamalar</b>

PricePulse Bot tajribangizni sozlang:`,
      language: '🌐 Til / Language',
      accountInfo: '👤 Akkount ma\'lumotlari',
      notificationPrefs: '🔔 Bildirishnoma sozlamalari',
      selectLanguage: '🌐 <b>Til tanlash</b>\n\nTilni tanlang:',
      languageChanged: '✅ <b>Til o\'zbek tiliga o\'zgartirildi!</b>',
      accountTitle: '👤 <b>Sizning akkauntingiz</b>',
      unlinked: '🔓 <b>Akkount bog\'lanishi uzildi</b>\n\nQayta ulanish uchun /start',
      confirmUnlink: '⚠️ <b>Bog\'lanishni uzish?</b>\n\nBildirishnomalar to\'xtaydi.',
    },
    alert_notification: {
      title: '🔥 Narx Tushdi!',
      oldPrice: 'Oldingi',
      newPrice: 'Hozir',
      save: 'Tejaysiz',
      marketplace: 'da',
    },
    linking: {
      instructions: `🔗 <b>Akkauntni Bog'lash</b>

Bildirishnomalar va ma'lumotlaringizni boshqarish uchun:`,
      steps: [
        '1️⃣ <b>PricePulse veb-saytiga</b> o\'ting',
        '2️⃣ <b>Sozlamalar → Telegram Bot</b> ni oching',
        '3️⃣ <b>"Kod yaratish"</b> tugmasini bosing',
        '4️⃣ Kodni bu yerga yuboring',
      ],
      expires: '⏰ <i>Kod 15 daqiqa amal qiladi</i>',
      success: `✅ <b>Akkount Muvaffaqiyatli Bog'landi!</b>

Endi siz:
• Narx tushishi haqida xabarnoma olasiz
• Botdan ogohlantirishlarni boshqarasiz
• Saqlangan mahsulotlarni ko'rasiz`,
      failed: '❌ <b>Bog\'lanmadi</b> — kod muddati tugagan yoki noto\'g\'ri',
      invalidCode: '❌ <b>Noto\'g\'ri kod</b>\n\nVeb-saytda yangi kod yarating.',
      alreadyLinked: '⚠️ Bu Telegram boshqa akkauntga bog\'langan.',
      enterCode: '🔑 <b>Tasdiqlash kodini kiriting:</b>\n\n<i>Misol: ABC123</i>',
    },
    errors: {
      notLinked: `⚠️ <b>Akkount bog'lanmagan</b>

Bu funksiyadan foydalanish uchun avval akkauntingizni bog'lang.`,
      notFound: '❌ Topilmadi',
      serverError: '⚠️ <i>Xizmat vaqtincha mavjud emas. Qayta urinib ko\'ring.</i>',
    },
    help: {
      title: `ℹ️ <b>PricePulse Bot Yordam</b>
${'─'.repeat(28)}`,
      description: '📋 <b>Mavjud buyruqlar:</b>',
      commands: [
        '/start — Boshlash va asosiy menyu',
        '/alerts — Narx ogohlantirishlar',
        '/saved — Saqlangan mahsulotlar',
        '/notifications — Bildirishnomalar',
        '/settings — Bot sozlamalari',
        '/help — Yordam',
        '/menu — Asosiy menyu',
        '/unlink — Akkauntni uzish',
      ],
      features: '\n✨ <b>Imkoniyatlar:</b>',
      featureList: [
        '• 🔔 Tezkor narx tushishi bildirishnomasi',
        '• 📊 Ogohlantirishlarni boshqarish',
        '• ⭐ Saqlangan mahsulotlarni ko\'rish',
        '• 📬 Bildirishnomalar tarixini ko\'rish',
        '• 🌐 English va O\'zbek til qo\'llab-quvvatlash',
      ],
    },
  },
};

export type Locale = 'en' | 'uz';

export function getMessage(locale: Locale, path: string, ...args: any[]): string {
  const keys = path.split('.');
  let value: any = MESSAGES[locale];

  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) return path;
  }

  if (typeof value === 'function') {
    return value(...args);
  }

  return value || path;
}
