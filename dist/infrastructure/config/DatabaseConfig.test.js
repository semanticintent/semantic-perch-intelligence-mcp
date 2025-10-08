"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const Environment_1 = require("../../domain/value-objects/Environment");
const DatabaseConfig_1 = require("./DatabaseConfig");
(0, vitest_1.describe)('DatabaseConfig', () => {
    (0, vitest_1.describe)('constructor', () => {
        (0, vitest_1.it)('should create config with databases', () => {
            const databases = new Map();
            databases.set(Environment_1.Environment.DEVELOPMENT, { name: 'dev_db', id: 'dev-123' });
            databases.set(Environment_1.Environment.PRODUCTION, { name: 'prod_db', id: 'prod-456' });
            const config = new DatabaseConfig_1.DatabaseConfig(databases);
            (0, vitest_1.expect)(config.hasEnvironment(Environment_1.Environment.DEVELOPMENT)).toBe(true);
            (0, vitest_1.expect)(config.hasEnvironment(Environment_1.Environment.PRODUCTION)).toBe(true);
        });
        (0, vitest_1.it)('should throw error for empty databases', () => {
            (0, vitest_1.expect)(() => new DatabaseConfig_1.DatabaseConfig(new Map())).toThrow('At least one database must be configured');
        });
        (0, vitest_1.it)('should be immutable', () => {
            const databases = new Map();
            databases.set(Environment_1.Environment.DEVELOPMENT, { name: 'dev', id: '123' });
            const config = new DatabaseConfig_1.DatabaseConfig(databases);
            (0, vitest_1.expect)(Object.isFrozen(config)).toBe(true);
        });
    });
    (0, vitest_1.describe)('getDatabaseInstance()', () => {
        (0, vitest_1.it)('should return database instance for environment', () => {
            const databases = new Map();
            databases.set(Environment_1.Environment.DEVELOPMENT, { name: 'dev_db', id: 'dev-123' });
            const config = new DatabaseConfig_1.DatabaseConfig(databases);
            const instance = config.getDatabaseInstance(Environment_1.Environment.DEVELOPMENT);
            (0, vitest_1.expect)(instance.name).toBe('dev_db');
            (0, vitest_1.expect)(instance.id).toBe('dev-123');
        });
        (0, vitest_1.it)('should throw error for unconfigured environment', () => {
            const databases = new Map();
            databases.set(Environment_1.Environment.DEVELOPMENT, { name: 'dev', id: '123' });
            const config = new DatabaseConfig_1.DatabaseConfig(databases);
            (0, vitest_1.expect)(() => config.getDatabaseInstance(Environment_1.Environment.PRODUCTION)).toThrow('No database configured for environment: production');
        });
        (0, vitest_1.it)('should include available environments in error message', () => {
            const databases = new Map();
            databases.set(Environment_1.Environment.DEVELOPMENT, { name: 'dev', id: '123' });
            databases.set(Environment_1.Environment.STAGING, { name: 'stage', id: '456' });
            const config = new DatabaseConfig_1.DatabaseConfig(databases);
            (0, vitest_1.expect)(() => config.getDatabaseInstance(Environment_1.Environment.PRODUCTION)).toThrow('Available: development, staging');
        });
    });
    (0, vitest_1.describe)('getDatabaseId()', () => {
        (0, vitest_1.it)('should return database ID', () => {
            const databases = new Map();
            databases.set(Environment_1.Environment.DEVELOPMENT, { name: 'dev', id: 'dev-123' });
            const config = new DatabaseConfig_1.DatabaseConfig(databases);
            (0, vitest_1.expect)(config.getDatabaseId(Environment_1.Environment.DEVELOPMENT)).toBe('dev-123');
        });
    });
    (0, vitest_1.describe)('getDatabaseName()', () => {
        (0, vitest_1.it)('should return database name', () => {
            const databases = new Map();
            databases.set(Environment_1.Environment.DEVELOPMENT, { name: 'dev_db', id: '123' });
            const config = new DatabaseConfig_1.DatabaseConfig(databases);
            (0, vitest_1.expect)(config.getDatabaseName(Environment_1.Environment.DEVELOPMENT)).toBe('dev_db');
        });
    });
    (0, vitest_1.describe)('hasEnvironment()', () => {
        (0, vitest_1.it)('should return true for configured environment', () => {
            const databases = new Map();
            databases.set(Environment_1.Environment.DEVELOPMENT, { name: 'dev', id: '123' });
            const config = new DatabaseConfig_1.DatabaseConfig(databases);
            (0, vitest_1.expect)(config.hasEnvironment(Environment_1.Environment.DEVELOPMENT)).toBe(true);
        });
        (0, vitest_1.it)('should return false for unconfigured environment', () => {
            const databases = new Map();
            databases.set(Environment_1.Environment.DEVELOPMENT, { name: 'dev', id: '123' });
            const config = new DatabaseConfig_1.DatabaseConfig(databases);
            (0, vitest_1.expect)(config.hasEnvironment(Environment_1.Environment.PRODUCTION)).toBe(false);
        });
    });
    (0, vitest_1.describe)('getConfiguredEnvironments()', () => {
        (0, vitest_1.it)('should return all configured environments', () => {
            const databases = new Map();
            databases.set(Environment_1.Environment.DEVELOPMENT, { name: 'dev', id: '123' });
            databases.set(Environment_1.Environment.PRODUCTION, { name: 'prod', id: '456' });
            const config = new DatabaseConfig_1.DatabaseConfig(databases);
            const envs = config.getConfiguredEnvironments();
            (0, vitest_1.expect)(envs).toContain(Environment_1.Environment.DEVELOPMENT);
            (0, vitest_1.expect)(envs).toContain(Environment_1.Environment.PRODUCTION);
            (0, vitest_1.expect)(envs.length).toBe(2);
        });
    });
    (0, vitest_1.describe)('fromEnvironment()', () => {
        (0, vitest_1.it)('should load development database', () => {
            const env = {
                D1_DEV_DATABASE_ID: 'dev-123',
                D1_DEV_DATABASE_NAME: 'my_dev_db',
            };
            const config = DatabaseConfig_1.DatabaseConfig.fromEnvironment(env);
            (0, vitest_1.expect)(config.hasEnvironment(Environment_1.Environment.DEVELOPMENT)).toBe(true);
            (0, vitest_1.expect)(config.getDatabaseName(Environment_1.Environment.DEVELOPMENT)).toBe('my_dev_db');
            (0, vitest_1.expect)(config.getDatabaseId(Environment_1.Environment.DEVELOPMENT)).toBe('dev-123');
        });
        (0, vitest_1.it)('should use D1_DATABASE_ID as fallback for dev', () => {
            const env = {
                D1_DATABASE_ID: 'dev-123',
            };
            const config = DatabaseConfig_1.DatabaseConfig.fromEnvironment(env);
            (0, vitest_1.expect)(config.hasEnvironment(Environment_1.Environment.DEVELOPMENT)).toBe(true);
        });
        (0, vitest_1.it)('should use default name when not specified', () => {
            const env = {
                D1_DEV_DATABASE_ID: 'dev-123',
            };
            const config = DatabaseConfig_1.DatabaseConfig.fromEnvironment(env);
            (0, vitest_1.expect)(config.getDatabaseName(Environment_1.Environment.DEVELOPMENT)).toBe('development');
        });
        (0, vitest_1.it)('should load staging database', () => {
            const env = {
                D1_DEV_DATABASE_ID: 'dev-123',
                D1_STAGING_DATABASE_ID: 'staging-456',
                D1_STAGING_DATABASE_NAME: 'my_staging_db',
            };
            const config = DatabaseConfig_1.DatabaseConfig.fromEnvironment(env);
            (0, vitest_1.expect)(config.hasEnvironment(Environment_1.Environment.STAGING)).toBe(true);
            (0, vitest_1.expect)(config.getDatabaseName(Environment_1.Environment.STAGING)).toBe('my_staging_db');
        });
        (0, vitest_1.it)('should load production database', () => {
            const env = {
                D1_DEV_DATABASE_ID: 'dev-123',
                D1_PROD_DATABASE_ID: 'prod-789',
                D1_PROD_DATABASE_NAME: 'my_prod_db',
            };
            const config = DatabaseConfig_1.DatabaseConfig.fromEnvironment(env);
            (0, vitest_1.expect)(config.hasEnvironment(Environment_1.Environment.PRODUCTION)).toBe(true);
            (0, vitest_1.expect)(config.getDatabaseName(Environment_1.Environment.PRODUCTION)).toBe('my_prod_db');
        });
        (0, vitest_1.it)('should support D1_PRODUCTION_DATABASE_ID alias', () => {
            const env = {
                D1_DEV_DATABASE_ID: 'dev-123',
                D1_PRODUCTION_DATABASE_ID: 'prod-789',
            };
            const config = DatabaseConfig_1.DatabaseConfig.fromEnvironment(env);
            (0, vitest_1.expect)(config.hasEnvironment(Environment_1.Environment.PRODUCTION)).toBe(true);
        });
        (0, vitest_1.it)('should load all environments', () => {
            const env = {
                D1_DEV_DATABASE_ID: 'dev-123',
                D1_STAGING_DATABASE_ID: 'staging-456',
                D1_PROD_DATABASE_ID: 'prod-789',
            };
            const config = DatabaseConfig_1.DatabaseConfig.fromEnvironment(env);
            (0, vitest_1.expect)(config.getConfiguredEnvironments().length).toBe(3);
        });
        (0, vitest_1.it)('should throw error when no databases configured', () => {
            const env = {
                SOME_OTHER_VAR: 'value',
            };
            (0, vitest_1.expect)(() => DatabaseConfig_1.DatabaseConfig.fromEnvironment(env)).toThrow('No databases configured');
        });
    });
});
//# sourceMappingURL=DatabaseConfig.test.js.map