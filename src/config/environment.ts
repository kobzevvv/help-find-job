/**
 * Environment Configuration Service
 * 
 * Centralizes all environment-specific configuration with safe migration support.
 * Handles URLs, secrets classification, and environment-specific settings.
 */

export interface EnvironmentConfig {
  // Environment identification
  environment: 'development' | 'staging' | 'production';
  
  // 🤖 Telegram Bot Configuration
  telegram: {
    botToken: string;
    botUsername: string;
    webhookSecret: string | null; // null for staging (no webhook validation)
    webhookUrl: string;
  };
  
  // 🌐 Worker & URL Configuration  
  infrastructure: {
    workerName: string;
    workerUrl: string;
    cloudflareAccountId: string;
  };
  
  // 🔑 API Keys & External Services
  services: {
    openaiApiKey: string;
    openaiModel: string;
  };
  
  // 🔐 Admin & Security
  security: {
    adminPassword: string;
    authRequired: boolean;
    debugLogging: boolean;
  };
  
  // ⚙️ Application Settings
  application: {
    sessionTimeoutHours: number;
    maxFileSizeMB: number;
    rateLimitPerMinute: number;
    maxTokens: number;
    temperature: number;
  };
}

export class EnvironmentConfigurationService {
  private config: EnvironmentConfig;
  
  constructor(private env: any) {
    this.config = this.buildConfiguration();
  }
  
  /**
   * Get the complete configuration object
   */
  getConfig(): EnvironmentConfig {
    return this.config;
  }
  
  /**
   * Get environment name
   */
  getEnvironment(): 'development' | 'staging' | 'production' {
    return this.config.environment;
  }
  
  /**
   * Get Telegram configuration
   */
  getTelegramConfig() {
    return this.config.telegram;
  }
  
  /**
   * Get infrastructure configuration
   */
  getInfrastructureConfig() {
    return this.config.infrastructure;
  }
  
  /**
   * Get services configuration
   */
  getServicesConfig() {
    return this.config.services;
  }
  
  /**
   * Get security configuration
   */
  getSecurityConfig() {
    return this.config.security;
  }
  
  /**
   * Get application configuration
   */
  getApplicationConfig() {
    return this.config.application;
  }
  
  /**
   * Validate configuration completeness
   */
  validate(): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    // Check required telegram config
    if (!this.config.telegram.botToken) {
      results.push({
        category: 'telegram',
        status: 'error',
        message: 'Bot token is required',
        suggestion: 'Set BOT_TOKEN_* or TELEGRAM_BOT_TOKEN'
      });
    }
    
    // Check required services
    if (!this.config.services.openaiApiKey) {
      results.push({
        category: 'services', 
        status: 'error',
        message: 'OpenAI API key is required',
        suggestion: 'Set OPENAI_API_KEY'
      });
    }
    
    // Check environment-specific requirements
    if (this.config.environment === 'production') {
      if (!this.config.telegram.webhookSecret) {
        results.push({
          category: 'security',
          status: 'warning',
          message: 'Production should have webhook secret',
          suggestion: 'Set WEBHOOK_SECRET'
        });
      }
      
      if (!this.config.security.authRequired) {
        results.push({
          category: 'security',
          status: 'warning', 
          message: 'Production should require admin auth',
          suggestion: 'Check admin configuration'
        });
      }
    }
    
