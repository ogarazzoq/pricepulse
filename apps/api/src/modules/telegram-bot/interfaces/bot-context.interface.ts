import { Context } from 'telegraf';

export interface BotSession {
  userId?: string;
  locale?: 'en' | 'uz';
  page?: number;
  collectionId?: string | null;
  awaitingCode?: boolean;
}

export interface BotContext extends Context {
  session: BotSession;
}
