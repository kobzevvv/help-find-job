/**
 * User session and conversation state types
 */

export type ConversationState = 
  | 'idle'
  | 'waiting_resume'
  | 'waiting_job_post'
  | 'processing'
  | 'completed';

export interface UserSession {
  userId: number;
  chatId: number;
  state: ConversationState;
  resume?: ProcessedDocument | undefined;
  jobPost?: ProcessedDocument | undefined;
  createdAt: string;
  lastActivity: string;
  language?: string;
}

export interface ProcessedDocument {
  fileName?: string;
  mimeType?: string;
  text: string;
  wordCount: number;
  processedAt: string;
}

export interface AnalysisResult {
  category: 'general' | 'skills' | 'experience';
  score: number; // 0-100
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  details?: string;
}

export interface CompleteAnalysis {
  overallScore: number;
  general: AnalysisResult;
  skills: AnalysisResult;
  experience: AnalysisResult;
  summary: string;
  processedAt: string;
}
