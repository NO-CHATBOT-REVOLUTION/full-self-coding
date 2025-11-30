import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

// Global test setup
console.log('🧪 Setting up test environment...');

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  // Optional: Mock console methods for cleaner test output
  // console.log = () => {};
  // console.error = () => {};
  // console.warn = () => {};
});

afterEach(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Export test utilities for reuse
export { describe, it, expect, beforeEach, afterEach };

// Export common test helpers
export const createMockTaskState = (overrides = {}) => ({
  id: 'test-task-id',
  status: 'pending' as const,
  input: {
    type: 'github_url' as const,
    url: 'https://github.com/test/repo.git'
  },
  analyzerProgress: {
    status: 'pending' as const,
    progress: 0
  },
  taskSolverProgress: {
    status: 'pending' as const,
    progress: 0,
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export const createMockCreateTaskRequest = (overrides = {}) => ({
  type: 'github_url' as const,
  url: 'https://github.com/test/repo.git',
  ...overrides
});

console.log('✅ Test environment setup complete');