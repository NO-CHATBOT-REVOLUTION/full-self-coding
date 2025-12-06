import { useState } from 'react';
import { Github, GitBranch, FolderOpen, Loader2, Play } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';
import type { CreateTaskRequest } from '../types/api';

interface TaskSubmissionProps {
  onSubmit: (request: CreateTaskRequest) => Promise<void>;
  isLoading: boolean;
  currentTaskId: string | null;
}

export function TaskSubmission({ onSubmit, isLoading, currentTaskId }: TaskSubmissionProps) {
  const [url, setUrl] = useState('');
  const [type, setType] = useState<'github_url' | 'git_url' | 'local_path'>('github_url');
  const [timeout, setTimeout] = useState<number>(300); // 5 minutes default
  const [maxTasks, setMaxTasks] = useState<number>(10);
  const [agentType, setAgentType] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      return;
    }

    const request: CreateTaskRequest = {
      type,
      url: url.trim(),
      config: showAdvanced ? {
        timeout: timeout > 0 ? timeout : undefined,
        maxTasks: maxTasks > 0 ? maxTasks : undefined,
        agentType: agentType.trim() || undefined,
      } : undefined,
    };

    await onSubmit(request);
  };

  const isActive = currentTaskId !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Github className="h-5 w-5" />
          <span>Submit Analysis Task</span>
        </CardTitle>
        <CardDescription>
          Enter a repository URL to start code analysis and task generation
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isActive && (
          <Alert className="mb-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <AlertDescription>
              You have an active task in progress. Check the Progress tab for updates.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Selection */}
          <div className="flex space-x-2">
            <Button
              type="button"
              variant={type === 'github_url' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setType('github_url')}
              className="flex items-center space-x-1"
            >
              <Github className="h-4 w-4" />
              <span>GitHub</span>
            </Button>
            <Button
              type="button"
              variant={type === 'git_url' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setType('git_url')}
              className="flex items-center space-x-1"
            >
              <GitBranch className="h-4 w-4" />
              <span>Git</span>
            </Button>
            <Button
              type="button"
              variant={type === 'local_path' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setType('local_path')}
              className="flex items-center space-x-1"
            >
              <FolderOpen className="h-4 w-4" />
              <span>Local</span>
            </Button>
          </div>

          {/* URL Input */}
          <div className="space-y-2">
            <label htmlFor="url" className="text-sm font-medium">
              Repository {type === 'local_path' ? 'Path' : 'URL'}
            </label>
            <Input
              id="url"
              type="text"
              placeholder={
                type === 'github_url'
                  ? 'https://github.com/username/repository'
                  : type === 'git_url'
                  ? 'https://git.example.com/username/repository'
                  : '/path/to/local/repository'
              }
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading || isActive}
              required
            />
          </div>

          {/* Advanced Settings */}
          <div className="space-y-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-gray-600 dark:text-gray-400"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
            </Button>
          </div>

          {showAdvanced && (
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="timeout" className="text-sm font-medium">
                    Timeout (seconds)
                  </label>
                  <Input
                    id="timeout"
                    type="number"
                    min="30"
                    max="3600"
                    value={timeout}
                    onChange={(e) => setTimeout(Number(e.target.value))}
                    disabled={isLoading || isActive}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="maxTasks" className="text-sm font-medium">
                    Max Tasks
                  </label>
                  <Input
                    id="maxTasks"
                    type="number"
                    min="1"
                    max="100"
                    value={maxTasks}
                    onChange={(e) => setMaxTasks(Number(e.target.value))}
                    disabled={isLoading || isActive}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="agentType" className="text-sm font-medium">
                  Agent Type (optional)
                </label>
                <Input
                  id="agentType"
                  type="text"
                  placeholder="e.g., claude-sonnet, gpt-4"
                  value={agentType}
                  onChange={(e) => setAgentType(e.target.value)}
                  disabled={isLoading || isActive}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || isActive || !url.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : isActive ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Task in Progress...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Analysis
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}