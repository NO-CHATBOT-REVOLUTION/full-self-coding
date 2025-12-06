import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Trash2, Eye, RefreshCw, Github, GitBranch, FolderOpen, Search, Filter } from 'lucide-react';
import type { TaskHistoryItem } from '../types/api';

interface TaskHistoryProps {
  history: TaskHistoryItem[];
  onLoadTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  currentTaskId: string | null;
}

export function TaskHistory({ history, onLoadTask, onDeleteTask, onRefresh, currentTaskId }: TaskHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'github_url':
        return <Github className="h-4 w-4" />;
      case 'git_url':
        return <GitBranch className="h-4 w-4" />;
      case 'local_path':
        return <FolderOpen className="h-4 w-4" />;
      default:
        return <FolderOpen className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800';
      case 'failed':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800';
      case 'pending':
      case 'analyzing':
      case 'analyzed':
      case 'executing':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (start: string, end?: string) => {
    const startTime = new Date(start);
    const endTime = end ? new Date(end) : new Date();
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  const handleDelete = async (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      setIsDeleting(taskId);
      try {
        await onDeleteTask(taskId);
      } catch (error) {
        console.error('Failed to delete task:', error);
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const handleRefresh = async () => {
    try {
      await onRefresh();
    } catch (error) {
      console.error('Failed to refresh history:', error);
    }
  };

  // Filter history based on search term and filters
  const filteredHistory = history.filter((task) => {
    const matchesSearch = task.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.summary?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || task.type === filterType;
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const sortedHistory = [...filteredHistory].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Task History</CardTitle>
              <CardDescription>
                {history.length} total task{history.length !== 1 ? 's' : ''}
                {filteredHistory.length !== history.length && ` (${filteredHistory.length} filtered)`}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by URL or summary..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div className="flex space-x-2">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('all')}
              >
                All Types
              </Button>
              <Button
                variant={filterType === 'github_url' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('github_url')}
              >
                <Github className="h-4 w-4 mr-1" />
                GitHub
              </Button>
              <Button
                variant={filterType === 'git_url' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('git_url')}
              >
                <GitBranch className="h-4 w-4 mr-1" />
                Git
              </Button>
              <Button
                variant={filterType === 'local_path' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('local_path')}
              >
                <FolderOpen className="h-4 w-4 mr-1" />
                Local
              </Button>
            </div>

            {/* Status Filter */}
            <div className="flex space-x-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('all')}
              >
                All Status
              </Button>
              <Button
                variant={filterStatus === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('completed')}
              >
                Completed
              </Button>
              <Button
                variant={filterStatus === 'failed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('failed')}
              >
                Failed
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History List */}
      <Card>
        <CardContent className="p-0">
          {sortedHistory.length === 0 ? (
            <div className="text-center py-12">
              {history.length === 0 ? (
                <>
                  <div className="w-16 h-16 mx-auto bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                    <Github className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No tasks yet
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Submit your first task to see it appear here.
                  </p>
                </>
              ) : (
                <>
                  <Filter className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No matching tasks
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Try adjusting your search terms or filters.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setFilterType('all');
                      setFilterStatus('all');
                    }}
                  >
                    Clear filters
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {sortedHistory.map((task) => (
                <div key={task.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        {getTypeIcon(task.type)}
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                        {currentTaskId === task.id && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            Current
                          </span>
                        )}
                      </div>

                      <div className="mb-2">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {task.url}
                        </h4>
                        {task.summary && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                            {task.summary}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>ID: {task.id.slice(0, 8)}...</span>
                        <span>Created: {formatDate(task.createdAt)}</span>
                        {task.completedAt && (
                          <span>Completed: {formatDate(task.completedAt)}</span>
                        )}
                        <span>Duration: {formatDuration(task.createdAt, task.completedAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onLoadTask(task.id)}
                        disabled={currentTaskId === task.id}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(task.id)}
                        disabled={isDeleting === task.id || currentTaskId === task.id}
                      >
                        {isDeleting === task.id ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}