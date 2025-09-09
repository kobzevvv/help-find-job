/**
 * Jest configuration for Unit Tests
 * Fast tests with minimal setup and mocked dependencies
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  displayName: '🧪 Unit Tests',
  
  // Test matching
  testMatch: [
    '**/tests/unit/**/*.test.ts',
    '**/src/**/*.unit.test.ts'
  ],
  
  // Coverage collection
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/index.ts', // Entry point, tested via integration
    '!src/**/*.integration.ts'
  ],
  
  // Coverage thresholds for unit tests (should be high)
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Fast execution settings
  maxWorkers: '50%',
  cache: true,
  clearMocks: true,
  restoreMocks: true,
  
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
    '<rootDir>/tests/setup/unit.setup.js'
  ],
  
  // Globals for TypeScript
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  }
};
