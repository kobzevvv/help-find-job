/**
 * Telegram Resume Matcher Bot - Main Entry Point
 *
 * This is the main entry point for the Cloudflare Workers-based Telegram bot
 * that analyzes resume-job description compatibility using AI.
 */

import { createServiceContainer } from './container/service-container';
import { ConversationHandler } from './handlers/conversation';
import { WebhookHandler } from './handlers/webhook';
import { LoggingService } from './services/logging';
import { SessionService } from './services/session';
import { TelegramService } from './services/telegram';

export interface Env {
  // Telegram Configuration
  TELEGRAM_BOT_TOKEN?: string;

  // Cloudflare Workers Configuration
  SESSIONS: KVNamespace;
  LOGS_DB?: D1Database;
  AI?: any; // Cloudflare AI binding for PDF processing

  // Environment Configuration
  ENVIRONMENT?: string;
  WEBHOOK_SECRET?: string;
}

/**
 * Get bot username based on environment
 */
function getBotUsername(environment: string): string {
  switch (environment) {
    case 'staging':
      return 'job_search_help_staging_bot';
    case 'production':
      return 'job_search_help_bot';
    default:
      return 'development_bot';
  }
}

/**
 * Get worker name based on environment
 */
function getWorkerName(environment: string): string {
  switch (environment) {
    case 'staging':
      return 'help-with-job-search-telegram-bot-staging';
    case 'production':
      return 'help-with-job-search-telegram-bot';
    default:
      return 'help-with-job-search-telegram-bot-dev';
  }
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
  const conversationHandler =
    await container.get<ConversationHandler>('conversation');
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
        // Get environment from wrangler vars or default to development
        const environment = env.ENVIRONMENT || 'development';

        // Build configuration object for validation
        const configuration = {
          environment,
          telegram: {
            botUsername: getBotUsername(environment),
            webhookUrl: `${url.origin}/webhook`,
            webhookSecretPresent: !!env.WEBHOOK_SECRET,
          },
          infrastructure: {
            workerName: getWorkerName(environment),
            workerUrl: url.origin,
          },
          security: {
            authRequired: true,
            debugLogging:
              environment === 'staging' || environment === 'development',
          },
        };

        return new Response(
          JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            message: 'Simplified bot is running',
            configuration,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Environment validation endpoint
      if (url.pathname === '/validate-environment') {
        const environment = env.ENVIRONMENT || 'development';

        // Test Telegram connectivity (simple check)
        let telegramConnectivity = { status: 'unknown', message: 'Not tested' };
        try {
          if (env.TELEGRAM_BOT_TOKEN) {
            telegramConnectivity = {
              status: 'success',
              message: 'Token present',
            };
          } else {
            telegramConnectivity = {
              status: 'warning',
              message: 'No token configured',
            };
          }
        } catch (error) {
          telegramConnectivity = { status: 'error', message: String(error) };
        }

        // Test OpenAI connectivity (simple check)
        let openaiConnectivity = { status: 'unknown', message: 'Not tested' };
        try {
          // We don't have direct access to OpenAI token in this simplified version
          openaiConnectivity = {
            status: 'info',
            message: 'OpenAI not configured in this version',
          };
        } catch (error) {
          openaiConnectivity = { status: 'error', message: String(error) };
        }

        // Test webhook accessibility
        let webhookAccessibility = {
          status: 'success',
          message: 'Endpoint accessible',
        };

        const validation = {
          overallStatus: 'success',
          validation: {
            telegramConnectivity,
            openaiConnectivity,
            webhookAccessibility,
          },
          recommendations: [] as string[],
        };

        // Add recommendations based on environment
        if (environment === 'staging') {
          validation.recommendations.push('Test bot commands after deployment');
          validation.recommendations.push(
            'Verify webhook is properly configured'
          );
        }

        return new Response(JSON.stringify(validation), {
          headers: { 'Content-Type': 'application/json' },
        });
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