    return results;
  }
  
  /**
   * Get masked configuration for safe logging/debugging
   */
  getMaskedConfig(): object {
    return {
      environment: this.config.environment,
      telegram: {
        botUsername: this.config.telegram.botUsername,
        webhookUrl: this.config.telegram.webhookUrl,
        botTokenPresent: !!this.config.telegram.botToken,
        botTokenLength: this.config.telegram.botToken?.length || 0,
        webhookSecretPresent: !!this.config.telegram.webhookSecret,
      },
      infrastructure: this.config.infrastructure,
      services: {
        openaiModel: this.config.services.openaiModel,
        openaiKeyPresent: !!this.config.services.openaiApiKey,
        openaiKeyLength: this.config.services.openaiApiKey?.length || 0,
      },
      security: {
        authRequired: this.config.security.authRequired,
        debugLogging: this.config.security.debugLogging,
        adminPasswordPresent: !!this.config.security.adminPassword,
      },
      application: this.config.application,
    };
  }
  
  /**
   * Build configuration from environment variables with safe migration
   */
  private buildConfiguration(): EnvironmentConfig {
    const environment = this.getEnvironmentName();
    
    return {
      environment,
      
      telegram: {
        botToken: this.getBotToken(environment),
        botUsername: this.getBotUsername(environment),
        webhookSecret: this.getWebhookSecret(environment),
        webhookUrl: this.getWebhookUrl(environment),
      },
      
      infrastructure: {
        workerName: this.getWorkerName(environment),
        workerUrl: this.getWorkerUrl(environment),
        cloudflareAccountId: this.env.CLOUDFLARE_ACCOUNT_ID || 'c8f793821e2b05647f669d4f13b51f0e',
      },
      
      services: {
        openaiApiKey: this.env.OPENAI_API_KEY || '',
        openaiModel: this.env.OPENAI_MODEL || (environment === 'production' ? 'gpt-4' : 'gpt-3.5-turbo'),
      },
      
      security: {
        adminPassword: this.getAdminPassword(environment),
        authRequired: environment !== 'development',
        debugLogging: this.env.DEBUG_LOGGING === 'true' || environment !== 'production',
      },
      
      application: {
        sessionTimeoutHours: parseInt(this.env.SESSION_TIMEOUT_HOURS || '24'),
        maxFileSizeMB: parseInt(this.env.MAX_FILE_SIZE_MB || '10'),
        rateLimitPerMinute: parseInt(this.env.RATE_LIMIT_PER_MINUTE || '10'),
        maxTokens: parseInt(this.env.MAX_TOKENS || '1500'),
        temperature: parseFloat(this.env.GPT_TEMPERATURE || '0.3'),
      },
    };
  }
  
  /**
   * Get environment name with safe fallback
   */
  private getEnvironmentName(): 'development' | 'staging' | 'production' {
    // NEW: Check environment-specific variable first
    const envFromVar = this.env.ENVIRONMENT;
    
    // Validate and return
    if (['development', 'staging', 'production'].includes(envFromVar)) {
      return envFromVar as 'development' | 'staging' | 'production';
    }
    
    // Fallback for safety
    return 'development';
  }
  
  /**
   * Get bot token with new naming convention and fallback
   */
  private getBotToken(environment: string): string {
    // NEW: Try environment-specific variable first
    const envSpecific = this.env[`BOT_TOKEN_${environment.toUpperCase()}`];
    if (envSpecific) return envSpecific;
    
    // FALLBACK: Old variable for migration compatibility
    const oldVar = this.env.TELEGRAM_BOT_TOKEN;
    if (oldVar) return oldVar;
    
    // Known public staging token
    if (environment === 'staging') {
      return '8358869176:AAGo9WKrpUnbLBD-Zq40DIPpfdoBZroPVfI';
    }
    
    return '';
  }
  
  /**
   * Get bot username
   */
  private getBotUsername(environment: string): string {
    // NEW: Try environment-specific variable first
    const envSpecific = this.env[`BOT_USERNAME_${environment.toUpperCase()}`];
    if (envSpecific) return envSpecific;
    
    // Known usernames
    switch (environment) {
      case 'staging':
        return 'job_search_help_staging_bot';
      case 'production':
        return 'job_search_help_bot';
      default:
        return 'help_find_job_dev_bot';
    }
  }
  
  /**
   * Get webhook secret with environment-appropriate logic
   */
  private getWebhookSecret(environment: string): string | null {
    // Staging doesn't need webhook secret validation
    if (environment === 'staging') {
      return null;
    }
    
    // NEW: Try environment-specific variable first
    const envSpecific = this.env[`WEBHOOK_SECRET_${environment.toUpperCase()}`];
    if (envSpecific) return envSpecific;
    
    // FALLBACK: Old variable
    return this.env.WEBHOOK_SECRET || null;
  }
  
  /**
   * Get worker URL
   */
  private getWorkerUrl(environment: string): string {
    // NEW: Try environment-specific variable first
    const envSpecific = this.env[`WORKER_URL_${environment.toUpperCase()}`];
    if (envSpecific) return envSpecific;
    
    // FALLBACK: Known URLs (update these to match your actual worker URLs)
    switch (environment) {
      case 'staging':
        return 'https://help-with-job-search-telegram-bot-staging.vova-likes-smoothy.workers.dev';
      case 'production':
        return 'https://help-with-job-search-telegram-bot.vova-likes-smoothy.workers.dev';
      default:
        return 'https://help-with-job-search-telegram-bot-dev.vova-likes-smoothy.workers.dev';
    }
  }
  
  /**
   * Get webhook URL
   */
  private getWebhookUrl(environment: string): string {
    return `${this.getWorkerUrl(environment)}/webhook`;
  }
  
  /**
   * Get worker name
   */
  private getWorkerName(environment: string): string {
    // NEW: Try environment-specific variable first
    const envSpecific = this.env[`WORKER_NAME_${environment.toUpperCase()}`];
    if (envSpecific) return envSpecific;
    
    // FALLBACK: Known worker names from wrangler.toml
    switch (environment) {
      case 'staging':
        return 'help-with-job-search-telegram-bot-staging';
      case 'production':
        return 'help-with-job-search-telegram-bot';
      default:
        return 'help-with-job-search-telegram-bot-dev';
    }
  }
  
  /**
   * Get admin password
   */
  private getAdminPassword(environment: string): string {
    // NEW: Try environment-specific variable first
    const envSpecific = this.env[`ADMIN_PASSWORD_${environment.toUpperCase()}`];
    if (envSpecific) return envSpecific;
    
    // FALLBACK: Old variables
    if (environment === 'staging' && this.env.ADMIN_PASSWORD_STAGING) {
      return this.env.ADMIN_PASSWORD_STAGING;
    }
    
    if (this.env.ADMIN_PASSWORD) {
      return this.env.ADMIN_PASSWORD;
    }
    
    // Known staging password
    if (environment === 'staging') {
      return '12354678';
    }
    
    return 'defaultpassword';
  }
}

export interface ValidationResult {
  category: 'telegram' | 'services' | 'security' | 'infrastructure' | 'application';
  status: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}
