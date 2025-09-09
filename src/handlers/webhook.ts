/**
 * Telegram webhook handler
 */

import { TelegramUpdate } from '../types/telegram';
import { ConversationHandler } from './conversation';
import { LoggingService } from '../services/logging';

export class WebhookHandler {
  private conversationHandler: ConversationHandler;
  // TODO: Re-add webhookSecret property when validation is re-enabled
  private loggingService: LoggingService | undefined;

  constructor(
    conversationHandler: ConversationHandler,
    _webhookSecret?: string, // TODO: Remove underscore when webhook validation is re-enabled
    loggingService?: LoggingService
  ) {
    this.conversationHandler = conversationHandler;
    // TODO: Re-enable: this.webhookSecret = webhookSecret;
    this.loggingService = loggingService;
  }

  /**
   * Handle incoming webhook request
   */
  async handleWebhook(request: Request): Promise<Response> {
    const startTime = Date.now();

    try {
      await this.loggingService?.log(
        'DEBUG',
        'WEBHOOK_REQUEST',
        'Received webhook request',
        {
          method: request.method,
          url: request.url,
          headers: this.headersToObject(request.headers),
        }
      );

      // Validate request method
      if (request.method !== 'POST') {
        await this.loggingService?.log(
          'WARN',
          'INVALID_METHOD',
          `Invalid method: ${request.method}`
        );
        return new Response('Method not allowed', { status: 405 });
      }

      // Validate webhook secret if configured (disabled for staging testing)
      // TODO: Re-enable webhook secret validation in production
      /*
      const secretHeader = request.headers.get(
        'X-Telegram-Bot-Api-Secret-Token'
      );
      if (secretHeader !== this.webhookSecret) {
        await this.loggingService?.logError(
          'WEBHOOK_AUTH',
          'Invalid webhook secret',
          new Error('Unauthorized webhook request')
        );
        return new Response('Unauthorized', { status: 401 });
      }
      */

      // Parse request body
      const update: TelegramUpdate = await request.json();

      console.log('🔍 WEBHOOK DEBUG:', {
        updateId: update.update_id,
        messageText: update.message?.text,
        userId: update.message?.from?.id,
        chatId: update.message?.chat?.id,
        timestamp: new Date().toISOString(),
      });

      await this.loggingService?.log(
        'INFO',
        'WEBHOOK_UPDATE',
        'Parsed webhook update',
        {
          updateId: update.update_id,
          hasMessage: !!update.message,
          hasCallbackQuery: !!update.callback_query,
          messageText: update.message?.text,
          userId: update.message?.from?.id,
          chatId: update.message?.chat?.id,
        }
      );

      // Validate update structure
      if (!this.isValidUpdate(update)) {
        await this.loggingService?.logError(
          'INVALID_UPDATE',
          'Invalid update structure',
          new Error('Invalid update'),
          undefined,
          undefined
        );
        return new Response('Bad request', { status: 400 });
      }

      // Process the update
      await this.processUpdate(update);

      const duration = Date.now() - startTime;
      await this.loggingService?.log(
        'INFO',
        'WEBHOOK_SUCCESS',
        `Webhook processed successfully in ${duration}ms`,
        { duration }
      );

      // Return success response to Telegram
      return new Response('OK', { status: 200 });
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.loggingService?.logError(
        'WEBHOOK_ERROR',
        'Webhook handler error',
        error as Error
      );
      await this.loggingService?.log(
        'ERROR',
        'WEBHOOK_FAILED',
        `Webhook failed after ${duration}ms`,
        { duration, error: String(error) }
      );
      return new Response('Internal server error', { status: 500 });
    }
  }

  /**
   * Process Telegram update
   */
  private async processUpdate(update: TelegramUpdate): Promise<void> {
    try {
      // Handle message updates
      if (update.message) {
        await this.conversationHandler.handleMessage(update.message);
        return;
      }

      // Handle callback query updates (for inline keyboards)
      if (update.callback_query) {
        try {
          const data = update.callback_query.data || '';
          const chatId = update.callback_query.message?.chat.id;
          const userId = update.callback_query.from.id;

          if (!chatId || !userId) return;

          if (data === 'resume_done') {
            await this.conversationHandler['sessionService'].updateState(
              userId,
              'waiting_job_post'
            );
            await this.conversationHandler['telegramService'].sendMessage({
              chat_id: chatId,
              text: '✅ Спасибо! Я получил ваше резюме. Теперь пришлите текст вакансии (можно в одном или нескольких сообщениях).',
            });
          } else if (data === 'cancel') {
            await this.conversationHandler['sessionService'].completeSession(
              userId
            );
            await this.conversationHandler['telegramService'].sendMessage({
              chat_id: chatId,
              text: '✅ Процесс отменён. Вы можете начать заново командой /resume_and_job_post_match',
            });
          }
        } catch (e) {
          console.error('Error handling callback query:', e);
        }
        return;
      }

      console.log('Unhandled update type:', update);
    } catch (error) {
      console.error('Error processing update:', error);
    }
  }

