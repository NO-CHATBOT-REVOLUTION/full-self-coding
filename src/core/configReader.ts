import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { Config } from './config';
import { SWEAgentType, DEFAULT_CONFIG, createConfig } from './config';
import { WorkStyle } from './workStyle';

export interface ConfigReaderOptions {
    /**
     * Custom path to the config directory
     * @default "~/.config/full-self-coding"
     */
    configDir?: string;

    /**
     * Custom config filename
     * @default "config.json"
     */
    configFileName?: string;

    /**
     * Whether to throw an error when config file is missing
     * @default false - returns default config when file is missing
     */
    throwOnMissing?: boolean;

    /**
     * Whether to create the config directory if it doesn't exist
     * @default true
     */
    createDirectory?: boolean;

    /**
     * Whether to read supplementary configuration from project root
     * @default true - reads from ./config.json
     */
    readSupplementaryConfig?: boolean;
}

/**
 * ConfigReader class for reading and validating configuration files
 */
export class ConfigReader {
    private readonly configPath: string;
    private readonly throwOnMissing: boolean;
    private readonly createDirectory: boolean;
    private readonly readSupplementaryConfig: boolean;

    constructor(options: ConfigReaderOptions = {}) {
        const configDir = options.configDir || this.getDefaultConfigDir();
        const configFileName = options.configFileName || 'config.json';
        this.configPath = path.resolve(configDir, configFileName);
        this.throwOnMissing = options.throwOnMissing || false;
        this.createDirectory = options.createDirectory ?? true;
        this.readSupplementaryConfig = options.readSupplementaryConfig ?? true;

        // Create config directory if it doesn't exist and createDirectory is true
        if (this.createDirectory && !this.configExists()) {
            this.ensureConfigDirectory();
        }
    }

    /**
     * Get the default configuration directory path
     * @returns Path to ~/.config/full-self-coding
     */
    private getDefaultConfigDir(): string {
        return path.join(os.homedir(), '.config', 'full-self-coding');
    }

