/**
 * Dependency Injection Container
 *
 * Manages service lifecycle, dependencies, and initialization order.
 * Eliminates complex constructor parameter passing.
 */

import { ConversationHandler } from '../handlers/conversation';
import { WebhookHandler } from '../handlers/webhook';
import { Env } from '../index';
import { LoggingService } from '../services/logging';
import { SessionService } from '../services/session';
import { TelegramService } from '../services/telegram';

export interface ServiceFactory<T> {
  create(container: ServiceContainer, env?: unknown): Promise<T>;
  dependencies: string[];
}

export interface ServiceInfo {
  name: string;
  initialized: boolean;
  dependencies: string[];
}

/**
 * Main dependency injection container
 */
export class ServiceContainer {
  private services: Map<string, unknown> = new Map();
  private factories: Map<string, ServiceFactory<unknown>> = new Map();
  private initializing: Set<string> = new Set();
  private initialized: Set<string> = new Set();
  private env?: unknown;

  constructor(env?: unknown) {
    this.env = env;
  }

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

      // Create service instance (pass env to factory)
      const service = await factory.create(this, this.env);

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
}

/**
 * Create a simplified service container
 */
export async function createServiceContainer(
  env: Env
): Promise<ServiceContainer> {
  const container = new ServiceContainer(env);

  // Register logging service
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
    dependencies: [],
    async create() {
      return new SessionService(env.SESSIONS, 86400); // 24 hours TTL
    },
  });

  // Register Telegram service
  container.register('telegram', {
    dependencies: [],
    async create() {
      // Get bot token from environment - you may need to adjust this based on your env structure
      const botToken = env.TELEGRAM_BOT_TOKEN || 'your-bot-token-here';
      return new TelegramService(botToken);
    },
  });

  // Register conversation handler
  container.register('conversation', {
    dependencies: ['session', 'telegram', 'logging'],
    async create(container) {
      const sessionService = await container.get<SessionService>('session');
      const telegramService = await container.get<TelegramService>('telegram');
      const loggingService = await container.get<LoggingService>('logging');

      // Get admin password from environment or use default for staging
      const adminPassword = env?.ADMIN_PASSWORD || '12354678';
      const environment = env?.ENVIRONMENT || 'development';

      return new ConversationHandler(
        sessionService,
        telegramService,
        loggingService,
        env?.AI, // Pass AI binding for PDF processing
        adminPassword,
        environment
      );
    },
  });

  // Register webhook handler
  container.register('webhook', {
    dependencies: ['conversation', 'logging'],
    async create(container) {
      const conversationHandler =
        await container.get<ConversationHandler>('conversation');
      const loggingService = await container.get<LoggingService>('logging');

      return WebhookHandler.createWithRateLimit(
        conversationHandler,
        env.SESSIONS,
        undefined, // webhook secret - adjust if needed
        60, // rate limit per minute
        loggingService
      );
    },
  });

  return container;
}
