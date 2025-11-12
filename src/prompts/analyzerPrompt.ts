/**
 * This is the core prompt for the code analyzer in SWE Agent application, such as 
 * gemini cli, claude code, codex and other SWE Agent.
 * 
 * This is not the prompt for LLM model.
 * 
 * So we just need to describe a high level task for the code analyzer.
 */

import type {Config} from '../config';

export function analyzerPrompt(
  strWorkStyleDesription: string,
  strCodingStyleDesription: string,
  config: Config
) {
    return `
Here is your role and work style: 

${strWorkStyleDesription}

Here is your coding style:

${strCodingStyleDesription}

Now your task is to analyze the whole codebase and extract tasks that need to be done. Each task should have a description and a priority. Remember that if a task is dependent on another task, it should be included in the followingTasks array. Try to add as many tasks as possible. 

Here are the rules:
1. DO NOT DO ANY CODE CHANGES OR MODIFICATIONS.
2. After generating the tasks, please make sure that the number of tasks is between ${config.minTasks ?? 1} and ${config.maxTasks ?? 10}.
3. After output the tasks in JSON format, please make sure that the JSON is valid and can be parsed by TypeScript. Then create a folder "./fsc" and save the JSON file in it "/app/repo/fsc/tasks.json".
4. When creating the task, please make sure that the description is rich, instruction and actionable. Make sure that the description is specific and can be followed by a human, providing clear instructions on what needs to be done. Also please provide as many tasks as possible. Your supervisor will make the final decision on which tasks to include. 
5. The final output should be a JSON array of tasks. Even if there is only one task, it should be wrapped in an array.
6. After JSON task array output, please double check the JSON format and syntax, and make sure that it can be parsed by TypeScript.

Below is the structure of a single task:

interface Task {
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

And you need to return a list of tasks that follow the above structure.

`;

};
