/**
 * User session management service
 */

import {
  UserSession,
  ConversationState,
  ProcessedDocument,
} from '../types/session';

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
  createSession(
    userId: number,
    chatId: number,
    language?: string
  ): UserSession {
    const now = new Date().toISOString();

    return {
      userId,
      chatId,
      state: 'idle',
      createdAt: now,
      lastActivity: now,
      language: language || 'ru',
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
   * Add resume to session
   */
  async addResume(
    userId: number,
    document: ProcessedDocument
  ): Promise<boolean> {
    const session = await this.getSession(userId);
    if (!session) {
      return false;
    }

    session.resume = document;
    // Stay in waiting_resume until user confirms with 'done'
    return await this.saveSession(session);
  }

  /**
   * Add job post to session
   */
  async addJobPost(
    userId: number,
    document: ProcessedDocument
  ): Promise<boolean> {
    const session = await this.getSession(userId);
    if (!session) {
      return false;
    }

    session.jobPost = document;
    session.state = 'processing';
    return await this.saveSession(session);
  }

  /**
   * Complete session (reset to idle)
   */
  async completeSession(userId: number): Promise<boolean> {
    const session = await this.getSession(userId);
    if (!session) {
      return false;
    }

    // Keep session but reset state and documents
    session.state = 'idle';
    session.resume = undefined;
    session.jobPost = undefined;

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

  /**
   * Check if user has active session
   */
  async hasActiveSession(userId: number): Promise<boolean> {
    const session = await this.getSession(userId);
    return session !== null && session.state !== 'idle';
  }
}
