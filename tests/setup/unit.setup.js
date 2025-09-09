/**
 * Unit Test Setup
 * Fast, isolated tests with extensive mocking
 */

// Mock external dependencies
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    overallScore: 75,
                    headlines: { matchScore: 80 },
                    skills: { matchScore: 70 },
                    experience: { experienceMatch: 75 },
                    jobConditions: { overallScore: 80 },
                    summary: 'Mock analysis result'
                  })
                }
              }
            ]
          })
        }
      }
    }))
  };
});

// Mock file system operations
jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue('Mock file content'),
  writeFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true)
}));

// Mock path operations
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/'))
}));

// Global test utilities
global.createMockDocument = () => ({
  text: 'Mock document content',
  wordCount: 100,
  characterCount: 500,
  processedAt: new Date().toISOString()
});

global.createMockAnalysis = () => ({
  overallScore: 75,
  headlines: {
    jobTitle: 'Senior Developer',
    candidateTitles: ['Full Stack Developer'],
    matchScore: 80,
    explanation: 'Good match',
    problems: [],
    recommendations: []
  },
  skills: {
    requestedSkills: ['JavaScript', 'React'],
    candidateSkills: ['JavaScript', 'React', 'Node.js'],
    matchingSkills: ['JavaScript', 'React'],
    missingSkills: [],
    additionalSkills: ['Node.js'],
    matchScore: 90,
    explanation: 'Excellent skill match'
  },
  experience: {
    candidateExperience: ['5 years development'],
    jobRequirements: ['3+ years experience'],
    experienceMatch: 85,
    seniorityMatch: 'perfect-match',
    seniorityExplanation: 'Experience level matches',
    quantityMatch: 90,
    quantityExplanation: 'Sufficient experience',
    explanation: 'Good experience match'
  },
  jobConditions: {
    location: { compatible: true, explanation: 'Location compatible' },
    salary: { compatible: true, explanation: 'Salary range matches' },
    schedule: { compatible: true, explanation: 'Schedule works' },
    workFormat: { compatible: true, explanation: 'Remote work available' },
    overallScore: 85,
    explanation: 'All conditions compatible'
  },
  summary: 'MATCH ANALYSIS: This is a strong match with 75% overall compatibility.',
  processedAt: new Date().toISOString()
});

// Console override for cleaner test output
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: originalConsole.warn,
  error: originalConsole.error
};

// Test lifecycle hooks
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});
