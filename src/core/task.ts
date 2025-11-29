/**
 * Represents a task to be executed by the system
 */
export interface Task {
    /**
     * The title of the task
     */
    title: string;

    /**
     * Detailed description of what the task should accomplish
     */
    description: string;

    /**
     * Priority level of the task. Higher number means higher priority
     * @example
     * 1 = Low priority
     * 2 = Medium priority
     * 3 = High priority
     * 4 = Critical priority
     * 5 = Immediate priority
     */
    priority: number;

    /**
     * The ID of the task
     */
    ID: string;
}

/**
 * Status of a completed task
 */
export enum TaskStatus {
    SUCCESS = 'success',
    FAILURE = 'failure',
    ONGOING = 'ongoing',
    NOT_STARTED = 'not_started',
    SKIPPED = 'skipped',
}

/**
 * Represents the result of an executed task, including the original task properties
 * and execution outcomes
 */
export interface TaskResult extends Task {

    /**
     * The title of the task
     */
    title: string;

    /**
     * Detailed description of what the task should accomplish
     */
    description: string;

    /**
     * The status of the task execution
     */
    status: TaskStatus;

    /**
     * Detailed report of what was done, any issues encountered,
     * and the final outcome
     */
    report: string;

    /**
     * Unix timestamp (in milliseconds) when the task completed
     */
    completedAt?: number;

    /**
     * 
     * The git diff of the changes made by this task
     */
    gitDiff?: string;
}
