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
import { DocumentService } from './services/document';
import { AIService } from './services/ai';
import { LoggingService } from './services/logging';
import { AdminAuthService } from './services/admin-auth';

export interface Env {
  // Telegram Configuration
  TELEGRAM_BOT_TOKEN: string;
  WEBHOOK_SECRET: string;

  // OpenAI Configuration
  OPENAI_API_KEY: string;
  OPENAI_MODEL?: string;
  OPENAI_ORG_ID?: string;

  // Admin Configuration
  ADMIN_PASSWORD?: string;
  ADMIN_PASSWORD_STAGING?: string;

  // Cloudflare Workers Configuration
  SESSIONS: KVNamespace;
  CACHE: KVNamespace;
  LOGS_DB?: D1Database;
  ANALYTICS_DB?: D1Database;

  // Application Settings
  ENVIRONMENT?: string;
  DEBUG_LOGGING?: string;
  SESSION_TIMEOUT_HOURS?: string;
  MAX_FILE_SIZE_MB?: string;
  RATE_LIMIT_PER_MINUTE?: string;

  // AI Configuration
  MAX_TOKENS?: string;
  GPT_TEMPERATURE?: string;
  AI_REQUEST_TIMEOUT?: string;

  // Localization
  DEFAULT_LANGUAGE?: string;
  SUPPORTED_LANGUAGES?: string;

  // Feature Flags
  ENABLE_ANALYTICS?: string;
  ENABLE_EXPERIMENTAL_FEATURES?: string;
  PARALLEL_AI_REQUESTS?: string;
}

/**
 * Load application configuration
 */
async function loadConfig(_environment: string): Promise<any> {
  try {
    // Import config.json - in a real scenario, you might fetch this from KV or use it directly
    const config = {
      "project": {
        "name": "telegram-resume-matcher",
        "version": "1.0.0",
        "description": "AI-powered Telegram bot for resume-job matching analysis"
      },
      "admin": {
        "development": {
          "authRequired": false,
          "openAccess": true,
          "sessionTimeoutHours": 24,
          "maxLoginAttempts": 5,
          "loginCooldownMinutes": 5
        },
        "staging": {
          "authRequired": true,
          "openAccess": false,
          "sessionTimeoutHours": 24,
          "maxLoginAttempts": 5,
          "loginCooldownMinutes": 10
        },
        "production": {
          "authRequired": true,
          "openAccess": false,
          "sessionTimeoutHours": 24,
          "maxLoginAttempts": 3,
          "loginCooldownMinutes": 15
        }
      }
    };
    
    return config;
  } catch (error) {
    console.error('Failed to load config:', error);
    return {};
  }
}

/**
 * Initialize services with environment configuration
 */
async function initializeServices(env: Env) {
  // Get environment and load config
  const environment = env.ENVIRONMENT || 'development';
  const config = await loadConfig(environment);

  // Parse configuration
  const sessionTimeoutHours = parseInt(env.SESSION_TIMEOUT_HOURS || '24');
  const maxFileSizeMB = parseInt(env.MAX_FILE_SIZE_MB || '10');
  const rateLimitPerMinute = parseInt(env.RATE_LIMIT_PER_MINUTE || '10');
  const maxTokens = parseInt(env.MAX_TOKENS || '1500');
  const temperature = parseFloat(env.GPT_TEMPERATURE || '0.3');
  const model = env.OPENAI_MODEL || 'gpt-4';

  // Initialize logging service first
  const loggingService = new LoggingService(env.LOGS_DB);
  await loggingService.initialize();

  // Initialize admin auth service
  const adminPassword = environment === 'staging' 
    ? (env.ADMIN_PASSWORD_STAGING || '12354678')
    : env.ADMIN_PASSWORD;
    
  const adminAuthService = new AdminAuthService(
    env.SESSIONS,
    environment,
    config,
    adminPassword
  );

  // Initialize other services
  const sessionService = new SessionService(env.SESSIONS, sessionTimeoutHours * 3600);
  const telegramService = new TelegramService(env.TELEGRAM_BOT_TOKEN);
  const documentService = new DocumentService(maxFileSizeMB);
  const aiService = new AIService(env.OPENAI_API_KEY, model, maxTokens, temperature);

  // Initialize conversation handler
  const conversationHandler = new ConversationHandler(
    sessionService,
    telegramService,
    documentService,
    aiService,
    loggingService,
    env.ENVIRONMENT || 'development',
    adminPassword || 'defaultpassword'
  );

  // Initialize webhook handler with rate limiting
  const webhookHandler = WebhookHandler.createWithRateLimit(
    conversationHandler,
    env.SESSIONS,
    env.WEBHOOK_SECRET,
    rateLimitPerMinute,
    loggingService
  );

  return {
    sessionService,
    telegramService,
    documentService,
    aiService,
    conversationHandler,
    webhookHandler,
    loggingService,
    adminAuthService,
  };
}

/**
 * Main Worker request handler
 */
