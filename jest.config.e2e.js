/**
 * Jest configuration for End-to-End Tests
 * Full workflow testing with compiled code and external services
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  displayName: '🌐 E2E Tests',
  
  // Test matching
  testMatch: [
    '**/tests/e2e/**/*.test.ts'
  ],
  
  // No coverage collection for E2E tests (tested via integration)
  collectCoverage: false,
  
  // Execution settings (slowest tests)
  maxWorkers: 1,
  testTimeout: 120000, // 2 minutes for AI API calls
  cache: false, // Don't cache E2E results
  clearMocks: true,
  
  // Module handling - prefer compiled dist files
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/dist/$1',
    '^@/types/(.*)$': '<rootDir>/dist/types/$1',
    '^@/handlers/(.*)$': '<rootDir>/dist/handlers/$1',
    '^@/services/(.*)$': '<rootDir>/dist/services/$1',
    '^@/utils/(.*)$': '<rootDir>/dist/utils/$1',
    '^@/config/(.*)$': '<rootDir>/dist/config/$1'
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/e2e.setup.js'
  ],
  
  // Globals for TypeScript
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },
  
  // E2E specific settings
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  
  // Environment variables for E2E tests
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  }
};
