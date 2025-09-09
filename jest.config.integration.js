/**
 * Jest configuration for Integration Tests
 * Tests service integration with mocked external APIs
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'miniflare',
  displayName: '🔗 Integration Tests',
  
  // Test matching
  testMatch: [
    '**/tests/integration/**/*.test.ts',
    '**/src/**/*.integration.test.ts'
  ],
  
  // Coverage collection (less strict than unit tests)
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.unit.ts'
  ],
  
  // Coverage thresholds for integration tests
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Execution settings (slower than unit tests)
  maxWorkers: 1,
  testTimeout: 30000,
  cache: true,
  clearMocks: true,
  
  // Module handling
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/handlers/(.*)$': '<rootDir>/src/handlers/$1',
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/config/(.*)$': '<rootDir>/src/config/$1'
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/integration.setup.js'
  ],
  
  // Globals for TypeScript
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },
  
  // Miniflare environment configuration
  testEnvironmentOptions: {
    bindings: {
      TELEGRAM_BOT_TOKEN: 'test-token',
      OPENAI_API_KEY: 'test-key',
      WEBHOOK_SECRET: 'test-secret'
    },
    kvNamespaces: ['TEST_KV'],
    compatibilityDate: '2023-10-01'
  }
};
