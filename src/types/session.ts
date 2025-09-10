/**
 * Simplified user session and conversation state types
 */

export type ConversationState =
  | 'idle'
  | 'collecting_resume'
  | 'collecting_job_ad';

export interface UserSession {
  userId: number;
  chatId: number;
  state: ConversationState;
  resumeText?: string;
  jobAdText?: string;
  createdAt: string;
  lastActivity: string;
}

