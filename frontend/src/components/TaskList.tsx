import React from 'react';
import { CodeTask } from '../types';
import { ExpandableReport } from './ExpandableReport';

interface TaskListProps {
  tasks: CodeTask[];
  onViewTask: (task: CodeTask) => void;
}

export const TaskList: React.FC<TaskListProps> = ({ tasks, onViewTask }) => {
  return (
    <div className="terminal-container">
      <div className="terminal-header">
        Task List
      </div>
      <div className="terminal-content">
        <table className="task-table">
          <thead>
            <tr>
              <th>Task ID</th>
              <th>Description</th>
              <th>Detailed Report</th>
              <th>Git Hash</th>
              <th>Git Branch</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td className="commit-hash">{task.id}</td>
                <td>{task.description}</td>
                <td>
                  <ExpandableReport report={task.detailedReport} />
                </td>
                <td className="commit-hash">{task.pushedGitHash.substring(0, 7)}</td>
                <td className="branch-name">{task.pushedGitBranch}</td>
                <td>
                  <button
                    className="view-button"
                    onClick={() => onViewTask(task)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};