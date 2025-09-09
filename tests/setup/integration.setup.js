/**
 * Integration Test Setup
 * Tests with real service integration but mocked external APIs
 */

// Mock external APIs (but allow real service logic)
global.fetch = jest.fn();

// Mock OpenAI API responses
jest.mock('openai', () => {
  const mockOpenAI = {
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  };

  // Allow different responses based on test context
  mockOpenAI.chat.completions.create.mockImplementation(async (params) => {
    // Simulate real API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Return appropriate response based on request
    if (params.messages.some(msg => msg.content.includes('HEADLINES_ANALYSIS'))) {
      return {
        choices: [{
          message: {
            content: JSON.stringify({
              jobTitle: 'Senior Sales Manager',
              candidateTitles: ['Product Manager', 'Sales Manager'],
              matchScore: 65,
              explanation: 'Moderate match between product management and sales roles',
              problems: ['Different primary focus'],
              recommendations: ['Highlight transferable skills']
            })
          }
        }]
      };
    }
    
    // Default comprehensive analysis response
    return {
      choices: [{
        message: {
          content: JSON.stringify({
            overallScore: 72,
            headlines: {
              jobTitle: 'Senior Sales Manager',
              candidateTitles: ['Product Manager'],
              matchScore: 65,
              explanation: 'Transferable skills present',
              problems: ['Role transition required'],
              recommendations: ['Emphasize sales aspects of product management']
            },
            skills: {
              requestedSkills: ['B2B Sales', 'CRM', 'Lead Generation'],
              candidateSkills: ['Product Management', 'Analytics', 'Strategy'],
              matchingSkills: ['Analytics'],
              missingSkills: ['B2B Sales', 'CRM'],
              additionalSkills: ['Product Management', 'Strategy'],
              matchScore: 40,
              explanation: 'Limited direct sales skill overlap'
            },
            experience: {
              candidateExperience: ['5 years Product Management at ITV'],
              jobRequirements: ['3+ years B2B sales experience'],
              experienceMatch: 60,
              seniorityMatch: 'perfect-match',
              seniorityExplanation: '5 years meets 3+ requirement',
              quantityMatch: 85,
              quantityExplanation: 'Sufficient years of experience',
              explanation: 'Good seniority, different domain'
            },
            jobConditions: {
              location: {
                jobLocation: 'Moscow',
                candidateLocation: 'Moscow', 
                compatible: true,
                explanation: 'Both in Moscow'
              },
              salary: {
                compatible: true,
                explanation: 'Salary expectations likely compatible'
              },
              schedule: {
                compatible: true,
                explanation: 'Full-time schedule matches'
              },
              workFormat: {
                compatible: true,
                explanation: 'Office work acceptable'
              },
              overallScore: 95,
              explanation: 'Excellent condition compatibility'
            },
            summary: 'MATCH ANALYSIS: 72% compatibility. Good seniority match and excellent conditions, but requires role transition from product management to sales.',
            processedAt: new Date().toISOString()
          })
        }
      }]
    };
  });

  return { OpenAI: jest.fn(() => mockOpenAI) };
});

// Telegram API mocking
global.mockTelegramAPI = {
  sendMessage: jest.fn().mockResolvedValue({ ok: true, result: { message_id: 123 } }),
  setWebhook: jest.fn().mockResolvedValue({ ok: true }),
  getWebhookInfo: jest.fn().mockResolvedValue({ ok: true, result: { url: '' } })
};

// Mock fetch for Telegram API calls
global.fetch.mockImplementation(async (url, options) => {
  if (url.includes('api.telegram.org')) {
    return {
      ok: true,
      json: async () => mockTelegramAPI.sendMessage()
    };
  }
  
  // Default fetch mock
  return {
    ok: true,
    json: async () => ({ success: true })
  };
});

// Environment setup
process.env.NODE_ENV = 'test';
process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.WEBHOOK_SECRET = 'test-webhook-secret';

// Test utilities for integration tests
global.createTestRequest = (method, path, body) => {
  return new Request(`https://test-worker.example.com${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Bot-Api-Secret-Token': 'test-webhook-secret'
    },
    body: body ? JSON.stringify(body) : undefined
  });
};

global.createTelegramUpdate = (message) => {
  return {
    update_id: 123456,
    message: {
      message_id: 1,
      from: {
        id: 12345,
        is_bot: false,
        first_name: 'Test',
        username: 'testuser'
      },
      chat: {
        id: 12345,
        first_name: 'Test',
        username: 'testuser',
        type: 'private'
      },
      date: Math.floor(Date.now() / 1000),
      text: message
    }
  };
};

// Test lifecycle
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch.mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
});
