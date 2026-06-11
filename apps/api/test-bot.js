// Quick bot test without full backend
const { Telegraf } = require('telegraf');

const bot = new Telegraf('8810783474:AAH05dyAYwKJij6g2eDZ1HjlE4EVLjxCxgE');

bot.start((ctx) => {
  ctx.reply('👋 Welcome to PricePulse Bot!\n\nBot is working! ✅');
});

bot.command('test', (ctx) => {
  ctx.reply('✅ Bot is responding correctly!');
});

bot.launch();
console.log('✅ Bot started successfully!');
console.log('📱 Test it: https://t.me/newPricePulse_bot');

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
