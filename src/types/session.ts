/**
 * Simplified user session and conversation state types
 */

import { StructuredResumeData } from '../services/resume-processor';

export type ConversationState =
  | 'idle'
  | 'collecting_resume'
  | 'collecting_job_ad'
  | 'structuring_resume';

export interface UserSession {
  userId: number;
  chatId: number;
  state: ConversationState;
  resumeText?: string;
  jobAdText?: string;
  structuredResume?: StructuredResumeData;
  createdAt: string;
  lastActivity: string;
}
