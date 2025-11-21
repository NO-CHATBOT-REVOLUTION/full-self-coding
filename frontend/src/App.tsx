import React, { useState } from 'react';
import { TaskList } from './components/TaskList';
import { CodeDiffViewer } from './components/CodeDiffViewer';
import { CodeTask } from './types';
import { sampleTasks } from './sampleData';
import './index.css';

const App: React.FC = () => {
  const [selectedTask, setSelectedTask] = useState<CodeTask | null>(null);

  const handleViewTask = (task: CodeTask) => {
    setSelectedTask(task);
  };

  return (
    <div style={{ padding: '20px', width: '100vw' }}>
      <header style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{
          color: '#006666',
          fontSize: '24px',
          marginBottom: '10px',
          textTransform: 'uppercase',
          letterSpacing: '2px'
        }}>
          Coding Task Dashboard
        </h1>
        <div style={{
          color: '#666666',
          fontSize: '12px',
          fontFamily: 'Courier New, monospace'
        }}>
          Real-time task tracking and code visualization
        </div>
      </header>

      {/* Task List Section */}
      <section style={{ marginBottom: '40px' }}>
        <div className="section-title">Active Tasks</div>
        <TaskList tasks={sampleTasks} onViewTask={handleViewTask} />
      </section>

      {/* Code Diff Section */}
      {selectedTask && (
        <section style={{ marginBottom: '40px' }}>
          <div className="section-title">
            Code Changes for Task: <span style={{ color: '#b35a00' }}>{selectedTask.id}</span>
          </div>
          <CodeDiffViewer fileChanges={selectedTask.fileChanges} />
        </section>
      )}

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        marginTop: '50px',
        padding: '20px',
        borderTop: '1px solid #333333',
        color: '#666666',
        fontSize: '10px'
      }}>
        <div>Coding Task Dashboard v1.0.0</div>
        <div>Light terminal-style interface with real-time updates</div>
      </footer>
    </div>
  );
};

export default App;