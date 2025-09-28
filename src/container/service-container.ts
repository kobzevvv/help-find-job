/**
 * Simple service initialization
 * Creates all services with their dependencies
 */

import { LoggingService } from '../services/logging';
import { Env } from '../index';
import { SessionService } from '../services/session';
import { TelegramService } from '../services/telegram';
import { ConversationHandler } from '../handlers/conversation';
import { WebhookHandler } from '../handlers/webhook';

export interface Services {
  sessionService: SessionService;
  telegramService: TelegramService;
  loggingService: LoggingService;
  conversationHandler: ConversationHandler;
  webhookHandler: WebhookHandler;
}

/**
 * Create all services with their dependencies
 */
export async function createServices(env: Env): Promise<Services> {
  // Initialize core services
  const sessionService = new SessionService(env.SESSIONS);
  const telegramService = new TelegramService(env.TELEGRAM_BOT_TOKEN || '');
  const loggingService = new LoggingService(env.LOGS_DB);

  // Initialize handlers
  const conversationHandler = new ConversationHandler(
    sessionService,
    telegramService,
    loggingService,
    env.AI
  );

  const webhookHandler = new WebhookHandler(conversationHandler);

  return {
    sessionService,
    telegramService,
    loggingService,
    conversationHandler,
    webhookHandler,
  };
}
