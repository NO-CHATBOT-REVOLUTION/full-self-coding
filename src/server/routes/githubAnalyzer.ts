import { Router, Request, Response } from 'express';
import { serverState, createResponse, generateTaskId, validateGitUrl, extractProjectNameFromUrl } from '../utils';
import analyzeCodebase from '../../analyzer';
import { TaskSolverManager } from '../../taskSolverManager';
import { readConfigWithEnv } from '../../configReader';
import { CodeCommitter } from '../../codeCommitter';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { getYYMMDDHHMMSS } from '../../utils/getDateAndTime';

const router = Router();

/**
 * Analyze GitHub repository end-to-end
 * Input: GitHub URL
 * Output: Final report with all tasks solved
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { githubUrl } = req.body;

    if (!githubUrl) {
      return res.status(400).json(createResponse(false, null, 'GitHub URL is required'));
    }

    if (!validateGitUrl(githubUrl)) {
      return res.status(400).json(createResponse(false, null, 'Invalid GitHub URL format'));
    }

    // Generate unique task ID for this analysis
    const taskId = generateTaskId();

    // Initialize analysis state
    serverState.githubAnalyzer = {
      status: 'initializing',
      taskId,
      githubUrl,
      startedAt: new Date()
    };

    // Start analysis in background
    setTimeout(async () => {
      try {
        await performGitHubAnalysis(taskId, githubUrl);
      } catch (error) {
        serverState.githubAnalyzer = {
          status: 'error',
          taskId,
          githubUrl,
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date()
        };
      }
    }, 100);

    res.json(createResponse(true, {
      taskId,
      status: 'initializing',
      message: 'GitHub repository analysis started'
    }));

  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Get analysis progress and status
 */
