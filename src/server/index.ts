import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { createResponse } from './utils';

// Import routes
import tasksRoutes from './routes/tasks';
import analyzerRoutes from './routes/analyzer';
import taskSolverRoutes from './routes/taskSolver';
import workspaceRoutes from './routes/workspace';
import systemRoutes from './routes/system';
import githubAnalyzerRoutes from './routes/githubAnalyzer';
import globalStateRoutes from './routes/globalState';

export function startServer(port: number = 3000) {
  // Create Express app
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Health check endpoint (for backwards compatibility)
  app.get('/health', (req, res) => {
    res.json(createResponse(true, {
      status: 'healthy',
      uptime: process.uptime(),
      server: 'Full Self-Coding API Server',
      version: '1.0.0'
    }));
  });

  // API Routes
  app.use('/api/tasks', tasksRoutes);
  app.use('/api/analyzer', analyzerRoutes);
  app.use('/api/task-solver', taskSolverRoutes);
  app.use('/api/workspace', workspaceRoutes);
  app.use('/api/github-analyzer', githubAnalyzerRoutes);
  app.use('/api/global-state', globalStateRoutes);
  app.use('/api', systemRoutes);

  // Error handling middleware
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json(createResponse(false, null, 'Internal server error'));
  });

  // 404 handler
  app.use((req: express.Request, res: express.Response) => {
    res.status(404).json(createResponse(false, null, 'Endpoint not found'));
  });

  // Start HTTP server
  const httpServer = createServer(app);

  httpServer.listen(port, () => {
    console.log(`🚀 Full Self-Coding Server running on http://localhost:${port}`);
    console.log(`📊 Dashboard: http://localhost:${port}/api/dashboard`);
    console.log(`🏥 Health Check: http://localhost:${port}/health`);
    console.log(`📚 API Documentation: https://github.com/your-repo/full-self-coding/blob/main/API_DOCUMENTATION.md`);
  });

  return httpServer;
}