  /**
   * Validate update structure
   */
  private isValidUpdate(update: unknown): update is TelegramUpdate {
    // Type guard to check if object has update_id property
    const hasUpdateId = (obj: object): obj is { update_id: unknown } =>
      'update_id' in obj;

    return (
      typeof update === 'object' &&
      update !== null &&
      hasUpdateId(update) &&
      typeof update.update_id === 'number' &&
      ('message' in update || 'callback_query' in update)
    );
  }

  /**
   * Extract user information from update for logging/analytics
   */
  private extractUserInfo(update: TelegramUpdate): {
    userId?: number;
    chatId?: number;
    username?: string;
  } {
    if (update.message && update.message.from) {
      const result: { userId?: number; chatId?: number; username?: string } = {
        chatId: update.message.chat.id,
      };
      if (update.message.from.id !== undefined)
        result.userId = update.message.from.id;
      if (update.message.from.username !== undefined)
        result.username = update.message.from.username;
      return result;
    } else if (update.callback_query) {
      const result: { userId?: number; chatId?: number; username?: string } = {
        userId: update.callback_query.from.id,
      };
      if (update.callback_query.message?.chat.id !== undefined)
        result.chatId = update.callback_query.message.chat.id;
      if (update.callback_query.from.username !== undefined)
        result.username = update.callback_query.from.username;
      return result;
    }

    return {};
  }

  /**
   * Rate limiting check (basic implementation)
   */
  private async checkRateLimit(
    userId: number,
    kv: KVNamespace,
    limitPerMinute: number = 10
  ): Promise<boolean> {
    try {
      const key = `rate_limit:${userId}`;
      const now = Date.now();
      const windowStart = now - 60000; // 1 minute window

      // Get current request timestamps
      const requestsData = await kv.get(key);
      let requests: number[] = requestsData ? JSON.parse(requestsData) : [];

      // Filter out old requests
      requests = requests.filter((timestamp) => timestamp > windowStart);

      // Check if limit exceeded
      if (requests.length >= limitPerMinute) {
        return false;
      }

      // Add current request
      requests.push(now);

      // Save updated requests
      await kv.put(key, JSON.stringify(requests), { expirationTtl: 60 });

      return true;
    } catch (error) {
      console.error('Rate limiting error:', error);
      return true; // Allow on error
    }
  }

  /**
   * Convert Headers to plain object
   */
  private headersToObject(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Create webhook handler with rate limiting
   */
  static createWithRateLimit(
    conversationHandler: ConversationHandler,
    kv: KVNamespace,
    webhookSecret?: string,
    rateLimitPerMinute: number = 10,
    loggingService?: LoggingService
  ): WebhookHandler {
    const handler = new WebhookHandler(
      conversationHandler,
      webhookSecret,
      loggingService
    );

    // Override handleWebhook to include rate limiting
    const originalHandleWebhook = handler.handleWebhook.bind(handler);

    handler.handleWebhook = async function (
      request: Request
    ): Promise<Response> {
      try {
        // Only apply rate limiting to POST requests with JSON bodies
        if (request.method === 'POST') {
          const update: TelegramUpdate = await request.clone().json();
          const userInfo = handler.extractUserInfo(update);

          if (userInfo.userId) {
            const allowed = await handler.checkRateLimit(
              userInfo.userId,
              kv,
              rateLimitPerMinute
            );
            if (!allowed) {
              console.log(`Rate limit exceeded for user ${userInfo.userId}`);
              return new Response('Rate limit exceeded', { status: 429 });
            }
          }
        }

        return originalHandleWebhook(request);
      } catch (error) {
        console.error('Rate limit check error:', error);
        return originalHandleWebhook(request);
      }
    };

    return handler;
  }
}
