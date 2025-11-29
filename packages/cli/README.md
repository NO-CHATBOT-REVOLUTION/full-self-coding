# @full-self-coding/cli

CLI tool for automated code analysis and task execution. Built with pure TypeScript and powered by Bun.

## Installation

### Global Installation

```bash
npm install -g @full-self-coding/cli
```

### Local Development

```bash
git clone https://github.com/NO-CHATBOT-REVOLUTION/full-self-coding.git
cd full-self-coding
bun install
bun run start
```

## Usage

The CLI binary name is `full-self-coding-cli`.

```bash
# Run full analysis on current repository
full-self-coding-cli

# Run with custom config
full-self-coding-cli run --config ./my-config.json

# Show help
full-self-coding-cli --help

# Show version
full-self-coding-cli --version
```

## Commands

- `run` - Run the full self-coding analysis and task execution (default command)
- `--config <path>` - Specify custom configuration file
- `--help` - Show help information
- `--version` - Show version information

## TypeScript Execution

This CLI package runs directly from TypeScript source files using Bun runtime:

- **No build step required** - TypeScript files are executed directly
- **Fast startup** - Bun provides instant TypeScript compilation and execution
- **Development friendly** - Edit source and immediately run without rebuilding

## Configuration

The CLI uses configuration from `~/.config/full-self-coding/config.json` by default. You can also specify environment variables:

- `FSC_AGENT_TYPE` - AI agent type (claude-code, gemini-cli)
- `FSC_ANTHROPIC_API_KEY` - Anthropic API key
- `FSC_GOOGLE_GEMINI_API_KEY` - Google Gemini API key
- `FSC_OPENAI_CODEX_API_KEY` - OpenAI Codex API key

## Examples

```bash
# Basic usage - analyze current repository
full-self-coding-cli

# With custom configuration file
full-self-coding-cli run --config ./project-config.json

# Using environment variables
export FSC_ANTHROPIC_API_KEY="sk-ant-api03-..."
export FSC_AGENT_TYPE="claude-code"
full-self-coding-cli

# Development mode - run from source
cd packages/cli
bun src/index.ts
```

## Package Structure

```
packages/cli/
├── src/
│   └── index.ts           # Main CLI entry point
├── package.json           # Package configuration
└── README.md             # This file
```

The CLI package imports all core functionality from `@full-self-coding/core` and provides a command-line interface.

## License

MIT