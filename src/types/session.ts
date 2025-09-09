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

// Enhanced analysis types for detailed resume-job matching
export interface HeadlineAnalysis {
  jobTitle: string;
  candidateTitles: string[];
  matchScore: number; // 0-100
  explanation: string;
  problems: string[];
  recommendations: string[];
}

export interface SkillsAnalysis {
  requestedSkills: string[];
  candidateSkills: string[];
  matchingSkills: string[];
  missingSkills: string[];
  additionalSkills: string[];
  matchScore: number; // 0-100
  explanation: string;
  problems: string[];
  recommendations: string[];
}

export interface ExperienceAnalysis {
  candidateExperience: string[];
  jobRequirements: string[];
  experienceMatch: number; // 0-100
  seniorityMatch: 'under-qualified' | 'perfect-match' | 'over-qualified';
  seniorityExplanation: string;
  quantityMatch: number; // 0-100
  quantityExplanation: string;
  explanation: string;
  problems: string[];
  recommendations: string[];
}

export interface JobConditionsAnalysis {
  location: {
    jobLocation: string;
    candidateLocation: string;
    compatible: boolean;
    explanation: string;
  };
  salary: {
    jobSalary: string;
    candidateExpectation: string;
    compatible: boolean;
    explanation: string;
  };
  schedule: {
    jobSchedule: string;
    candidatePreference: string;
    compatible: boolean;
    explanation: string;
  };
  workFormat: {
    jobFormat: string;
    candidatePreference: string;
    compatible: boolean;
    explanation: string;
  };
  overallScore: number; // 0-100
  explanation: string;
}

export interface EnhancedAnalysis {
  overallScore: number;
  headlines: HeadlineAnalysis;
  skills: SkillsAnalysis;
  experience: ExperienceAnalysis;
  jobConditions: JobConditionsAnalysis;
  summary: string;
  processedAt: string;
}
