/**
 * Admin authentication service for log access
 */

export interface AdminSession {
  userId: number;
  chatId: number;
  authenticatedAt: string;
  expiresAt: string;
  environment: string;
  loginAttempts?: number;
  lastAttemptAt?: string;
}

export interface LoginAttempt {
  userId: number;
  attempts: number;
  lastAttemptAt: string;
  cooldownUntil?: string;
}

export class AdminAuthService {
  private kv: KVNamespace | undefined;
  private environment: string;
  private adminPassword: string | undefined;
  private authRequired: boolean;
  private maxLoginAttempts: number;
  private loginCooldownMinutes: number;
  private sessionTimeoutHours: number;

  constructor(
    kv?: KVNamespace,
    environment: string = 'development',
    config: any = {},
    adminPassword?: string
  ) {
    this.kv = kv;
    this.environment = environment;
    this.adminPassword = adminPassword;

    // Environment-specific configuration
    const adminConfig = config.admin?.[environment] || {};
    this.authRequired =
      adminConfig.authRequired ?? environment === 'production';
    this.maxLoginAttempts = adminConfig.maxLoginAttempts ?? 3;
    this.loginCooldownMinutes = adminConfig.loginCooldownMinutes ?? 15;
    this.sessionTimeoutHours = adminConfig.sessionTimeoutHours ?? 24;
  }

  /**
   * Check if admin authentication is required for this environment
   */
  isAuthRequired(): boolean {
    return this.authRequired;
  }

  /**
   * Get authentication required message with password info
   */
  getAuthRequiredMessage(): string {
    if (!this.authRequired) {
      return ''; // No message needed for open environments
    }

    if (this.environment === 'staging') {
      return `🔒 Admin authentication required. Please use /admin_login first.\n\n💡 For staging environment, the password is: **12345678**`;
    } else if (this.environment === 'production') {
      return `🔒 Admin authentication required. Please use /admin_login first.\n\n💡 For production environment, ask the main developer for the secure password.`;
    } else {
      return `🔒 Admin authentication required. Please use /admin_login first.`;
    }
  }

  /**
   * Check if user is authenticated as admin
   */
  async isAuthenticated(userId: number): Promise<boolean> {
    if (!this.authRequired) {
      return true; // Open access for environments without auth requirement
    }

    if (!this.kv) {
      return false;
    }

    try {
      const sessionKey = `admin_session:${userId}:${this.environment}`;
      const sessionData = await this.kv.get(sessionKey);

      if (!sessionData) {
        return false;
      }

      const session: AdminSession = JSON.parse(sessionData);
      const now = new Date();
      const expiresAt = new Date(session.expiresAt);

      if (now > expiresAt) {
        // Session expired, clean it up
        await this.kv.delete(sessionKey);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking admin authentication:', error);
      return false;
    }
  }

  /**
   * Authenticate admin with password
   */
  async authenticate(
    userId: number,
    chatId: number,
    password: string
  ): Promise<{ success: boolean; message: string; cooldownMinutes?: number }> {
    if (!this.authRequired) {
      return {
        success: true,
        message: 'Authentication not required in this environment',
      };
    }

    if (!this.adminPassword) {
      return { success: false, message: 'Admin password not configured' };
    }

    // Check for cooldown
    const cooldownResult = await this.checkCooldown(userId);
    if (!cooldownResult.allowed) {
      return {
        success: false,
        message: `Too many login attempts. Please wait ${cooldownResult.remainingMinutes} minutes.`,
        cooldownMinutes:
          cooldownResult.remainingMinutes || this.loginCooldownMinutes,
      };
    }

    // Verify password
    if (password !== this.adminPassword) {
      await this.recordFailedAttempt(userId);
      const attempts = await this.getLoginAttempts(userId);
      const remainingAttempts = this.maxLoginAttempts - attempts;

      if (remainingAttempts <= 0) {
        return {
          success: false,
          message: `Invalid password. Maximum attempts reached. Please wait ${this.loginCooldownMinutes} minutes.`,
          cooldownMinutes: this.loginCooldownMinutes,
        };
      }

      return {
        success: false,
        message: `Invalid password. ${remainingAttempts} attempts remaining.`,
      };
    }

    // Success - create session
    await this.createSession(userId, chatId);
    await this.clearLoginAttempts(userId);

    return {
      success: true,
      message: `✅ Admin authenticated successfully! Access granted for ${this.sessionTimeoutHours} hours.`,
    };
  }

  /**
   * Logout admin (clear session)
   */
  async logout(userId: number): Promise<{ success: boolean; message: string }> {
    if (!this.kv) {
      return { success: true, message: 'Logged out successfully' };
    }

    try {
      const sessionKey = `admin_session:${userId}:${this.environment}`;
      await this.kv.delete(sessionKey);
      return { success: true, message: '✅ Logged out successfully' };
    } catch (error) {
      console.error('Error during logout:', error);
      return { success: false, message: 'Error during logout' };
    }
  }

  /**
   * Get login help message
   */
  getLoginHelpMessage(): string {
    if (this.environment === 'staging') {
      return `🔑 Please send the admin password.\n\n💡 For staging environment, the password is: **12345678**`;
    } else if (this.environment === 'production') {
      return `🔑 Please send the admin password.\n\n💡 For production environment, ask the main developer for the secure password.`;
    } else {
      return `🔑 Please send the admin password.`;
    }
  }

  /**
   * Get admin session info
   */
  async getSessionInfo(userId: number): Promise<AdminSession | null> {
    if (!this.kv || !this.authRequired) {
      return null;
    }

    try {
      const sessionKey = `admin_session:${userId}:${this.environment}`;
      const sessionData = await this.kv.get(sessionKey);

      if (!sessionData) {
        return null;
      }

      return JSON.parse(sessionData);
    } catch (error) {
      console.error('Error getting session info:', error);
      return null;
    }
  }

  /**
   * Create admin session
   */
  private async createSession(userId: number, chatId: number): Promise<void> {
    if (!this.kv) return;

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + this.sessionTimeoutHours * 60 * 60 * 1000
    );

    const session: AdminSession = {
      userId,
      chatId,
      authenticatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      environment: this.environment,
    };

    const sessionKey = `admin_session:${userId}:${this.environment}`;
    await this.kv.put(sessionKey, JSON.stringify(session), {
      expirationTtl: this.sessionTimeoutHours * 60 * 60,
    });
  }

