import type { Task } from './task';
import type { Config } from './config';

/**
 * Executes an array of tasks in the correct order based on their priority and dependencies
 * @param tasks Array of tasks to be executed
 * @returns Promise<void>
 */
export async function executeTasks(tasks: Task[], config: Config): Promise<void> {
    // TODO: implement task execution
    // 1. Sort tasks by priority
    // 2. Build execution graph based on followingTasks
    // 3. Execute tasks in correct order respecting dependencies
    // 4. Handle task failures and rollbacks if needed
}

export default executeTasks;
