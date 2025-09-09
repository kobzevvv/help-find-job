/**
 * Telegram Bot Integration Test
 * 
 * This test validates that the enhanced resume matching works 
 * through the actual Telegram bot interface.
 */

import { ConversationHandler } from '../../src/handlers/conversation';
import { SessionService } from '../../src/services/session';
import { TelegramService } from '../../src/services/telegram';
import { DocumentService } from '../../src/services/document';
import { AIService } from '../../src/services/ai';
import { EnhancedAIService } from '../../src/services/enhanced-ai';
import { LoggingService } from '../../src/services/logging';

// Mock KV namespace for testing
class MockKVNamespace {
  private store: Map<string, string> = new Map();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) || null;
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(): Promise<{ keys: { name: string }[] }> {
    return { keys: Array.from(this.store.keys()).map(name => ({ name })) };
  }
}

// Mock D1 database for testing
class MockD1Database {
  async prepare(query: string) {
    return {
      bind: (...params: any[]) => ({
        run: async () => ({ success: true }),
        all: async () => ({ results: [] }),
        first: async () => null,
      }),
      run: async () => ({ success: true }),
      all: async () => ({ results: [] }),
      first: async () => null,
    };
  }

  async exec(query: string) {
    return { results: [], success: true };
  }
}

describe('Telegram Bot Integration Tests', () => {
  let conversationHandler: ConversationHandler;
  let mockSessionService: SessionService;
  let mockTelegramService: TelegramService;
  let documentService: DocumentService;
  let aiService: AIService;
  let enhancedAIService: EnhancedAIService;
  let loggingService: LoggingService;

  const testApiKey = process.env.OPENAI_API_KEY || 'test-api-key';
  const testBotToken = process.env.TELEGRAM_BOT_TOKEN || 'test-bot-token';

  beforeAll(() => {
    // Initialize mock services
    const mockKV = new MockKVNamespace();
    const mockDB = new MockD1Database();

    mockSessionService = new SessionService(mockKV as any, 3600);
    documentService = new DocumentService(10);
    aiService = new AIService(testApiKey, 'gpt-3.5-turbo', 1500, 0.3);
    enhancedAIService = new EnhancedAIService(testApiKey, 'gpt-3.5-turbo', 2000, 0.3);
    loggingService = new LoggingService(mockDB as any);
    
    // Mock Telegram service to prevent actual API calls during testing
    mockTelegramService = new TelegramService(testBotToken);
    
    // Mock the sendMessage method to prevent actual Telegram API calls
    jest.spyOn(mockTelegramService, 'sendMessage').mockImplementation(
      async (params: any) => {
        console.log('📱 Mock Telegram message:', params.text?.substring(0, 100) + '...');
        return true;
      }
    );

    conversationHandler = new ConversationHandler(
      mockSessionService,
      mockTelegramService,
      documentService,
      aiService,
      enhancedAIService,
      loggingService,
      'test',
      'testpassword'
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Resume-Job Matching Commands', () => {
    const testUserId = 12345;
    const testChatId = 67890;

    test('should handle /resume_and_job_post_match command', async () => {
      const mockMessage = {
        message_id: 1,
        from: { id: testUserId, first_name: 'Test', language_code: 'en' },
        chat: { id: testChatId, type: 'private' as const },
        date: Date.now(),
        text: '/resume_and_job_post_match'
      };

      await conversationHandler.handleMessage(mockMessage);

      // Verify that the start flow message was sent (Russian prompt)
      expect(mockTelegramService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          chat_id: testChatId,
          text: expect.stringContaining('Я помогу проанализировать')
        })
      );

      // Verify session state was updated
      const session = await mockSessionService.getSession(testUserId);
      expect(session?.state).toBe('waiting_resume');
    });

    test('should handle /test_resume_match command', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping test_resume_match test - no API key provided');
        return;
      }

      const mockMessage = {
        message_id: 2,
        from: { id: testUserId, first_name: 'Test', language_code: 'en' },
        chat: { id: testChatId, type: 'private' as const },
        date: Date.now(),
        text: '/test_resume_match'
      };

      await conversationHandler.handleMessage(mockMessage);

      // Verify that multiple messages were sent (summary + detailed breakdown)
      expect(mockTelegramService.sendMessage).toHaveBeenCalledTimes(6); // Summary + 4 detailed + final
      
      // Check that the test analysis message was sent (Russian)
      expect(mockTelegramService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          chat_id: testChatId,
          text: expect.stringContaining('ЗАПУСК ТЕСТОВОГО АНАЛИЗА')
        })
      );

      // Check that comprehensive analysis message was sent (Russian)
      expect(mockTelegramService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          chat_id: testChatId,
          text: expect.stringContaining('КОМПЛЕКСНЫЙ АНАЛИЗ РЕЗЮМЕ')
        })
      );
    }, 120000); // 2 minute timeout for AI analysis

    test('should handle resume input in waiting_resume state', async () => {
      // First set the session to waiting_resume state
      await mockSessionService.updateState(testUserId, 'waiting_resume');

      const resumeText = `Product Manager
5 years experience in product development
Skills: Product Strategy, Agile, Scrum, Analytics
Experience at Tech Company from 2020-2025`;

      const mockMessage = {
        message_id: 3,
        from: { id: testUserId, first_name: 'Test', language_code: 'en' },
        chat: { id: testChatId, type: 'private' as const },
        date: Date.now(),
        text: resumeText
      };

      await conversationHandler.handleMessage(mockMessage);

      // Verify resume was processed and state updated
      expect(mockTelegramService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          chat_id: testChatId,
          text: expect.stringContaining('Resume received')
        })
      );

      const session = await mockSessionService.getSession(testUserId);
      expect(session?.state).toBe('waiting_job_post');
      expect(session?.resume).toBeDefined();
    });

    test('should handle job post input in waiting_job_post state', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping job post input test - no API key provided');
        return;
      }

      // Set up session with resume and waiting for job post
      await mockSessionService.updateState(testUserId, 'waiting_job_post');
      const resumeText = `Product Manager, 5 years experience, Skills: Product Strategy, Agile`;
      const resume = documentService.processTextInput(resumeText);
      await mockSessionService.addResume(testUserId, resume);

      const jobPostText = `Senior Product Manager
Location: Remote
Salary: $100,000 - $150,000
Requirements: 3+ years product management, Agile experience, Analytics skills
Responsibilities: Lead product strategy, Manage development teams`;

      const mockMessage = {
        message_id: 4,
        from: { id: testUserId, first_name: 'Test', language_code: 'en' },
        chat: { id: testChatId, type: 'private' as const },
        date: Date.now(),
        text: jobPostText
      };

      await conversationHandler.handleMessage(mockMessage);

      // Verify analysis was started (Russian)
      expect(mockTelegramService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          chat_id: testChatId,
          text: expect.stringContaining('комплексный анализ резюме')
        })
      );

      // Verify detailed analysis results were sent (Russian)
      expect(mockTelegramService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          chat_id: testChatId,
          text: expect.stringContaining('КОМПЛЕКСНЫЙ АНАЛИЗ РЕЗЮМЕ')
        })
      );
    }, 120000); // 2 minute timeout for AI analysis
  });

  describe('Error Handling in Bot Context', () => {
    const testUserId = 54321;
    const testChatId = 98765;

    test('should handle unsupported message types gracefully', async () => {
      const mockMessage = {
        message_id: 5,
        from: { id: testUserId, first_name: 'Test', language_code: 'en' },
        chat: { id: testChatId, type: 'private' as const },
        date: Date.now(),
        // No text, document, or other supported content
      };

      await conversationHandler.handleMessage(mockMessage);

      expect(mockTelegramService.sendMessage).toHaveBeenCalled();
    });

    test('should handle unknown commands', async () => {
      const mockMessage = {
        message_id: 6,
        from: { id: testUserId, first_name: 'Test', language_code: 'en' },
        chat: { id: testChatId, type: 'private' as const },
        date: Date.now(),
        text: '/unknown_command'
      };

      await conversationHandler.handleMessage(mockMessage);

      expect(mockTelegramService.sendMessage).toHaveBeenCalled();
    });

    test('should handle invalid resume input', async () => {
      await mockSessionService.updateState(testUserId, 'waiting_resume');

      const mockMessage = {
        message_id: 7,
        from: { id: testUserId, first_name: 'Test', language_code: 'en' },
        chat: { id: testChatId, type: 'private' as const },
        date: Date.now(),
        text: 'a' // Too short
      };

      await conversationHandler.handleMessage(mockMessage);

      expect(mockTelegramService.sendMessage).toHaveBeenCalled();
    });
  });

  describe('Session Management', () => {
    const testUserId = 11111;
    const testChatId = 22222;

    test('should create new session for new users', async () => {
      const mockMessage = {
        message_id: 8,
        from: { id: testUserId, first_name: 'New User', language_code: 'en' },
        chat: { id: testChatId, type: 'private' as const },
        date: Date.now(),
        text: '/start'
      };

      await conversationHandler.handleMessage(mockMessage);

      const session = await mockSessionService.getSession(testUserId);
      expect(session).toBeDefined();
      expect(session?.userId).toBe(testUserId);
      expect(session?.chatId).toBe(testChatId);
      expect(session?.state).toBe('idle');
    });

    test('should handle /cancel command', async () => {
      // Set up a session in progress
      await mockSessionService.updateState(testUserId, 'waiting_job_post');

      const mockMessage = {
        message_id: 9,
        from: { id: testUserId, first_name: 'Test', language_code: 'en' },
        chat: { id: testChatId, type: 'private' as const },
        date: Date.now(),
        text: '/cancel'
      };

      await conversationHandler.handleMessage(mockMessage);

      expect(mockTelegramService.sendMessage).toHaveBeenCalled();

      const session = await mockSessionService.getSession(testUserId);
      expect(session?.state).toBe('completed');
    });
  });
});

// Helper function for manual testing
export async function runBotIntegrationTest() {
  console.log('🤖 Running manual bot integration test...');
  
  const testApiKey = process.env.OPENAI_API_KEY;
  const testBotToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!testApiKey || !testBotToken) {
    console.log('❌ Missing API keys for manual test');
    return false;
  }

  try {
    // This would be used for actual bot testing in a staging environment
    console.log('✅ Bot integration test setup complete');
    console.log('🔗 Use /test_resume_match command in your Telegram bot to test');
    return true;
  } catch (error) {
    console.error('❌ Bot integration test failed:', error);
    return false;
  }
}
