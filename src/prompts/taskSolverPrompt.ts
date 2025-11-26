import type {Config} from '../config';
import type {Task} from '../task';
import { getCodingStyle } from '../codingStyle';

export function taskSolverPrompt(task: Task, config: Config): string {
    // return test_string;
    return `
The path of the source code is located at /app/repo.

Now please complete your task. Here are the rules:
1.You need to try your best to complete the task.
2.If you cannot complete the task by technical reasons, please just fail the task; if the task is not related to the project, please just skip it.
3.If the task is finished successfully, please DO NOT create a new branch, commit, or push the changes. Just provide a very detailed report of the changes you made.
4.If the task is skipped or failed, please provide a very detailed report of the reasons.
5.No matter what, please always provide a very detailed report of the task execution. Save it at /app/finalReport.json, in following format:

{
    "taskId": "the task ID",
    "title": "the task title",
    "description": "the task description",
    "status": "success" | "skipped" | "failed",
    "report": "A very detailed report of the task execution."
}


6. Please double check the finalReport.json file to make sure it is correct in JSON format and can be parsed successfully.
7. After all tasks are completed, please run "node /app/diff/run.js". This script will save the structured git diff to /app/git_diff.txt.
8. For any string field in the JSON object, please double check that only use single quotes, and make sure that it does not contain any double quotes.

As a task solver, here are some extra instructions for you.

${config.specialInstructionsForTaskSolver ?? ''}

${config.customizedMessage ?? ''}

Below is your work style. Please follow it as much as possible: 
${config.workStyle}


Below is your coding style. When writing code, please follow it as much as possible:
${getCodingStyle(config.codingStyleLevel || 0)}

And here is your task information, in JSON format, please use it as the reference, and start your work.

Task title: ${task.title}

Task description: ${task.description}

Task ID: ${task.ID}`;  
}