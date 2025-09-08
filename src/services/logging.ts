/**
 * Logging service for tracking user interactions and debugging
 */

export interface LogEntry {
  id?: number;
  timestamp: string;
  level: 'INFO' | 'ERROR' | 'DEBUG' | 'WARN';
  event_type: string;
  user_id?: number | undefined;
  chat_id?: number | undefined;
  message: string;
  data?: string | undefined;
  error_details?: string | undefined;
}

export class LoggingService {
  private db: D1Database | undefined;
  private isInitialized = false;

  constructor(db?: D1Database) {
    this.db = db;
  }

  /**
   * Initialize the database schema
   */
  async initialize(): Promise<void> {
    if (!this.db || this.isInitialized) return;

    try {
      // Create table with single line SQL
      await this.db.exec(`CREATE TABLE IF NOT EXISTS user_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT NOT NULL, level TEXT NOT NULL, event_type TEXT NOT NULL, user_id INTEGER, chat_id INTEGER, message TEXT NOT NULL, data TEXT, error_details TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);

      // Create indexes
      await this.db.exec(`CREATE INDEX IF NOT EXISTS idx_user_logs_timestamp ON user_logs(timestamp)`);
      await this.db.exec(`CREATE INDEX IF NOT EXISTS idx_user_logs_user_id ON user_logs(user_id)`);
      await this.db.exec(`CREATE INDEX IF NOT EXISTS idx_user_logs_event_type ON user_logs(event_type)`);

      this.isInitialized = true;
      await this.log('INFO', 'SYSTEM', 'Logging service initialized');
    } catch (error) {
      console.error('Failed to initialize logging database:', error);
    }
  }

  /**
   * Log an event
   */
  async log(
    level: LogEntry['level'],
    eventType: string,
    message: string,
    data?: any,
    userId?: number,
    chatId?: number,
    error?: Error
  ): Promise<void> {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      event_type: eventType,
      user_id: userId,
      chat_id: chatId,
      message,
      data: data ? JSON.stringify(data) : undefined,
      error_details: error ? `${error.name}: ${error.message}\n${error.stack}` : undefined,
    };

    // Always log to console
    const logMessage = `[${logEntry.timestamp}] ${level} ${eventType}: ${message}`;
    if (level === 'ERROR') {
      console.error(logMessage, data, error);
    } else if (level === 'WARN') {
      console.warn(logMessage, data);
    } else {
      console.log(logMessage, data);
    }

    // Log to database if available
    if (this.db) {
      try {
        await this.db.prepare(`
          INSERT INTO user_logs (timestamp, level, event_type, user_id, chat_id, message, data, error_details)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          logEntry.timestamp,
          logEntry.level,
          logEntry.event_type,
          logEntry.user_id || null,
          logEntry.chat_id || null,
          logEntry.message,
          logEntry.data || null,
          logEntry.error_details || null
        ).run();
      } catch (dbError) {
        console.error('Failed to log to database:', dbError);
      }
    }
  }

  /**
   * Log user message received
   */
  async logUserMessage(userId: number, chatId: number, message: string, messageData?: any): Promise<void> {
    await this.log('INFO', 'USER_MESSAGE', `User sent: ${message}`, messageData, userId, chatId);
  }

  /**
   * Log bot response sent
   */
  async logBotResponse(userId: number, chatId: number, response: string, responseData?: any): Promise<void> {
    await this.log('INFO', 'BOT_RESPONSE', `Bot sent: ${response}`, responseData, userId, chatId);
  }

  /**
   * Log session state change
   */
  async logSessionChange(userId: number, chatId: number, fromState: string, toState: string): Promise<void> {
    await this.log('INFO', 'SESSION_STATE', `State changed: ${fromState} → ${toState}`, { fromState, toState }, userId, chatId);
  }

  /**
   * Log error
   */
  async logError(eventType: string, message: string, error: Error, userId?: number, chatId?: number): Promise<void> {
    await this.log('ERROR', eventType, message, { errorName: error.name, errorMessage: error.message }, userId, chatId, error);
  }

  /**
   * Log AI analysis
   */
  async logAIAnalysis(userId: number, chatId: number, success: boolean, duration: number, details?: any): Promise<void> {
    await this.log('INFO', 'AI_ANALYSIS', `AI analysis ${success ? 'succeeded' : 'failed'} in ${duration}ms`, { success, duration, ...details }, userId, chatId);
  }

  /**
   * Log webhook received
   */
  async logWebhookReceived(updateId: number, updateType: string, userId?: number, chatId?: number, data?: any): Promise<void> {
    await this.log('DEBUG', 'WEBHOOK_RECEIVED', `Received ${updateType} update ${updateId}`, { updateId, updateType, ...data }, userId, chatId);
  }

  /**
   * Get recent logs (for debugging)
   */
  async getRecentLogs(limit: number = 50): Promise<LogEntry[]> {
    if (!this.db) return [];

    try {
      const result = await this.db.prepare(`
        SELECT * FROM user_logs 
        ORDER BY created_at DESC 
        LIMIT ?
      `).bind(limit).all();

      return (result.results as unknown[]).map(row => row as LogEntry);
    } catch (error) {
      console.error('Failed to fetch recent logs:', error);
      return [];
    }
  }

  /**
   * Get logs for specific user
   */
  async getUserLogs(userId: number, limit: number = 20): Promise<LogEntry[]> {
    if (!this.db) return [];

    try {
      const result = await this.db.prepare(`
        SELECT * FROM user_logs 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `).bind(userId, limit).all();

      return (result.results as unknown[]).map(row => row as LogEntry);
    } catch (error) {
      console.error('Failed to fetch user logs:', error);
      return [];
    }
  }

  /**
   * Clear old logs (cleanup)
   */
  async cleanupOldLogs(daysToKeep: number = 7): Promise<void> {
    if (!this.db) return;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      await this.db.prepare(`
        DELETE FROM user_logs 
        WHERE created_at < ?
      `).bind(cutoffDate.toISOString()).run();

      await this.log('INFO', 'CLEANUP', `Cleaned up logs older than ${daysToKeep} days`);
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  /**
   * Get formatted recent logs for admin display
   */
  async getFormattedRecentLogs(limit: number, environment: string): Promise<string> {
    const logs = await this.getRecentLogs(limit);
    
    if (logs.length === 0) {
      return `📊 No log entries found.\n\n🌍 Environment: ${environment}`;
    }

    const timeRange = this.calculateTimeRange(logs);
    let formattedMessage = `📊 Last ${logs.length} Log Messages\n\n`;

    for (const log of logs) {
      const icon = this.getLogIcon(log.level, log.event_type);
      const timestamp = this.formatTimestamp(log.timestamp);
      const userInfo = this.formatUserInfo(log.user_id, log.chat_id);
      
      formattedMessage += `${icon} ${timestamp} | ${log.level} | ${log.event_type}\n`;
      
      if (userInfo) {
        formattedMessage += `${userInfo}\n`;
      }
      
      formattedMessage += `📝 ${log.message}\n`;
      
      if (log.error_details) {
        const shortError = log.error_details.split('\n')[0]?.substring(0, 100) || '';
        formattedMessage += `❌ ${shortError}${log.error_details.length > 100 ? '...' : ''}\n`;
      }
      
      formattedMessage += `\n`;
    }

    formattedMessage += `---\n📈 Total entries: ${logs.length} | 🕐 ${timeRange} | 🌍 ${environment}`;

    // Telegram message limit is 4096 characters
    if (formattedMessage.length > 4000) {
      formattedMessage = formattedMessage.substring(0, 3900) + '\n\n...📝 Message truncated due to length limit';
    }

    return formattedMessage;
  }

  /**
   * Get log icon based on level and event type
   */
  private getLogIcon(level: string, eventType: string): string {
    if (level === 'ERROR') return '❌';
    if (level === 'WARN') return '⚠️';
    if (eventType === 'USER_MESSAGE') return '👤';
    if (eventType === 'BOT_RESPONSE') return '🤖';
    if (eventType === 'SESSION_STATE') return '🔄';
    if (eventType === 'AI_ANALYSIS') return '🧠';
    if (eventType === 'WEBHOOK_RECEIVED') return '📥';
    if (eventType === 'NEW_SESSION') return '🆕';
    if (level === 'DEBUG') return '🔍';
    return '🕐';
  }

  /**
   * Format timestamp for display
   */
  private formatTimestamp(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch (error) {
      return timestamp.substring(0, 16);
    }
  }

  /**
   * Format user info for display
   */
  private formatUserInfo(userId?: number, chatId?: number): string {
    if (!userId && !chatId) return '';
    
    let info = '';
    if (userId) info += `User ${userId}`;
    if (chatId) {
      if (info) info += ` in chat ${chatId}`;
      else info += `Chat ${chatId}`;
    }
    
    return info ? `🔗 ${info}` : '';
  }

  /**
   * Calculate time range of logs
   */
  private calculateTimeRange(logs: LogEntry[]): string {
    if (logs.length === 0) return 'No entries';
    
    try {
      const newestLog = logs[0];
      const oldestLog = logs[logs.length - 1];
      if (!newestLog?.timestamp || !oldestLog?.timestamp) return 'Recent entries';
      
      const newest = new Date(newestLog.timestamp);
      const oldest = new Date(oldestLog.timestamp);
      const diffMs = newest.getTime() - oldest.getTime();
      
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffDays > 0) {
        return `Last ${diffDays} day${diffDays > 1 ? 's' : ''}`;
      } else if (diffHours > 0) {
        return `Last ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
      } else if (diffMinutes > 0) {
        return `Last ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
      } else {
        return 'Last minute';
      }
    } catch (error) {
      return 'Recent entries';
    }
  }

  /**
   * Get admin log summary for dashboard
   */
  async getAdminLogSummary(hours: number = 24): Promise<string> {
    if (!this.db) return 'Database not available';

    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - hours);

      const result = await this.db.prepare(`
        SELECT 
          level,
          COUNT(*) as count,
          event_type
        FROM user_logs 
        WHERE created_at > ? 
        GROUP BY level, event_type
        ORDER BY count DESC
      `).bind(cutoffDate.toISOString()).all();

      const stats = result.results as Array<{level: string, count: number, event_type: string}>;
      
      if (stats.length === 0) {
        return `📊 No activity in the last ${hours} hours`;
      }

      let summary = `📊 Log Summary (Last ${hours}h)\n\n`;
      
      const totalLogs = stats.reduce((sum, stat) => sum + stat.count, 0);
      const errorCount = stats.filter(s => s.level === 'ERROR').reduce((sum, s) => sum + s.count, 0);
      const warnCount = stats.filter(s => s.level === 'WARN').reduce((sum, s) => sum + s.count, 0);
      const infoCount = stats.filter(s => s.level === 'INFO').reduce((sum, s) => sum + s.count, 0);

      summary += `📈 Total: ${totalLogs} entries\n`;
      summary += `❌ Errors: ${errorCount}\n`;
      summary += `⚠️ Warnings: ${warnCount}\n`;
      summary += `ℹ️ Info: ${infoCount}\n\n`;

      summary += `🔝 Top Events:\n`;
      const topEvents = stats.slice(0, 5);
      for (const stat of topEvents) {
        const icon = this.getLogIcon(stat.level, stat.event_type);
        summary += `${icon} ${stat.event_type}: ${stat.count}\n`;
      }

      return summary;
    } catch (error) {
      console.error('Failed to get admin log summary:', error);
      return 'Error generating log summary';
    }
  }
}
