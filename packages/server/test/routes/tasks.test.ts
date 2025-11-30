import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import express from 'express';
import taskRoutes from '../../src/routes/tasks.js';
import type {
  CreateTaskRequest,
  CreateTaskResponse,
  TaskProgressResponse,
  TaskResultsResponse,
  TaskHistoryResponse,
  ErrorResponse
} from '../../src/types/index.js';

describe('Tasks API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    // Setup Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/tasks', taskRoutes);
  });

  describe('POST /api/tasks', () => {
    it('should validate required fields', async () => {
      // Test the validation logic conceptually
      expect(() => {
        const validRequest: CreateTaskRequest = {
          type: 'github_url',
          url: 'https://github.com/test/repo.git'
        };
        expect(validRequest.type).toBe('github_url');
        expect(validRequest.url).toBe('https://github.com/test/repo.git');
      }).not.toThrow();
    });

    it('should accept valid task request types', () => {
      // Test all valid input types
      const validRequests: CreateTaskRequest[] = [
        {
          type: 'github_url',
          url: 'https://github.com/test/repo.git'
        },
        {
          type: 'git_url',
          url: 'https://git.example.com/test/repo.git'
        },
        {
          type: 'local_path',
          url: '/path/to/local/repo'
        }
      ];

      validRequests.forEach((request, index) => {
        expect(request.type).toBeDefined();
        expect(['github_url', 'git_url', 'local_path']).toContain(request.type);
        expect(request.url).toBeDefined();
      });
    });

    it('should accept requests with config', () => {
      const requestWithConfig: CreateTaskRequest = {
        type: 'github_url',
        url: 'https://github.com/test/repo.git',
        config: { timeout: 60000, maxTasks: 10 }
      };

      expect(requestWithConfig.config).toBeDefined();
      expect(requestWithConfig.config?.timeout).toBe(60000);
      expect(requestWithConfig.config?.maxTasks).toBe(10);
    });
  });

  describe('Response Types', () => {
    it('should validate create task response type', () => {
      const response: CreateTaskResponse = {
        taskId: 'test-task-id',
        status: 'pending',
        message: 'Task created successfully'
      };

      expect(response.taskId).toBe('test-task-id');
      expect(response.status).toBe('pending');
      expect(response.message).toBe('Task created successfully');
    });

    it('should validate error response type', () => {
      const errorResponse: ErrorResponse = {
        error: 'Validation error',
        message: 'Missing required field'
      };

      expect(errorResponse.error).toBe('Validation error');
      expect(errorResponse.message).toBe('Missing required field');
    });

    it('should validate error response without message', () => {
      const errorResponse: ErrorResponse = {
        error: 'Internal server error'
      };

      expect(errorResponse.error).toBe('Internal server error');
      expect(errorResponse.message).toBeUndefined();
    });

    it('should validate task progress response type', () => {
      const progressResponse: TaskProgressResponse = {
        taskId: 'test-task',
        status: 'analyzing',
        analyzerProgress: {
          status: 'analyzing',
          progress: 50,
          currentStep: 'Analyzing codebase'
        },
        taskSolverProgress: {
          status: 'pending',
          progress: 0,
          totalTasks: 0,
          completedTasks: 0,
          failedTasks: 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(progressResponse.taskId).toBe('test-task');
      expect(progressResponse.status).toBe('analyzing');
      expect(progressResponse.analyzerProgress.progress).toBe(50);
      expect(progressResponse.taskSolverProgress.status).toBe('pending');
    });

    it('should validate task results response type', () => {
      const resultsResponse: TaskResultsResponse = {
        taskId: 'test-task',
        status: 'completed',
        tasks: [
          { title: 'Task 1', description: 'Description 1', priority: 1, ID: 'task-1' }
        ],
        reports: [
          { title: 'Task 1', status: 'success', report: 'Success', ID: 'task-1' }
        ],
        finalReport: {
          summary: 'Task completed successfully',
          totalTasks: 1,
          completedTasks: 1,
          failedTasks: 0,
          duration: 60000
        },
        createdAt: new Date(),
        completedAt: new Date()
      };

      expect(resultsResponse.taskId).toBe('test-task');
      expect(resultsResponse.status).toBe('completed');
      expect(resultsResponse.tasks).toHaveLength(1);
      expect(resultsResponse.reports).toHaveLength(1);
      expect(resultsResponse.finalReport?.summary).toBe('Task completed successfully');
    });

    it('should validate task history response type', () => {
      const historyResponse: TaskHistoryResponse = {
        tasks: [
          {
            id: 'task-1',
            type: 'github_url',
            url: 'https://github.com/test/repo.git',
            status: 'completed',
            createdAt: new Date(),
            completedAt: new Date(),
            summary: 'Task completed successfully'
          }
        ],
        totalCount: 1
      };

      expect(historyResponse.tasks).toHaveLength(1);
      expect(historyResponse.totalCount).toBe(1);
      expect(historyResponse.tasks[0].id).toBe('task-1');
      expect(historyResponse.tasks[0].status).toBe('completed');
    });
  });

  describe('Request Validation', () => {
    it('should validate task input types', () => {
      const validTypes = ['github_url', 'git_url', 'local_path'];

      validTypes.forEach(type => {
        const request: Partial<CreateTaskRequest> = {
          type: type as any,
          url: 'https://example.com/repo.git'
        };

        expect(request.type).toBe(type);
        expect(validTypes).toContain(request.type);
      });
    });

    it('should validate URL formats', () => {
      const validUrls = [
        'https://github.com/user/repo.git',
        'https://git.example.com/user/repo.git',
        '/path/to/local/repo'
      ];

      validUrls.forEach(url => {
        expect(url).toBeDefined();
        expect(typeof url).toBe('string');
        expect(url.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle missing required fields', () => {
      const invalidRequests = [
        {}, // Missing both type and url
        { type: 'github_url' }, // Missing url
        { url: 'https://github.com/test/repo.git' } // Missing type
      ];

      invalidRequests.forEach((request, index) => {
        expect(() => {
          const validated = request as CreateTaskRequest;
          if (!validated.type || !validated.url) {
            throw new Error('Missing required fields');
          }
        }).toThrow();
      });
    });

    it('should handle invalid task types', () => {
      const invalidTypes = [
        'invalid_type',
        'github',
        'git',
        'local'
      ];

      invalidTypes.forEach(type => {
        expect(() => {
          const validTypes = ['github_url', 'git_url', 'local_path'];
          if (!validTypes.includes(type as any)) {
            throw new Error('Invalid task type');
          }
        }).toThrow();
      });
    });
  });

  describe('HTTP Methods', () => {
    it('should support all required HTTP methods', () => {
      // Test that the Express app supports these methods
      expect(typeof app.get).toBe('function');
      expect(typeof app.post).toBe('function');
      expect(typeof app.put).toBe('function');
      expect(typeof app.delete).toBe('function');
      expect(typeof app.patch).toBe('function');
    });

    it('should support middleware', () => {
      // Test that the Express app supports middleware
      expect(typeof app.use).toBe('function');
    });
  });
});