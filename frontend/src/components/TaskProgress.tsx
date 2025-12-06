import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Loader2, CheckCircle, XCircle, Clock, GitBranch, FileCode } from 'lucide-react';
import type { TaskProgressResponse } from '../types/api';

interface TaskProgressProps {
  progress: TaskProgressResponse;
  taskId: string;
  onClear: () => void;
}

export function TaskProgress({ progress, taskId, onClear }: TaskProgressProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      case 'analyzing':
      case 'analyzed':
      case 'executing':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      case 'analyzing':
      case 'analyzed':
      case 'executing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatDuration = (createdAt: string, updatedAt: string) => {
    const start = new Date(createdAt);
    const end = new Date(updatedAt);
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);

    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  const isCompleted = progress.status === 'completed';
  const isFailed = progress.status === 'failed';
  const isRunning = ['pending', 'analyzing', 'analyzed', 'executing'].includes(progress.status);

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getStatusIcon(progress.status)}
              <CardTitle className={`capitalize ${getStatusColor(progress.status)}`}>
                {progress.status}
              </CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                ID: {taskId.slice(0, 8)}...
              </span>
              {(isCompleted || isFailed) && (
                <Button variant="outline" size="sm" onClick={onClear}>
                  Clear
                </Button>
              )}
            </div>
          </div>
          <CardDescription>
            Duration: {formatDuration(progress.createdAt, progress.updatedAt)}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Analyzer Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-lg">
            <FileCode className="h-5 w-5" />
            <span>Code Analyzer</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            <div className="flex items-center space-x-1">
              {getStatusIcon(progress.analyzerProgress.status)}
              <span className={`text-sm capitalize ${getStatusColor(progress.analyzerProgress.status)}`}>
                {progress.analyzerProgress.status}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {progress.analyzerProgress.progress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.analyzerProgress.progress}%` }}
              />
            </div>
          </div>

          {progress.analyzerProgress.currentStep && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Current: {progress.analyzerProgress.currentStep}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Solver Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-lg">
            <GitBranch className="h-5 w-5" />
            <span>Task Solver</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            <div className="flex items-center space-x-1">
              {getStatusIcon(progress.taskSolverProgress.status)}
              <span className={`text-sm capitalize ${getStatusColor(progress.taskSolverProgress.status)}`}>
                {progress.taskSolverProgress.status}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {progress.taskSolverProgress.totalTasks > 0
                  ? Math.round((progress.taskSolverProgress.completedTasks / progress.taskSolverProgress.totalTasks) * 100)
                  : 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${progress.taskSolverProgress.totalTasks > 0
                    ? (progress.taskSolverProgress.completedTasks / progress.taskSolverProgress.totalTasks) * 100
                    : 0}%`
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                {progress.taskSolverProgress.completedTasks}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Completed</div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                {progress.taskSolverProgress.failedTasks}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Failed</div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-lg font-semibold text-gray-600 dark:text-gray-400">
                {progress.taskSolverProgress.totalTasks}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
            </div>
          </div>

          {progress.taskSolverProgress.currentTask && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Current: {progress.taskSolverProgress.currentTask}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Messages */}
      {isCompleted && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-green-800 dark:text-green-200">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Analysis Completed Successfully!</span>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              Check the Results tab for detailed reports and code changes.
            </p>
          </CardContent>
        </Card>
      )}

      {isFailed && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-800 dark:text-red-200">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">Analysis Failed</span>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              The analysis encountered an error. Please check the server logs for more details.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}