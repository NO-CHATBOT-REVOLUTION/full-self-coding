import { Router, type request, type Response } from 'express';
import { serverState, createResponse, generateTaskId } from '../utils';
import analyzeCodebase from '../../analyzer';
import { readConfigWithEnv } from '../../configReader';
import { getGitRemoteUrls } from '../../utils/git';
import { globalStateManager } from '../state/globalStateManager';

const router = Router();

/**
 * Helper functions to update global state with analyzer status
 */
function updateAnalyzerStateInGlobalState(state: any) {
  try {
    globalStateManager.set('code_analyzer_status', state, {
      category: 'system',
      tags: ['analyzer', 'status'],
      description: 'Current state of the code analyzer',
      persistent: false
    });

    // Also update analyzer statistics
    globalStateManager.set('code_analyzer_stats', {
      totalRuns: globalStateManager.get('code_analyzer_stats')?.value?.totalRuns || 0,
      lastRun: new Date().toISOString(),
      currentTaskId: state.taskId,
      status: state.status
    }, {
      category: 'system',
      tags: ['analyzer', 'statistics'],
      persistent: true
    });

  } catch (error) {
    console.error('Failed to update analyzer state in global state:', error);
  }
}

function incrementAnalyzerStats(field: 'totalRuns' | 'successfulRuns' | 'failedRuns') {
  try {
    const stats = globalStateManager.get('code_analyzer_stats')?.value || {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      lastRun: null
    };

    stats[field] = (stats[field] || 0) + 1;
    stats.lastRun = new Date().toISOString();

    globalStateManager.set('code_analyzer_stats', stats, {
      category: 'system',
      tags: ['analyzer', 'statistics'],
      persistent: true
    });
  } catch (error) {
    console.error('Failed to increment analyzer stats:', error);
  }
}

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
    const analyzerState = {
      status: 'analyzing',
      taskId,
      directory,
      startedAt: new Date()
    };

    serverState.codeAnalyzer = analyzerState;

    // Update global state
    updateAnalyzerStateInGlobalState(analyzerState);
    incrementAnalyzerStats('totalRuns');

    // Start analysis in background
    setTimeout(async () => {
      try {
        // Update progress
        const analyzingState = {
          ...analyzerState,
          progress: 10,
          currentStep: 'Loading configuration',
          startedAt: new Date()
        };
        updateAnalyzerStateInGlobalState(analyzingState);

        const config = readConfigWithEnv();
        const { fetchUrl } = await getGitRemoteUrls(config.useGithubSSH);
        const gitRemoteUrl = fetchUrl || '';

        // Update progress - configuration loaded
        updateAnalyzerStateInGlobalState({
          ...analyzingState,
          progress: 20,
          currentStep: 'Git repository detected',
          gitRemoteUrl
        });

        const analysis = await analyzeCodebase(config, gitRemoteUrl);

        const completedState = {
          status: 'completed',
          taskId,
          analysis: { taskCount: analysis.length, directory },
          completedAt: new Date(),
          progress: 100,
          currentStep: 'Analysis completed'
        };

        serverState.codeAnalyzer = completedState;
        updateAnalyzerStateInGlobalState(completedState);
        incrementAnalyzerStats('successfulRuns');

        // Store analysis results in global state
        globalStateManager.set(`analysis_result_${taskId}`, {
          taskId,
          directory,
          gitRemoteUrl,
          taskCount: analysis.length,
          tasks: analysis,
          completedAt: new Date().toISOString()
        }, {
          category: 'analyzer',
          tags: ['results', 'completed'],
          description: `Analysis results for task ${taskId}`,
          ttl: 3600 // Keep for 1 hour
        });

      } catch (error) {
        const errorState = {
          status: 'error',
          taskId,
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
          progress: 0,
          currentStep: 'Analysis failed'
        };

        serverState.codeAnalyzer = errorState;
        updateAnalyzerStateInGlobalState(errorState);
        incrementAnalyzerStats('failedRuns');
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
 * Get analyzer data from global state
 */
router.get('/global-state', (req: Request, res: Response) => {
  try {
    const status = globalStateManager.get('code_analyzer_status');
    const stats = globalStateManager.get('code_analyzer_stats');

    res.json(createResponse(true, {
      currentStatus: status?.value || null,
      statistics: stats?.value || null,
      timestamp: new Date().toISOString()
    }));

  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Get analyzer history from global state
 */
router.get('/history', (req: Request, res: Response) => {
  try {
    const { limit } = req.query;

    // Query all analysis results
    const allResults = globalStateManager.query({
      category: 'analyzer',
      tags: ['results'],
      keyPattern: 'analysis_result_.*',
      limit: limit ? parseInt(limit as string) : 10
    });

    const stats = globalStateManager.get('code_analyzer_stats');

    res.json(createResponse(true, {
      results: allResults,
      statistics: stats?.value || null,
      totalResults: allResults.length,
      timestamp: new Date().toISOString()
    }));

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
    const stoppedState = {
      ...serverState.codeAnalyzer,
      status: 'stopped',
      completedAt: new Date(),
      progress: 0,
      currentStep: 'Analysis stopped by user'
    };

    serverState.codeAnalyzer = stoppedState;

    // Update global state
    updateAnalyzerStateInGlobalState(stoppedState);

    res.json(createResponse(true, { previousStatus, currentStatus: 'stopped' }));

  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

export default router;