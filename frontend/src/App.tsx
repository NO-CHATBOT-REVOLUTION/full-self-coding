import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Activity, Home, Settings, FolderOpen, Play, Square, Power } from 'lucide-react';
import { usePolling } from './hooks/usePolling';
import apiService from './services/api';
import type { Health, Dashboard } from './types';
import { AnalyzerProvider } from './contexts/AnalyzerContext';

// Import pages (we'll create these next)
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import AnalyzerPage from './pages/AnalyzerPage';
import TaskSolverPage from './pages/TaskSolverPage';
import WorkspacePage from './pages/WorkspacePage';

function Navigation() {
  const location = useLocation();
  const [health, setHealth] = useState<Health | null>(null);

  const { data: healthData } = usePolling(
    () => apiService.getHealth(),
    15000 // Health check every 15 seconds
  );

  useEffect(() => {
    if (healthData) {
      setHealth(healthData);
    }
  }, [healthData]);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/tasks', label: 'Tasks', icon: FolderOpen },
    { path: '/analyzer', label: 'Analyzer', icon: Activity },
    { path: '/task-solver', label: 'Task Solver', icon: Play },
    { path: '/workspace', label: 'Workspace', icon: Settings },
  ];

  const getServerStatus = () => {
    if (!health) return 'unknown';
    return health.status;
  };

  const getStatusColor = () => {
    const status = getServerStatus();
    switch (status) {
      case 'healthy': return 'text-success';
      default: return 'text-error';
    }
  };

  return (
    <nav className="flex items-center justify-between p-4 bg-surface border-b border-border">
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-primary">
          <Activity size={24} />
          Full Self-Coding
        </Link>

        <div className="flex gap-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-primary text-white'
                    : 'text-secondary hover:text-primary hover:bg-gray-100'
                }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
          <span className="text-secondary">Server: {getServerStatus()}</span>
        </div>

        {health && (
          <div className="text-xs text-muted">
            Uptime: {Math.floor(health.uptime / 60)}m
          </div>
        )}
      </div>
    </nav>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container py-6">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Layout>
        <AnalyzerProvider>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/analyzer" element={<AnalyzerPage />} />
            <Route path="/task-solver" element={<TaskSolverPage />} />
            <Route path="/workspace" element={<WorkspacePage />} />
          </Routes>
        </AnalyzerProvider>
      </Layout>
    </Router>
  );
}