    /**
     * Ensure the configuration directory exists
     */
    private ensureConfigDirectory(): void {
        try {
            const configDir = path.dirname(this.configPath);
            fs.mkdirSync(configDir, { recursive: true });
        } catch (error) {
            // If directory creation fails, it's not critical - we'll handle it in read/write operations
            console.warn(`Warning: Could not create config directory: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Read and parse the configuration file
     * @returns Complete configuration with defaults applied
     * @throws Error if config file is invalid and throwOnMissing is true
     */
    public readConfig(): Config {
        try {
            let baseConfig: Partial<Config> = {};

            // Check if main config file exists
            if (fs.existsSync(this.configPath)) {
                // Read and parse the config file
                const rawConfig = this.readConfigFile();

                // Validate the configuration
                const validatedConfig = this.validateConfig(rawConfig);
                baseConfig = validatedConfig;
            } else {
                if (this.throwOnMissing) {
                    throw new Error(`Configuration file not found at: ${this.configPath}`);
                }
                console.warn(`Configuration file not found at: ${this.configPath}. Using default configuration.`);
            }

            // Read supplementary project-level config if it exists and is enabled
            const supplementaryConfig = this.readSupplementaryConfig ? this.readSupplementaryConfigFile() : {};

            // Merge base config with supplementary config (supplementary config takes precedence)
            const mergedConfig = { ...baseConfig, ...supplementaryConfig };

            // Validate the merged configuration
            const validatedMergedConfig = this.validateConfig(mergedConfig);

            // Merge with defaults
            return createConfig(validatedMergedConfig);

        } catch (error) {
            if (this.throwOnMissing) {
                throw error;
            }

            console.error(`Error reading configuration file: ${error instanceof Error ? error.message : String(error)}`);
            console.log('Using default configuration instead.');
            return DEFAULT_CONFIG;
        }
    }

    /**
     * Read the raw configuration file content
     * @returns Parsed configuration object
     */
    private readConfigFile(): Partial<Config> {
        try {
            const fileContent = fs.readFileSync(this.configPath, 'utf8');

            // Parse JSON content
            const parsedConfig = JSON.parse(fileContent);

            return parsedConfig;

        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error(`Invalid JSON in configuration file: ${error.message}`);
            }
            throw new Error(`Failed to read configuration file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Validate the configuration object
     * @param config Raw configuration object
     * @returns Validated configuration object
     */
    private validateConfig(config: Partial<Config>): Partial<Config> {
        const validatedConfig: Partial<Config> = { ...config };

        // Validate agentType (required field)
        if (validatedConfig.agentType) {
            if (!Object.values(SWEAgentType).includes(validatedConfig.agentType)) {
                throw new Error(`Invalid agentType: ${validatedConfig.agentType}. Must be one of: ${Object.values(SWEAgentType).join(', ')}`);
            }
        }

        // Validate workStyle if provided
        if (validatedConfig.workStyle) {
            if (!Object.values(WorkStyle).includes(validatedConfig.workStyle)) {
                throw new Error(`Invalid workStyle: ${validatedConfig.workStyle}. Must be one of: ${Object.values(WorkStyle).join(', ')}`);
            }
        }

        // Validate numeric fields
        this.validateNumericField(validatedConfig, 'maxDockerContainers', 1, 100);
        this.validateNumericField(validatedConfig, 'maxParallelDockerContainers', 1, 1000000);
        this.validateNumericField(validatedConfig, 'dockerTimeoutSeconds', 1, 360000000);
        // this.validateNumericField(validatedConfig, 'maxTasks', 1, 1000);
        // this.validateNumericField(validatedConfig, 'minTasks', 1, 100);
        this.validateNumericField(validatedConfig, 'dockerMemoryMB', 128, 8192);
        this.validateNumericField(validatedConfig, 'dockerCpuCores', 1, 16);
        // this.validateNumericField(validatedConfig, 'codingStyleLevel', 0, 10);

        // Validate logical constraints
        if (validatedConfig.maxTasks && validatedConfig.minTasks && validatedConfig.minTasks > validatedConfig.maxTasks) {
            throw new Error(`minTasks (${validatedConfig.minTasks}) cannot be greater than maxTasks (${validatedConfig.maxTasks})`);
        }

        if (validatedConfig.maxParallelDockerContainers && validatedConfig.maxDockerContainers &&
            validatedConfig.maxParallelDockerContainers > validatedConfig.maxDockerContainers) {
            throw new Error(`maxParallelDockerContainers (${validatedConfig.maxParallelDockerContainers}) cannot be greater than maxDockerContainers (${validatedConfig.maxDockerContainers})`);
        }

        // Validate dockerImageRef format if provided
        if (validatedConfig.dockerImageRef) {
            if (typeof validatedConfig.dockerImageRef !== 'string' || validatedConfig.dockerImageRef.trim() === '') {
                throw new Error('dockerImageRef must be a non-empty string');
            }
        }

        // Validate API keys and URLs if provided
        this.validateStringField(validatedConfig, 'googleGeminiApiKey', true);
        this.validateStringField(validatedConfig, 'anthropicAPIKey', true);
        this.validateStringField(validatedConfig, 'anthropicAPIBaseUrl', false);
        this.validateStringField(validatedConfig, 'openAICodexApiKey', true);
        this.validateStringField(validatedConfig, 'customizedWorkStyle', false);
        this.validateStringField(validatedConfig, 'customizedCodingStyle', false);

        return validatedConfig;
    }

    /**
     * Validate a numeric field
     * @param config Configuration object
     * @param fieldName Field name to validate
     * @param minValue Minimum allowed value
     * @param maxValue Maximum allowed value
     */
    private validateNumericField(config: Partial<Config>, fieldName: keyof Config, minValue: number, maxValue: number): void {
        const value = config[fieldName];
        if (value !== undefined) {
            if (typeof value !== 'number' || !Number.isInteger(value)) {
                throw new Error(`${fieldName} must be an integer`);
            }
            if (value < minValue || value > maxValue) {
                throw new Error(`${fieldName} must be between ${minValue} and ${maxValue}`);
            }
        }
    }

    /**
     * Validate a string field
     * @param config Configuration object
     * @param fieldName Field name to validate
     * @param allowEmpty Whether empty strings are allowed
     */
    private validateStringField(config: Partial<Config>, fieldName: keyof Config, allowEmpty: boolean): void {
        const value = config[fieldName];
        if (value !== undefined) {
            if (typeof value !== 'string') {
                throw new Error(`${fieldName} must be a string`);
            }
            if (!allowEmpty && value.trim() === '') {
                throw new Error(`${fieldName} cannot be empty`);
            }
        }
    }

    /**
     * Read supplementary project-level configuration file
     * @returns Partial configuration from project-level config.json
     */
    private readSupplementaryConfigFile(): Partial<Config> {
        try {
            // Look for config.json at ./.fsc/config.json
            // This path is relative to the current working directory
            const supplementaryConfigPath = path.resolve(process.cwd(), '.fsc', 'config.json');

            if (!fs.existsSync(supplementaryConfigPath)) {
                console.log(`Supplementary configuration file not found at: ${supplementaryConfigPath}`);
                return {};
            }

            console.log(`Reading supplementary configuration from: ${supplementaryConfigPath}`);

            // Read and parse the supplementary config file
            const fileContent = fs.readFileSync(supplementaryConfigPath, 'utf8');
            const parsedConfig = JSON.parse(fileContent);

            // Validate the supplementary configuration
            const validatedConfig = this.validateConfig(parsedConfig);

            console.log(`Successfully loaded supplementary configuration with ${Object.keys(validatedConfig).length} items`);
            return validatedConfig;

        } catch (error) {
            if (error instanceof SyntaxError) {
                console.warn(`Invalid JSON in supplementary configuration file: ${error.message}`);
            } else {
                console.warn(`Failed to read supplementary configuration file: ${error instanceof Error ? error.message : String(error)}`);
            }
            return {};
        }
    }

    /**
     * Get the path to the configuration file
     * @returns Full path to the configuration file
     */
    public getConfigPath(): string {
        return this.configPath;
    }

    /**
     * Get the default configuration directory path
     * @returns Path to ~/.config/full-self-coding
     */
    public getDefaultConfigDirectory(): string {
        return this.getDefaultConfigDir();
    }

    /**
     * Check if the configuration file exists
     * @returns True if the configuration file exists
     */
    public configExists(): boolean {
        return fs.existsSync(this.configPath);
    }

    /**
     * Create a new configuration file with the provided config
     * @param config Configuration to write
     */
    public writeConfig(config: Partial<Config>): void {
        try {
            // Ensure the directory exists
            const configDir = path.dirname(this.configPath);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            // Validate the configuration
            const validatedConfig = this.validateConfig(config);

            // Write the configuration file
            fs.writeFileSync(this.configPath, JSON.stringify(validatedConfig, null, 2), 'utf8');

            console.log(`Configuration written to: ${this.configPath}`);

        } catch (error) {
            throw new Error(`Failed to write configuration file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Read configuration with environment variable override support
     * Environment variables follow the pattern: FSC_<FIELD_NAME>
     * For example: FSC_AGENT_TYPE, FSC_MAX_DOCKER_CONTAINERS
     * @returns Complete configuration with env vars and defaults applied
     */
    public readConfigWithEnvOverride(): Config {
        const baseConfig = this.readConfig();

        // Environment variable mappings
        const envMappings: Record<string, keyof Config> = {
            'FSC_AGENT_TYPE': 'agentType',
            'FSC_GOOGLE_GEMINI_API_KEY': 'googleGeminiApiKey',
            'FSC_ANTHROPIC_API_KEY': 'anthropicAPIKey',
            'FSC_ANTHROPIC_API_BASE_URL': 'anthropicAPIBaseUrl',
            'FSC_OPENAI_CODEX_API_KEY': 'openAICodexApiKey',
            'FSC_MAX_DOCKER_CONTAINERS': 'maxDockerContainers',
            'FSC_MAX_PARALLEL_DOCKER_CONTAINERS': 'maxParallelDockerContainers',
            'FSC_DOCKER_IMAGE_REF': 'dockerImageRef',
            'FSC_DOCKER_TIMEOUT_SECONDS': 'dockerTimeoutSeconds',
            'FSC_MAX_TASKS': 'maxTasks',
            'FSC_MIN_TASKS': 'minTasks',
            'FSC_DOCKER_MEMORY_MB': 'dockerMemoryMB',
            'FSC_DOCKER_CPU_CORES': 'dockerCpuCores',
            'FSC_WORK_STYLE': 'workStyle',
            'FSC_CODING_STYLE_LEVEL': 'codingStyleLevel',
        };

        const configWithEnv = { ...baseConfig };

        // Apply environment variable overrides
        for (const [envVar, configKey] of Object.entries(envMappings)) {
            const envValue = process.env[envVar];
            if (envValue !== undefined) {
                // Type conversion based on the field type
                const convertedValue = this.convertEnvValue(envValue, configKey);
                if (convertedValue !== null) {
                    (configWithEnv as any)[configKey] = convertedValue;
                }
            }
        }

        return configWithEnv;
    }

    /**
     * Convert environment variable string to the appropriate type
     * @param value Environment variable value
     * @param configKey Configuration key
     * @returns Converted value or null if conversion fails
     */
    private convertEnvValue(value: string, configKey: keyof Config): any {
        try {
            // Boolean fields
            const booleanFields: (keyof Config)[] = [
                'googleGeminiAPIKeyExportNeeded',
                'anthropicAPIKeyExportNeeded',
                'openAICodexAPIKeyExportNeeded'
            ];

            if (booleanFields.includes(configKey)) {
                return value.toLowerCase() === 'true';
            }

            // Number fields
            const numberFields: (keyof Config)[] = [
                'maxDockerContainers',
                'maxParallelDockerContainers',
                'dockerTimeoutSeconds',
                'maxTasks',
                'minTasks',
                'dockerMemoryMB',
                'dockerCpuCores',
                'codingStyleLevel'
            ];

            if (numberFields.includes(configKey)) {
                const numValue = parseInt(value, 10);
                if (isNaN(numValue)) {
                    console.warn(`Invalid number value for ${configKey}: ${value}`);
                    return null;
                }
                return numValue;
            }

            // String fields (including enums)
            return value;

        } catch (error) {
            console.warn(`Failed to convert environment variable value for ${configKey}: ${value}`);
            return null;
        }
    }
}

/**
 * Convenience function to read configuration with default settings
 * @param options Optional configuration reader options
 * @returns Complete configuration
 */
export function readConfig(options?: ConfigReaderOptions): Config {
    const reader = new ConfigReader(options);
    return reader.readConfig();
}

/**
 * Convenience function to read configuration with environment variable override
 * @param options Optional configuration reader options
 * @returns Complete configuration with env vars applied
 */
export function readConfigWithEnv(options?: ConfigReaderOptions): Config {
    const reader = new ConfigReader(options);
    return reader.readConfigWithEnvOverride();
}