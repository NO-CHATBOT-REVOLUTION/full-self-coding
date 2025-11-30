// Core functionality exports for the full-self-coding library

// Main engines
export { default as analyzeCodebase } from './analyzer';
export { TaskSolver } from './taskSolver';
export { TaskSolverManager } from './taskSolverManager';
export { CodeCommitter } from './codeCommitter';
export { DockerInstance } from './dockerInstance';

// Configuration
export { createConfig, type Config } from './config';
export { readConfigWithEnv } from './configReader';

// Types and interfaces
export type { Task, TaskResult } from './task';
export { TaskStatus } from './task';
export type { codingStyles } from './codingStyle';
export type { WorkStyle } from './workStyle';

// Utilities
export * from './utils/getDateAndTime';
export * from './utils/trimJSON';
export * from './utils/git';

// Prompts
export * from './prompts/analyzerPrompt';
export * from './prompts/taskSolverPrompt';
export * from './prompts/codingStylePrompt';
export * from './prompts/diff_nodejs';

// SWE Agent commands
export * from './SWEAgent/claudeCodeCommands';
export * from './SWEAgent/codexCommands';
export * from './SWEAgent/cursorCommands';
export * from './SWEAgent/geminiCodeCommands';
export * from './SWEAgent/SWEAgentTaskSolverCommands';