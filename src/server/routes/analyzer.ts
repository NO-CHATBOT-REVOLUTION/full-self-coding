import { Router, Request, Response } from 'express';
import { serverState, createResponse, generateTaskId } from '../utils';
import analyzeCodebase from '../../analyzer';
import { readConfigWithEnv } from '../../configReader';
import { getGitRemoteUrls } from '../../utils/git';

const router = Router();

/**
 * Start code analyzer
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { directory } = req.body;

    if (serverState.codeAnalyzer.status !== 'idle') {
      return res.status(400).json(createResponse(false, null, 'Code analyzer is already running'));
    }

    const taskId = generateTaskId();
    serverState.codeAnalyzer = {
      status: 'analyzing',
      taskId,
      startedAt: new Date()
    };

    // Start analysis in background
    setTimeout(async () => {
      try {
        const config = readConfigWithEnv();
        const { fetchUrl } = await getGitRemoteUrls(config.useGithubSSH);
        const gitRemoteUrl = fetchUrl || '';

        const analysis = await analyzeCodebase(config, gitRemoteUrl);

        serverState.codeAnalyzer = {
          status: 'completed',
          taskId,
          analysis: { taskCount: analysis.length, directory },
          completedAt: new Date()
        };

      } catch (error) {
        serverState.codeAnalyzer = {
          status: 'error',
          taskId,
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date()
        };
      }
    }, 100);

    res.json(createResponse(true, { taskId, status: 'analyzing' }));

  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Read code analyzer report
 */
router.get('/report', (req: Request, res: Response) => {
  try {
    if (serverState.codeAnalyzer.status !== 'completed') {
      return res.status(400).json(createResponse(false, null, 'No completed analysis available'));
    }

    res.json(createResponse(true, serverState.codeAnalyzer));

  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Get code analyzer status
 */
router.get('/status', (req: Request, res: Response) => {
  try {
    res.json(createResponse(true, serverState.codeAnalyzer));

  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Stop code analyzer
 */
router.post('/stop', (req: Request, res: Response) => {
  try {
    if (serverState.codeAnalyzer.status !== 'analyzing') {
      return res.status(400).json(createResponse(false, null, 'Code analyzer is not currently running'));
    }

    const previousStatus = serverState.codeAnalyzer.status;
    serverState.codeAnalyzer = {
      ...serverState.codeAnalyzer,
      status: 'stopped',
      completedAt: new Date()
    };

    res.json(createResponse(true, { previousStatus, currentStatus: 'stopped' }));

  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

export default router;