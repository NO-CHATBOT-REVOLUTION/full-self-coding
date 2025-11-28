import React from 'react';
import { FolderOpen } from 'lucide-react';

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FolderOpen size={24} />
        <h1 className="text-2xl font-bold">Task Management</h1>
      </div>

      <div className="card">
        <div className="card-body text-center">
          <p className="text-secondary">Task management interface coming soon...</p>
        </div>
      </div>
    </div>
  );
}