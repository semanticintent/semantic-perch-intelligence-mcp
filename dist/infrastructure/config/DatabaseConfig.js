"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseConfig = void 0;
const Environment_1 = require("../../domain/value-objects/Environment");
class DatabaseConfig {
    databases;
    constructor(databases) {
        if (databases.size === 0) {
            throw new Error('At least one database must be configured');
        }
        this.databases = new Map(databases);
        Object.freeze(this);
    }
    /**
     * Get database instance for environment
     *
     * Semantic: Environment determines which database to use
     */
    getDatabaseInstance(environment) {
        const instance = this.databases.get(environment);
        if (!instance) {
            throw new Error(`No database configured for environment: ${environment}. ` +
                `Available: ${Array.from(this.databases.keys()).join(', ')}`);
        }
        return instance;
    }
    /**
     * Get database ID for environment
     */
    getDatabaseId(environment) {
        return this.getDatabaseInstance(environment).id;
    }
    /**
     * Get database name for environment
     */
    getDatabaseName(environment) {
        return this.getDatabaseInstance(environment).name;
    }
    /**
     * Check if environment has configured database
     */
    hasEnvironment(environment) {
        return this.databases.has(environment);
    }
    /**
     * Get all configured environments
     */
    getConfiguredEnvironments() {
        return Array.from(this.databases.keys());
    }
    /**
     * Create config from environment variables
     */
    static fromEnvironment(env) {
        const databases = new Map();
        // Development database
        const devId = env.D1_DEV_DATABASE_ID || env.D1_DATABASE_ID;
        if (devId) {
            databases.set(Environment_1.Environment.DEVELOPMENT, {
                name: env.D1_DEV_DATABASE_NAME || 'development',
                id: devId,
            });
        }
        // Staging database
        const stagingId = env.D1_STAGING_DATABASE_ID;
        if (stagingId) {
            databases.set(Environment_1.Environment.STAGING, {
                name: env.D1_STAGING_DATABASE_NAME || 'staging',
                id: stagingId,
            });
        }
        // Production database
        const prodId = env.D1_PROD_DATABASE_ID || env.D1_PRODUCTION_DATABASE_ID;
        if (prodId) {
            databases.set(Environment_1.Environment.PRODUCTION, {
                name: env.D1_PROD_DATABASE_NAME || env.D1_PRODUCTION_DATABASE_NAME || 'production',
                id: prodId,
            });
        }
        if (databases.size === 0) {
            throw new Error('No databases configured. Set at least one of: ' +
                'D1_DEV_DATABASE_ID, D1_STAGING_DATABASE_ID, D1_PROD_DATABASE_ID');
        }
        return new DatabaseConfig(databases);
    }
}
exports.DatabaseConfig = DatabaseConfig;
//# sourceMappingURL=DatabaseConfig.js.map