import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { ConfigReader, readConfig, readConfigWithEnv } from '../src/core/configReader';
import { SWEAgentType, DEFAULT_CONFIG } from '../src/core/config';
import { WorkStyle } from '../src/core/workStyle';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('ConfigReader', () => {
    let tempDir: string;
    let configDir: string;
    let configPath: string;

    beforeEach(() => {
        // Create a temporary directory for testing
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-reader-test-'));
        configDir = path.join(tempDir, '.fsc');
        configPath = path.join(configDir, 'config.json');
    });

    afterEach(() => {
        // Clean up the temporary directory
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (error) {
            console.error('Failed to cleanup test directory:', error);
        }
    });

    describe('Constructor', () => {
        it('should initialize with default options', () => {
            const reader = new ConfigReader();
            expect(reader.getConfigPath()).toContain('.config/full-self-coding/config.json');
        });

        it('should initialize with custom config directory', () => {
            const customPath = path.join(tempDir, 'custom-config');
            const reader = new ConfigReader({ configDir: customPath });
            expect(reader.getConfigPath()).toContain(path.join(customPath, 'config.json'));
        });

        it('should initialize with custom config filename', () => {
            const reader = new ConfigReader({ configFileName: 'custom.json' });
            expect(reader.getConfigPath()).toContain('.config/full-self-coding/custom.json');
        });

        it('should initialize with custom config directory and filename', () => {
            const reader = new ConfigReader({
                configDir: path.join(tempDir, 'custom'),
                configFileName: 'app-config.json'
            });
            expect(reader.getConfigPath()).toContain(path.join(tempDir, 'custom', 'app-config.json'));
        });
    });

    describe('File Existence', () => {
        it('should return false for non-existent config file', () => {
            const reader = new ConfigReader({ configDir: configDir, throwOnMissing: true });
            expect(reader.configExists()).toBe(false);
        });

        it('should return true for existing config file', () => {
            // Create config directory and file
            fs.mkdirSync(configDir, { recursive: true });
            fs.writeFileSync(configPath, JSON.stringify({ agentType: SWEAgentType.GEMINI_CLI }));

            const reader = new ConfigReader({ configDir: configDir, throwOnMissing: true });
            expect(reader.configExists()).toBe(true);
        });
    });

    describe('Reading Configuration', () => {
        it('should return default config when file does not exist', () => {
            const reader = new ConfigReader({ configDir: configDir });
            const config = reader.readConfig();

            expect(config).toEqual(DEFAULT_CONFIG);
        });

        it('should throw error when file does not exist and throwOnMissing is true', () => {
            const reader = new ConfigReader({ configDir: tempDir, throwOnMissing: true });

            expect(() => reader.readConfig()).toThrow('Configuration file not found');
        });

        it('should read and parse valid config file', () => {
            // Create config directory and file
            fs.mkdirSync(configDir, { recursive: true });
            const testConfig = {
                agentType: SWEAgentType.CLAUDE_CODE,
                maxDockerContainers: 10,
                dockerImageRef: 'ubuntu:latest'
            };
            fs.writeFileSync(configPath, JSON.stringify(testConfig));

            const reader = new ConfigReader({ configDir: configDir });
            const config = reader.readConfig();

            expect(config.agentType).toBe(SWEAgentType.CLAUDE_CODE);
            expect(config.maxDockerContainers).toBe(10);
            expect(config.dockerImageRef).toBe('ubuntu:latest');
            // Should have defaults for missing fields
            expect(config.dockerTimeoutSeconds).toBe(DEFAULT_CONFIG.dockerTimeoutSeconds);
        });

        it('should handle invalid JSON gracefully', () => {
            fs.mkdirSync(configDir, { recursive: true });
            fs.writeFileSync(configPath, '{ invalid json }');

            const reader = new ConfigReader({ configDir: configDir, throwOnMissing: true });
            expect(() => reader.readConfig()).toThrow('Invalid JSON');
        });

        it('should merge with defaults correctly', () => {
            fs.mkdirSync(configDir, { recursive: true });
            const partialConfig = {
                agentType: SWEAgentType.GEMINI_CLI,
                maxTasks: 20
            };
            fs.writeFileSync(configPath, JSON.stringify(partialConfig));

            const reader = new ConfigReader({ configDir: configDir });
            const config = reader.readConfig();

            expect(config.agentType).toBe(SWEAgentType.GEMINI_CLI);
            expect(config.maxTasks).toBe(20);
            // Should have defaults for other fields
            expect(config.maxDockerContainers).toBe(DEFAULT_CONFIG.maxDockerContainers);
            expect(config.dockerTimeoutSeconds).toBe(DEFAULT_CONFIG.dockerTimeoutSeconds);
        });
    });

    describe('Configuration Validation', () => {
        it('should validate agentType enum values', () => {
            fs.mkdirSync(configDir, { recursive: true });
            const invalidConfig = { agentType: 'invalid-agent' };
            fs.writeFileSync(configPath, JSON.stringify(invalidConfig));

            const reader = new ConfigReader({ configDir: configDir, throwOnMissing: true });
            expect(() => reader.readConfig()).toThrow('Invalid agentType');
        });

        it('should validate workStyle enum values', () => {
            fs.mkdirSync(configDir, { recursive: true });
            const invalidConfig = {
                agentType: SWEAgentType.GEMINI_CLI,
                workStyle: 'invalid-style'
            };
            fs.writeFileSync(configPath, JSON.stringify(invalidConfig));

            const reader = new ConfigReader({ configDir: configDir, throwOnMissing: true });
            expect(() => reader.readConfig()).toThrow('Invalid workStyle');
        });

        it('should validate numeric field ranges', () => {
            fs.mkdirSync(configDir, { recursive: true });
            const invalidConfig = {
                agentType: SWEAgentType.GEMINI_CLI,
                maxDockerContainers: 0 // Invalid: less than 1
            };
            fs.writeFileSync(configPath, JSON.stringify(invalidConfig));

            const reader = new ConfigReader({ configDir: configDir, throwOnMissing: true });
            expect(() => reader.readConfig()).toThrow('maxDockerContainers must be between 1 and 100');
        });

        it('should validate logical constraints between fields', () => {
            fs.mkdirSync(configDir, { recursive: true });
            const invalidConfig = {
                agentType: SWEAgentType.GEMINI_CLI,
                maxTasks: 5,
                minTasks: 10 // Invalid: greater than maxTasks
            };
            fs.writeFileSync(configPath, JSON.stringify(invalidConfig));

            const reader = new ConfigReader({ configDir: configDir, throwOnMissing: true });
            expect(() => reader.readConfig()).toThrow('minTasks (10) cannot be greater than maxTasks (5)');
        });

        it('should accept valid workStyle values', () => {
            fs.mkdirSync(configDir, { recursive: true });
            const validConfig = {
                agentType: SWEAgentType.GEMINI_CLI,
                workStyle: WorkStyle.QATESTER
            };
            fs.writeFileSync(configPath, JSON.stringify(validConfig));

            const reader = new ConfigReader({ configDir: configDir, throwOnMissing: true });
            const config = reader.readConfig();

            expect(config.workStyle).toBe(WorkStyle.QATESTER);
        });
    });

    describe('Writing Configuration', () => {
        it('should write config file with validation', () => {
            const reader = new ConfigReader({ configDir: configDir, throwOnMissing: true });
            const configToWrite = {
                agentType: SWEAgentType.CLAUDE_CODE,
                maxDockerContainers: 8,
                workStyle: WorkStyle.BUGFIXER
            };

            reader.writeConfig(configToWrite);

            expect(fs.existsSync(configPath)).toBe(true);
            expect(reader.configExists()).toBe(true);

            const writtenConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            expect(writtenConfig.agentType).toBe(SWEAgentType.CLAUDE_CODE);
            expect(writtenConfig.maxDockerContainers).toBe(8);
            expect(writtenConfig.workStyle).toBe(WorkStyle.BUGFIXER);
        });

        it('should create directory if it does not exist', () => {
            const reader = new ConfigReader({ configDir: configDir, throwOnMissing: true });
            const configToWrite = {
                agentType: SWEAgentType.GEMINI_CLI
            };

            reader.writeConfig(configToWrite);

            expect(fs.existsSync(configDir)).toBe(true);
            expect(fs.existsSync(configPath)).toBe(true);
        });

        it('should throw error when writing invalid config', () => {
            const reader = new ConfigReader({ configDir: configDir, throwOnMissing: true });
            const invalidConfig = {
                agentType: 'invalid-agent' as SWEAgentType
            };

            expect(() => reader.writeConfig(invalidConfig)).toThrow('Invalid agentType');
        });
    });

    describe('Environment Variable Override', () => {
        beforeEach(() => {
            // Clear relevant environment variables
            delete process.env.FSC_AGENT_TYPE;
            delete process.env.FSC_MAX_DOCKER_CONTAINERS;
            delete process.env.FSC_DOCKER_TIMEOUT_SECONDS;
            delete process.env.FSC_ANTHROPIC_API_KEY;
            delete process.env.FSC_GOOGLE_GEMINI_API_KEY;
        });

        afterEach(() => {
            // Clean up environment variables
            delete process.env.FSC_AGENT_TYPE;
            delete process.env.FSC_MAX_DOCKER_CONTAINERS;
            delete process.env.FSC_DOCKER_TIMEOUT_SECONDS;
            delete process.env.FSC_ANTHROPIC_API_KEY;
            delete process.env.FSC_GOOGLE_GEMINI_API_KEY;
        });

        it('should override config with environment variables', () => {
            // Create base config file
            fs.mkdirSync(configDir, { recursive: true });
            const baseConfig = {
                agentType: SWEAgentType.GEMINI_CLI,
                maxDockerContainers: 5
            };
            fs.writeFileSync(configPath, JSON.stringify(baseConfig));

            // Set environment variables
            process.env.FSC_AGENT_TYPE = SWEAgentType.CLAUDE_CODE;
            process.env.FSC_MAX_DOCKER_CONTAINERS = '15';

            const reader = new ConfigReader({ configDir: configDir, throwOnMissing: true });
            const config = reader.readConfigWithEnvOverride();

            expect(config.agentType).toBe(SWEAgentType.CLAUDE_CODE); // Overridden
            expect(config.maxDockerContainers).toBe(15); // Overridden
            expect(config.dockerTimeoutSeconds).toBe(DEFAULT_CONFIG.dockerTimeoutSeconds); // From default
        });

        it('should ignore invalid environment variable values', () => {
            fs.mkdirSync(configDir, { recursive: true });
            fs.writeFileSync(configPath, JSON.stringify({ agentType: SWEAgentType.GEMINI_CLI }));

            process.env.FSC_MAX_DOCKER_CONTAINERS = 'invalid-number';

            const reader = new ConfigReader({ configDir: configDir, throwOnMissing: true });
            const config = reader.readConfigWithEnvOverride();

            expect(config.maxDockerContainers).toBe(DEFAULT_CONFIG.maxDockerContainers); // Should use default
        });

    });

    describe('Convenience Functions', () => {

        it('readConfigWithEnv should support environment overrides', () => {
            fs.mkdirSync(configDir, { recursive: true });
            fs.writeFileSync(configPath, JSON.stringify({ agentType: SWEAgentType.GEMINI_CLI }));

            process.env.FSC_AGENT_TYPE = SWEAgentType.CLAUDE_CODE;

            const config = readConfigWithEnv({ configDir: tempDir });
            expect(config.agentType).toBe(SWEAgentType.CLAUDE_CODE);

            delete process.env.FSC_AGENT_TYPE;
        });
    });

    describe('Error Handling', () => {
        it('should handle file read errors gracefully', () => {
            // Create a directory instead of a file
            fs.mkdirSync(configPath, { recursive: true });

            const reader = new ConfigReader({ configDir: configDir, throwOnMissing: true });
            expect(() => reader.readConfig()).toThrow('Failed to read configuration file');
        });
    });

    describe('Complete Configuration Example', () => {
        it('should handle a complete real-world configuration', () => {
            fs.mkdirSync(configDir, { recursive: true });
            const completeConfig = {
                agentType: SWEAgentType.CLAUDE_CODE,
                googleGeminiAPIKeyExportNeeded: false,
                anthropicAPIKey: 'test-anthropic-key',
                anthropicAPIKeyExportNeeded: true,
                anthropicAPIBaseUrl: 'https://api.anthropic.com',
                maxDockerContainers: 8,
                maxParallelDockerContainers: 3,
                dockerImageRef: 'ubuntu:22.04',
                dockerTimeoutSeconds: 600,
                maxTasks: 25,
                minTasks: 2,
                dockerMemoryMB: 1024,
                dockerCpuCores: 2,
                workStyle: WorkStyle.CAREFULDOCUMENTWRITER,
                codingStyleLevel: 3,
                customizedCodingStyle: 'eslint-prettier'
            };
            fs.writeFileSync(configPath, JSON.stringify(completeConfig, null, 2));

            const reader = new ConfigReader({ configDir: configDir, throwOnMissing: true });
            const config = reader.readConfig();

            expect(config.agentType).toBe(SWEAgentType.CLAUDE_CODE);
            expect(config.anthropicAPIKey).toBe('test-anthropic-key');
            expect(config.anthropicAPIKeyExportNeeded).toBe(true);
            expect(config.anthropicAPIBaseUrl).toBe('https://api.anthropic.com');
            expect(config.maxDockerContainers).toBe(8);
            expect(config.maxParallelDockerContainers).toBe(3);
            expect(config.dockerImageRef).toBe('ubuntu:22.04');
            expect(config.dockerTimeoutSeconds).toBe(600);
            expect(config.maxTasks).toBe(25);
            expect(config.minTasks).toBe(2);
            expect(config.dockerMemoryMB).toBe(1024);
            expect(config.dockerCpuCores).toBe(2);
            expect(config.workStyle).toBe(WorkStyle.CAREFULDOCUMENTWRITER);
            expect(config.codingStyleLevel).toBe(3);
            expect(config.customizedCodingStyle).toBe('eslint-prettier');

            // Should have default for missing fields
            expect(config.openAICodexApiKey).toBeUndefined();
        });
    });
});