import React from 'react';
import { Settings } from 'lucide-react';

export default function WorkspacePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings size={24} />
        <h1 className="text-2xl font-bold">Workspace Management</h1>
      </div>

      <div className="card">
        <div className="card-body text-center">
          <p className="text-secondary">Workspace management interface coming soon...</p>
        </div>
      </div>
    </div>
  );
}