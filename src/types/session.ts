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
  fileName?: string | undefined;
  mimeType?: string | undefined;
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

// =============================================================================
// Request-Based Architecture (Iteration 2)
// =============================================================================

/**
 * Represents a complete user request for document matching
 * Contains multiple documents and tracks processing state
 */
export interface UserRequest {
  id: string; // "request-123456"
  userId: number;
  chatId: number;
  createdAt: string;
  status: 'collecting' | 'processing' | 'completed' | 'error';
  
  // Documents associated with this request
  documentIds: string[]; // References to DocumentReference.id
  
  // Processing results
  analysis?: EnhancedAnalysis;
  processedAt?: string;
  
  // Request metadata
  lastActivity: string;
  language?: string | undefined;
}

/**
 * Represents a single document within a user request
 * Supports both original document info and processed results
 */
export interface DocumentReference {
  id: string; // "doc-789012"
  requestId: string; // Links back to UserRequest.id
  type: 'resume' | 'job_post';
  
  // Original document info
  originalName?: string | undefined;
  originalMimeType?: string | undefined;
  originalSize?: number | undefined;
  
  // Processed text (from current DocumentService)
  text: string;
  wordCount: number;
  
  // Processing metadata
  conversionMethod: 'cloudflare-ai' | 'text-input' | 'fallback' | 'javascript-fallback';
  processedAt: string;
  
  // Future: structured data extraction (Iteration 3)
  structuredData?: ResumeStructuredData | JobPostStructuredData;
}

/**
 * Future: Structured resume data (Iteration 3)
 * Will be extracted from resume text for advanced features
 */
export interface ResumeStructuredData {
  personalInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
  };
  
  experience?: JobExperience[];
  education?: EducationRecord[];
  skills?: string[];
  
  // For "beautiful PDF generation" feature
  lastJob?: JobExperience;
  previousJob?: JobExperience;
  earlierExperiences?: JobExperience[];
}

/**
 * Future: Structured job posting data (Iteration 3)
 */
export interface JobPostStructuredData {
  jobTitle?: string;
  company?: string;
  location?: string;
  salaryRange?: string;
  
  requirements?: {
    required: string[];
    preferred: string[];
  };
  
  responsibilities?: string[];
  benefits?: string[];
}

/**
 * Job experience record for structured data
 */
export interface JobExperience {
  company: string;
  position: string;
  startDate: string;
  endDate?: string; // undefined for current job
  duration?: string; // "2 years 3 months"
  
  responsibilities: string[];
  achievements: string[];
  
  // For matching analysis
  technologies?: string[];
  industryType?: string;
}

/**
 * Education record for structured data
 */
export interface EducationRecord {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  
  gpa?: string;
  honors?: string[];
  relevantCourses?: string[];
}
