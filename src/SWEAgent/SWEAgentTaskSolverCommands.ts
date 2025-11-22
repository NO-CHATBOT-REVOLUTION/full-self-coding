import { SWEAgentType } from "../config";
import type { Config } from "../config";
import type {Task} from "../task";
import {diffNodejsSourceCode} from "../prompts/diff_nodejs";
import {getClaudeCommand} from "./claudeCodeCommands";
import { CursorInstallationWrapper } from "./cursorCommands";

const diffjsPrompt = diffNodejsSourceCode;

function environmentSetup(config: Config, gitRemoteUrl: string, task: Task, bInstallAgent: boolean = true): string[] {
  let setupCommands = [
    `git clone ${gitRemoteUrl} /app/repo`,
    "apt-get update",
    "apt-get install -y curl",
    "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -",
    "apt-get install -y nodejs",
    "mkdir /app/diff && cd /app/diff && npm install simple-git",
    
    // save diffjsPrompt into /app/diff/run.js
    `echo "${diffjsPrompt}" > /app/diff/run.js`,
  ];

  if (bInstallAgent) {
    switch (config.agentType) {
      case SWEAgentType.GEMINI_CLI:
        setupCommands.push(
          "npm install -g @google/gemini-cli",
        );
        break;
      case SWEAgentType.CLAUDE_CODE:
        setupCommands.push(
          "npm install -g @anthropic-ai/claude-code",
        );
        break;
      case SWEAgentType.CODEX:
        setupCommands.push(
          "npm install -g @openai/codex",
        );
        break;
      case SWEAgentType.CURSOR:
        setupCommands.push(
          ...CursorInstallationWrapper(),
        );
        break;
      default:
        throw new Error(`Unsupported agent type: ${config.agentType}`);
   }
  }
  setupCommands.push("mkdir /app/repo/fsc");
  // setupCommands.push(
  //   ...addTaskSolverPromptIntoPath(
  //     taskSolverPrompt(task, config),"/app/taskSolverPrompt.txt"));
  return setupCommands;
}

export function taskSolverCommands(
  agentType:SWEAgentType,
  config: Config,
  task: Task,
  gitRemoteUrl: string,
): string[] {

  let finalCommandsList = [] 
  finalCommandsList.push(...environmentSetup(config , gitRemoteUrl , task));

  switch (agentType) {
    case SWEAgentType.GEMINI_CLI:
      finalCommandsList.push(GeminiExecutionCommand(config));
      return finalCommandsList;
    case SWEAgentType.CLAUDE_CODE:
      finalCommandsList.push(getClaudeCommand(config, false));
      return finalCommandsList;
    case SWEAgentType.CODEX:
      finalCommandsList.push(CodexExecutionCommand(config));
      return finalCommandsList;
    case SWEAgentType.CURSOR:
      finalCommandsList.push(CursorExecutionCommand(config));
      return finalCommandsList
    default:
      break;
  }

  throw new Error(`Unsupported agent type: ${agentType}`);
}

function GeminiExecutionCommand(config: Config): string{
  if (config.googleGeminiApiKey && config.googleGeminiAPIKeyExportNeeded) {
    return `export GEMINI_API_KEY=${config.googleGeminiApiKey} && gemini -p "all the task descriptions are located at /app/taskSolverPrompt.txt, please read and execute" --yolo`;
  }
  return `gemini -p "all the task descriptions are located at /app/taskSolverPrompt.txt, please read and execute" --yolo`;
}

function CodexExecutionCommand(config: Config): string{
  if (config.openAICodexApiKey && config.openAICodexAPIKeyExportNeeded) {
    return `export OPENAI_API_KEY=${config.openAICodexApiKey} && codex exec --sandbox danger-full-access "all the task descriptions are located at /app/taskSolverPrompt.txt, please read and execute"`;
  }
  return `codex exec --sandbox danger-full-access "all the task descriptions are located at /app/taskSolverPrompt.txt, please read and execute"`;
}

function CursorExecutionCommand(config: Config): string{
  if (config.cursorAPIKey && config.cursorAPIKeyExportNeeded) {
    return `export CURSOR_API_KEY=${config.cursorAPIKey} && cursor-agent -p "all the task descriptions are located at /app/taskSolverPrompt.txt, please read and execute"`;
  }
  return `cursor-agent -p "all the task descriptions are located at /app/taskSolverPrompt.txt, please read and execute"`;
}