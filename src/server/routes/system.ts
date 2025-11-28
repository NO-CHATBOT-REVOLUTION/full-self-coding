import { Router, Request, Response } from 'express';
import { serverState, createResponse } from '../utils';

const router = Router();

/**
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json(createResponse(true, {
    status: 'healthy',
    uptime: process.uptime(),
    tasks: serverState.tasks.size,
    codeAnalyzerStatus: serverState.codeAnalyzer.status,
    taskSolverManagerStatus: serverState.taskSolverManager.status
  }));
});

/**
 * Server status dashboard
 */
router.get('/dashboard', (req: Request, res: Response) => {
  try {
    const dashboard = {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      codeAnalyzer: serverState.codeAnalyzer,
      taskSolverManager: serverState.taskSolverManager,
      tasks: {
        total: serverState.tasks.size,
        pending: Array.from(serverState.tasks.values()).filter(t => t.status === 'pending').length,
        analyzing: Array.from(serverState.tasks.values()).filter(t => t.status === 'analyzing').length,
        analyzed: Array.from(serverState.tasks.values()).filter(t => t.status === 'analyzed').length,
        solving: Array.from(serverState.tasks.values()).filter(t => t.status === 'solving').length,
        completed: Array.from(serverState.tasks.values()).filter(t => t.status === 'completed').length,
        failed: Array.from(serverState.tasks.values()).filter(t => t.status === 'failed').length,
        stopped: Array.from(serverState.tasks.values()).filter(t => t.status === 'stopped').length
      }
    };

    res.json(createResponse(true, dashboard));

  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Emergency stop - stop all running components
 */
router.post('/emergency-stop', (req: Request, res: Response) => {
  try {
    const stoppedComponents: string[] = [];

    // Stop code analyzer
    if (serverState.codeAnalyzer.status === 'analyzing') {
      serverState.codeAnalyzer = {
        ...serverState.codeAnalyzer,
        status: 'stopped',
        completedAt: new Date()
      };
      stoppedComponents.push('codeAnalyzer');
    }

    // Stop task solver manager
    if (serverState.taskSolverManager.status === 'running') {
      const manager = serverState.taskSolverManager.manager;
      if (manager && typeof manager.stop === 'function') {
        manager.stop();
      }

      serverState.taskSolverManager = {
        ...serverState.taskSolverManager,
        status: 'stopped',
        completedAt: new Date()
      };
      stoppedComponents.push('taskSolverManager');
    }

    // Stop all running tasks
    for (const [taskId, task] of serverState.tasks.entries()) {
      if (task.status === 'analyzing' || task.status === 'solving') {
        task.status = 'stopped';
        task.completedAt = new Date();
        stoppedComponents.push(`task-${taskId}`);
      }
    }

    res.json(createResponse(true, {
      stoppedComponents,
      message: 'Emergency stop completed successfully'
    }));

  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Stop a specific task solver in emergency
 */
router.post('/emergency-stop/task-solver/:taskId', (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const task = serverState.tasks.get(taskId);

    if (!task) {
      return res.status(404).json(createResponse(false, null, 'Task not found'));
    }

    if (task.status !== 'solving') {
      return res.status(400).json(createResponse(false, null, 'Task is not currently solving'));
    }

    task.status = 'stopped';
    task.completedAt = new Date();
    serverState.tasks.set(taskId, task);

    res.json(createResponse(true, { taskId, status: 'stopped' }));

  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

export default router;