import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { CheckCircle, XCircle, FileText, GitBranch, Download, Eye, Code } from 'lucide-react';
import type { TaskResultsResponse } from '../types/api';

interface TaskResultsProps {
  results: TaskResultsResponse;
  taskId: string;
}

export function TaskResults({ results, taskId }: TaskResultsProps) {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [expandedDiff, setExpandedDiff] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
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
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatDuration = (duration: number) => {
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const handleDownloadDiff = (report: any, index: number) => {
    if (!report.gitDiff) return;

    const blob = new Blob([report.gitDiff], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title || `task-${index}`}-diff.patch`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderFinalReport = () => {
    if (!results.finalReport) return null;

    return (
      <Card className="mb-6 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-green-800 dark:text-green-200">
            <CheckCircle className="h-5 w-5" />
            <span>Analysis Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
              <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                {results.finalReport.totalTasks}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total Tasks</div>
            </div>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
              <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                {results.finalReport.completedTasks}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Completed</div>
            </div>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
              <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                {results.finalReport.failedTasks}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Failed</div>
            </div>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
              <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                {formatDuration(results.finalReport.duration)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Duration</div>
            </div>
          </div>

          {results.finalReport.summary && (
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium mb-2">Summary</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {results.finalReport.summary}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderReport = (report: any, index: number) => {
    const isExpanded = selectedReport === report.ID;
    const isDiffExpanded = expandedDiff === report.ID;

    return (
      <Card key={report.ID || index} className="mb-4">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                {getStatusIcon(report.status)}
                <CardTitle className="text-lg capitalize">{report.title}</CardTitle>
                <span className={`text-sm ${getStatusColor(report.status)}`}>
                  ({report.status})
                </span>
              </div>
              <CardDescription className="text-sm">
                Priority: {report.priority}
                {report.completedAt && (
                  <span className="ml-2">
                    Completed: {new Date(report.completedAt).toLocaleString()}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedReport(isExpanded ? null : report.ID)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              {report.gitDiff && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownloadDiff(report, index)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {report.description}
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Report</h4>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                  {report.report}
                </pre>
              </div>
            </div>

            {report.gitDiff && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium flex items-center space-x-1">
                    <GitBranch className="h-4 w-4" />
                    <span>Git Diff</span>
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedDiff(isDiffExpanded ? null : report.ID)}
                  >
                    <Code className="h-4 w-4" />
                  </Button>
                </div>
                {isDiffExpanded && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg max-h-96 overflow-auto">
                    <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                      {report.gitDiff}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Task Results</span>
          </CardTitle>
          <CardDescription>
            Task ID: {taskId} | Completed: {new Date(results.completedAt || results.createdAt).toLocaleString()}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Final Report */}
      {renderFinalReport()}

      {/* Task Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Task Reports ({results.reports.length})</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedReport(selectedReport ? null : 'all')}
            >
              {selectedReport ? 'Collapse All' : 'Expand All'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {results.reports.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No reports available for this task.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.reports.map((report, index) => renderReport(report, index))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}