import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Markup } from 'telegraf';
import { BotContext } from './interfaces/bot-context.interface';
import { Locale, MESSAGES } from './constants/messages';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { SavedProductsService } from '../saved-products/saved-products.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CollectionsService } from '../collections/collections.service';
import { AlertStatus } from '@prisma/client';

@Injectable()
export class TelegramBotService implements OnModuleInit {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot: Telegraf<BotContext> | null = null;
  private readonly botToken: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly alertsService: AlertsService,
    private readonly savedProductsService: SavedProductsService,
    private readonly notificationsService: NotificationsService,
    private readonly collectionsService: CollectionsService,
  ) {
    this.botToken = this.config.get<string>('telegram.botToken') || '';
    if (!this.botToken) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not configured');
    }
  }

  async onModuleInit() {
    if (!this.botToken) return;

    this.bot = new Telegraf<BotContext>(this.botToken);

    // In-memory session
    const sessions = new Map<number, any>();
    this.bot.use((ctx, next) => {
      const chatId = ctx.chat?.id;
      if (chatId) {
        if (!sessions.has(chatId)) {
          sessions.set(chatId, { locale: 'en' as Locale, page: 1 });
        }
        ctx.session = sessions.get(chatId);
      }
      return next();
    });

    // Global error handler - MUST be before handlers
    this.bot.catch(async (err: any, ctx: BotContext) => {
      this.logger.error(`Bot error [${ctx.updateType}]: ${err?.message}`);
      try { await (ctx as any).answerCbQuery('⚠️ Error').catch(() => {}); } catch {}
    });

    this.registerHandlers();

    const mode = this.config.get<string>('telegram.mode') || 'webhook';
    if (mode === 'polling') {
      this.bot.launch().catch((e) => this.logger.error('Bot launch error:', e.message));
      process.once('SIGINT', () => this.bot?.stop('SIGINT'));
      process.once('SIGTERM', () => this.bot?.stop('SIGTERM'));
      this.logger.log('Telegram bot started in polling mode ✅');
    } else {
      this.logger.log('Telegram bot initialized in webhook mode ✅');
    }
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private getWebUrl(): string {
    const raw = this.config.get<string>('app.frontendUrl') || 'https://pricepulse.app';
    return raw.startsWith('http://') ? 'https://' + raw.slice(7) : raw;
  }

  private t(locale: Locale) {
    return MESSAGES[locale] || MESSAGES['en'];
  }

  private mainMenu(locale: Locale) {
    const m = this.t(locale);
    return Markup.inlineKeyboard([
      [Markup.button.callback(m.menu.alerts, 'alerts')],
      [Markup.button.callback(m.menu.saved, 'saved')],
      [Markup.button.callback(m.menu.notifications, 'notifications')],
      [Markup.button.callback(m.menu.settings, 'settings')],
      [Markup.button.callback(m.menu.help, 'help')],
    ]);
  }

  /** Returns userId if linked, otherwise shows "not linked" and returns null */
  private async getLinkedUser(ctx: BotContext): Promise<string | null> {
    const chatId = String(ctx.chat?.id || '');
    if (!chatId) return null;

    const user = await this.prisma.user.findFirst({ where: { telegramChatId: chatId } });
    if (user) {
      ctx.session.userId = user.id;
      if (user.locale) ctx.session.locale = user.locale as Locale;
      return user.id;
    }

    ctx.session.userId = undefined;
    const m = this.t(ctx.session.locale || 'en');
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(m.buttons.linkAccount, 'link_account')],
    ]);

    // In callback context use editMessageText, in command context use reply
    try {
      await (ctx as any).editMessageText(m.errors.notLinked, { parse_mode: 'HTML', ...keyboard });
    } catch {
      try { await (ctx as any).reply(m.errors.notLinked, { parse_mode: 'HTML', ...keyboard }); } catch {}
    }
    return null;
  }

  /** Send or edit a message safely */
  private async send(ctx: BotContext, text: string, keyboard: any, edit: boolean) {
    const opts = { parse_mode: 'HTML' as const, ...keyboard };
    if (edit) {
      try {
        await (ctx as any).editMessageText(text, opts);
        return;
      } catch (e: any) {
        if (e?.description?.includes('not modified')) return;
        // fall through to reply
      }
    }
    try {
      await (ctx as any).reply(text, opts);
    } catch (e: any) {
      this.logger.error('send() reply error:', e?.message);
    }
  }

  // ============================================================
  // REGISTER ALL HANDLERS
  // ============================================================

  private registerHandlers() {
    if (!this.bot) return;
    const bot = this.bot;

    // ── Commands ──────────────────────────────────────────────
    bot.start(async (ctx) => {
      const locale = ctx.session.locale || 'en';
      const m = this.t(locale);
      const chatId = String(ctx.chat.id);
      const user = await this.prisma.user.findFirst({ where: { telegramChatId: chatId } });
      if (user) {
        ctx.session.userId = user.id;
        if (user.locale) ctx.session.locale = user.locale as Locale;
        await ctx.reply(`${m.welcome.title}\n\n${m.welcome.alreadyLinked}`, {
          parse_mode: 'HTML', ...this.mainMenu(locale),
        });
      } else {
        await ctx.reply(
          `${m.welcome.title}\n${m.welcome.description}\n\n${m.welcome.needLink}`,
          {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
              [Markup.button.callback(m.buttons.linkAccount, 'link_account')],
              [Markup.button.callback(m.menu.help, 'help_cmd')],
            ]),
          },
        );
      }
    });

    bot.command('menu', async (ctx) => {
      const locale = ctx.session.locale || 'en';
      await ctx.reply(this.t(locale).menu.title, { parse_mode: 'HTML', ...this.mainMenu(locale) });
    });
    bot.command('alerts', async (ctx) => { await this.showAlerts(ctx, false); });
    bot.command('saved', async (ctx) => { await this.showSaved(ctx, false); });
    bot.command('notifications', async (ctx) => { await this.showNotifications(ctx, false); });
    bot.command('settings', async (ctx) => { await this.showSettings(ctx, false); });
    bot.command('help', async (ctx) => { await this.showHelp(ctx, false); });
    bot.command('unlink', async (ctx) => {
      const locale = ctx.session.locale || 'en';
      const m = this.t(locale);
      await ctx.reply(m.settings.confirmUnlink, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(m.buttons.confirm, 'confirm_unlink'),
           Markup.button.callback(m.buttons.cancel, 'menu')],
        ]),
      });
    });

    // ── Callbacks ──────────────────────────────────────────────
    bot.action('menu', async (ctx) => {
      await ctx.answerCbQuery();
      const locale = ctx.session.locale || 'en';
      await this.send(ctx, this.t(locale).menu.title, this.mainMenu(locale), true);
    });

    bot.action('alerts', async (ctx) => {
      await ctx.answerCbQuery();
      ctx.session.page = 1;
      await this.showAlerts(ctx, true);
    });

    bot.action('saved', async (ctx) => {
      await ctx.answerCbQuery();
      ctx.session.page = 1;
      await this.showSaved(ctx, true);
    });

    bot.action('notifications', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showNotifications(ctx, true);
    });

    bot.action('settings', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showSettings(ctx, true);
    });

    bot.action('help', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showHelp(ctx, true);
    });

    bot.action('help_cmd', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showHelp(ctx, true);
    });

    // Account linking
    bot.action('link_account', async (ctx) => {
      await ctx.answerCbQuery();
      const locale = ctx.session.locale || 'en';
      const m = this.t(locale);
      const msg = `${m.linking.instructions}\n\n${m.linking.steps.join('\n')}\n\n${m.linking.expires}\n\n${m.linking.enterCode}`;
      await this.send(ctx, msg, Markup.inlineKeyboard([[Markup.button.callback(m.menu.back, 'menu')]]), true);
      ctx.session.awaitingCode = true;
    });

    bot.action('confirm_unlink', async (ctx) => {
      await ctx.answerCbQuery();
      const chatId = String(ctx.chat?.id || '');
      const locale = ctx.session.locale || 'en';
      const m = this.t(locale);
      try {
        await this.prisma.user.updateMany({ where: { telegramChatId: chatId }, data: { telegramChatId: null } });
        ctx.session.userId = undefined;
        await this.send(ctx, m.settings.unlinked, Markup.inlineKeyboard([[Markup.button.callback(m.menu.back, 'menu')]]), true);
      } catch (e: any) {
        this.logger.error('Unlink error:', e?.message);
      }
    });

    // Language
    bot.action('select_language', async (ctx) => {
      await ctx.answerCbQuery();
      const locale = ctx.session.locale || 'en';
      const m = this.t(locale);
      await this.send(ctx, m.settings.selectLanguage, Markup.inlineKeyboard([
        [Markup.button.callback('🇬🇧 English', 'lang_en'), Markup.button.callback("🇺🇿 O'zbek", 'lang_uz')],
        [Markup.button.callback(m.menu.back, 'settings')],
      ]), true);
    });

    bot.action('lang_en', async (ctx) => {
      await ctx.answerCbQuery();
      ctx.session.locale = 'en';
      await this.updateLocale(ctx, 'en');
      await this.send(ctx, this.t('en').settings.languageChanged, this.mainMenu('en'), true);
    });

    bot.action('lang_uz', async (ctx) => {
      await ctx.answerCbQuery();
      ctx.session.locale = 'uz';
      await this.updateLocale(ctx, 'uz');
      await this.send(ctx, this.t('uz').settings.languageChanged, this.mainMenu('uz'), true);
    });

    // Noop (page display buttons)
    bot.action('noop', async (ctx) => { await ctx.answerCbQuery(); });

    // Alert actions
    bot.action(/^alert_pause_(.+)$/, async (ctx) => {
      await ctx.answerCbQuery();
      const alertId = ctx.match[1];
      const userId = await this.getLinkedUser(ctx);
      if (!userId) return;
      const locale = ctx.session.locale || 'en';
      try {
        await this.alertsService.update(userId, alertId, { status: AlertStatus.PAUSED });
        await this.send(ctx, this.t(locale).alerts.paused, Markup.inlineKeyboard([[Markup.button.callback(this.t(locale).menu.alerts, 'alerts')]]), true);
      } catch (e: any) { this.logger.error('Pause alert error:', e?.message); }
    });

    bot.action(/^alert_resume_(.+)$/, async (ctx) => {
      await ctx.answerCbQuery();
      const alertId = ctx.match[1];
      const userId = await this.getLinkedUser(ctx);
      if (!userId) return;
      const locale = ctx.session.locale || 'en';
      try {
        await this.alertsService.update(userId, alertId, { status: AlertStatus.ACTIVE });
        await this.send(ctx, this.t(locale).alerts.resumed, Markup.inlineKeyboard([[Markup.button.callback(this.t(locale).menu.alerts, 'alerts')]]), true);
      } catch (e: any) { this.logger.error('Resume alert error:', e?.message); }
    });

    bot.action(/^alert_delete_(.+)$/, async (ctx) => {
      await ctx.answerCbQuery();
      const alertId = ctx.match[1];
      const locale = ctx.session.locale || 'en';
      const m = this.t(locale);
      await this.send(ctx, m.alerts.confirmDelete, Markup.inlineKeyboard([
        [Markup.button.callback(m.buttons.confirm, `confirm_del_${alertId}`),
         Markup.button.callback(m.buttons.cancel, 'alerts')],
      ]), true);
    });

    bot.action(/^confirm_del_(.+)$/, async (ctx) => {
      await ctx.answerCbQuery();
      const alertId = ctx.match[1];
      const userId = await this.getLinkedUser(ctx);
      if (!userId) return;
      const locale = ctx.session.locale || 'en';
      try {
        await this.alertsService.archive(userId, alertId);
        await this.send(ctx, this.t(locale).alerts.deleted, Markup.inlineKeyboard([[Markup.button.callback(this.t(locale).menu.alerts, 'alerts')]]), true);
      } catch (e: any) { this.logger.error('Delete alert error:', e?.message); }
    });

    // Pagination
    bot.action(/^page_(alerts|saved|notifications)_(\d+)$/, async (ctx) => {
      await ctx.answerCbQuery();
      const type = ctx.match[1];
      ctx.session.page = parseInt(ctx.match[2], 10);
      if (type === 'alerts') await this.showAlerts(ctx, true);
      else if (type === 'saved') await this.showSaved(ctx, true);
      else if (type === 'notifications') await this.showNotifications(ctx, true);
    });

    // Text handler (verification code)
    bot.on('text', async (ctx) => {
      const text = (ctx.message as any).text as string;
      if (text.startsWith('/')) return;
      if (ctx.session.awaitingCode) {
        await this.verifyCode(ctx, text.trim());
      }
    });
  }

  // ============================================================
  // SCREENS
  // ============================================================

  private async showAlerts(ctx: BotContext, edit: boolean) {
    const userId = await this.getLinkedUser(ctx);
    if (!userId) return;
    const locale = ctx.session.locale || 'en';
    const m = this.t(locale);
    const page = ctx.session.page || 1;
    const pageSize = 5;

    try {
      const alerts = await this.alertsService.listByUser(userId);

      if (!alerts.length) {
        return this.send(ctx, `${m.alerts.title}\n\n${m.alerts.empty}`,
          Markup.inlineKeyboard([[Markup.button.callback(m.menu.back, 'menu')]]), edit);
      }

      const start = (page - 1) * pageSize;
      const page_items = alerts.slice(start, start + pageSize);
      const totalPages = Math.ceil(alerts.length / pageSize);

      let msg = m.alerts.header(alerts.length) + '\n\n';
      for (let i = 0; i < page_items.length; i++) {
        const a = page_items[i];
        const sKey = a.status as keyof typeof m.alerts.status;
        const emoji = m.alerts.statusEmoji[sKey] || '⚪';
        const cond = m.alerts.condition[a.condition as keyof typeof m.alerts.condition] || a.condition;
        msg += m.alerts.item(start + i + 1, a.productTitle, cond, String(a.threshold), a.currency, m.alerts.status[sKey] || a.status, emoji) + '\n\n';
      }

      const buttons: any[] = [];
      for (const a of page_items) {
        const short = a.productTitle.length > 18 ? a.productTitle.slice(0, 18) + '…' : a.productTitle;
        if (a.status === 'ACTIVE') buttons.push([Markup.button.callback(`⏸ ${short}`, `alert_pause_${a.id}`), Markup.button.callback('🗑', `alert_delete_${a.id}`)]);
        else if (a.status === 'PAUSED') buttons.push([Markup.button.callback(`▶️ ${short}`, `alert_resume_${a.id}`), Markup.button.callback('🗑', `alert_delete_${a.id}`)]);
        else buttons.push([Markup.button.callback('🗑 ' + short, `alert_delete_${a.id}`)]);
      }
      if (totalPages > 1) {
        const row: any[] = [];
        if (page > 1) row.push(Markup.button.callback(m.buttons.previous, `page_alerts_${page - 1}`));
        row.push(Markup.button.callback(`${page}/${totalPages}`, 'noop'));
        if (page < totalPages) row.push(Markup.button.callback(m.buttons.next, `page_alerts_${page + 1}`));
        buttons.push(row);
      }
      buttons.push([Markup.button.callback(m.menu.back, 'menu')]);

      await this.send(ctx, msg, Markup.inlineKeyboard(buttons), edit);
    } catch (e: any) {
      this.logger.error('showAlerts error:', e?.message);
    }
  }

  private async showSaved(ctx: BotContext, edit: boolean) {
    const userId = await this.getLinkedUser(ctx);
    if (!userId) return;
    const locale = ctx.session.locale || 'en';
    const m = this.t(locale);
    const page = ctx.session.page || 1;
    const webUrl = this.getWebUrl();

    try {
      const result = await this.savedProductsService.list(userId, page, 5);
      if (!result.items.length) {
        return this.send(ctx, `${m.saved.title}\n\n${m.saved.empty}`,
          Markup.inlineKeyboard([[Markup.button.callback(m.menu.back, 'menu')]]), edit);
      }

      const totalPages = Math.ceil(result.total / 5);
      let msg = m.saved.header(result.total) + '\n\n';
      for (let i = 0; i < result.items.length; i++) {
        const item = result.items[i];
        const p = item.product;
        const url = `${webUrl}/products/${p.slug || p.id}`;
        msg += m.saved.item((page - 1) * 5 + i + 1, p.title, p.lowestPrice ? String(p.lowestPrice) : '', p.currency || 'USD', p.marketplaceCount || 0, url) + '\n\n';
      }

      const buttons: any[] = [];
      if (totalPages > 1) {
        const row: any[] = [];
        if (page > 1) row.push(Markup.button.callback(m.buttons.previous, `page_saved_${page - 1}`));
        row.push(Markup.button.callback(`${page}/${totalPages}`, 'noop'));
        if (page < totalPages) row.push(Markup.button.callback(m.buttons.next, `page_saved_${page + 1}`));
        buttons.push(row);
      }
      buttons.push([Markup.button.url('🌐 View All', `${webUrl}/saved`)]);
      buttons.push([Markup.button.callback(m.menu.back, 'menu')]);

      await this.send(ctx, msg, Markup.inlineKeyboard(buttons), edit);
    } catch (e: any) {
      this.logger.error('showSaved error:', e?.message);
    }
  }

  private async showNotifications(ctx: BotContext, edit: boolean) {
    const userId = await this.getLinkedUser(ctx);
    if (!userId) return;
    const locale = ctx.session.locale || 'en';
    const m = this.t(locale);

    try {
      const notifs = await this.notificationsService.listForUser(userId, 15);
      if (!notifs.length) {
        return this.send(ctx, `${m.notifications.title}\n\n${m.notifications.empty}`,
          Markup.inlineKeyboard([[Markup.button.callback(m.menu.back, 'menu')]]), edit);
      }

      let msg = m.notifications.header(notifs.length) + '\n\n';
      for (const n of notifs) {
        const emoji = m.notifications.status[n.status as keyof typeof m.notifications.status] || '📌';
        const date = new Date(n.createdAt).toLocaleString(locale === 'uz' ? 'uz-UZ' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        msg += m.notifications.item(n.subject, date, emoji) + '\n\n';
      }

      await this.send(ctx, msg, Markup.inlineKeyboard([
        [Markup.button.callback(m.buttons.refresh, 'notifications')],
        [Markup.button.callback(m.menu.back, 'menu')],
      ]), edit);
    } catch (e: any) {
      this.logger.error('showNotifications error:', e?.message);
    }
  }

  private async showSettings(ctx: BotContext, edit: boolean) {
    const userId = await this.getLinkedUser(ctx);
    if (!userId) return;
    const locale = ctx.session.locale || 'en';
    const m = this.t(locale);
    const webUrl = this.getWebUrl();

    await this.send(ctx, m.settings.title, Markup.inlineKeyboard([
      [Markup.button.callback(m.settings.language, 'select_language')],
      [Markup.button.url('🌐 Open Website', webUrl)],
      [Markup.button.url('⚙️ Account Settings', `${webUrl}/settings`)],
      [Markup.button.callback(m.buttons.unlinkAccount, 'confirm_unlink')],
      [Markup.button.callback(m.menu.back, 'menu')],
    ]), edit);
  }

  private async showHelp(ctx: BotContext, edit: boolean) {
    const locale = ctx.session.locale || 'en';
    const m = this.t(locale);
    const webUrl = this.getWebUrl();

    const msg = [
      m.help.title,
      '',
      m.help.description,
      m.help.commands.map(c => `  <code>${c}</code>`).join('\n'),
      '',
      m.help.features,
      m.help.featureList.join('\n'),
    ].join('\n');

    await this.send(ctx, msg, Markup.inlineKeyboard([
      [Markup.button.url('🌐 Open PricePulse', webUrl)],
      [Markup.button.callback(m.menu.back, 'menu')],
    ]), edit);
  }

  // ============================================================
  // VERIFICATION CODE
  // ============================================================

  private async verifyCode(ctx: BotContext, code: string) {
    const chatId = String((ctx as any).chat?.id || '');
    const locale = ctx.session.locale || 'en';
    const m = this.t(locale);

    const verification = await this.prisma.telegramVerification.findFirst({
      where: { code: code.toUpperCase(), usedAt: null, expiresAt: { gte: new Date() } },
      include: { user: true },
    });

    if (!verification) {
      await (ctx as any).reply(m.linking.invalidCode, { parse_mode: 'HTML' });
      return;
    }

    const conflict = await this.prisma.user.findFirst({
      where: { telegramChatId: chatId, id: { not: verification.userId } },
    });
    if (conflict) {
      await (ctx as any).reply(m.linking.alreadyLinked, { parse_mode: 'HTML' });
      return;
    }

    await this.prisma.user.update({
      where: { id: verification.userId },
      data: { telegramChatId: chatId, locale },
    });
    await this.prisma.telegramVerification.update({
      where: { id: verification.id },
      data: { usedAt: new Date(), chatId },
    });

    ctx.session.userId = verification.userId;
    ctx.session.awaitingCode = false;

    await (ctx as any).reply(`${m.linking.success}\n\n${m.welcome.title}`, {
      parse_mode: 'HTML',
      ...this.mainMenu(locale),
    });
  }

  // ============================================================
  // UTILS
  // ============================================================

  private async updateLocale(ctx: BotContext, locale: Locale) {
    if (!ctx.session.userId) return;
    await this.prisma.user.update({ where: { id: ctx.session.userId }, data: { locale } }).catch(() => {});
  }

  getBot() { return this.bot; }

  async handleUpdate(update: any) {
    if (!this.bot) return;
    await this.bot.handleUpdate(update);
  }

  // ============================================================
  // SEND ALERT NOTIFICATION (called from alerts job)
  // ============================================================

  async sendAlertNotification(userId: string, alert: any, product: any, offer: any) {
    if (!this.bot) return;
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user?.telegramChatId) return;

      const locale = (user.locale as Locale) || 'en';
      const m = this.t(locale);
      const webUrl = this.getWebUrl();
      const oldPrice = Number(offer.originalPrice || offer.currentPrice);
      const newPrice = Number(offer.currentPrice);
      const savings = oldPrice - newPrice;
      const savingsPct = oldPrice > 0 ? ((savings / oldPrice) * 100).toFixed(0) : '0';
      const currency = offer.currency || product.currency || 'USD';
      const productUrl = `${webUrl}/products/${product.slug || product.id}`;

      const msg =
        `🔥 <b>${m.alert_notification.title}</b>\n` +
        `${'─'.repeat(28)}\n\n` +
        `📦 <b>${product.title}</b>\n\n` +
        `💸 <s>${oldPrice} ${currency}</s>  →  <b>${newPrice} ${currency}</b>\n` +
        `🎉 ${m.alert_notification.save}: <b>${savings.toFixed(2)} ${currency}</b> <i>(${savingsPct}% off)</i>\n\n` +
        `🏪 ${m.alert_notification.marketplace} <b>${offer.marketplace?.name || 'Store'}</b>\n` +
        `${'─'.repeat(28)}`;

      await this.bot.telegram.sendMessage(user.telegramChatId, msg, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.url('🛒 View Deal', offer.externalUrl || productUrl)],
          [Markup.button.url('📊 All Prices', productUrl), Markup.button.callback('⏸ Pause Alert', `alert_pause_${alert.id}`)],
        ]),
      });
    } catch (e: any) {
      this.logger.error('sendAlertNotification error:', e?.message);
    }
  }
}
