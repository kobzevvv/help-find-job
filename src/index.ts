/**
 * Telegram Resume Matcher Bot - Main Entry Point
 *
 * This is the main entry point for the Cloudflare Workers-based Telegram bot
 * that analyzes resume-job description compatibility using AI.
 */

import { WebhookHandler } from './handlers/webhook';
import { ConversationHandler } from './handlers/conversation';
import { SessionService } from './services/session';
import { TelegramService } from './services/telegram';
import { LoggingService } from './services/logging';
import { createServiceContainer } from './container/service-container';

export interface Env {
  // Telegram Configuration
  TELEGRAM_BOT_TOKEN?: string;

  // Cloudflare Workers Configuration
  SESSIONS: KVNamespace;
  LOGS_DB?: D1Database;
  AI?: any; // Cloudflare AI binding for PDF processing
}

// Configuration now handled by service container

/**
 * Initialize services using dependency injection container
 */
async function initializeServices(env: Env) {
  console.log('🔧 Initializing simplified services...');

  const container = await createServiceContainer(env);

  // Initialize core services
  const sessionService = await container.get<SessionService>('session');
  const telegramService = await container.get<TelegramService>('telegram');
  const loggingService = await container.get<LoggingService>('logging');
  const conversationHandler = await container.get<ConversationHandler>('conversation');
  const webhookHandler = await container.get<WebhookHandler>('webhook');

  console.log('✅ All services initialized');

  return {
    container,
    sessionService,
    telegramService,
    loggingService,
    conversationHandler,
    webhookHandler,
  };
}

/**
 * Main Worker request handler
 */
export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    try {
      const url = new URL(request.url);

      // Health check endpoint
      if (url.pathname === '/health') {
        return new Response(
          JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            message: 'Simplified bot is running',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Telegram webhook endpoint
      if (url.pathname === '/webhook') {
        const services = await initializeServices(env);
        return await services.webhookHandler.handleWebhook(request);
      }

      // Default response for unhandled routes
      return new Response(
        JSON.stringify({
          error: 'Not Found',
          message: 'The requested endpoint was not found.',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Worker error:', error);

      return new Response(
        JSON.stringify({
          error: 'Internal Server Error',
          message: 'An unexpected error occurred.',
          details: String(error),
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  },

};
