import React, { useState, useEffect } from 'react';
import { Activity, Github, Play, Square, CheckCircle, AlertCircle, Clock, FileText, Folder, BarChart3, History, Settings, TrendingUp, Calendar, GitBranch } from 'lucide-react';
import { usePolling } from '../hooks/usePolling';
import apiService from '../services/api';
import type { GitHubAnalyzerState, GitHubAnalysisReport } from '../types';
import { useAnalyzer } from '../contexts/AnalyzerContext';

export default function AnalyzerPage() {
  const [activeTab, setActiveTab] = useState<'github' | 'local' | 'stats'>('github');

  // Use global analyzer state from context
  const { state: globalAnalyzerState } = useAnalyzer();

  // GitHub Analysis State (still local since it's separate from local analyzer)
  const [githubUrl, setGithubUrl] = useState('');
  const [isGitHubAnalyzing, setIsGitHubAnalyzing] = useState(false);
  const [githubAnalysisStatus, setGithubAnalysisStatus] = useState<GitHubAnalyzerState | null>(null);
  const [githubAnalysisReport, setGithubAnalysisReport] = useState<GitHubAnalysisReport | null>(null);
  const [githubError, setGithubError] = useState('');

  // Local analyzer inputs (still local)
  const [directory, setDirectory] = useState('');
  const [analyzerError, setAnalyzerError] = useState('');

  // Poll for GitHub analysis status when analyzing
  const { data: githubStatusData } = usePolling(
    () => apiService.getGitHubAnalysisStatus(),
    2000, // Poll every 2 seconds
    isGitHubAnalyzing && !githubAnalysisStatus?.error
  );

  // Handle GitHub analysis status updates
  useEffect(() => {
    if (githubStatusData) {
      setGithubAnalysisStatus(githubStatusData);
      setIsGitHubAnalyzing(githubStatusData.status !== 'completed' && githubStatusData.status !== 'error' && githubStatusData.status !== 'stopped');

      // If completed, fetch the report
      if (githubStatusData.status === 'completed') {
        fetchGitHubAnalysisReport();
      }

      // If error, set error message
      if (githubStatusData.status === 'error') {
        setGithubError(githubStatusData.error || 'GitHub analysis failed');
      }
    }
  }, [githubStatusData]);

  // GitHub Analysis Handlers
  const handleStartGitHubAnalysis = async () => {
    if (!githubUrl.trim()) {
      setGithubError('Please enter a GitHub URL');
      return;
    }

    // Basic GitHub URL validation
    const githubUrlPattern = /^https:\/\/github\.com\/[^\/]+\/[^\/]+(\.git)?$/;
    if (!githubUrlPattern.test(githubUrl)) {
      setGithubError('Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo)');
      return;
    }

    try {
      setGithubError('');
      setGithubAnalysisReport(null);
      setGithubAnalysisStatus(null);

      const response = await apiService.startGitHubAnalysis({ githubUrl });
      setIsGitHubAnalyzing(true);
      setGithubAnalysisStatus({
        status: 'initializing',
        taskId: response.taskId,
        githubUrl,
        startedAt: new Date().toISOString()
      });
    } catch (err) {
      setGithubError(err instanceof Error ? err.message : 'Failed to start GitHub analysis');
    }
  };

  const handleStopGitHubAnalysis = async () => {
    try {
      await apiService.stopGitHubAnalysis();
      setIsGitHubAnalyzing(false);
    } catch (err) {
      setGithubError(err instanceof Error ? err.message : 'Failed to stop GitHub analysis');
    }
  };

  const fetchGitHubAnalysisReport = async () => {
    try {
      const report = await apiService.getGitHubAnalysisReport();
      setGithubAnalysisReport(report);
    } catch (err) {
      console.error('Failed to fetch GitHub analysis report:', err);
    }
  };

  // Local Analyzer Handlers
  const handleStartLocalAnalysis = async () => {
    if (!directory.trim()) {
      setAnalyzerError('Please enter a directory path');
      return;
    }

    try {
      setAnalyzerError('');
      const response = await apiService.startAnalyzer(directory);
      console.log('Local analysis started:', response);
    } catch (err) {
      setAnalyzerError(err instanceof Error ? err.message : 'Failed to start local analysis');
    }
  };

  const handleStopLocalAnalysis = async () => {
    try {
      await apiService.stopAnalyzer();
    } catch (err) {
      setAnalyzerError(err instanceof Error ? err.message : 'Failed to stop local analysis');
    }
  };

  // Helper functions
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="text-success" size={20} />;
      case 'error': return <AlertCircle className="text-error" size={20} />;
      case 'stopped': return <Square className="text-warning" size={20} />;
      case 'analyzing': return <Clock className="text-primary animate-spin" size={20} />;
      default: return <Clock className="text-secondary" size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-success';
      case 'error': return 'text-error';
      case 'stopped': return 'text-warning';
      case 'analyzing': return 'text-primary';
      default: return 'text-secondary';
    }
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const durationMs = end.getTime() - start.getTime();
    const durationSec = Math.floor(durationMs / 1000);
    const minutes = Math.floor(durationSec / 60);
    const seconds = durationSec % 60;
    return `${minutes}m ${seconds}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={24} />
          <h1 className="text-2xl font-bold">Code Analyzer</h1>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('github')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'github'
              ? 'border-primary text-primary'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <Github size={16} className="inline mr-2" />
          GitHub Analysis
        </button>
        <button
          onClick={() => setActiveTab('local')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'local'
              ? 'border-primary text-primary'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <Folder size={16} className="inline mr-2" />
          Local Analyzer
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'stats'
              ? 'border-primary text-primary'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <BarChart3 size={16} className="inline mr-2" />
          Statistics & History
        </button>
      </div>

      {/* GitHub Analysis Tab */}
      {activeTab === 'github' && (
        <>
          <div className="card">
            <div className="card-body">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    GitHub Repository URL
                  </label>
                  <div className="flex gap-2">
                    <div className="input-group flex-1">
                      <Github size={18} />
                      <input
                        type="text"
                        placeholder="https://github.com/owner/repo"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        className="form-control"
                        disabled={isGitHubAnalyzing}
                      />
                    </div>
                    {isGitHubAnalyzing ? (
                      <button
                        onClick={handleStopGitHubAnalysis}
                        className="btn btn-outline btn-danger"
                        disabled={!isGitHubAnalyzing}
                      >
                        <Square size={16} />
                        Stop
                      </button>
                    ) : (
                      <button
                        onClick={handleStartGitHubAnalysis}
                        className="btn btn-primary"
                        disabled={!githubUrl.trim() || isGitHubAnalyzing}
                      >
                        <Play size={16} />
                        Analyze
                      </button>
                    )}
                  </div>
                  {githubError && (
                    <div className="alert alert-error mt-2">
                      <AlertCircle size={16} />
                      {githubError}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* GitHub Analysis Status */}
          {githubAnalysisStatus && (
            <div className="card">
              <div className="card-body">
                <div className="flex items-center gap-2 mb-4">
                  {getStatusIcon(githubAnalysisStatus.status)}
                  <h2 className="text-lg font-semibold">GitHub Analysis Status</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm text-secondary">Status</label>
                    <p className={`font-medium capitalize ${getStatusColor(githubAnalysisStatus.status)}`}>
                      {githubAnalysisStatus.status.replace('_', ' ')}
                    </p>
                  </div>

                  {githubAnalysisStatus.progress !== undefined && (
                    <div>
                      <label className="text-sm text-secondary">Progress</label>
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${githubAnalysisStatus.progress}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{githubAnalysisStatus.progress}%</span>
                      </div>
                    </div>
                  )}

                  {githubAnalysisStatus.taskCount !== undefined && (
                    <div>
                      <label className="text-sm text-secondary">Tasks Found</label>
                      <p className="font-medium">{githubAnalysisStatus.taskCount}</p>
                    </div>
                  )}

                  {githubAnalysisStatus.startedAt && (
                    <div>
                      <label className="text-sm text-secondary">Duration</label>
                      <p className="font-medium">
                        {formatDuration(githubAnalysisStatus.startedAt, githubAnalysisStatus.completedAt)}
                      </p>
                    </div>
                  )}
                </div>

                {githubAnalysisStatus.githubUrl && (
                  <div className="mt-4">
                    <label className="text-sm text-secondary">Repository</label>
                    <a
                      href={githubAnalysisStatus.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline block truncate"
                    >
                      {githubAnalysisStatus.githubUrl}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* GitHub Analysis Report */}
          {githubAnalysisReport && (
            <div className="card">
              <div className="card-body">
                <div className="flex items-center gap-2 mb-4">
                  <FileText size={20} />
                  <h2 className="text-lg font-semibold">GitHub Analysis Report</h2>
                </div>

                {githubAnalysisReport.summary && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-4 bg-surface rounded-lg">
                      <div className="text-2xl font-bold text-primary">{githubAnalysisReport.summary.totalTasks}</div>
                      <div className="text-sm text-secondary">Total Tasks</div>
                    </div>
                    <div className="text-center p-4 bg-surface rounded-lg">
                      <div className="text-2xl font-bold text-success">{githubAnalysisReport.summary.successfulTasks}</div>
                      <div className="text-sm text-secondary">Successful</div>
                    </div>
                    <div className="text-center p-4 bg-surface rounded-lg">
                      <div className="text-2xl font-bold text-error">{githubAnalysisReport.summary.failedTasks}</div>
                      <div className="text-sm text-secondary">Failed</div>
                    </div>
                    <div className="text-center p-4 bg-surface rounded-lg">
                      <div className="text-2xl font-bold text-primary">{githubAnalysisReport.summary.successRate}</div>
                      <div className="text-sm text-secondary">Success Rate</div>
                    </div>
                  </div>
                )}

                {githubAnalysisReport.reports && githubAnalysisReport.reports.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3">Task Details</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {githubAnalysisReport.reports.map((report, index) => (
                        <div key={index} className="p-3 bg-surface rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {report.success ? (
                                <CheckCircle className="text-success" size={16} />
                              ) : (
                                <AlertCircle className="text-error" size={16} />
                              )}
                              <span className="text-sm font-medium">Task {index + 1}</span>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${
                              report.success ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                            }`}>
                              {report.success ? 'Success' : 'Failed'}
                            </span>
                          </div>
                          {report.description && (
                            <p className="text-sm text-secondary mt-1">{report.description}</p>
                          )}
                          {report.error && (
                            <p className="text-xs text-error mt-1">{report.error}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Local Analyzer Tab */}
      {activeTab === 'local' && (
        <>
          <div className="card">
            <div className="card-body">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Directory Path
                  </label>
                  <div className="flex gap-2">
                    <div className="input-group flex-1">
                      <Folder size={18} />
                      <input
                        type="text"
                        placeholder="/path/to/your/project"
                        value={directory}
                        onChange={(e) => setDirectory(e.target.value)}
                        className="form-control"
                        disabled={localAnalyzerState?.status === 'analyzing'}
                      />
                    </div>
                    {localAnalyzerState?.status === 'analyzing' ? (
                      <button
                        onClick={handleStopLocalAnalysis}
                        className="btn btn-outline btn-danger"
                      >
                        <Square size={16} />
                        Stop
                      </button>
                    ) : (
                      <button
                        onClick={handleStartLocalAnalysis}
                        className="btn btn-primary"
                        disabled={!directory.trim() || localAnalyzerState?.status === 'analyzing'}
                      >
                        <Play size={16} />
                        Start Analysis
                      </button>
                    )}
                  </div>
                  {analyzerError && (
                    <div className="alert alert-error mt-2">
                      <AlertCircle size={16} />
                      {analyzerError}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Local Analyzer Status */}
          {globalAnalyzerState.localState && (
            <div className="card">
              <div className="card-body">
                <div className="flex items-center gap-2 mb-4">
                  {getStatusIcon(globalAnalyzerState.localState.status)}
                  <h2 className="text-lg font-semibold">Local Analyzer Status</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-secondary">Status</label>
                    <p className={`font-medium capitalize ${getStatusColor(globalAnalyzerState.localState.status)}`}>
                      {globalAnalyzerState.localState.status}
                    </p>
                  </div>

                  {globalAnalyzerState.localState.taskId && (
                    <div>
                      <label className="text-sm text-secondary">Task ID</label>
                      <p className="font-medium text-xs">{globalAnalyzerState.localState.taskId}</p>
                    </div>
                  )}

                  {globalAnalyzerState.localState.progress !== undefined && (
                    <div>
                      <label className="text-sm text-secondary">Progress</label>
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${globalAnalyzerState.localState.progress}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{globalAnalyzerState.localState.progress}%</span>
                      </div>
                    </div>
                  )}

                  {globalAnalyzerState.localState.directory && (
                    <div>
                      <label className="text-sm text-secondary">Directory</label>
                      <p className="font-medium text-xs truncate">{globalAnalyzerState.localState.directory}</p>
                    </div>
                  )}

                  {globalAnalyzerState.localState.currentStep && (
                    <div>
                      <label className="text-sm text-secondary">Current Step</label>
                      <p className="font-medium text-sm">{globalAnalyzerState.localState.currentStep}</p>
                    </div>
                  )}

                  {globalAnalyzerState.localState.startedAt && (
                    <div>
                      <label className="text-sm text-secondary">Started</label>
                      <p className="font-medium text-sm">{formatDate(globalAnalyzerState.localState.startedAt)}</p>
                    </div>
                  )}
                </div>

                {globalAnalyzerState.localState.error && (
                  <div className="mt-4 alert alert-error">
                    <AlertCircle size={16} />
                    {globalAnalyzerState.localState.error}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Statistics & History Tab */}
      {activeTab === 'stats' && (
        <>
          {/* Analyzer Statistics */}
          {globalAnalyzerState.statistics && (
            <div className="card">
              <div className="card-body">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 size={20} />
                  <h2 className="text-lg font-semibold">Analyzer Statistics</h2>
                  <span className="text-xs text-secondary">Last updated: {globalAnalyzerState.lastUpdated ? formatDate(globalAnalyzerState.lastUpdated) : 'Never'}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-surface rounded-lg">
                    <div className="text-2xl font-bold text-primary">{globalAnalyzerState.statistics.totalRuns}</div>
                    <div className="text-sm text-secondary">Total Runs</div>
                  </div>

                  {globalAnalyzerState.statistics.successfulRuns !== undefined && (
                    <div className="text-center p-4 bg-surface rounded-lg">
                      <div className="text-2xl font-bold text-success">{globalAnalyzerState.statistics.successfulRuns}</div>
                      <div className="text-sm text-secondary">Successful</div>
                    </div>
                  )}

                  {globalAnalyzerState.statistics.failedRuns !== undefined && (
                    <div className="text-center p-4 bg-surface rounded-lg">
                      <div className="text-2xl font-bold text-error">{globalAnalyzerState.statistics.failedRuns}</div>
                      <div className="text-sm text-secondary">Failed</div>
                    </div>
                  )}

                  <div className="text-center p-4 bg-surface rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {globalAnalyzerState.statistics.totalRuns > 0
                        ? Math.round((globalAnalyzerState.statistics.successfulRuns || 0) / globalAnalyzerState.statistics.totalRuns * 100)
                        : 0}%
                    </div>
                    <div className="text-sm text-secondary">Success Rate</div>
                  </div>

                  <div className="text-center p-4 bg-surface rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {globalAnalyzerState.isLoading ? (
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent animate-spin rounded-full"></div>
                      ) : (
                        <CheckCircle size={24} />
                      )}
                    </div>
                    <div className="text-sm text-secondary">Status</div>
                  </div>
                </div>

                {globalAnalyzerState.statistics.lastRun && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-secondary">
                    <Calendar size={16} />
                    <span>Last run: {formatDate(globalAnalyzerState.statistics.lastRun)}</span>
                  </div>
                )}

                {globalAnalyzerState.isLoading && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-primary">
                    <Clock size={16} className="animate-spin" />
                    <span>Updating analyzer data...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Analysis History */}
          {globalAnalyzerState.history && globalAnalyzerState.history.results && globalAnalyzerState.history.results.length > 0 && (
            <div className="card">
              <div className="card-body">
                <div className="flex items-center gap-2 mb-4">
                  <History size={20} />
                  <h2 className="text-lg font-semibold">Recent Analysis History</h2>
                  <span className="text-sm text-secondary">({globalAnalyzerState.history.totalResults} results)</span>
                  <span className="text-xs text-secondary">Updated: {formatDate(globalAnalyzerState.lastUpdated)}</span>
                </div>

                <div className="space-y-3">
                  {globalAnalyzerState.history.results.map((result: any, index: number) => (
                    <div key={index} className="p-4 bg-surface rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <GitBranch size={16} className="text-primary" />
                          <span className="font-medium">{result.directory || 'Unknown directory'}</span>
                        </div>
                        <span className="text-xs text-secondary">
                          {formatDate(result.completedAt || result.createdAt)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div>
                          <span className="text-secondary">Tasks:</span>
                          <span className="ml-2 font-medium">{result.taskCount || 0}</span>
                        </div>
                        {result.gitRemoteUrl && (
                          <div className="col-span-2">
                            <span className="text-secondary">Repo:</span>
                            <span className="ml-2 font-medium text-xs truncate">{result.gitRemoteUrl}</span>
                          </div>
                        )}
                        {result.taskId && (
                          <div>
                            <span className="text-secondary">ID:</span>
                            <span className="ml-2 font-mono text-xs">{result.taskId.slice(0, 8)}...</span>
                          </div>
                        )}
                      </div>

                      {result.tags && result.tags.includes('completed') && (
                        <div className="mt-2">
                          <span className="text-xs px-2 py-1 bg-success/10 text-success rounded">
                            Completed
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* No History State */}
          {(!globalAnalyzerState.history || !globalAnalyzerState.history.results || globalAnalyzerState.history.results.length === 0) && (
            <div className="card">
              <div className="card-body text-center">
                <History size={48} className="mx-auto text-secondary mb-4" />
                <p className="text-secondary">No analysis history available</p>
                <p className="text-xs text-secondary mt-2">Start an analysis to see results here</p>
                {globalAnalyzerState.isLoading && (
                  <p className="text-xs text-primary mt-1">
                    Loading history...
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}