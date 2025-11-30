import { beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';

// Test configuration
global.testConfig = {
  testMode: true,
  mockWorkingDir: '/tmp/fsc-server-test',
  cleanupTimeout: 1000
};

// Global test setup
beforeAll(async () => {
  // Set up test environment
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'silent';

  // Clean up any existing test data
  await cleanupTestData();
});

// Global test cleanup
afterAll(async () => {
  // Clean up after all tests
  await cleanupTestData();
});

// Cleanup before each test
beforeEach(async () => {
  await cleanupTestData();
});

// Cleanup after each test
afterEach(async () => {
  await cleanupTestData();
});

async function cleanupTestData() {
  const fs = await import('fs-extra');
  const path = await import('path');

  const testDir = global.testConfig.mockWorkingDir;
  if (await fs.pathExists(testDir)) {
    await fs.remove(testDir);
  }
}

// Mock utilities for testing
global.createMockTaskState = (overrides = {}) => {
  return {
    id: 'test-task-id',
    input: {
      type: 'github_url',
      url: 'https://github.com/test/repo.git',
      config: {}
    },
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
    analyzerProgress: {
      status: 'pending',
      progress: 0,
      currentStep: 'Waiting to start'
    },
    taskSolverProgress: {
      status: 'pending',
      progress: 0,
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0
    },
    ...overrides
  };
};

global.createMockRequest = (overrides = {}) => {
  return {
    body: {
      type: 'github_url',
      url: 'https://github.com/test/repo.git',
      config: {}
    },
    params: {},
    query: {},
    ...overrides
  };
};

global.createMockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};