  /**
   * Check if user is in cooldown period
   */
  private async checkCooldown(
    userId: number
  ): Promise<{ allowed: boolean; remainingMinutes?: number }> {
    if (!this.kv) return { allowed: true };

    try {
      const attemptKey = `login_attempts:${userId}:${this.environment}`;
      const attemptData = await this.kv.get(attemptKey);

      if (!attemptData) {
        return { allowed: true };
      }

      const attempt: LoginAttempt = JSON.parse(attemptData);

      if (attempt.cooldownUntil) {
        const now = new Date();
        const cooldownUntil = new Date(attempt.cooldownUntil);

        if (now < cooldownUntil) {
          const remainingMs = cooldownUntil.getTime() - now.getTime();
          const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
          return { allowed: false, remainingMinutes };
        }
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking cooldown:', error);
      return { allowed: true };
    }
  }

  /**
   * Record failed login attempt
   */
  private async recordFailedAttempt(userId: number): Promise<void> {
    if (!this.kv) return;

    try {
      const attemptKey = `login_attempts:${userId}:${this.environment}`;
      const existingData = await this.kv.get(attemptKey);

      let attempt: LoginAttempt;
      if (existingData) {
        attempt = JSON.parse(existingData);
        attempt.attempts += 1;
      } else {
        attempt = {
          userId,
          attempts: 1,
          lastAttemptAt: new Date().toISOString(),
        };
      }

      attempt.lastAttemptAt = new Date().toISOString();

      // If max attempts reached, set cooldown
      if (attempt.attempts >= this.maxLoginAttempts) {
        const cooldownUntil = new Date();
        cooldownUntil.setMinutes(
          cooldownUntil.getMinutes() + this.loginCooldownMinutes
        );
        attempt.cooldownUntil = cooldownUntil.toISOString();
      }

      await this.kv.put(attemptKey, JSON.stringify(attempt), {
        expirationTtl: this.loginCooldownMinutes * 60,
      });
    } catch (error) {
      console.error('Error recording failed attempt:', error);
    }
  }

  /**
   * Get current login attempts for user
   */
  private async getLoginAttempts(userId: number): Promise<number> {
    if (!this.kv) return 0;

    try {
      const attemptKey = `login_attempts:${userId}:${this.environment}`;
      const attemptData = await this.kv.get(attemptKey);

      if (!attemptData) {
        return 0;
      }

      const attempt: LoginAttempt = JSON.parse(attemptData);
      return attempt.attempts;
    } catch (error) {
      console.error('Error getting login attempts:', error);
      return 0;
    }
  }

  /**
   * Clear login attempts for user (after successful login)
   */
  private async clearLoginAttempts(userId: number): Promise<void> {
    if (!this.kv) return;

    try {
      const attemptKey = `login_attempts:${userId}:${this.environment}`;
      await this.kv.delete(attemptKey);
    } catch (error) {
      console.error('Error clearing login attempts:', error);
    }
  }
}
