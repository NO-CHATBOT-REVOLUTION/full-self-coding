import { ConfigReader, readConfig, readConfigWithEnv } from '../src/configReader';
import { SWEAgentType, WorkStyle } from '../src/config';

// Example 1: Basic usage with default settings
console.log('=== Example 1: Basic Usage ===');
try {
    const config = readConfig();
    console.log('Agent Type:', config.agentType);
    console.log('Max Docker Containers:', config.maxDockerContainers);
    console.log('Docker Image:', config.dockerImageRef);
} catch (error) {
    console.error('Failed to read config:', error);
}

// Example 2: Custom config directory
console.log('\n=== Example 2: Custom Config Directory ===');
try {
    const customConfig = readConfig({
        configDir: './custom-config',
        configFileName: 'my-config.json'
    });
    console.log('Custom config loaded successfully');
} catch (error) {
    console.error('Failed to read custom config:', error);
}

// Example 3: With environment variable overrides
console.log('\n=== Example 3: Environment Variable Overrides ===');
try {
    // You can set environment variables like this:
    // process.env.FSC_AGENT_TYPE = 'claude-code';
    // process.env.FSC_MAX_DOCKER_CONTAINERS = '10';
    // process.env.FSC_ANTHROPIC_API_KEY = 'your-key-here';

    const configWithEnv = readConfigWithEnv();
    console.log('Agent Type (with env override):', configWithEnv.agentType);
    console.log('Max Docker Containers (with env override):', configWithEnv.maxDockerContainers);
} catch (error) {
    console.error('Failed to read config with env override:', error);
}

// Example 4: Advanced ConfigReader usage
console.log('\n=== Example 4: Advanced ConfigReader Usage ===');
try {
    const reader = new ConfigReader({
        configDir: './.fsc',
        throwOnMissing: false // Don't throw if file is missing
    });

    console.log('Config file exists:', reader.configExists());
    console.log('Config file path:', reader.getConfigPath());

    if (reader.configExists()) {
        const config = reader.readConfig();
        console.log('Config loaded successfully!');
        console.log('Work Style:', config.workStyle);
        console.log('API Keys configured:', {
            gemini: !!config.googleGeminiApiKey,
            anthropic: !!config.anthropicAPIKey,
            openai: !!config.openAICodexApiKey
        });
    } else {
        console.log('Config file not found, using defaults');
    }
} catch (error) {
    console.error('Advanced config reading failed:', error);
}

// Example 5: Writing configuration
console.log('\n=== Example 5: Writing Configuration ===');
try {
    const reader = new ConfigReader({
        configDir: './config-backup',
        throwOnMissing: false
    });

    const configToWrite = {
        agentType: SWEAgentType.CLAUDE_CODE,
        anthropicAPIKey: 'sk-ant-api-key',
        anthropicAPIKeyExportNeeded: true,
        maxDockerContainers: 8,
        dockerImageRef: 'node:18-alpine',
        workStyle: WorkStyle.BUGFIXER,
        codingStyleLevel: 2
    };

    reader.writeConfig(configToWrite);
    console.log('Configuration written successfully!');
} catch (error) {
    console.error('Failed to write config:', error);
}

// Example 6: Validating configuration
console.log('\n=== Example 6: Configuration Validation ===');
const validationExamples = [
    { agentType: 'invalid-agent' }, // Should fail
    { agentType: SWEAgentType.GEMINI_CLI, maxDockerContainers: -1 }, // Should fail
    { agentType: SWEAgentType.CLAUDE_CODE, maxDockerContainers: 5 }, // Should succeed
];

validationExamples.forEach((example, index) => {
    try {
        const reader = new ConfigReader({
            configDir: './temp-validation',
            throwOnMissing: true
        });

        reader.writeConfig(example);
        console.log(`Example ${index + 1}: ✅ Valid configuration`);
    } catch (error) {
        console.log(`Example ${index + 1}: ❌ Invalid configuration - ${error instanceof Error ? error.message : String(error)}`);
    }
});