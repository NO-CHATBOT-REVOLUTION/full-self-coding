#!/usr/bin/env bun

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import {
  errorHandler,
  requestLogger,
  corsHandler,
  rateLimit,
  validateJSON,
  requestTimeout,
  healthCheck
} from './middleware/index.js';
import taskRoutes from './routes/tasks.js';
import stateRoutes from './routes/state.js';
import { globalStateManager } from './utils/globalStateManager.js';
import { TaskStorage } from './storage/taskStorage.js';

const app = express();
const PORT = process.env.PORT || 3002;

// Initialize storage
const taskStorage = new TaskStorage();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Custom middleware
app.use(requestLogger);
app.use(corsHandler);
app.use(validateJSON);
app.use(requestTimeout(5 * 60 * 1000)); // 5 minutes timeout

// Rate limiting (different limits for different routes)
const taskRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // 10 tasks per hour
  message: 'Too many task submissions, please try again later'
});

const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000, // 1000 requests per 15 minutes
  message: 'Too many requests, please try again later'
});

// Apply general rate limiting
app.use(apiRateLimit);

// Health check endpoint
app.get('/health', healthCheck);

// API routes
app.use('/api/tasks', taskRoutes);
app.use('/api/state', stateRoutes);

// Apply stricter rate limiting to task creation
app.post('/api/tasks', taskRateLimit);

// Root endpoint with API information
app.get('/', (req, res) => {
  res.json({
    name: 'Full Self Coding Server',
    version: '1.0.0',
    description: 'Server for automated code analysis and task execution',
    endpoints: {
      health: '/health',
      tasks: {
        create: 'POST /api/tasks',
        getProgress: 'GET /api/tasks/:taskId/progress',
        getResults: 'GET /api/tasks/:taskId/results',
        getHistory: 'GET /api/tasks',
        getDetails: 'GET /api/tasks/:taskId',
        getStatus: 'GET /api/tasks/:taskId/status',
        delete: 'DELETE /api/tasks/:taskId'
      },
      state: {
        query: 'GET /api/state',
        getStats: 'GET /api/state/stats',
        getKeys: 'GET /api/state/keys',
        getValue: 'GET /api/state/:key',
        setValue: 'POST /api/state/:key',
        updateValue: 'PUT /api/state/:key',
        deleteValue: 'DELETE /api/state/:key',
        cleanup: 'POST /api/state/cleanup',
        clearAll: 'DELETE /api/state'
      }
    },
    documentation: 'https://github.com/NO-CHATBOT-REVOLUTION/full-self-coding'
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    version: '1.0.0',
    title: 'Full Self Coding Server API',
    description: 'RESTful API for automated code analysis and task execution',
    base_url: `${req.protocol}://${req.get('host')}/api`,
    endpoints: {
      tasks: {
        description: 'Task management endpoints',
        methods: {
          'POST /tasks': 'Create a new analysis task',
          'GET /tasks': 'Get task history',
          'GET /tasks/:taskId': 'Get task details',
          'GET /tasks/:taskId/progress': 'Get task progress',
          'GET /tasks/:taskId/results': 'Get task results',
          'GET /tasks/:taskId/status': 'Get task status (lightweight)',
          'DELETE /tasks/:taskId': 'Delete a task'
        }
      },
      state: {
        description: 'Global state management endpoints',
        methods: {
          'GET /state': 'Query state entries',
          'GET /state/stats': 'Get state statistics',
          'GET /state/keys': 'Get all keys',
          'GET /state/:key': 'Get value by key',
          'POST /state/:key': 'Set value by key',
          'PUT /state/:key': 'Update value by key',
          'DELETE /state/:key': 'Delete value by key',
          'POST /state/cleanup': 'Clean up expired entries',
          'DELETE /state': 'Clear all entries'
        }
      }
    },
    examples: {
      create_task: {
        method: 'POST',
        url: '/api/tasks',
        body: {
          type: 'github_url',
          url: 'https://github.com/user/repo.git',
          config: {
            agentType: 'claude-code',
            maxDockerContainers: 5
          }
        }
      },
      get_progress: {
        method: 'GET',
        url: '/api/tasks/{taskId}/progress'
      },
      get_results: {
        method: 'GET',
        url: '/api/tasks/{taskId}/results'
      },
      set_state: {
        method: 'POST',
        url: '/api/state/mykey',
        body: {
          value: 'myvalue',
          ttl: 3600000,
          metadata: { source: 'api' }
        }
      }
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    available_routes: [
      'GET /',
      'GET /health',
      'GET /api',
      'POST /api/tasks',
      'GET /api/tasks',
      'GET /api/tasks/:id',
      'GET /api/tasks/:id/progress',
      'GET /api/tasks/:id/results',
      'DELETE /api/tasks/:id',
      'GET /api/state',
      'POST /api/state/:key',
      'GET /api/state/:key',
      'DELETE /api/state/:key'
    ]
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

  // Close the server
  server.close(() => {
    console.log('HTTP server closed');

    // Cleanup global state manager
    globalStateManager.destroy();
    console.log('Global state manager cleaned up');

    console.log('Graceful shutdown completed');
    process.exit(0);
  });

  // Force close after 30 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Full Self Coding Server started on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API docs: http://localhost:${PORT}/api`);
  console.log(`🗃️  Storage directory: ${taskStorage['storageDir'] || '~/.full-self-coding-server'}`);
  console.log(`⏱️  Rate limits: 10 tasks/hour, 1000 requests/15min`);
  console.log(`⚡ Powered by Bun runtime`);
});

// Handle process signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app;