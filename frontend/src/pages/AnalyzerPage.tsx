import React from 'react';
import { Activity } from 'lucide-react';

export default function AnalyzerPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Activity size={24} />
        <h1 className="text-2xl font-bold">Code Analyzer</h1>
      </div>

      <div className="card">
        <div className="card-body text-center">
          <p className="text-secondary">Code analyzer interface coming soon...</p>
        </div>
      </div>
    </div>
  );
}