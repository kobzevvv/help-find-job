/**
 * Dependency Injection Container
 *
 * Manages service lifecycle, dependencies, and initialization order.
 * Eliminates complex constructor parameter passing.
 */

import { EnvironmentConfigurationService } from '../config/environment';
import { LoggingService } from '../services/logging';
import { Env } from '../index';
import { SessionService } from '../services/session';
import { TelegramService } from '../services/telegram';
import { DocumentService } from '../services/document';
import { AIService } from '../services/ai';
import { EnhancedAIService } from '../services/enhanced-ai';
import { AdminAuthService } from '../services/admin-auth';
import { DocumentProcessingPipeline } from '../services/document-pipeline';
import { CloudflareRequestStorage } from '../services/request-storage';
import { UserRequestManager } from '../services/request-manager';
import { ConversationHandler } from '../handlers/conversation';
import { WebhookHandler } from '../handlers/webhook';
import { ServiceHealth, ServiceLifecycle } from '../types/service';

export interface ServiceFactory<T> {
  create(container: ServiceContainer): Promise<T>;
  dependencies: string[];
}


export interface AppConfig {
  admin: {
    [environment: string]: {
      authRequired: boolean;
      openAccess: boolean;
      sessionTimeoutHours: number;
      maxLoginAttempts: number;
      loginCooldownMinutes: number;
    };
  };
}

export interface ServiceInfo {
  name: string;
  initialized: boolean;
  dependencies: string[];
  healthStatus?: ServiceHealth;
}

/**
 * Main dependency injection container
 */
export class ServiceContainer {
  private services: Map<string, unknown> = new Map();
  private factories: Map<string, ServiceFactory<unknown>> = new Map();
  private initializing: Set<string> = new Set();
  private initialized: Set<string> = new Set();

  constructor() {}

  /**
   * Register a service factory
   */
  register<T>(name: string, factory: ServiceFactory<T>): void {
    if (this.factories.has(name)) {
      throw new Error(`Service ${name} is already registered`);
    }

    this.factories.set(name, factory);
  }

  /**
   * Get a service instance (lazy initialization)
   */
  async get<T>(name: string): Promise<T> {
    // Return cached instance if already initialized
    if (this.services.has(name)) {
      return this.services.get(name) as T;
    }

    // Check if service is registered
    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(`Service ${name} is not registered`);
    }

    // Prevent circular dependencies
    if (this.initializing.has(name)) {
      throw new Error(`Circular dependency detected for service ${name}`);
    }

    // Initialize dependencies first
    this.initializing.add(name);

