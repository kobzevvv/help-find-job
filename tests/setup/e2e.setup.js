/**
 * E2E Test Setup
 * Full workflow testing with real external services (when API keys available)
 */

// Environment configuration
process.env.NODE_ENV = 'test';

// Test data paths
const path = require('path');
global.TEST_DATA_DIR = path.join(__dirname, '../resume_job_post_match');

// Utility functions for E2E tests
global.skipIfNoAPIKey = (apiKey, testName) => {
  if (!apiKey || apiKey === 'test-api-key' || apiKey === '') {
    console.log(`⏭️ Skipping ${testName} - no API key provided`);
    return true;
  }
  return false;
};

global.loadTestData = () => {
  const fs = require('fs');
  const resumePath = path.join(global.TEST_DATA_DIR, 'resume_test_input.txt');
  const jobPostPath = path.join(global.TEST_DATA_DIR, 'job_post_test_input.txt');
  
  return {
    resume: fs.readFileSync(resumePath, 'utf-8'),
    jobPost: fs.readFileSync(jobPostPath, 'utf-8')
  };
};

// Performance monitoring
global.measurePerformance = (name) => {
  const startTime = process.hrtime.bigint();
  
  return {
    end: () => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1e6; // Convert to milliseconds
      console.log(`⏱️ ${name} took ${duration.toFixed(2)}ms`);
      return duration;
    }
  };
};

// Test reporting utilities
global.logTestProgress = (step, details) => {
  console.log(`📋 E2E Test Step: ${step}`);
  if (details) {
    console.log(`   Details: ${details}`);
  }
};

global.validateAnalysisStructure = (analysis) => {
  const errors = [];
  
  if (!analysis) {
    errors.push('Analysis is null or undefined');
    return errors;
  }
  
  // Check required fields
  const requiredFields = ['overallScore', 'headlines', 'skills', 'experience', 'jobConditions', 'summary'];
  requiredFields.forEach(field => {
    if (!(field in analysis)) {
      errors.push(`Missing required field: ${field}`);
    }
  });
  
  // Check score ranges
  if (typeof analysis.overallScore !== 'number' || analysis.overallScore < 0 || analysis.overallScore > 100) {
    errors.push('overallScore must be a number between 0 and 100');
  }
  
  // Check headlines structure
  if (analysis.headlines) {
    if (typeof analysis.headlines.matchScore !== 'number') {
      errors.push('headlines.matchScore must be a number');
    }
    if (!Array.isArray(analysis.headlines.candidateTitles)) {
      errors.push('headlines.candidateTitles must be an array');
    }
  }
  
  // Check skills structure
  if (analysis.skills) {
    const skillArrays = ['requestedSkills', 'candidateSkills', 'matchingSkills', 'missingSkills'];
    skillArrays.forEach(field => {
      if (analysis.skills[field] && !Array.isArray(analysis.skills[field])) {
        errors.push(`skills.${field} must be an array`);
      }
    });
  }
  
  // Check experience structure
  if (analysis.experience) {
    if (!['under-qualified', 'perfect-match', 'over-qualified'].includes(analysis.experience.seniorityMatch)) {
      errors.push('experience.seniorityMatch must be one of: under-qualified, perfect-match, over-qualified');
    }
  }
  
  return errors;
};

// Error handling for E2E tests
global.handleE2EError = (error, testName) => {
  console.error(`💥 E2E Test Error in ${testName}:`, error);
  
  if (error.code === 'ENOTFOUND') {
    console.log('🌐 Network error - check internet connection');
  } else if (error.message.includes('429')) {
    console.log('🚫 Rate limit exceeded - consider using test doubles');
  } else if (error.message.includes('401')) {
    console.log('🔐 Authentication error - check API keys');
  }
  
  return error;
};

// Cleanup utilities
global.cleanup = () => {
  // Clean up any test artifacts
  console.log('🧹 E2E test cleanup completed');
};

// Test lifecycle
beforeAll(async () => {
  console.log('🚀 Starting E2E tests...');
  
  // Verify test data exists
  const fs = require('fs');
  const testDataExists = fs.existsSync(global.TEST_DATA_DIR);
  if (!testDataExists) {
    throw new Error(`Test data directory not found: ${global.TEST_DATA_DIR}`);
  }
});

afterAll(async () => {
  global.cleanup();
  console.log('✅ E2E tests completed');
});

beforeEach(() => {
  // Reset any global state
  jest.clearAllTimers();
});

afterEach(() => {
  // Individual test cleanup
  jest.useRealTimers();
});
