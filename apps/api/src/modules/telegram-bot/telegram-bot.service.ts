import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Markup } from 'telegraf';
import { BotContext } from './interfaces/bot-context.interface';
import { getMessage, Locale, MESSAGES } from './constants/messages';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { SavedProductsService } from '../saved-products/saved-products.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CollectionsService } from '../collections/collections.service';
import { Alert, AlertStatus, NotificationChannel } from '@prisma/client';

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
    if (!this.botToken) {
      this.logger.warn('Bot not initialized - token missing');
      return;
    }

    this.bot = new Telegraf<BotContext>(this.botToken);
    
    // Simple session middleware (in-memory)
    const sessions = new Map();
    this.bot.use((ctx, next) => {
      const chatId = ctx.chat?.id;
      if (chatId) {
        if (!sessions.has(chatId)) {
          sessions.set(chatId, { locale: 'en', page: 1 });
        }
        ctx.session = sessions.get(chatId);
      }
      return next();
    });

    // Register handlers
    this.registerCommands();
    this.registerCallbacks();
    this.registerTextHandlers();

    // Start bot in polling mode (for development)
    const mode = this.config.get<string>('telegram.mode') || 'polling';
    
    if (mode === 'polling') {
      this.logger.log('Starting bot in polling mode...');
      // Non-blocking launch - don't await, let server start first
      this.bot.launch().catch((err) => {
        this.logger.error('Bot launch error:', err.message);
      });
      this.logger.log('Telegram bot started in polling mode');
      
      // Graceful shutdown
      process.once('SIGINT', () => this.bot?.stop('SIGINT'));
      process.once('SIGTERM', () => this.bot?.stop('SIGTERM'));
    } else {
      this.logger.log('Telegram bot initialized (webhook mode)');
    }
  }

  private registerCommands() {
    if (!this.bot) return;

    // /start command
    this.bot.command('start', async (ctx) => {
      const chatId = String(ctx.chat.id);
      const user = await this.prisma.user.findFirst({
        where: { telegramChatId: chatId },
      });

      const locale = ctx.session.locale || 'en';

      if (user) {
        ctx.session.userId = user.id;
        await ctx.reply(
          `${getMessage(locale, 'welcome.title')}\n\n${getMessage(locale, 'welcome.alreadyLinked')}`,
          this.getMainMenuKeyboard(locale),
        );
      } else {
        await ctx.reply(
          `${getMessage(locale, 'welcome.title')}\n${getMessage(locale, 'welcome.description')}\n\n${getMessage(locale, 'welcome.needLink')}`,
          Markup.inlineKeyboard([
            [Markup.button.callback(getMessage(locale, 'buttons.linkAccount'), 'link_account')],
            [Markup.button.callback(getMessage(locale, 'buttons.help'), 'help')],
          ]),
        );
      }
    });

    // /menu command
    this.bot.command('menu', async (ctx) => {
      const locale = ctx.session.locale || 'en';
      await ctx.reply(
        getMessage(locale, 'menu.title') || 'Main Menu',
        this.getMainMenuKeyboard(locale),
      );
    });

    // /alerts command
    this.bot.command('alerts', async (ctx) => this.showAlerts(ctx));

    // /saved command
    this.bot.command('saved', async (ctx) => this.showSavedProducts(ctx));

    // /notifications command
    this.bot.command('notifications', async (ctx) => this.showNotifications(ctx));

    // /settings command
    this.bot.command('settings', async (ctx) => this.showSettings(ctx));

    // /help command
    this.bot.command('help', async (ctx) => this.showHelp(ctx));

    // /unlink command
    this.bot.command('unlink', async (ctx) => {
      const locale = ctx.session.locale || 'en';
      await ctx.reply(
        getMessage(locale, 'settings.confirmUnlink'),
        Markup.inlineKeyboard([
          [
            Markup.button.callback(getMessage(locale, 'buttons.confirm'), 'confirm_unlink'),
            Markup.button.callback(getMessage(locale, 'buttons.cancel'), 'menu'),
          ],
        ]),
      );
    });
  }

  private registerCallbacks() {
    if (!this.bot) return;

    // Main menu callbacks
    this.bot.action('menu', async (ctx) => {
      await ctx.answerCbQuery();
      const locale = ctx.session.locale || 'en';
      await ctx.editMessageText(
        getMessage(locale, 'menu.title') || 'Main Menu',
        this.getMainMenuKeyboard(locale),
      );
    });

    this.bot.action('alerts', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showAlerts(ctx);
    });

    this.bot.action('saved', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showSavedProducts(ctx);
    });

    this.bot.action('notifications', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showNotifications(ctx);
    });

    this.bot.action('settings', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showSettings(ctx);
    });

    this.bot.action('help', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showHelp(ctx);
    });

    // Account linking
    this.bot.action('link_account', async (ctx) => {
      await ctx.answerCbQuery();
      await this.handleLinkAccount(ctx);
    });

    this.bot.action('confirm_unlink', async (ctx) => {
      await ctx.answerCbQuery();
      await this.handleUnlinkAccount(ctx);
    });

    // Language settings
    this.bot.action('lang_en', async (ctx) => {
      await ctx.answerCbQuery();
      ctx.session.locale = 'en';
      await this.updateUserLocale(ctx, 'en');
      await ctx.editMessageText(
        getMessage('en', 'settings.languageChanged'),
        this.getMainMenuKeyboard('en'),
      );
    });

    this.bot.action('lang_uz', async (ctx) => {
      await ctx.answerCbQuery();
      ctx.session.locale = 'uz';
      await this.updateUserLocale(ctx, 'uz');
      await ctx.editMessageText(
        getMessage('uz', 'settings.languageChanged'),
        this.getMainMenuKeyboard('uz'),
      );
    });

    // Alert actions
    this.bot.action(/alert_pause_(.+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const alertId = ctx.match[1];
      await this.handlePauseAlert(ctx, alertId);
    });

    this.bot.action(/alert_resume_(.+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const alertId = ctx.match[1];
      await this.handleResumeAlert(ctx, alertId);
    });

    this.bot.action(/alert_delete_(.+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const alertId = ctx.match[1];
      const locale = ctx.session.locale || 'en';
      await ctx.editMessageText(
        getMessage(locale, 'alerts.confirmDelete'),
        Markup.inlineKeyboard([
          [
            Markup.button.callback(getMessage(locale, 'buttons.confirm'), `confirm_delete_alert_${alertId}`),
            Markup.button.callback(getMessage(locale, 'buttons.cancel'), 'alerts'),
          ],
        ]),
      );
    });

    this.bot.action(/confirm_delete_alert_(.+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const alertId = ctx.match[1];
      await this.handleDeleteAlert(ctx, alertId);
    });

    // Saved product actions
    this.bot.action(/saved_remove_(.+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const productId = ctx.match[1];
      const locale = ctx.session.locale || 'en';
      await ctx.editMessageText(
        getMessage(locale, 'saved.confirmRemove'),
        Markup.inlineKeyboard([
          [
            Markup.button.callback(getMessage(locale, 'buttons.confirm'), `confirm_remove_saved_${productId}`),
            Markup.button.callback(getMessage(locale, 'buttons.cancel'), 'saved'),
          ],
        ]),
      );
    });

    this.bot.action(/confirm_remove_saved_(.+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const productId = ctx.match[1];
      await this.handleRemoveSaved(ctx, productId);
    });

    // Pagination
    this.bot.action(/page_(.+)_(\d+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const [, type, pageStr] = ctx.match;
      ctx.session.page = parseInt(pageStr, 10);
      
      if (type === 'alerts') await this.showAlerts(ctx, true);
      else if (type === 'saved') await this.showSavedProducts(ctx, true);
      else if (type === 'notifications') await this.showNotifications(ctx, true);
    });
  }

  private registerTextHandlers() {
    if (!this.bot) return;

    // Handle text messages
    this.bot.on('text', async (ctx) => {
      const text = ctx.message.text;
      
      // Skip if it's a command
      if (text.startsWith('/')) return;

      // Check if waiting for verification code
      if (ctx.session.awaitingCode) {
        await this.handleCodeInput(ctx, text.trim());
        return;
      }

      // Simple product search (can be enhanced)
      const locale = ctx.session.locale || 'en';
      await ctx.reply(`🔍 Search feature coming soon!\n\nSearched for: "${text}"`);
    });
  }

  // ========== Handler Methods ==========

  private async showAlerts(ctx: BotContext, edit = false) {
    if (!await this.ensureLinked(ctx)) return;

    const locale = ctx.session.locale || 'en';
    const page = ctx.session.page || 1;
    const pageSize = 5;
    const msgs = MESSAGES[locale];

    try {
      const alerts = await this.alertsService.listByUser(ctx.session.userId!);

      if (alerts.length === 0) {
        const message = `${msgs.alerts.title}\n\n${msgs.alerts.empty}`;
        const keyboard = Markup.inlineKeyboard([[Markup.button.callback(msgs.menu.back, 'menu')]]);
        if (edit) await ctx.editMessageText(message, { parse_mode: 'HTML', ...keyboard });
        else await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
        return;
      }

      const start = (page - 1) * pageSize;
      const pageAlerts = alerts.slice(start, start + pageSize);
      const totalPages = Math.ceil(alerts.length / pageSize);

      let message = msgs.alerts.header(alerts.length) + '\n\n';

      for (let i = 0; i < pageAlerts.length; i++) {
        const alert = pageAlerts[i];
        const statusKey = alert.status as keyof typeof msgs.alerts.status;
        const statusEmoji = msgs.alerts.statusEmoji[statusKey] || '⚪';
        const status = msgs.alerts.status[statusKey] || alert.status;
        const condition = msgs.alerts.condition[alert.condition as keyof typeof msgs.alerts.condition] || alert.condition;
        message += msgs.alerts.item(
          start + i + 1,
          alert.productTitle,
          condition,
          String(alert.threshold),
          alert.currency,
          status,
          statusEmoji,
        ) + '\n\n';
      }

      // Per-alert action buttons
      const buttons: any[] = [];
      for (const alert of pageAlerts) {
        const row: any[] = [];
        const shortTitle = alert.productTitle.length > 20 ? alert.productTitle.slice(0, 20) + '…' : alert.productTitle;
        if (alert.status === 'ACTIVE') {
          row.push(Markup.button.callback(`⏸ ${shortTitle}`, `alert_pause_${alert.id}`));
        } else if (alert.status === 'PAUSED') {
          row.push(Markup.button.callback(`▶️ ${shortTitle}`, `alert_resume_${alert.id}`));
        }
        row.push(Markup.button.callback('🗑', `alert_delete_${alert.id}`));
        buttons.push(row);
      }

      // Pagination
      if (totalPages > 1) {
        const paginationRow: any[] = [];
        if (page > 1) paginationRow.push(Markup.button.callback(msgs.buttons.previous, `page_alerts_${page - 1}`));
        paginationRow.push(Markup.button.callback(`${page} / ${totalPages}`, 'noop'));
        if (page < totalPages) paginationRow.push(Markup.button.callback(msgs.buttons.next, `page_alerts_${page + 1}`));
        buttons.push(paginationRow);
      }

      buttons.push([Markup.button.callback(msgs.menu.back, 'menu')]);

      const keyboard = Markup.inlineKeyboard(buttons);
      if (edit) await ctx.editMessageText(message, { parse_mode: 'HTML', ...keyboard });
      else await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
    } catch (error) {
      this.logger.error('Show alerts error:', error);
      await this.handleError(ctx, error);
    }
  }

  private async showSavedProducts(ctx: BotContext, edit = false) {
    if (!await this.ensureLinked(ctx)) return;

    const locale = ctx.session.locale || 'en';
    const page = ctx.session.page || 1;
    const pageSize = 5;
    const msgs = MESSAGES[locale];
    const webUrl = this.config.get<string>('app.frontendUrl') || 'https://pricepulse.app';

    try {
      const result = await this.savedProductsService.list(ctx.session.userId!, page, pageSize);

      if (result.items.length === 0) {
        const message = `${msgs.saved.title}\n\n${msgs.saved.empty}`;
        const keyboard = Markup.inlineKeyboard([[Markup.button.callback(msgs.menu.back, 'menu')]]);
        if (edit) await ctx.editMessageText(message, { parse_mode: 'HTML', ...keyboard });
        else await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
        return;
      }

      const totalPages = Math.ceil(result.total / pageSize);
      let message = msgs.saved.header(result.total) + '\n\n';

      for (let i = 0; i < result.items.length; i++) {
        const item = result.items[i];
        const product = item.product;
        const productUrl = `${webUrl}/products/${product.slug || product.id}`;
        const price = product.lowestPrice ? String(product.lowestPrice) : '';
        const currency = product.currency || 'USD';
        const stores = product.marketplaceCount || 0;

        message += msgs.saved.item(
          (page - 1) * pageSize + i + 1,
          product.title,
          price,
          currency,
          stores,
          productUrl,
        ) + '\n\n';
      }

      const buttons: any[] = [];

      // Pagination
      if (totalPages > 1) {
        const paginationRow: any[] = [];
        if (page > 1) paginationRow.push(Markup.button.callback(msgs.buttons.previous, `page_saved_${page - 1}`));
        paginationRow.push(Markup.button.callback(`${page} / ${totalPages}`, 'noop'));
        if (page < totalPages) paginationRow.push(Markup.button.callback(msgs.buttons.next, `page_saved_${page + 1}`));
        buttons.push(paginationRow);
      }

      buttons.push([
        Markup.button.url('🌐 View All on Website', `${webUrl}/saved`),
      ]);
      buttons.push([Markup.button.callback(msgs.menu.back, 'menu')]);

      const keyboard = Markup.inlineKeyboard(buttons);
      if (edit) await ctx.editMessageText(message, { parse_mode: 'HTML', ...keyboard });
      else await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
    } catch (error) {
      this.logger.error('Show saved products error:', error);
      await this.handleError(ctx, error);
    }
  }

  private async showNotifications(ctx: BotContext, edit = false) {
    if (!await this.ensureLinked(ctx)) return;

    const locale = ctx.session.locale || 'en';
    const msgs = MESSAGES[locale];

    try {
      const notifications = await this.notificationsService.listForUser(ctx.session.userId!, 15);

      if (notifications.length === 0) {
        const message = `${msgs.notifications.title}\n\n${msgs.notifications.empty}`;
        const keyboard = Markup.inlineKeyboard([[Markup.button.callback(msgs.menu.back, 'menu')]]);
        if (edit) await ctx.editMessageText(message, { parse_mode: 'HTML', ...keyboard });
        else await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
        return;
      }

      let message = msgs.notifications.header(notifications.length) + '\n\n';

      for (const notif of notifications) {
        const statusKey = notif.status as keyof typeof msgs.notifications.status;
        const statusEmoji = msgs.notifications.status[statusKey] || '📌';
        const date = new Date(notif.createdAt).toLocaleString(locale === 'uz' ? 'uz-UZ' : 'en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        });
        message += msgs.notifications.item(notif.subject, date, statusEmoji) + '\n\n';
      }

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback(msgs.buttons.refresh, 'notifications')],
        [Markup.button.callback(msgs.menu.back, 'menu')],
      ]);

      if (edit) await ctx.editMessageText(message, { parse_mode: 'HTML', ...keyboard });
      else await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
    } catch (error) {
      this.logger.error('Show notifications error:', error);
      await this.handleError(ctx, error);
    }
  }

  private async showSettings(ctx: BotContext) {
    if (!await this.ensureLinked(ctx)) return;

    const locale = ctx.session.locale || 'en';
    const msgs = MESSAGES[locale];
    const webUrl = this.config.get<string>('app.frontendUrl') || 'https://pricepulse.app';

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(msgs.settings.language, 'select_language')],
      [Markup.button.url('🌐 Open Website', webUrl)],
      [Markup.button.url('⚙️ Account Settings', `${webUrl}/settings`)],
      [Markup.button.callback(msgs.buttons.unlinkAccount, 'confirm_unlink')],
      [Markup.button.callback(msgs.menu.back, 'menu')],
    ]);

    await ctx.reply(msgs.settings.title, { parse_mode: 'HTML', ...keyboard });
  }

  private async showHelp(ctx: BotContext) {
    const locale = ctx.session.locale || 'en';
    const msgs = MESSAGES[locale];
    const webUrl = this.config.get<string>('app.frontendUrl') || 'https://pricepulse.app';

    let message = `${msgs.help.title}\n\n`;
    message += `${msgs.help.description}\n`;
    message += msgs.help.commands.map(c => `  <code>${c}</code>`).join('\n');
    message += '\n' + msgs.help.features + '\n';
    message += msgs.help.featureList.join('\n');

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.url('🌐 Open PricePulse', webUrl)],
      [Markup.button.callback(msgs.menu.back, 'menu')],
    ]);

    await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
  }

  private async handleLinkAccount(ctx: BotContext) {
    const chatId = String(ctx.chat?.id);
    const locale = ctx.session.locale || 'en';

    const linking = MESSAGES[locale].linking;
    let message = `${linking.instructions}\n\n`;
    message += linking.steps.join('\n') + '\n\n';
    message += linking.expires;

    await ctx.editMessageText(message, { 
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(getMessage(locale, 'menu.back'), 'menu')],
      ]),
    });

    // Set state to wait for code input
    ctx.session.awaitingCode = true;
  }

  private async handleCodeInput(ctx: BotContext, code: string) {
    const chatId = String(ctx.chat?.id);
    const locale = ctx.session.locale || 'en';

    try {
      // Find verification code in database
      const verification = await this.prisma.telegramVerification.findFirst({
        where: {
          code: code.toUpperCase(),
          usedAt: null,
          expiresAt: { gte: new Date() },
        },
        include: {
          user: true,
        },
      });

      if (!verification) {
        await ctx.reply(getMessage(locale, 'linking.invalidCode'));
        return;
      }

      // Check if this telegram account is already linked to another user
      const existingUser = await this.prisma.user.findFirst({
        where: {
          telegramChatId: chatId,
          id: { not: verification.userId },
        },
      });

      if (existingUser) {
        await ctx.reply(getMessage(locale, 'linking.alreadyLinked'));
        return;
      }

      // Update user with telegram chat ID
      await this.prisma.user.update({
        where: { id: verification.userId },
        data: { 
          telegramChatId: chatId,
          locale: locale, // Save user's selected language
        },
      });

      // Mark verification as used
      await this.prisma.telegramVerification.update({
        where: { id: verification.id },
        data: {
          usedAt: new Date(),
          chatId,
        },
      });

      // Set session
      ctx.session.userId = verification.userId;
      ctx.session.awaitingCode = false;

      await ctx.reply(
        `✅ ${getMessage(locale, 'linking.success')}\n\n${getMessage(locale, 'welcome.title')}`,
        this.getMainMenuKeyboard(locale),
      );
    } catch (error) {
      this.logger.error('Code verification error:', error);
      await ctx.reply(getMessage(locale, 'errors.serverError'));
    }
  }

  private async handleUnlinkAccount(ctx: BotContext) {
    const chatId = String(ctx.chat?.id);
    const locale = ctx.session.locale || 'en';

    try {
      await this.prisma.user.updateMany({
        where: { telegramChatId: chatId },
        data: { telegramChatId: null },
      });

      ctx.session.userId = undefined;
      await ctx.editMessageText(getMessage(locale, 'settings.unlinked'));
    } catch (error) {
      this.logger.error('Unlink error:', error);
      await this.handleError(ctx, error);
    }
  }

  private async handlePauseAlert(ctx: BotContext, alertId: string) {
    const locale = ctx.session.locale || 'en';

    try {
      await this.alertsService.update(ctx.session.userId!, alertId, { status: AlertStatus.PAUSED });
      await ctx.editMessageText(getMessage(locale, 'alerts.paused'));
      setTimeout(() => this.showAlerts(ctx, true), 1000);
    } catch (error) {
      await this.handleError(ctx, error);
    }
  }

  private async handleResumeAlert(ctx: BotContext, alertId: string) {
    const locale = ctx.session.locale || 'en';

    try {
      await this.alertsService.update(ctx.session.userId!, alertId, { status: AlertStatus.ACTIVE });
      await ctx.editMessageText(getMessage(locale, 'alerts.resumed'));
      setTimeout(() => this.showAlerts(ctx, true), 1000);
    } catch (error) {
      await this.handleError(ctx, error);
    }
  }

  private async handleDeleteAlert(ctx: BotContext, alertId: string) {
    const locale = ctx.session.locale || 'en';

    try {
      await this.alertsService.archive(ctx.session.userId!, alertId);
      await ctx.editMessageText(getMessage(locale, 'alerts.deleted'));
      setTimeout(() => this.showAlerts(ctx, true), 1000);
    } catch (error) {
      await this.handleError(ctx, error);
    }
  }

  private async handleRemoveSaved(ctx: BotContext, productId: string) {
    const locale = ctx.session.locale || 'en';

    try {
      await this.savedProductsService.remove(ctx.session.userId!, productId);
      await ctx.editMessageText(getMessage(locale, 'saved.removed'));
      setTimeout(() => this.showSavedProducts(ctx, true), 1000);
    } catch (error) {
      await this.handleError(ctx, error);
    }
  }

  // ========== Utility Methods ==========

  private getMainMenuKeyboard(locale: Locale) {
    return Markup.inlineKeyboard([
      [Markup.button.callback(getMessage(locale, 'menu.alerts'), 'alerts')],
      [Markup.button.callback(getMessage(locale, 'menu.saved'), 'saved')],
      [Markup.button.callback(getMessage(locale, 'menu.notifications'), 'notifications')],
      [Markup.button.callback(getMessage(locale, 'menu.settings'), 'settings')],
      [Markup.button.callback(getMessage(locale, 'menu.help'), 'help')],
    ]);
  }

  private async ensureLinked(ctx: BotContext): Promise<boolean> {
    if (ctx.session.userId) return true;

    const chatId = String(ctx.chat?.id);
    const user = await this.prisma.user.findFirst({
      where: { telegramChatId: chatId },
    });

    if (user) {
      ctx.session.userId = user.id;
      return true;
    }

    const locale = ctx.session.locale || 'en';
    await ctx.reply(getMessage(locale, 'errors.notLinked'));
    return false;
  }

  private async updateUserLocale(ctx: BotContext, locale: Locale) {
    if (!ctx.session.userId) return;

    try {
      await this.prisma.user.update({
        where: { id: ctx.session.userId },
        data: { locale },
      });
    } catch (error) {
      this.logger.error('Update locale error:', error);
    }
  }

  private async handleError(ctx: BotContext, error: any) {
    const locale = ctx.session.locale || 'en';
    await ctx.reply(getMessage(locale, 'errors.serverError'));
  }

  private generateVerificationCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // ========== Public API for webhook ==========

  getBot(): Telegraf<BotContext> | null {
    return this.bot;
  }

  async handleUpdate(update: any) {
    if (!this.bot) {
      this.logger.warn('Bot not initialized');
      return;
    }
    await this.bot.handleUpdate(update);
  }

  // ========== Send Alert Notification ==========

  async sendAlertNotification(userId: string, alert: any, product: any, offer: any) {
    if (!this.bot) return;

    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user?.telegramChatId) return;

      const locale = (user.locale as Locale) || 'en';
      const msgs = MESSAGES[locale];
      const webUrl = this.config.get<string>('app.frontendUrl') || 'https://pricepulse.app';

      const oldPrice = Number(offer.originalPrice || offer.currentPrice);
      const newPrice = Number(offer.currentPrice);
      const savings = oldPrice - newPrice;
      const savingsPct = ((savings / oldPrice) * 100).toFixed(0);
      const currency = offer.currency || product.currency || 'USD';
      const productUrl = `${webUrl}/products/${product.slug || product.id}`;

      const message =
        `🔥 <b>${msgs.alert_notification.title}</b>\n` +
        `${'─'.repeat(28)}\n\n` +
        `📦 <b>${product.title}</b>\n\n` +
        `💸 <s>${oldPrice} ${currency}</s>  →  <b>${newPrice} ${currency}</b>\n` +
        `🎉 ${msgs.alert_notification.save}: <b>${savings.toFixed(2)} ${currency}</b> <i>(${savingsPct}% off)</i>\n\n` +
        `🏪 ${msgs.alert_notification.marketplace} <b>${offer.marketplace?.name || 'Store'}</b>\n` +
        `${'─'.repeat(28)}`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.url('🛒 View Deal', offer.externalUrl || productUrl)],
        [
          Markup.button.url('📊 All Prices', productUrl),
          Markup.button.callback('⏸ Pause Alert', `alert_pause_${alert.id}`),
        ],
      ]);

      await this.bot.telegram.sendMessage(user.telegramChatId, message, {
        parse_mode: 'HTML',
        ...keyboard,
      });
    } catch (error) {
      this.logger.error('Send alert notification error:', error);
    }
  }
}
