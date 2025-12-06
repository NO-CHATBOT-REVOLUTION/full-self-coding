import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import type {
  CreateTaskRequest,
  TaskProgressResponse,
  TaskResultsResponse,
  TaskHistoryResponse,
  TaskHistoryItem,
  TaskReport
} from '../types/api';

interface TaskManagerState {
  currentTask: {
    id: string | null;
    progress: TaskProgressResponse | null;
    results: TaskResultsResponse | null;
  };
  history: TaskHistoryItem[];
  isLoading: boolean;
  error: string | null;
}

export function useTaskManager() {
  const [state, setState] = useState<TaskManagerState>({
    currentTask: {
      id: null,
      progress: null,
      results: null,
    },
    history: [],
    isLoading: false,
    error: null,
  });

  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Create a new task
  const createTask = useCallback(async (request: CreateTaskRequest) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiService.createTask(request);

      setState(prev => ({
        ...prev,
        currentTask: {
          ...prev.currentTask,
          id: response.taskId,
          progress: null,
          results: null,
        },
        isLoading: false,
      }));

      // Start polling for progress
      startPollingProgress(response.taskId);

      return response;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create task',
      }));
      throw error;
    }
  }, []);

  // Start polling task progress
  const startPollingProgress = useCallback((taskId: string) => {
    // Clear any existing polling
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    let pollCount = 0;
    let currentInterval = 2000; // Start with 2 seconds
    const maxInterval = 10000; // Max 10 seconds
    const backoffMultiplier = 1.5;

    const poll = async () => {
      try {
        const progress = await apiService.getTaskProgress(taskId);

        setState(prev => ({
          ...prev,
          currentTask: {
            ...prev.currentTask,
            progress,
          },
        }));

        // If task is completed or failed, fetch results and stop polling
        if (progress.status === 'completed' || progress.status === 'failed') {
          // Clear the interval directly instead of calling stopPolling
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }

          const results = await apiService.getTaskResults(taskId);

          setState(prev => ({
            ...prev,
            currentTask: {
              ...prev.currentTask,
              results,
            },
          }));

          // Refresh history to include the completed task (only if needed)
          // Don't fetch history if we just completed a task to avoid rate limiting
          return;
        }

        pollCount++;

        // Implement exponential backoff
        // After 10 polls (20 seconds), increase interval
        if (pollCount > 10) {
          currentInterval = Math.min(currentInterval * backoffMultiplier, maxInterval);

          // Clear current interval and set new one
          if (pollingInterval) {
            clearInterval(pollingInterval);
          }
          const newInterval = setInterval(poll, currentInterval);
          setPollingInterval(newInterval);
        }
      } catch (error) {
        console.error('Error polling task progress:', error);

        // If we hit rate limiting, back off more aggressively
        if (error instanceof Error && error.message.includes('Too many requests')) {
          currentInterval = Math.min(currentInterval * 2, maxInterval);

          if (pollingInterval) {
            clearInterval(pollingInterval);
          }
          const newInterval = setInterval(poll, currentInterval);
          setPollingInterval(newInterval);
        }
      }
    };

    // Initial poll
    poll();

    // Set up regular polling
    const interval = setInterval(poll, currentInterval);
    setPollingInterval(interval);
  }, [pollingInterval]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [pollingInterval]);

  // Fetch task history
  const fetchTaskHistory = useCallback(async (limit?: number, offset?: number) => {
    try {
      const history = await apiService.getTaskHistory(limit, offset);
      setState(prev => ({
        ...prev,
        history: history.tasks,
      }));
    } catch (error) {
      console.error('Error fetching task history:', error);
      // Only set error state if it's not a "No such file or directory" error
      // (which is handled gracefully by the API service)
      if (!(error instanceof Error && error.message.includes('No such file or directory'))) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to fetch task history',
        }));
      }
    }
  }, []);

  // Load task by ID
  const loadTask = useCallback(async (taskId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const [progress, results] = await Promise.all([
        apiService.getTaskProgress(taskId),
        apiService.getTaskResults(taskId).catch(() => null), // Results might not be available yet
      ]);

      setState(prev => ({
        ...prev,
        currentTask: {
          id: taskId,
          progress,
          results,
        },
        isLoading: false,
      }));

      // If task is still running, start polling
      if (progress.status === 'pending' || progress.status === 'analyzing' || progress.status === 'analyzed' || progress.status === 'executing') {
        startPollingProgress(taskId);
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load task',
      }));
    }
  }, [startPollingProgress]);

  // Clear current task
  const clearCurrentTask = useCallback(() => {
    stopPolling();
    setState(prev => ({
      ...prev,
      currentTask: {
        id: null,
        progress: null,
        results: null,
      },
      error: null,
    }));
  }, [stopPolling]);

  // Delete task
  const deleteTask = useCallback(async (taskId: string) => {
    try {
      await apiService.deleteTask(taskId);

      // If this is the current task, clear it
      if (state.currentTask.id === taskId) {
        clearCurrentTask();
      }

      // Refresh history
      await fetchTaskHistory();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to delete task',
      }));
      throw error;
    }
  }, [state.currentTask.id, clearCurrentTask, fetchTaskHistory]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Initial load of task history with delay to avoid rate limiting
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTaskHistory();
    }, 1000); // Wait 1 second before initial fetch

    return () => clearTimeout(timer);
  }, [fetchTaskHistory]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    // State
    currentTask: state.currentTask,
    history: state.history,
    isLoading: state.isLoading,
    error: state.error,

    // Actions
    createTask,
    loadTask,
    deleteTask,
    clearCurrentTask,
    clearError,
    fetchTaskHistory,

    // Computed values
    isTaskActive: !!state.currentTask.id && !!pollingInterval,
    hasTaskResults: !!state.currentTask.results,
    taskReports: state.currentTask.results?.reports || [],
    taskFinalReport: state.currentTask.results?.finalReport,
  };
}