export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);
      
      // Health check endpoint
      if (url.pathname === '/health') {
        return new Response(JSON.stringify({ 
          status: 'healthy', 
          timestamp: new Date().toISOString(),
          environment: env.ENVIRONMENT || 'unknown',
          version: '1.0.0',
          botTokenPresent: !!env.TELEGRAM_BOT_TOKEN,
          botTokenLength: env.TELEGRAM_BOT_TOKEN?.length || 0,
          webhookSecretPresent: !!env.WEBHOOK_SECRET
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Telegram webhook endpoint
      if (url.pathname === '/webhook') {
        const services = await initializeServices(env);
        return await services.webhookHandler.handleWebhook(request);
      }

      // Webhook management endpoints
      if (url.pathname === '/set-webhook' && request.method === 'POST') {
        return await handleSetWebhook(request, env);
      }

      if (url.pathname === '/delete-webhook' && request.method === 'POST') {
        return await handleDeleteWebhook(env);
      }

      // Debug logs endpoint
      if (url.pathname === '/logs' && request.method === 'GET') {
        return await handleGetLogs(env);
      }

      // Debug test endpoint
      if (url.pathname === '/test-bot' && request.method === 'POST') {
        return await handleTestBot(request, env);
      }

      // Default response for unhandled routes
      return new Response(JSON.stringify({
        error: 'Not Found',
        message: 'The requested endpoint was not found.'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Worker error:', error);
      
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred.',
        ...(env.DEBUG_LOGGING === 'true' && { details: String(error) })
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },

  /**
   * Scheduled event handler for cleanup tasks
   */
  async scheduled(event: ScheduledEvent, _env: Env, _ctx: ExecutionContext): Promise<void> {
    try {
      console.log('Scheduled task executed:', event.scheduledTime);
      
      // TODO: Implement session cleanup and maintenance tasks
      // For example:
      // - Clean up expired sessions
      // - Generate analytics reports  
      // - Health checks on external services
      
    } catch (error) {
      console.error('Scheduled task error:', error);
    }
  }
};

/**
 * Handle webhook setup
 */
async function handleSetWebhook(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as { url: string };
    const webhookUrl = body.url;

    if (!webhookUrl) {
      return new Response(JSON.stringify({
        error: 'Missing webhook URL'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const telegramService = new TelegramService(env.TELEGRAM_BOT_TOKEN);
    const success = await telegramService.setWebhook(webhookUrl, env.WEBHOOK_SECRET);

    return new Response(JSON.stringify({
      success,
      message: success ? 'Webhook set successfully' : 'Failed to set webhook'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Set webhook error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to set webhook',
      details: String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle webhook deletion
 */
async function handleDeleteWebhook(env: Env): Promise<Response> {
  try {
    const telegramService = new TelegramService(env.TELEGRAM_BOT_TOKEN);
    const success = await telegramService.deleteWebhook();

    return new Response(JSON.stringify({
      success,
      message: success ? 'Webhook deleted successfully' : 'Failed to delete webhook'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Delete webhook error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to delete webhook',
      details: String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle logs retrieval for debugging
 */
async function handleGetLogs(env: Env): Promise<Response> {
  try {
    if (!env.LOGS_DB) {
      return new Response(JSON.stringify({
        error: 'Logs database not available'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const loggingService = new LoggingService(env.LOGS_DB);
    await loggingService.initialize();
    
    const recentLogs = await loggingService.getRecentLogs(100);

    return new Response(JSON.stringify({
      success: true,
      logs: recentLogs,
      count: recentLogs.length,
      timestamp: new Date().toISOString()
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Get logs error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to retrieve logs',
      details: String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle bot testing for debugging
 */
async function handleTestBot(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as { userId?: number; message?: string };
    const testUserId = body.userId || 99999;
    const testMessage = body.message || '/resume_and_job_post_match';

    const logs: string[] = [];
    
    logs.push('🔧 Testing bot components...');

    // Test 1: Initialize services
    try {
      const services = await initializeServices(env);
      logs.push('✅ Services initialized successfully');
      
      // Test 2: Check logging
      await services.loggingService.log('INFO', 'BOT_TEST', 'Testing logging system');
      logs.push('✅ Logging service working');

      // Test 3: Test session creation
      const session = services.sessionService.createSession(testUserId, testUserId);
      await services.sessionService.saveSession(session);
      logs.push('✅ Session service working');

      // Test 4: Test admin auth service
      const isAuthRequired = services.adminAuthService.isAuthRequired();
      logs.push(`✅ Admin auth service working (auth required: ${isAuthRequired})`);

      // Test 5: Test webhook handling with a simple message
      const testUpdate = {
        update_id: 99999,
        message: {
          message_id: 99999,
          from: { id: testUserId, first_name: 'Test', is_bot: false },
          chat: { id: testUserId, type: 'private' as const },
          date: Math.floor(Date.now() / 1000),
          text: testMessage
        }
      };

      logs.push('🔄 Processing test message...');
      await services.conversationHandler.handleMessage(testUpdate.message);
      logs.push('✅ Message processed successfully');

      // Test 6: Check if response was sent
      logs.push('📊 Checking recent logs...');
      const recentLogs = await services.loggingService.getRecentLogs(10);
      logs.push(`📝 Found ${recentLogs.length} recent log entries`);

      return new Response(JSON.stringify({
        success: true,
        message: 'Bot test completed successfully',
        logs,
        recentLogs: recentLogs.slice(0, 5),
        testDetails: {
          userId: testUserId,
          message: testMessage,
          timestamp: new Date().toISOString(),
          environment: env.ENVIRONMENT || 'development'
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (serviceError) {
      logs.push(`❌ Service error: ${serviceError}`);
      throw serviceError;
    }

  } catch (error) {
    console.error('Test bot error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Bot test failed',
      details: String(error),
      logs: [`❌ Test failed: ${error}`]
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