router.get('/status', (req: Request, res: Response) => {
  try {
    const analysis = serverState.githubAnalyzer;
    if (!analysis || analysis.status === 'idle') {
      return res.status(404).json(createResponse(false, null, 'No analysis in progress'));
    }

    res.json(createResponse(true, analysis));

  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Get final analysis report
 */
router.get('/report', (req: Request, res: Response) => {
  try {
    const analysis = serverState.githubAnalyzer;
    if (!analysis || analysis.status !== 'completed') {
      return res.status(400).json(createResponse(false, null, 'Analysis not completed yet'));
    }

    res.json(createResponse(true, {
      taskId: analysis.taskId,
      githubUrl: analysis.githubUrl,
      reports: analysis.reports,
      summary: analysis.summary,
      startedAt: analysis.startedAt,
      completedAt: analysis.completedAt
    }));

  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Stop ongoing analysis
 */
router.post('/stop', (req: Request, res: Response) => {
  try {
    const analysis = serverState.githubAnalyzer;
    if (!analysis || analysis.status !== 'running') {
      return res.status(400).json(createResponse(false, null, 'No analysis in progress to stop'));
    }

    serverState.githubAnalyzer = {
      ...analysis,
      status: 'stopped',
      completedAt: new Date()
    };

    res.json(createResponse(true, {
      taskId: analysis.taskId,
      previousStatus: 'running',
      currentStatus: 'stopped'
    }));

  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Perform the complete GitHub repository analysis
 */
async function performGitHubAnalysis(taskId: string, githubUrl: string) {
  try {
    const projectName = extractProjectNameFromUrl(githubUrl);
    const tempDir = path.join(process.env.TMPDIR || '/tmp', `fsc-${projectName}-${taskId}`);

    // Update status: Cloning repository
    serverState.githubAnalyzer = {
      status: 'cloning',
      taskId,
      githubUrl,
      tempDir,
      progress: 10
    };

    // Clone the repository
    await cloneRepository(githubUrl, tempDir);

    // Update status: Analyzing codebase
    serverState.githubAnalyzer = {
      status: 'analyzing',
      taskId,
      githubUrl,
      tempDir,
      progress: 30
    };

    // Load configuration
    const config = readConfigWithEnv();

    // Change to repository directory for analysis
    const originalCwd = process.cwd();
    process.chdir(tempDir);

    try {
      // Analyze the codebase
      const tasks = await analyzeCodebase(config, githubUrl);

      // Update status: Solving tasks
      serverState.githubAnalyzer = {
        status: 'solving',
        taskId,
        githubUrl,
        tempDir,
        progress: 50,
        taskCount: tasks.length
      };

      // Create task solver manager and solve tasks
      const taskSolverManager = new TaskSolverManager(config, githubUrl);
      for (const task of tasks) {
        taskSolverManager.addTask(task);
      }

      await taskSolverManager.start();
      const allTaskReports = taskSolverManager.getReports();

      // Update status: Committing changes
      serverState.githubAnalyzer = {
        status: 'committing',
        taskId,
        githubUrl,
        tempDir,
        progress: 80,
        taskCount: tasks.length
      };

      // Commit all changes
      const codeCommitter = new CodeCommitter(allTaskReports);
      await codeCommitter.commitAllChanges();

      // Update status: Generating report
      serverState.githubAnalyzer = {
        status: 'generating_report',
        taskId,
        githubUrl,
        tempDir,
        progress: 90,
        taskCount: tasks.length
      };

      // Generate final report
      const summary = generateSummary(allTaskReports, githubUrl);

      // Save final report
      const reportPath = await saveFinalReport(allTaskReports, taskId, githubUrl);

      // Cleanup temporary directory
      cleanup(tempDir);

      // Mark as completed
      serverState.githubAnalyzer = {
        status: 'completed',
        taskId,
        githubUrl,
        reports: allTaskReports,
        summary,
        reportPath,
        taskCount: tasks.length,
        progress: 100,
        completedAt: new Date()
      };

    } finally {
      // Change back to original directory
      process.chdir(originalCwd);
    }

  } catch (error) {
    console.error('Error in GitHub analysis:', error);
    serverState.githubAnalyzer = {
      status: 'error',
      taskId,
      githubUrl,
      error: error instanceof Error ? error.message : 'Unknown error',
      completedAt: new Date()
    };
  }
}

/**
 * Clone a GitHub repository to the specified directory
 */
async function cloneRepository(githubUrl: string, targetDir: string): Promise<void> {
  try {
    // Remove target directory if it exists
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }

    // Clone the repository
    execSync(`git clone ${githubUrl} "${targetDir}"`, { stdio: 'pipe' });

    if (!fs.existsSync(targetDir)) {
      throw new Error('Failed to clone repository');
    }

  } catch (error) {
    throw new Error(`Failed to clone repository ${githubUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a summary of the analysis results
 */
function generateSummary(reports: any[], githubUrl: string): any {
  const totalTasks = reports.length;
  const successfulTasks = reports.filter(report => report.success).length;
  const failedTasks = totalTasks - successfulTasks;

  return {
    repository: githubUrl,
    totalTasks,
    successfulTasks,
    failedTasks,
    successRate: totalTasks > 0 ? (successfulTasks / totalTasks * 100).toFixed(2) + '%' : '0%',
    analyzedAt: new Date().toISOString()
  };
}

/**
 * Save final report to file
 */
async function saveFinalReport(reports: any[], taskId: string, githubUrl: string): Promise<string> {
  try {
    const logDir = process.env.HOME + "/Library/Logs/full-self-coding";

    // Create directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const timestamp = getYYMMDDHHMMSS();
    const projectName = extractProjectNameFromUrl(githubUrl);
    const reportPath = path.join(logDir, `github-analysis-${projectName}-${taskId}-${timestamp}.txt`);

    const reportContent = {
      taskId,
      githubUrl,
      analyzedAt: new Date().toISOString(),
      summary: generateSummary(reports, githubUrl),
      reports: reports
    };

    fs.writeFileSync(reportPath, JSON.stringify(reportContent, null, 2));
    return reportPath;

  } catch (error) {
    console.error('Failed to save report:', error);
    return '';
  }
}

/**
 * Clean up temporary files and directories
 */
function cleanup(tempDir: string): void {
  try {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.error('Failed to cleanup temporary directory:', error);
  }
}

export default router;