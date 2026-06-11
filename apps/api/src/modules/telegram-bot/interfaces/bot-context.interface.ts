import { Context } from 'telegraf';

export interface BotSession {
  userId?: string;
  locale?: 'en' | 'uz';
  page?: number;
  collectionId?: string | null;
}

export interface BotContext extends Context {
  session: BotSession;
}
