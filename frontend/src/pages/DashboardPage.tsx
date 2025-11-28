import React, { useState, useEffect } from 'react';
import { usePolling } from '../hooks/usePolling';
import apiService from '../services/api';
import {
  Activity,
  FolderOpen,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Power,
  AlertTriangle
} from 'lucide-react';
import type { Dashboard } from '../types';

export default function DashboardPage() {
  const [isEmergencyStopping, setIsEmergencyStopping] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(true);

  // Only poll when tab is visible
  const { data: dashboard, loading, error, manualRefresh } = usePolling(
    () => apiService.getDashboard(),
    10000, // 10 seconds instead of 3
    isTabVisible
  );

  // Track tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleEmergencyStop = async () => {
    if (!window.confirm('Are you sure you want to emergency stop all components? This cannot be undone.')) {
      return;
    }

    try {
      setIsEmergencyStopping(true);
      await apiService.emergencyStop();
      manualRefresh();
    } catch (err) {
      alert('Failed to emergency stop: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsEmergencyStopping(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'idle':
        return <Clock size={16} className="text-muted" />;
      case 'analyzing':
      case 'running':
        return <Activity size={16} className="text-primary" />;
      case 'completed':
        return <CheckCircle size={16} className="text-success" />;
      case 'failed':
      case 'error':
        return <XCircle size={16} className="text-error" />;
      case 'stopped':
        return <Square size={16} className="text-warning" />;
      default:
        return <AlertTriangle size={16} className="text-muted" />;
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading && !dashboard) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner" />
        <span className="ml-2 text-secondary">Loading dashboard...</span>
      </div>
    );
  }

  if (error && !dashboard) {
    return (
      <div className="text-center py-12">
        <XCircle className="mx-auto mb-4 text-error" size={48} />
        <h2 className="text-xl font-semibold text-error mb-2">Failed to load dashboard</h2>
        <p className="text-secondary mb-4">{error}</p>
        <button onClick={manualRefresh} className="btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  const taskStats = dashboard.tasks;
  const activeTasks = taskStats.analyzing + taskStats.solving;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-secondary">
            Server uptime: {formatUptime(dashboard.uptime)}
          </p>
        </div>

        <div className="flex gap-2">
          <button onClick={manualRefresh} className="btn-secondary">
            <Activity size={16} />
            Refresh
          </button>
          <button
            onClick={handleEmergencyStop}
            disabled={isEmergencyStopping || activeTasks === 0}
            className="btn-error"
          >
            <Power size={16} />
            {isEmergencyStopping ? 'Stopping...' : 'Emergency Stop'}
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Total Tasks</p>
                <p className="text-2xl font-bold">{taskStats.total}</p>
              </div>
              <FolderOpen className="text-muted" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Active Tasks</p>
                <p className="text-2xl font-bold text-primary">{activeTasks}</p>
              </div>
              <Activity className="text-primary" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Completed</p>
                <p className="text-2xl font-bold text-success">{taskStats.completed}</p>
              </div>
              <CheckCircle className="text-success" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Failed</p>
                <p className="text-2xl font-bold text-error">{taskStats.failed}</p>
              </div>
              <XCircle className="text-error" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 size={20} />
              Code Analyzer Status
            </h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(dashboard.codeAnalyzer.status)}
                  <span className="font-medium capitalize">{dashboard.codeAnalyzer.status}</span>
                </div>
                <span className={`status status-${dashboard.codeAnalyzer.status}`}>
                  {dashboard.codeAnalyzer.status}
                </span>
              </div>

              {dashboard.codeAnalyzer.taskId && (
                <div className="text-sm text-muted">
                  Task ID: {dashboard.codeAnalyzer.taskId}
                </div>
              )}

              {dashboard.codeAnalyzer.startedAt && (
                <div className="text-sm text-muted">
                  Started: {new Date(dashboard.codeAnalyzer.startedAt).toLocaleString()}
                </div>
              )}

              {dashboard.codeAnalyzer.error && (
                <div className="text-sm text-error bg-red-50 p-2 rounded">
                  Error: {dashboard.codeAnalyzer.error}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Play size={20} />
              Task Solver Manager Status
            </h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(dashboard.taskSolverManager.status)}
                  <span className="font-medium capitalize">{dashboard.taskSolverManager.status}</span>
                </div>
                <span className={`status status-${dashboard.taskSolverManager.status}`}>
                  {dashboard.taskSolverManager.status}
                </span>
              </div>

              {dashboard.taskSolverManager.taskId && (
                <div className="text-sm text-muted">
                  Task ID: {dashboard.taskSolverManager.taskId}
                </div>
              )}

              {dashboard.taskSolverManager.progress !== undefined && (
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{dashboard.taskSolverManager.progress}%</span>
                  </div>
                  <div className="progress">
                    <div
                      className="progress-bar"
                      style={{ width: `${dashboard.taskSolverManager.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {dashboard.taskSolverManager.startedAt && (
                <div className="text-sm text-muted">
                  Started: {new Date(dashboard.taskSolverManager.startedAt).toLocaleString()}
                </div>
              )}

              {dashboard.taskSolverManager.error && (
                <div className="text-sm text-error bg-red-50 p-2 rounded">
                  Error: {dashboard.taskSolverManager.error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task Distribution Chart */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold">Task Distribution</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries({
              'Pending': { count: taskStats.pending, color: 'text-primary' },
              'Analyzing': { count: taskStats.analyzing, color: 'text-primary' },
              'Analyzed': { count: taskStats.analyzed, color: 'text-primary' },
              'Solving': { count: taskStats.solving, color: 'text-primary' },
              'Completed': { count: taskStats.completed, color: 'text-success' },
              'Failed': { count: taskStats.failed, color: 'text-error' },
              'Stopped': { count: taskStats.stopped, color: 'text-warning' }
            }).map(([status, data]) => (
              data.count > 0 && (
                <div key={status} className="text-center">
                  <div className={`text-2xl font-bold ${data.color}`}>
                    {data.count}
                  </div>
                  <div className="text-sm text-muted">{status}</div>
                </div>
              )
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}