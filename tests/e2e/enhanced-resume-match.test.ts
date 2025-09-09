/**
 * Enhanced Resume-Job Post Matching E2E Tests
 * 
 * This test file validates the comprehensive resume analysis system
 * using real test data to ensure all functionality works correctly.
 */

import { EnhancedAIService } from '../../src/services/enhanced-ai';
import { DocumentService } from '../../src/services/document';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Enhanced Resume-Job Post Matching E2E Tests', () => {
  let enhancedAIService: EnhancedAIService;
  let documentService: DocumentService;
  
  // Mock OpenAI API key for testing
  const testApiKey = process.env.OPENAI_API_KEY || 'test-api-key';
  
  beforeAll(() => {
    // Initialize services with GPT-3.5 for cost-effective testing
    enhancedAIService = new EnhancedAIService(testApiKey, 'gpt-3.5-turbo', 2000, 0.3);
    documentService = new DocumentService(10);
  });

  beforeEach(() => {
    // Reset any state between tests
    jest.clearAllMocks();
  });

  describe('Test Data Processing', () => {
    test('should load and process test resume file', () => {
      const resumePath = join(__dirname, '../resume_job_post_match/resume_test_input.txt');
      const resumeContent = readFileSync(resumePath, 'utf-8');
      
      const processedResume = documentService.processTextInput(resumeContent);
      const validation = documentService.validateDocument(processedResume);
      
      expect(validation.isValid).toBe(true);
      expect(processedResume.text).toContain('Продакт-менеджер');
      expect(processedResume.text).toContain('ITV');
      expect(processedResume.wordCount).toBeGreaterThan(100);
    });

    test('should load and process test job post file', () => {
      const jobPostPath = join(__dirname, '../resume_job_post_match/job_post_test_input.txt');
      const jobPostContent = readFileSync(jobPostPath, 'utf-8');
      
      const processedJobPost = documentService.processTextInput(jobPostContent);
      const validation = documentService.validateDocument(processedJobPost);
      
      expect(validation.isValid).toBe(true);
      expect(processedJobPost.text).toContain('Senior sales manager');
      expect(processedJobPost.text).toContain('Between Exchange');
      expect(processedJobPost.wordCount).toBeGreaterThan(50);
    });
  });

  describe('Enhanced Analysis System', () => {
    let testResume: any;
    let testJobPost: any;

    beforeEach(() => {
      // Load test data
      const resumePath = join(__dirname, '../resume_job_post_match/resume_test_input.txt');
      const jobPostPath = join(__dirname, '../resume_job_post_match/job_post_test_input.txt');
      
      const resumeContent = readFileSync(resumePath, 'utf-8');
      const jobPostContent = readFileSync(jobPostPath, 'utf-8');
      
      testResume = documentService.processTextInput(resumeContent);
      testJobPost = documentService.processTextInput(jobPostContent);
    });

    test('should perform comprehensive resume-job analysis', async () => {
      // Skip if no API key
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping AI analysis test - no API key provided');
        return;
      }

      const analysis = await enhancedAIService.analyzeResumeJobMatch(testResume, testJobPost);
      
      expect(analysis).toBeTruthy();
      expect(typeof analysis!.overallScore).toBe('number');
      expect(analysis!.overallScore).toBeGreaterThanOrEqual(0);
      expect(analysis!.overallScore).toBeLessThanOrEqual(100);
      
      // Verify all analysis sections exist
      expect(analysis!.headlines).toBeDefined();
      expect(analysis!.skills).toBeDefined();
      expect(analysis!.experience).toBeDefined();
      expect(analysis!.jobConditions).toBeDefined();
      expect(analysis!.summary).toBeDefined();
      expect(analysis!.processedAt).toBeDefined();
    }, 120000); // 2 minute timeout for AI analysis

    test('should analyze headlines correctly', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping headlines analysis test - no API key provided');
        return;
      }

      const analysis = await enhancedAIService.analyzeResumeJobMatch(testResume, testJobPost);
      const headlines = analysis!.headlines;
      
      expect(headlines.jobTitle).toBeTruthy();
      expect(headlines.candidateTitles).toBeInstanceOf(Array);
      expect(headlines.candidateTitles.length).toBeGreaterThan(0);
      expect(typeof headlines.matchScore).toBe('number');
      expect(headlines.matchScore).toBeGreaterThanOrEqual(0);
      expect(headlines.matchScore).toBeLessThanOrEqual(100);
      expect(headlines.explanation).toBeTruthy();
      expect(headlines.problems).toBeInstanceOf(Array);
      expect(headlines.recommendations).toBeInstanceOf(Array);
      
      // Specific expectations for test data
      expect(headlines.jobTitle.toLowerCase()).toContain('sales manager');
      expect(headlines.candidateTitles.some(title => 
        title.toLowerCase().includes('продакт-менеджер') || 
        title.toLowerCase().includes('product manager')
      )).toBe(true);
    }, 60000);

    test('should analyze skills correctly', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping skills analysis test - no API key provided');
        return;
      }

      const analysis = await enhancedAIService.analyzeResumeJobMatch(testResume, testJobPost);
      const skills = analysis!.skills;
      
      expect(skills.requestedSkills).toBeInstanceOf(Array);
      expect(skills.candidateSkills).toBeInstanceOf(Array);
      expect(skills.matchingSkills).toBeInstanceOf(Array);
      expect(skills.missingSkills).toBeInstanceOf(Array);
      expect(skills.additionalSkills).toBeInstanceOf(Array);
      expect(typeof skills.matchScore).toBe('number');
      expect(skills.matchScore).toBeGreaterThanOrEqual(0);
      expect(skills.matchScore).toBeLessThanOrEqual(100);
      expect(skills.explanation).toBeTruthy();
      
      // Should identify some key skills from job post
      const allRequestedSkills = skills.requestedSkills.join(' ').toLowerCase();
      expect(
        allRequestedSkills.includes('b2b') || 
        allRequestedSkills.includes('sales') || 
        allRequestedSkills.includes('digital marketing')
      ).toBe(true);
    }, 60000);

    test('should analyze experience with seniority assessment', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping experience analysis test - no API key provided');
        return;
      }

      const analysis = await enhancedAIService.analyzeResumeJobMatch(testResume, testJobPost);
      const experience = analysis!.experience;
      
      expect(experience.candidateExperience).toBeInstanceOf(Array);
      expect(experience.jobRequirements).toBeInstanceOf(Array);
      expect(typeof experience.experienceMatch).toBe('number');
      expect(experience.experienceMatch).toBeGreaterThanOrEqual(0);
      expect(experience.experienceMatch).toBeLessThanOrEqual(100);
      expect(['under-qualified', 'perfect-match', 'over-qualified']).toContain(experience.seniorityMatch);
      expect(experience.seniorityExplanation).toBeTruthy();
      expect(typeof experience.quantityMatch).toBe('number');
      expect(experience.quantityExplanation).toBeTruthy();
      expect(experience.explanation).toBeTruthy();
    }, 60000);

    test('should analyze job conditions', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping job conditions analysis test - no API key provided');
        return;
      }

      const analysis = await enhancedAIService.analyzeResumeJobMatch(testResume, testJobPost);
      const conditions = analysis!.jobConditions;
      
      expect(conditions.location).toBeDefined();
      expect(conditions.salary).toBeDefined();
      expect(conditions.schedule).toBeDefined();
      expect(conditions.workFormat).toBeDefined();
      
      expect(typeof conditions.location.compatible).toBe('boolean');
      expect(typeof conditions.salary.compatible).toBe('boolean');
      expect(typeof conditions.schedule.compatible).toBe('boolean');
      expect(typeof conditions.workFormat.compatible).toBe('boolean');
      
      expect(conditions.location.explanation).toBeTruthy();
      expect(conditions.salary.explanation).toBeTruthy();
      expect(conditions.schedule.explanation).toBeTruthy();
      expect(conditions.workFormat.explanation).toBeTruthy();
      
      expect(typeof conditions.overallScore).toBe('number');
      expect(conditions.overallScore).toBeGreaterThanOrEqual(0);
      expect(conditions.overallScore).toBeLessThanOrEqual(100);
      expect(conditions.explanation).toBeTruthy();
      
      // Should detect Moscow location from both documents
      expect(
        conditions.location.jobLocation.toLowerCase().includes('москва') ||
        conditions.location.jobLocation.toLowerCase().includes('moscow')
      ).toBe(true);
    }, 60000);

    test('should generate comprehensive summary', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping summary test - no API key provided');
        return;
      }

      const analysis = await enhancedAIService.analyzeResumeJobMatch(testResume, testJobPost);
      
      expect(analysis!.summary).toBeTruthy();
      expect(analysis!.summary.length).toBeGreaterThan(50);
      expect(analysis!.summary).toContain('MATCH');
      
      // Summary should contain score information
      const summaryLower = analysis!.summary.toLowerCase();
      expect(
        summaryLower.includes('score') || 
        summaryLower.includes('breakdown') ||
        summaryLower.includes('analysis')
      ).toBe(true);
    }, 60000);
  });

  describe('Error Handling', () => {
    test('should handle invalid API key gracefully', async () => {
      const invalidService = new EnhancedAIService('invalid-key', 'gpt-3.5-turbo', 1000, 0.3);
      
      const resumePath = join(__dirname, '../resume_job_post_match/resume_test_input.txt');
      const jobPostPath = join(__dirname, '../resume_job_post_match/job_post_test_input.txt');
      
      const resumeContent = readFileSync(resumePath, 'utf-8');
      const jobPostContent = readFileSync(jobPostPath, 'utf-8');
      
      const testResume = documentService.processTextInput(resumeContent);
      const testJobPost = documentService.processTextInput(jobPostContent);
      
      const analysis = await invalidService.analyzeResumeJobMatch(testResume, testJobPost);
      
      expect(analysis).toBeNull();
    });

    test('should handle empty documents gracefully', async () => {
      const emptyResume = documentService.processTextInput('');
      const emptyJobPost = documentService.processTextInput('');
      
      const resumeValidation = documentService.validateDocument(emptyResume);
      const jobPostValidation = documentService.validateDocument(emptyJobPost);
      
      expect(resumeValidation.isValid).toBe(false);
      expect(jobPostValidation.isValid).toBe(false);
    });
  });

  describe('Performance Tests', () => {
    test('should complete analysis within reasonable time', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping performance test - no API key provided');
        return;
      }

      const resumePath = join(__dirname, '../resume_job_post_match/resume_test_input.txt');
      const jobPostPath = join(__dirname, '../resume_job_post_match/job_post_test_input.txt');
      
      const resumeContent = readFileSync(resumePath, 'utf-8');
      const jobPostContent = readFileSync(jobPostPath, 'utf-8');
      
      const testResume = documentService.processTextInput(resumeContent);
      const testJobPost = documentService.processTextInput(jobPostContent);
      
      const startTime = Date.now();
      const analysis = await enhancedAIService.analyzeResumeJobMatch(testResume, testJobPost);
      const endTime = Date.now();
      
      expect(analysis).toBeTruthy();
      expect(endTime - startTime).toBeLessThan(120000); // Should complete within 2 minutes
    }, 130000);
  });
});

