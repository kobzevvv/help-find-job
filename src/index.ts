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
import { EnhancedAIService } from './services/enhanced-ai';
import { LoggingService } from './services/logging';
import { CloudflareAIService } from './types/ai';
import { AdminAuthService } from './services/admin-auth';
import { EnvironmentConfigurationService } from './config/environment';
import { createServiceContainer } from './container/service-container';
import { DocumentProcessingPipeline } from './services/document-pipeline';

export interface Env {
  // 🔄 EXISTING Telegram Configuration (for migration compatibility)
  TELEGRAM_BOT_TOKEN?: string;
  WEBHOOK_SECRET?: string;

  // 🆕 NEW Environment-Specific Telegram Configuration
  BOT_TOKEN_DEVELOPMENT?: string;
  BOT_TOKEN_STAGING?: string;
  BOT_TOKEN_PRODUCTION?: string;
  BOT_USERNAME_DEVELOPMENT?: string;
  BOT_USERNAME_STAGING?: string;
  BOT_USERNAME_PRODUCTION?: string;
  WEBHOOK_SECRET_DEVELOPMENT?: string;
  WEBHOOK_SECRET_STAGING?: string;
  WEBHOOK_SECRET_PRODUCTION?: string;

  // 🆕 NEW Infrastructure Configuration
  WORKER_NAME_DEVELOPMENT?: string;
  WORKER_NAME_STAGING?: string;
  WORKER_NAME_PRODUCTION?: string;
  WORKER_URL_DEVELOPMENT?: string;
  WORKER_URL_STAGING?: string;
  WORKER_URL_PRODUCTION?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;

  // 🔄 EXISTING OpenAI Configuration
  OPENAI_API_KEY: string;
  OPENAI_MODEL?: string;
  OPENAI_ORG_ID?: string;

  // 🆕 NEW Cloudflare Workers AI Configuration
  AI?: CloudflareAIService;