    try {
      // Resolve dependencies
      for (const depName of factory.dependencies) {
        await this.get(depName);
      }

      // Create service instance
      const service = await factory.create(this);

      // Cache and mark as initialized
      this.services.set(name, service);
      this.initialized.add(name);

      console.log(`✅ Service initialized: ${name}`);

      return service as T;
    } catch (error) {
      console.error(`❌ Failed to initialize service ${name}:`, error);
      throw error;
    } finally {
      this.initializing.delete(name);
    }
  }

  /**
   * Check if a service is registered
   */
  has(name: string): boolean {
    return this.factories.has(name);
  }

  /**
   * Get list of all registered services
   */
  getServiceNames(): string[] {
    return Array.from(this.factories.keys());
  }

  /**
   * Get service information
   */
  getServiceInfo(): ServiceInfo[] {
    return Array.from(this.factories.entries()).map(([name, factory]) => ({
      name,
      initialized: this.initialized.has(name),
      dependencies: factory.dependencies,
    }));
  }

  /**
   * Initialize all services (for eager initialization)
   */
  async initializeAll(): Promise<void> {
    console.log('🔧 Initializing all services...');

    const serviceNames = this.getServiceNames();
    const results = await Promise.allSettled(
      serviceNames.map((name) => this.get(name))
    );

    const failed = results
      .map((result, index) => ({ result, name: serviceNames[index] }))
      .filter(({ result }) => result.status === 'rejected')
      .map(({ name, result }) => ({
        name,
        error: (result as PromiseRejectedResult).reason,
      }));

    if (failed.length > 0) {
      console.error('❌ Some services failed to initialize:');
      failed.forEach(({ name, error }) => {
        console.error(`  - ${name}: ${error.message}`);
      });
      throw new Error(`Failed to initialize ${failed.length} services`);
    }

    console.log(
      `✅ All ${serviceNames.length} services initialized successfully`
    );
  }

  /**
   * Health check all services
   */
  async healthCheck(): Promise<ServiceHealth[]> {
    const results: ServiceHealth[] = [];

    for (const serviceName of this.initialized) {
      const service = this.services.get(serviceName);

      try {
        let health: ServiceHealth;

        // Check if service has a health check method
        if (service && typeof service === 'object' && service !== null && 'healthCheck' in service && typeof (service as ServiceLifecycle).healthCheck === 'function') {
          health = await (service as ServiceLifecycle).healthCheck!();
        } else {
          // Default health check - just check if service is initialized
          health = {
            name: serviceName,
            status: 'healthy',
            message: 'Service is initialized and running',
          };
        }

        results.push(health);
      } catch (error) {
        results.push({
          name: serviceName,
          status: 'unhealthy',
          message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }

    return results;
  }

  /**
   * Shutdown all services gracefully
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down services...');

    // Shutdown in reverse order of initialization
    const shutdownOrder = Array.from(this.initialized).reverse();

    for (const serviceName of shutdownOrder) {
      const service = this.services.get(serviceName);

      try {
        // Check if service has a shutdown method
        if (service && typeof service === 'object' && service !== null && 'shutdown' in service && typeof (service as ServiceLifecycle).shutdown === 'function') {
          await (service as ServiceLifecycle).shutdown!();
          console.log(`✅ Service shutdown: ${serviceName}`);
        }
      } catch (error) {
        console.error(`❌ Failed to shutdown service ${serviceName}:`, error);
      }
    }

    // Clear all cached services
    this.services.clear();
    this.initialized.clear();

    console.log('✅ All services shutdown complete');
  }
}

/**
 * Create a configured service container
 */
export async function createServiceContainer(
  env: Env
): Promise<ServiceContainer> {
  const container = new ServiceContainer();

  // Register configuration service (foundational service)
  container.register('config', {
    dependencies: [],
    async create() {
      return new EnvironmentConfigurationService(env);
    },
  });

  // Register logging service (needed by most other services)
  container.register('logging', {
    dependencies: [],
    async create() {
      const loggingService = new LoggingService(env.LOGS_DB);
      await loggingService.initialize();
      return loggingService;
    },
  });

  // Register session service
  container.register('session', {
    dependencies: ['config'],
    async create(container) {
      const config =
        await container.get<EnvironmentConfigurationService>('config');
      const appConfig = config.getApplicationConfig();
      return new SessionService(
        env.SESSIONS,
        appConfig.sessionTimeoutHours * 3600
      );
    },
  });

  // Register Telegram service
  container.register('telegram', {
    dependencies: ['config'],
    async create(container) {
      const config =
        await container.get<EnvironmentConfigurationService>('config');
      const telegramConfig = config.getTelegramConfig();
      return new TelegramService(telegramConfig.botToken);
    },
  });

  // Register document service
  container.register('document', {
    dependencies: ['config'],
    async create(container) {
      const config =
        await container.get<EnvironmentConfigurationService>('config');
      const appConfig = config.getApplicationConfig();
      return new DocumentService(appConfig.maxFileSizeMB, env.AI);
    },
  });

  // Register AI service
  container.register('ai', {
    dependencies: ['config'],
    async create(container) {
      const config =
        await container.get<EnvironmentConfigurationService>('config');
      const servicesConfig = config.getServicesConfig();
      const appConfig = config.getApplicationConfig();

      return new AIService(
        servicesConfig.openaiApiKey,
        servicesConfig.openaiModel,
        appConfig.maxTokens,
        appConfig.temperature
      );
    },
  });

  // Register enhanced AI service
  container.register('enhancedAI', {
    dependencies: ['config'],
    async create(container) {
      const config =
        await container.get<EnvironmentConfigurationService>('config');
      const servicesConfig = config.getServicesConfig();
      const appConfig = config.getApplicationConfig();

      return new EnhancedAIService(
        servicesConfig.openaiApiKey,
        servicesConfig.openaiModel,
        appConfig.maxTokens * 2,
        appConfig.temperature
      );
    },
  });

  // Register request storage service
  container.register('requestStorage', {
    dependencies: [],
    async create() {
      return new CloudflareRequestStorage(
        env.SESSIONS, // Reuse existing KV for requests
        env.CACHE, // Use cache KV for documents
        env.SESSIONS // Use sessions KV for user request index
      );
    },
  });

  // Register document processing pipeline
  container.register('documentPipeline', {
    dependencies: ['requestStorage'],
    async create(container) {
      const storage =
        await container.get<CloudflareRequestStorage>('requestStorage');
      if (!env.AI) {
        throw new Error('Cloudflare AI service is not available in environment');
      }
      return new DocumentProcessingPipeline(env.AI, storage);
    },
  });

  // Register user request manager
  container.register('requestManager', {
    dependencies: [
      'documentPipeline',
      'requestStorage',
      'enhancedAI',
      'logging',
    ],
    async create(container) {
      const pipeline =
        await container.get<DocumentProcessingPipeline>('documentPipeline');
      const storage =
        await container.get<CloudflareRequestStorage>('requestStorage');
      const enhancedAI = await container.get<EnhancedAIService>('enhancedAI');
      const logging = await container.get<LoggingService>('logging');

      return new UserRequestManager(pipeline, storage, enhancedAI, logging);
    },
  });

  // Register admin auth service
  container.register('adminAuth', {
    dependencies: ['config'],
    async create(container) {
      const config =
        await container.get<EnvironmentConfigurationService>('config');
      const envConfig = config.getConfig();

      // Load app config (from original loadConfig function)
      const appConfig = await loadAppConfig(envConfig.environment);

      return new AdminAuthService(
        env.SESSIONS,
        envConfig.environment,
        appConfig,
        envConfig.security.adminPassword
      );
    },
  });

  // Register conversation handler
  container.register('conversation', {
    dependencies: [
      'session',
      'telegram',
      'document',
      'ai',
      'enhancedAI',
      'logging',
      'requestManager',
      'config',
    ],
    async create(container) {
      const sessionService = await container.get<SessionService>('session');
      const telegramService = await container.get<TelegramService>('telegram');
      const documentService = await container.get<DocumentService>('document');
      const aiService = await container.get<AIService>('ai');
      const enhancedAIService =
        await container.get<EnhancedAIService>('enhancedAI');
      const loggingService = await container.get<LoggingService>('logging');
      const requestManager =
        await container.get<UserRequestManager>('requestManager');
      const config =
        await container.get<EnvironmentConfigurationService>('config');

      const envConfig = config.getConfig();

      return new ConversationHandler(
        sessionService,
        telegramService,
        documentService,
        aiService,
        enhancedAIService,
        loggingService,
        requestManager,
        envConfig.environment,
        envConfig.security.adminPassword
      );
    },
  });

  // Register webhook handler
  container.register('webhook', {
    dependencies: ['conversation', 'logging', 'config'],
    async create(container) {
      const conversationHandler =
        await container.get<ConversationHandler>('conversation');
      const loggingService = await container.get<LoggingService>('logging');
      const config =
        await container.get<EnvironmentConfigurationService>('config');

      const envConfig = config.getConfig();

      return WebhookHandler.createWithRateLimit(
        conversationHandler,
        env.SESSIONS,
        envConfig.telegram.webhookSecret || undefined,
        envConfig.application.rateLimitPerMinute,
        loggingService
      );
    },
  });

  return container;
}

/**
 * Load application configuration (environment-specific)
 */
async function loadAppConfig(environment: string): Promise<AppConfig> {
  // Environment-specific configuration
  const configs = {
    development: {
      admin: {
        authRequired: false,
        openAccess: true,
        sessionTimeoutHours: 24,
        maxLoginAttempts: 5,
        loginCooldownMinutes: 5,
      },
    },
    staging: {
      admin: {
        authRequired: true,
        openAccess: false,
        sessionTimeoutHours: 24,
        maxLoginAttempts: 5,
        loginCooldownMinutes: 10,
      },
    },
    production: {
      admin: {
        authRequired: true,
        openAccess: false,
        sessionTimeoutHours: 24,
        maxLoginAttempts: 3,
        loginCooldownMinutes: 15,
      },
    },
  };

  // Return environment-specific config with admin nested structure for compatibility
  const envConfig =
    configs[environment as keyof typeof configs] || configs.development;
  return {
    admin: {
      [environment]: envConfig.admin,
    },
  };
}