// Helper function to run integration test with real bot
export async function runManualIntegrationTest() {
  console.log('🧪 Running manual integration test...');
  
  try {
    const enhancedAIService = new EnhancedAIService(
      process.env.OPENAI_API_KEY || 'test-key', 
      'gpt-3.5-turbo', 
      2000, 
      0.3
    );
    
    const documentService = new DocumentService(10);
    
    // Load test files
    const resumePath = join(__dirname, '../resume_job_post_match/resume_test_input.txt');
    const jobPostPath = join(__dirname, '../resume_job_post_match/job_post_test_input.txt');
    
    const resumeContent = readFileSync(resumePath, 'utf-8');
    const jobPostContent = readFileSync(jobPostPath, 'utf-8');
    
    const testResume = documentService.processTextInput(resumeContent);
    const testJobPost = documentService.processTextInput(jobPostContent);
    
    console.log('📄 Test Resume processed:', testResume.wordCount, 'words');
    console.log('📋 Test Job Post processed:', testJobPost.wordCount, 'words');
    
    console.log('🔄 Starting enhanced analysis...');
    const analysis = await enhancedAIService.analyzeResumeJobMatch(testResume, testJobPost);
    
    if (analysis) {
      console.log('✅ Analysis completed successfully!');
      console.log('📊 Overall Score:', analysis.overallScore);
      console.log('🏷️ Headlines Score:', analysis.headlines.matchScore);
      console.log('🛠️ Skills Score:', analysis.skills.matchScore);
      console.log('💼 Experience Score:', analysis.experience.experienceMatch);
      console.log('📍 Conditions Score:', analysis.jobConditions.overallScore);
      console.log('📝 Summary:', analysis.summary.substring(0, 200) + '...');
      
      return analysis;
    } else {
      console.log('❌ Analysis failed');
      return null;
    }
  } catch (error) {
    console.error('💥 Integration test failed:', error);
    return null;
  }
}

// Export for use in other test files
export { EnhancedAIService, DocumentService };
