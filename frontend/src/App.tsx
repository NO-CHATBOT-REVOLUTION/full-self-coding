import { useState } from 'react';
import { useTaskManager } from './hooks/useTaskManager';
import { TaskSubmission } from './components/TaskSubmission';
import { TaskProgress } from './components/TaskProgress';
import { TaskResults } from './components/TaskResults';
import { TaskHistory } from './components/TaskHistory';
import { Header } from './components/Header';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ServerStatus } from './components/ServerStatus';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Alert, AlertDescription } from './components/ui/alert';
import { Loader2, Github, GitBranch, FolderOpen } from 'lucide-react';

function App() {
  const {
    currentTask,
    history,
    isLoading,
    error,
    createTask,
    loadTask,
    deleteTask,
    clearCurrentTask,
    clearError,
    fetchTaskHistory,
    isTaskActive,
    hasTaskResults,
    taskReports,
    taskFinalReport,
  } = useTaskManager();

  const [activeTab, setActiveTab] = useState('submit');

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Header */}
          <Header />

          {/* Server Status */}
          <ServerStatus />

          {/* Error Display */}
          {error && (
            <Alert className="mb-6" variant="destructive">
              <AlertDescription>{error}</AlertDescription>
              <button
                onClick={clearError}
                className="ml-4 underline hover:no-underline"
              >
                Dismiss
              </button>
            </Alert>
          )}

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="submit">Submit Task</TabsTrigger>
              <TabsTrigger value="progress" disabled={!currentTask.id}>
                Progress
                {isTaskActive && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              </TabsTrigger>
              <TabsTrigger value="results" disabled={!hasTaskResults}>
                Results
                {hasTaskResults && (
                  <span className="ml-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    {taskReports.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="history">
                History
                {history.length > 0 && (
                  <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                    {history.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Submit Task Tab */}
            <TabsContent value="submit" className="space-y-6">
              <TaskSubmission
                onSubmit={createTask}
                isLoading={isLoading}
                currentTaskId={currentTask.id}
              />
            </TabsContent>

            {/* Progress Tab */}
            <TabsContent value="progress" className="space-y-6">
              {currentTask.progress ? (
                <TaskProgress
                  progress={currentTask.progress}
                  taskId={currentTask.id}
                  onClear={clearCurrentTask}
                />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>No Active Task</CardTitle>
                    <CardDescription>
                      Submit a new task to see its progress here.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Loader2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">
                        No task is currently being processed.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Results Tab */}
            <TabsContent value="results" className="space-y-6">
              {hasTaskResults && currentTask.results ? (
                <TaskResults
                  results={currentTask.results}
                  taskId={currentTask.id}
                />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>No Results Available</CardTitle>
                    <CardDescription>
                      Task results will appear here once a task is completed.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                        <GitBranch className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-600 dark:text-gray-400">
                        No task results available yet.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-6">
              <TaskHistory
                history={history}
                onLoadTask={loadTask}
                onDeleteTask={deleteTask}
                onRefresh={fetchTaskHistory}
                currentTaskId={currentTask.id}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
