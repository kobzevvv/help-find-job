/**
 * Simplified user session management service
 */

import { UserSession, ConversationState } from '../types/session';

export class SessionService {
  private kv: KVNamespace;
  private ttlSeconds: number;

  constructor(kv: KVNamespace, ttlSeconds: number = 86400) {
    this.kv = kv;
    this.ttlSeconds = ttlSeconds;
  }

  /**
   * Get user session
   */
  async getSession(userId: number): Promise<UserSession | null> {
    try {
      const sessionData = await this.kv.get(`session:${userId}`);
      if (!sessionData) {
        return null;
      }

      return JSON.parse(sessionData) as UserSession;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  /**
   * Create or update user session
   */
  async saveSession(session: UserSession): Promise<boolean> {
    try {
      session.lastActivity = new Date().toISOString();

      await this.kv.put(`session:${session.userId}`, JSON.stringify(session), {
        expirationTtl: this.ttlSeconds,
      });

      return true;
    } catch (error) {
      console.error('Error saving session:', error);
      return false;
    }
  }

  /**
   * Create new session
   */
  createSession(userId: number, chatId: number): UserSession {
    const now = new Date().toISOString();

    return {
      userId,
      chatId,
      state: 'idle',
      createdAt: now,
      lastActivity: now,
    };
  }

  /**
   * Update session state
   */
  async updateState(
    userId: number,
    state: ConversationState
  ): Promise<boolean> {
    const session = await this.getSession(userId);
    if (!session) {
      return false;
    }

    session.state = state;
    return await this.saveSession(session);
  }

  /**
   * Append text to resume
   */
  async appendResumeText(userId: number, text: string): Promise<boolean> {
    const session = await this.getSession(userId);
    if (!session) {
      return false;
    }

    session.resumeText = (session.resumeText || '') + text + '\n';
    return await this.saveSession(session);
  }

  /**
   * Append text to job ad
   */
  async appendJobAdText(userId: number, text: string): Promise<boolean> {
    const session = await this.getSession(userId);
    if (!session) {
      return false;
    }

    session.jobAdText = (session.jobAdText || '') + text + '\n';
    return await this.saveSession(session);
  }

  /**
   * Get resume text for user
   */
  async getResumeText(userId: number): Promise<string | null> {
    const session = await this.getSession(userId);
    return session?.resumeText || null;
  }

  /**
   * Get job ad text for user
   */
  async getJobAdText(userId: number): Promise<string | null> {
    const session = await this.getSession(userId);
    return session?.jobAdText || null;
  }

  /**
   * Clear user data
   */
  async clearUserData(userId: number): Promise<boolean> {
    const session = await this.getSession(userId);
    if (!session) {
      return false;
    }

    delete session.resumeText;
    delete session.jobAdText;
    session.state = 'idle';
    return await this.saveSession(session);
  }

  /**
   * Delete session
   */
  async deleteSession(userId: number): Promise<boolean> {
    try {
      await this.kv.delete(`session:${userId}`);
      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  }
}