  // 🔄 EXISTING + NEW Admin Configuration
  ADMIN_PASSWORD?: string;
  ADMIN_PASSWORD_STAGING?: string;
  ADMIN_PASSWORD_DEVELOPMENT?: string;
  ADMIN_PASSWORD_PRODUCTION?: string;

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

// Configuration now handled by service container

/**
 * Initialize services using dependency injection container
 */
async function initializeServices(env: Env) {
  console.log(
    '🔧 Initializing services with dependency injection container...'
  );

  // 🆕 NEW: Create and configure service container
  const container = await createServiceContainer(env);

  // Get configuration service for validation and logging
  const configService =
    await container.get<EnvironmentConfigurationService>('config');

  // 🆕 NEW: Validate configuration and log results
  const validationResults = configService.validate();
  if (validationResults.length > 0) {
    console.log(
      '⚠️ Configuration validation results:',
      JSON.stringify(validationResults, null, 2)
    );
  }

  // 🆕 NEW: Log masked configuration for debugging
  console.log(
    '🔧 Configuration loaded:',
    JSON.stringify(configService.getMaskedConfig(), null, 2)
  );

  // Initialize core services (dependencies will be resolved automatically)
  const sessionService = await container.get<SessionService>('session');
  const telegramService = await container.get<TelegramService>('telegram');
  const documentService = await container.get<DocumentService>('document');
  const aiService = await container.get<AIService>('ai');
  const enhancedAIService =
    await container.get<EnhancedAIService>('enhancedAI');
  const loggingService = await container.get<LoggingService>('logging');
  const adminAuthService = await container.get<AdminAuthService>('adminAuth');
  const conversationHandler =
    await container.get<ConversationHandler>('conversation');
  const webhookHandler = await container.get<WebhookHandler>('webhook');

  console.log('✅ All services initialized via dependency injection container');

  return {
    container, // 🆕 NEW: Return container for advanced usage
    configService, // 🔄 KEEP: Still needed for endpoints
    sessionService,
    telegramService,
    documentService,
    aiService,
    enhancedAIService,
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
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    try {
      const url = new URL(request.url);

      // Health check endpoint
      if (url.pathname === '/health') {
        const services = await initializeServices(env);
        const configService = services.configService;
        const validationResults = configService.validate();

        return new Response(
          JSON.stringify({
            status: validationResults.some((r) => r.status === 'error')
              ? 'unhealthy'
              : 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            configuration: configService.getMaskedConfig(),
            validation: validationResults,
            // 🔄 LEGACY: Keep old fields for compatibility
            environment: configService.getEnvironment(),
            botTokenPresent: !!configService.getTelegramConfig().botToken,
            botTokenLength:
              configService.getTelegramConfig().botToken?.length || 0,
            webhookSecretPresent:
              !!configService.getTelegramConfig().webhookSecret,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Test document processing pipeline endpoint
      if (url.pathname === '/test-document-pipeline') {
        try {
          console.log('🧪 Testing document processing pipeline...');

          const services = await initializeServices(env);
          const pipeline = await services.container.get('documentPipeline') as DocumentProcessingPipeline;

          if (!pipeline) {
            return new Response(
              JSON.stringify({
                error: 'Pipeline not found',
                message: 'Document processing pipeline is not initialized',
                timestamp: new Date().toISOString(),
              }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }

          // Test pipeline health
          const health = await pipeline.healthCheck();

          return new Response(
            JSON.stringify({
              success: true,
              message: 'Document processing pipeline status',
              health,
              aiAvailable: !!env.AI,
              timestamp: new Date().toISOString(),
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            }
          );
        } catch (error) {
          console.error('❌ Pipeline test failed:', error);
          return new Response(
            JSON.stringify({
              error: 'Pipeline test failed',
              message: error instanceof Error ? error.message : String(error),
              timestamp: new Date().toISOString(),
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }

      // Test AI functionality endpoint
      if (url.pathname === '/test-ai') {
        try {
          console.log('🧪 Testing Workers AI functionality...');

          // Test AI availability
          if (!env.AI) {
            return new Response(
              JSON.stringify({
                error: 'AI binding not available',
                message: 'Workers AI is not configured for this environment',
                timestamp: new Date().toISOString(),
              }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }

          // Test AI functionality with a simple text generation
          const aiResponse = await env.AI.run(
            '@cf/meta/llama-3.1-8b-instruct',
            {
              prompt:
                'Say "Hello from Cloudflare Workers AI!" and confirm you can process text.',
              max_tokens: 100,
            }
          );

          return new Response(
            JSON.stringify({
              success: true,
              message: 'Workers AI is working!',
              ai_response: aiResponse,
              timestamp: new Date().toISOString(),
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            }
          );
        } catch (error) {
          console.error('❌ AI test failed:', error);
          return new Response(
            JSON.stringify({
              error: 'AI test failed',
              message: error instanceof Error ? error.message : String(error),
              timestamp: new Date().toISOString(),
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }

      // Fix webhook endpoint
      if (url.pathname === '/fix-webhook' && request.method === 'POST') {
        try {
          const webhookUrl = `${url.origin}/webhook`;

          // 🔄 UPDATED: Use configuration service for bot token
          const configService = new EnvironmentConfigurationService(env);
          const botToken = configService.getTelegramConfig().botToken;

          // Set webhook using our bot token
          const response = await fetch(
            `https://api.telegram.org/bot${botToken}/setWebhook`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url: webhookUrl,
                allowed_updates: ['message', 'callback_query'],
                drop_pending_updates: true,
              }),
            }
          );

          const result = await response.json();

          // Also get current status
          const infoResponse = await fetch(
            `https://api.telegram.org/bot${botToken}/getWebhookInfo`
          );
          const info = await infoResponse.json();

          return new Response(
            JSON.stringify({
              setWebhookResult: result,
              currentWebhookInfo: info,
              expectedUrl: webhookUrl,
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }

      // Debug endpoint to test bot functionality
      if (url.pathname === '/debug-bot' && request.method === 'POST') {
        try {
          const services = await initializeServices(env);
          const configService = services.configService;
          const config = configService.getConfig();
          const testChatId = 12345; // Test chat ID

          // Test the bot token first
          const botInfo = await fetch(
            `https://api.telegram.org/bot${config.telegram.botToken}/getMe`
          );
          const botResult = await botInfo.json();

          // Test sending a message
          const result = await services.telegramService.sendMessage({
            chat_id: testChatId,
            text: '🧪 Debug test message from staging bot',
          });

          return new Response(
            JSON.stringify({
              success: true,
              botInfo: botResult,
              messageResult: result,
              botTokenLength: config.telegram.botToken?.length || 0,
              environment: config.environment,
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined,
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
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

      // 🆕 NEW: Configuration validation endpoint
      if (
        url.pathname === '/validate-environment' &&
        request.method === 'GET'
      ) {
        return await handleValidateEnvironment(env);
      }

      // 🆕 NEW: Service container status endpoint
      if (url.pathname === '/services' && request.method === 'GET') {
        return await handleServiceStatus(env);
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
          ...(env.DEBUG_LOGGING === 'true' && { details: String(error) }),
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  },

  /**
   * Scheduled event handler for cleanup tasks
   */
  async scheduled(
    event: ScheduledEvent,
    _env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
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
  },
};

/**
 * Handle webhook setup
 */
async function handleSetWebhook(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as { url: string };
    const webhookUrl = body.url;

    if (!webhookUrl) {
      return new Response(
        JSON.stringify({
          error: 'Missing webhook URL',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 🔄 UPDATED: Use configuration service
    const configService = new EnvironmentConfigurationService(env);
    const config = configService.getConfig();

    const telegramService = new TelegramService(config.telegram.botToken);
    const success = await telegramService.setWebhook(
      webhookUrl,
      config.telegram.webhookSecret || undefined
    );

    return new Response(
      JSON.stringify({
        success,
        message: success ? 'Webhook set successfully' : 'Failed to set webhook',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Set webhook error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to set webhook',
        details: String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Handle webhook deletion
 */
async function handleDeleteWebhook(env: Env): Promise<Response> {
  try {
    // 🔄 UPDATED: Use configuration service
    const configService = new EnvironmentConfigurationService(env);
    const config = configService.getConfig();

    const telegramService = new TelegramService(config.telegram.botToken);
    const success = await telegramService.deleteWebhook();

    return new Response(
      JSON.stringify({
        success,
        message: success
          ? 'Webhook deleted successfully'
          : 'Failed to delete webhook',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Delete webhook error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to delete webhook',
        details: String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Handle logs retrieval for debugging
 */
async function handleGetLogs(env: Env): Promise<Response> {
  try {
    if (!env.LOGS_DB) {
      return new Response(
        JSON.stringify({
          error: 'Logs database not available',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const loggingService = new LoggingService(env.LOGS_DB);
    await loggingService.initialize();

    const recentLogs = await loggingService.getRecentLogs(100);

    return new Response(
      JSON.stringify({
        success: true,
        logs: recentLogs,
        count: recentLogs.length,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Get logs error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to retrieve logs',
        details: String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Handle bot testing for debugging
 */
async function handleTestBot(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as {
      userId?: number;
      message?: string;
    };
    const testUserId = body.userId || 99999;
    const testMessage = body.message || '/resume_and_job_post_match';

    const logs: string[] = [];

    logs.push('🔧 Testing bot components...');

    // Test 1: Initialize services
    try {
      const services = await initializeServices(env);
      logs.push('✅ Services initialized successfully');

      // Test 2: Check logging
      await services.loggingService.log(
        'INFO',
        'BOT_TEST',
        'Testing logging system'
      );
      logs.push('✅ Logging service working');

      // Test 3: Test session creation
      const session = services.sessionService.createSession(
        testUserId,
        testUserId
      );
      await services.sessionService.saveSession(session);
      logs.push('✅ Session service working');

      // Test 4: Test admin auth service
      const isAuthRequired = services.adminAuthService.isAuthRequired();
      logs.push(
        `✅ Admin auth service working (auth required: ${isAuthRequired})`
      );

      // Test 5: Test webhook handling with a simple message
      const testUpdate = {
        update_id: 99999,
        message: {
          message_id: 99999,
          from: { id: testUserId, first_name: 'Test', is_bot: false },
          chat: { id: testUserId, type: 'private' as const },
          date: Math.floor(Date.now() / 1000),
          text: testMessage,
        },
      };

      logs.push('🔄 Processing test message...');
      await services.conversationHandler.handleMessage(testUpdate.message);
      logs.push('✅ Message processed successfully');

      // Test 6: Check if response was sent
      logs.push('📊 Checking recent logs...');
      const recentLogs = await services.loggingService.getRecentLogs(10);
      logs.push(`📝 Found ${recentLogs.length} recent log entries`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Bot test completed successfully',
          logs,
          recentLogs: recentLogs.slice(0, 5),
          testDetails: {
            userId: testUserId,
            message: testMessage,
            timestamp: new Date().toISOString(),
            environment: env.ENVIRONMENT || 'development',
          },
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (serviceError) {
      logs.push(`❌ Service error: ${serviceError}`);
      throw serviceError;
    }
  } catch (error) {
    console.error('Test bot error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Bot test failed',
        details: String(error),
        logs: [`❌ Test failed: ${error}`],
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * 🆕 NEW: Handle environment validation endpoint
 */
async function handleValidateEnvironment(env: Env): Promise<Response> {
  try {
    console.log('🔍 Starting environment validation...');

    // Initialize configuration service
    const configService = new EnvironmentConfigurationService(env);
    const config = configService.getConfig();

    // Perform validation
    const validationResults = configService.validate();
    const maskedConfig = configService.getMaskedConfig();

    // Test Telegram connectivity
    let telegramTest = null;
    try {
      const telegramResponse = await fetch(
        `https://api.telegram.org/bot${config.telegram.botToken}/getMe`
      );
      telegramTest = {
        status: telegramResponse.ok ? 'pass' : 'fail',
        message: telegramResponse.ok
          ? 'Bot token is valid'
          : 'Bot token validation failed',
        details: telegramResponse.ok
          ? await telegramResponse.json()
          : await telegramResponse.text(),
      };
    } catch (error) {
      telegramTest = {
        status: 'fail',
        message: 'Telegram API connection failed',
        details: String(error),
      };
    }

    // Test OpenAI connectivity (if key present)
    let openaiTest = null;
    if (config.services.openaiApiKey) {
      try {
        const openaiResponse = await fetch('https://api.openai.com/v1/models', {
          headers: {
            Authorization: `Bearer ${config.services.openaiApiKey}`,
            'Content-Type': 'application/json',
          },
        });
        openaiTest = {
          status: openaiResponse.ok ? 'pass' : 'fail',
          message: openaiResponse.ok
            ? 'OpenAI API key is valid'
            : 'OpenAI API key validation failed',
          details: openaiResponse.ok
            ? 'Connection successful'
            : await openaiResponse.text(),
        };
      } catch (error) {
        openaiTest = {
          status: 'fail',
          message: 'OpenAI API connection failed',
          details: String(error),
        };
      }
    } else {
      openaiTest = {
        status: 'warning',
        message: 'OpenAI API key not provided',
        details: 'Set OPENAI_API_KEY to enable AI features',
      };
    }

    // Test webhook URL accessibility
    let webhookTest = null;
    try {
      const webhookResponse = await fetch(config.telegram.webhookUrl);
      webhookTest = {
        status: 'pass',
        message: 'Webhook URL is accessible',
        details: `Status: ${webhookResponse.status}`,
      };
    } catch (error) {
      webhookTest = {
        status: 'warning',
        message: 'Webhook URL accessibility test failed',
        details: String(error),
      };
    }

    // Calculate overall status
    const hasErrors =
      validationResults.some((r) => r.status === 'error') ||
      telegramTest?.status === 'fail' ||
      openaiTest?.status === 'fail';

    const overallStatus = hasErrors ? 'fail' : 'pass';

    const report = {
      timestamp: new Date().toISOString(),
      environment: config.environment,
      overallStatus,
      configuration: maskedConfig,
      validation: {
        configValidation: validationResults,
        telegramConnectivity: telegramTest,
        openaiConnectivity: openaiTest,
        webhookAccessibility: webhookTest,
      },
      recommendations: [
        ...(telegramTest?.status === 'fail'
          ? ['Fix Telegram bot token configuration']
          : []),
        ...(openaiTest?.status === 'fail'
          ? ['Fix OpenAI API key configuration']
          : []),
        ...validationResults
          .filter((r) => r.status === 'error')
          .map((r) => r.suggestion || r.message),
        ...(config.environment === 'production' &&
        !config.telegram.webhookSecret
          ? ['Set webhook secret for production']
          : []),
      ],
    };

    console.log('✅ Environment validation completed:', overallStatus);

    return new Response(JSON.stringify(report, null, 2), {
      status: hasErrors ? 500 : 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Environment validation failed:', error);

    return new Response(
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          overallStatus: 'fail',
          error: 'Validation process failed',
          message: String(error),
        },
        null,
        2
      ),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * 🆕 NEW: Handle service container status endpoint
 */
async function handleServiceStatus(env: Env): Promise<Response> {
  try {
    console.log('📊 Getting service container status...');

    // Initialize service container
    const services = await initializeServices(env);
    const container = services.container;

    // Get service information
    const serviceInfo = container.getServiceInfo();

    // Get health check results for initialized services
    const healthResults = await container.healthCheck();

    // Combine service info with health results
    const servicesStatus = serviceInfo.map((info) => {
      const health = healthResults.find((h) => h.name === info.name);
      return {
        ...info,
        healthStatus: health,
      };
    });

    // Calculate overall status
    const unhealthyServices = healthResults.filter(
      (h) => h.status === 'unhealthy'
    );
    const overallStatus =
      unhealthyServices.length === 0 ? 'healthy' : 'unhealthy';

    const report = {
      timestamp: new Date().toISOString(),
      overallStatus,
      summary: {
        totalServices: serviceInfo.length,
        initializedServices: serviceInfo.filter((s) => s.initialized).length,
        healthyServices: healthResults.filter((h) => h.status === 'healthy')
          .length,
        unhealthyServices: unhealthyServices.length,
      },
      services: servicesStatus,
      containerInfo: {
        registeredServices: container.getServiceNames(),
        dependencyGraph: serviceInfo.reduce(
          (graph, service) => {
            graph[service.name] = service.dependencies;
            return graph;
          },
          {} as Record<string, string[]>
        ),
      },
    };

    console.log(`✅ Service container status: ${overallStatus}`);

    return new Response(JSON.stringify(report, null, 2), {
      status: overallStatus === 'healthy' ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Service status check failed:', error);

    return new Response(
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          overallStatus: 'error',
          error: 'Service status check failed',
          message: String(error),
        },
        null,
        2
      ),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
